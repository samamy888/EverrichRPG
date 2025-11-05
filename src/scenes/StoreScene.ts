import Phaser from 'phaser';
import { items } from '../data/items';
import { createCrowd, updateCrowd, updateNameplates, updateNameplateForSprite } from '../actors/NpcCrowd';
import { fetchTravelers } from '../api/travelers';
import { t } from '../i18n';
import { CONFIG } from '../config';
import { GAME_WIDTH, GAME_HEIGHT } from '../main';

type StoreData = { storeId: string; returnTo?: string };

export class StoreScene extends Phaser.Scene {
  private cursor!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: { [k: string]: Phaser.Input.Keyboard.Key };
  private rows: (Phaser.GameObjects.Text | Phaser.GameObjects.BitmapText)[] = [];
  private selected = 0;
  private storeId: StoreData['storeId'] = 'cosmetics';
  private returnTo: string = 'ConcourseHallScene';
  // 商品清單面板（右側框框）
  private listPanel?: {
    container: Phaser.GameObjects.Container;
    gfx: Phaser.GameObjects.Graphics;
    x: number; y: number; w: number; h: number; pad: number;
  };

  // Dialogue gating
  private phase: 'browse' | 'dialog' | 'listing' = 'browse';
  private dialogLines: string[] = [];
  private dialogStep = 0;

  // Scene objects
  private player!: Phaser.GameObjects.Image;
  private cashier!: Phaser.GameObjects.Image;
  private customers?: Phaser.Physics.Arcade.Group;
  private layer!: Phaser.Tilemaps.TilemapLayer;
  private pBody!: Phaser.Physics.Arcade.Body;
  private exitWorld!: Phaser.Math.Vector2;

  constructor() { super('StoreScene'); }

  init(data: StoreData) {
    if (data?.storeId) this.storeId = data.storeId;
    if (data?.returnTo) this.returnTo = data.returnTo;
    // 確保每次進入商店都重置狀態（避免前一次的 listing 狀態殘留）
    this.phase = 'browse';
    this.selected = 0;
    this.dialogLines = [];
    this.dialogStep = 0;
    try { this.rows.forEach(r => { try { r.destroy(); } catch {} }); } catch {}
    this.rows = [];
    if (this.listPanel) {
      try { this.listPanel.container.destroy(true); } catch {}
      this.listPanel = undefined;
    }
    if (this.customers) {
      try { this.customers.clear(true, true); } catch {}
      this.customers = undefined;
    }
    try { (this.customers as any).__meta?.clear?.(); } catch {}
    // Reset basket overlay
  }

  preload() {
    // Procedural store tiles (16x16)
    if (!this.textures.exists('store-tiles')) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      const TILE = 16;
      const palette = { floorA: 0xf1f7fc, floorB: 0xe6f0f9, wall: 0xd7e6f3, shelf: 0xbfd6e8, counter: 0x9fc3dd, light: 0xfff7cc } as const;
      // 地板（明亮棋盤）
      g.fillStyle(palette.floorA, 1); g.fillRect(0 * TILE, 0, TILE, TILE);
      g.fillStyle(palette.floorB, 1); g.fillRect(1 * TILE, 0, TILE, TILE);
      g.fillStyle(0xffffff, 0.25);
      for (let y = 2; y < TILE; y += 4) for (let x = 2; x < TILE; x += 4) g.fillRect(1 * TILE + x, y, 1, 1);
      // 牆與家具（柔和藍灰）
      g.fillStyle(palette.wall, 1); g.fillRect(2 * TILE, 0, TILE, TILE);
      g.fillStyle(palette.shelf, 1); g.fillRect(3 * TILE + 2, 2, TILE - 4, TILE - 4);
      g.fillStyle(palette.counter, 1); g.fillRect(4 * TILE + 1, 3, TILE - 2, TILE - 6);
      // 燈帶（暖黃）
      g.fillStyle(palette.light, 1); g.fillRect(5 * TILE + 4, 2, 8, 4);
      g.generateTexture('store-tiles', TILE * 6, TILE);
      g.destroy();
    }

    // Placeholder tiny sprites (16x16)
    if (!this.textures.exists('sprite-player')) {
      const pg = this.make.graphics({ x: 0, y: 0, add: false });
      // player
      pg.fillStyle(0xebb35e, 1); pg.fillRect(6, 5, 4, 8);
      pg.fillStyle(0x3a2a1a, 1); pg.fillRect(6, 13, 2, 2); pg.fillRect(8, 13, 2, 2);
      pg.fillStyle(0x5a3a2a, 1); pg.fillRect(6, 4, 4, 1);
      pg.generateTexture('sprite-player', 16, 16); pg.clear();
      // npc
      pg.fillStyle(0xaec6cf, 1); pg.fillRect(6, 5, 4, 8);
      pg.fillStyle(0x2a3a4a, 1); pg.fillRect(6, 13, 2, 2); pg.fillRect(8, 13, 2, 2);
      pg.generateTexture('sprite-npc', 16, 16); pg.destroy();
    }
  }

  create() {
    this.cameras.main.setBackgroundColor('#0d1220');
    this.cameras.main.setRoundPixels(true);
    // 進入商店後套用目前縮放設定
    try { (window as any).__applyCameraZoom?.(); } catch {}
    // 下一幀再套用一次，避免剛啟動場景時未被收集到而維持 1x/左上
    try { this.time.delayedCall(0, () => { try { (window as any).__applyCameraZoom?.(); } catch {} }); } catch {}
    // 場景喚醒/恢復時也補一次，避免切換瞬間出現 1x 閃動
    this.events.on(Phaser.Scenes.Events.WAKE, () => { try { (window as any).__applyCameraZoom?.(); } catch {} });
    this.events.on(Phaser.Scenes.Events.RESUME, () => { try { (window as any).__applyCameraZoom?.(); } catch {} });

    this.cursor = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('ESC,E,W,A,S,D,SHIFT') as any;

    // Build store map (20x11 tiles = 320x176)
    const map = this.make.tilemap({ width: 20, height: 11, tileWidth: 16, tileHeight: 16 });
    const tiles = map.addTilesetImage('store-tiles');
    this.layer = map.createBlankLayer('floor', tiles!, 0, 2);
    const base = (tiles as any).firstgid ?? 1;
    const FLOOR_A = base + 0, FLOOR_B = base + 1, WALL = base + 2, SHELF = base + 3, COUNTER = base + 4, LIGHT = base + 5;
    for (let y = 0; y < 11; y++) { for (let x = 0; x < 20; x++) { this.layer.putTileAt(((x + y) % 2 === 0) ? FLOOR_A : FLOOR_B, x, y); } }
    this.layer.fill(WALL, 0, 0, 20, 1); this.layer.fill(WALL, 0, 10, 20, 1);
    [3,5,7].forEach(row => { for (let x=3; x<=16; x+=4) this.layer.putTileAt(SHELF, x, row); });
    for (let x=8; x<=11; x++) this.layer.putTileAt(COUNTER, x, 2);
    for (let x=2; x<=16; x+=7) this.layer.putTileAt(LIGHT, x, 1);

    // Location 顯示交由 UIOverlay（右上），本場景不再另外繪製標題文字
    const key = `store.title.${this.storeId}`;
    let title = t(key);
    if (!title || title === key) title = this.storeId;
    this.registry.set('location', title);
    this.registry.set('locationType', this.storeId);
    this.registry.set('hint', `${t('store.hintApproach')}｜ESC 購物籃`);

    // Player & cashier
    const idleKey = this.textures.exists('player_idle') ? 'player_idle' : 'sprite-player';
    const ps = this.add.sprite(16, 16 * 9, idleKey, 0).setOrigin(0.5, 1).setDepth(100);
    this.physics.add.existing(ps);
    this.player = ps as any;
    this.pBody = (this.player as any).body as Phaser.Physics.Arcade.Body;
    try {
      const frame: any = (ps as any).frame;
      const fw = Math.max(1, Number(frame?.width ?? 32));
      const fh = Math.max(1, Number(frame?.height ?? 32));
      const bw = Math.max(6, Math.round(fw * 0.35));
      const bh = Math.max(4, Math.round(fh * 0.25));
      const offX = Math.round((fw - bw) / 2);
      const offY = Math.round(fh - bh - fh * 0.06);
      this.pBody.setSize(bw, bh).setOffset(offX, offY);
    } catch {}
    this.pBody.setCollideWorldBounds(true);
    this.layer.setCollision([WALL, SHELF], true);
    this.physics.add.collider(this.player, this.layer);

    const clerkKey = this.textures.exists('clerk_idle') ? 'clerk_idle' : 'sprite-npc';
    const clerk = this.add.sprite(16 * 10, 16 * 3, clerkKey, 0).setOrigin(0.5, 1).setDepth(10);
    this.cashier = clerk as any;
    this.physics.add.existing(clerk);
    (clerk.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    // 與顧客區分：給店員不同色調
    this.cashier.setTint(0xffd966);
    // 取得店員資料，給予名牌資訊
    ;(async () => {
      try {
        const { fetchClerk } = await import('../api/travelers');
        const c = await fetchClerk(this.storeId);
        this.cashier.setData('traveler', c);
        this.cashier.setData('animPrefix', 'clerk');
        try { (this.cashier as any).anims?.play?.('clerk-idle-down'); } catch {}
      } catch {}
    })();

    // 化妝品店顧客：數名隨機移動的 NPC，與地圖/玩家/店員碰撞
    if (['cosmetics','liquor','snacks','tobacco','perfume'].includes(this.storeId)) {
      fetchTravelers().then((list) => {
        const pool = list.slice();
        const out: any[] = [];
        for (let i=0;i<4 && pool.length;i++) out.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);
        this.customers = createCrowd(this, {
          count: out.length,
          area: { xMin: 24, xMax: GAME_WIDTH - 24, yMin: 16 * 4, yMax: 16 * 9 },
          texture: 'sprite-npc',
          tint: 0x8fd3ff,
          layer: this.layer,
          collideWith: [this.player as unknown as any, this.cashier as unknown as any],
          speed: { vx: [-30, 30], vy: [-20, 20] },
          bounce: { x: 1, y: 1 },
          travelers: out,
          texturesByGender: { default: 'sprite-npc' },
        });
        // createCrowd 內已設定預設 depth，這裡不再額外遍歷
      });
    }
    // 出口：左下角門框，靠近按 E 離開
    this.exitWorld = new Phaser.Math.Vector2(16 * 1 + 8, 2 + 16 * 9 + 8);
    this.add.rectangle(this.exitWorld.x, this.exitWorld.y - 6, 10, 12, 0x2e8b57).setOrigin(0.5, 1);
    this.add.rectangle(this.exitWorld.x, this.exitWorld.y - 6, 12, 14).setStrokeStyle(1, 0x4a5668).setOrigin(0.5, 1);

    // 對話框改由 UIOverlay 顯示，這裡不建立本地對話 UI
  }

  // 產生顧客（化妝品店專用）
  private spawnCustomers() {}

  private startDialog(lines: string[]) {
    this.phase = 'dialog';
    this.dialogLines = lines;
    this.dialogStep = 0;
    try { (this.scene.get('UIOverlay') as any).openDialog(this.dialogLines, this.dialogStep); } catch {
      // 後備：仍透過 registry 通知
      this.registry.set('dialogLines', this.dialogLines);
      this.registry.set('dialogStep', this.dialogStep);
      this.registry.set('dialogOpen', true);
    }
  }

  private endDialogToListing() {
    this.registry.set('dialogOpen', false);
    this.phase = 'listing';
    this.registry.set('hint', t('store.hint'));
    // 將清單交由 UIOverlay 顯示
    const data = items.filter(i => i.store === this.storeId);
    const extended = [...data, { id: '__exit', name: t('store.listExit') || '結束對話', price: 0, store: this.storeId as any } as any];
    this.selected = 0;
    this.registry.set('listingItems', extended);
    this.registry.set('listingSelected', this.selected);
    this.registry.set('listingOpen', true);
    // 列表開啟後前幾幀強制重排（UIOverlay 會讀取）
    try { (this.scene.get('UIOverlay') as any).listingForceFrames = 2; } catch {}
  }

  private renderList() {
    if (this.phase !== 'listing') return;
    const data = items.filter(i => i.store === this.storeId);
    const extended = [...data, { id: '__exit', name: t('store.listExit') || '結束對話', price: 0, store: this.storeId as any } as any];
    this.registry.set('listingItems', extended);
    this.registry.set('listingSelected', this.selected);
  }

  // 建立或顯示右側框框
  private ensureListPanel(_show: boolean) { /* Deprecated: moved to UIOverlay */ }

  // Basket overlay rendering moved to UIOverlay (global)

  private endListingToBrowse() {
    this.phase = 'browse';
    // 隱藏清單面板與其文字
    try {
      this.rows.forEach(r => { try { r.destroy(); } catch {} });
    } catch {}
    this.rows = [];
    if (this.listPanel) {
      try { this.listPanel.container.setVisible(false); } catch {}
    }
    this.registry.set('hint', t('store.hintApproach'));
  }

  update() {
    const spr = this.player as unknown as Phaser.GameObjects.Sprite;
    const baseSpeed = CONFIG.controls.baseSpeed;
    const runMul = CONFIG.controls.runMultiplier;
    const speed = (this.keys as any).SHIFT?.isDown ? Math.round(baseSpeed * runMul) : baseSpeed;
    if (this.pBody) {
      this.pBody.setVelocity(0);
      // 僅在瀏覽狀態允許移動；對話與清單期間主角定格
      if (this.phase === 'browse') {
        if (this.cursor.left?.isDown || (this.keys as any).A.isDown) this.pBody.setVelocityX(-speed);
        else if (this.cursor.right?.isDown || (this.keys as any).D.isDown) this.pBody.setVelocityX(speed);
        if (this.cursor.up?.isDown || (this.keys as any).W.isDown) this.pBody.setVelocityY(-speed);
        else if (this.cursor.down?.isDown || (this.keys as any).S.isDown) this.pBody.setVelocityY(speed);
      }
      // 動畫播放（方向）：down/up/side，side 以 flipX 控左右
      try {
        const moving = Math.abs(this.pBody.velocity.x) + Math.abs(this.pBody.velocity.y) > 0;
        const ax = this.pBody.velocity.x; const ay = this.pBody.velocity.y;
        const absx = Math.abs(ax), absy = Math.abs(ay);
        let facing: 'down' | 'up' | 'side' = (spr.getData('facing') as any) || 'down';
        let flipX = spr.flipX;
        if (moving) {
          if (absx >= absy) { facing = 'side'; flipX = ax < 0; }
          else { facing = ay < 0 ? 'up' : 'down'; }
          spr.setData('facing', facing);
          spr.setFlipX(facing === 'side' ? flipX : false);
          const key = this.anims.exists(`player-walk-${facing}`) ? `player-walk-${facing}` : undefined;
          if (key) (spr as any).anims.play(key, true); else (spr as any).anims.stop();
        } else {
          const key = this.anims.exists(`player-idle-${facing}`) ? `player-idle-${facing}` : undefined;
          spr.setFlipX(facing === 'side' ? flipX : false);
          if (key) (spr as any).anims.play(key, true); else (spr as any).anims.stop();
        }
      } catch {}
    }


    // 顧客 AI（共用）：走動/暫停
    updateCrowd(this, this.customers);
    // 名牌接觸點比照對話：向下偏移 10，且更接近才顯示
    updateNameplates(this, this.customers, this.player as any, 20, 10);
    updateNameplateForSprite(this, this.cashier as any, this.player as any, 20, 10);

    // 取消 ESC 強制返回大廳（改由清單的「離開」或出口互動離開）

    if (!this.player || !this.cashier) return;
    // 與店員互動距離：以店員身前（櫃台外側）作為接觸點，讓玩家不必貼太上方才能對話
    const talkTargetX = this.cashier.x;
    const talkTargetY = this.cashier.y + 10; // 下移 10px，接近櫃台外側
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, talkTargetX, talkTargetY);
    // 出口互動（全階段檢查）：靠近門口按 E 離開
    if (this.exitWorld) {
      const distExitEarly = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.exitWorld.x, this.exitWorld.y);
      if (distExitEarly < 18) {
        this.registry.set('hint', `${t('store.hintExitDoor')}｜ESC 購物籃`);
        if (Phaser.Input.Keyboard.JustDown((this.keys as any).E)) { this.leaveStore(); return; }
      }
    }

    if (this.phase === 'browse') {
      if (dist < 24) this.registry.set('hint', `${t('store.hintTalk')}｜ESC 購物籃`);
      if (dist < 24 && Phaser.Input.Keyboard.JustDown((this.keys as any).E)) {
        this.startDialog([t('store.dialog.l1'), t('store.dialog.l2'), t('store.dialog.l3')]);
      }
      return;
    }

    if (this.phase === 'dialog') {
      if (Phaser.Input.Keyboard.JustDown((this.keys as any).E)) {
        let ended = false;
        try { ended = (this.scene.get('UIOverlay') as any).advanceDialog(); } catch {
          this.dialogStep++;
          if (this.dialogStep < this.dialogLines.length) {
            this.registry.set('dialogStep', this.dialogStep);
            this.registry.set('dialogOpen', true);
          } else {
            ended = true;
          }
        }
        if (ended) { this.endDialogToListing(); }
      }
      return;
    }

    // phase === 'listing': list navigation
    const data = items.filter(i => i.store === this.storeId);
    const listExt = [...data, { id: '__exit', name: t('store.listExit') || '結束對話', price: 0, store: this.storeId as any }];
    // 支援方向鍵與 W/S 進行選取
    if (Phaser.Input.Keyboard.JustDown(this.cursor.down!) || Phaser.Input.Keyboard.JustDown((this.keys as any).S)) {
      this.selected = (this.selected + 1) % listExt.length;
      this.renderList();
      this.registry.set('listingSelected', this.selected);
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursor.up!) || Phaser.Input.Keyboard.JustDown((this.keys as any).W)) {
      this.selected = (this.selected - 1 + listExt.length) % listExt.length;
      this.renderList();
      this.registry.set('listingSelected', this.selected);
    }
    // Enter 或 Space 加入購物車
    if (Phaser.Input.Keyboard.JustDown((this.keys as any).E)) {
      const it = listExt[this.selected];
      if (it?.id === '__exit') { this.endListingToBrowse(); this.registry.set('listingOpen', false); return; }
      const basket = ((this.registry.get('basket') as any[]) ?? []).slice();
      const money = (this.registry.get('money') as number) ?? 0;
      if (money >= it.price) {
        basket.push({ id: it.id, name: it.name, price: it.price });
        this.registry.set('basket', basket);
        this.registry.set('money', money - it.price);
      }
      this.renderList();
      this.registry.set('listingSelected', this.selected);
    }
    // 出口互動：靠近門口按 E 離開
    if (this.exitWorld) {
      const distExit = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.exitWorld.x, this.exitWorld.y);
      if (distExit < 18) {
        this.registry.set('hint', t('store.hintExitDoor'));
        if (Phaser.Input.Keyboard.JustDown((this.keys as any).E)) { this.leaveStore(); return; }
      }
    }
  }

  private leaveStore() {
    try { (window as any).__applyCameraZoom?.(); } catch {}
    // 關閉對話覆蓋層（若尚未關閉）
    try { this.registry.set('dialogOpen', false); } catch {}
    try { this.registry.set('listingOpen', false); } catch {}
    this.scene.resume(this.returnTo || 'ConcourseHallScene');
    this.scene.stop();
  }
}










    // 將主角世界座標提供給 UIOverlay，用於將清單定位在主角右側
    try { this.registry.set('playerPos', { x: this.player.x, y: this.player.y }); } catch {}
