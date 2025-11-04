import Phaser from 'phaser';
import { items } from '../data/items';
import { t } from '../i18n';
import { GAME_WIDTH, GAME_HEIGHT } from '../main';

type StoreData = { storeId: 'cosmetics' | 'liquor' };

export class StoreScene extends Phaser.Scene {
  private cursor!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: { [k: string]: Phaser.Input.Keyboard.Key };
  private rows: (Phaser.GameObjects.Text | Phaser.GameObjects.BitmapText)[] = [];
  private selected = 0;
  private storeId: StoreData['storeId'] = 'cosmetics';
  // 商品清單面板（右側框框）
  private listPanel?: {
    container: Phaser.GameObjects.Container;
    gfx: Phaser.GameObjects.Graphics;
    x: number; y: number; w: number; h: number; pad: number;
  };

  // Dialogue gating
  private phase: 'browse' | 'dialog' | 'listing' = 'browse';
  private dialogBox!: Phaser.GameObjects.Rectangle;
  private dialogText!: Phaser.GameObjects.Text;
  private dialogLines: string[] = [];
  private dialogStep = 0;

  // Scene objects
  private player!: Phaser.GameObjects.Image;
  private cashier!: Phaser.GameObjects.Image;
  private customers?: Phaser.Physics.Arcade.Group;
  private customerMeta: Map<Phaser.GameObjects.Image, { state: 'walk' | 'pause'; nextAt: number } > = new Map();
  private layer!: Phaser.Tilemaps.TilemapLayer;
  private pBody!: Phaser.Physics.Arcade.Body;
  private exitWorld!: Phaser.Math.Vector2;

  constructor() { super('StoreScene'); }

  init(data: StoreData) {
    if (data?.storeId) this.storeId = data.storeId;
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
    this.customerMeta.clear();
  }

  preload() {
    // Procedural store tiles (16x16)
    if (!this.textures.exists('store-tiles')) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      const TILE = 16;
      const palette = { floorA: 0x1d2430, floorB: 0x202b39, wall: 0x2d3a48, shelf: 0x4b5a6a, counter: 0x355a6a, light: 0xfff1b6 } as const;
      g.fillStyle(palette.floorA, 1); g.fillRect(0 * TILE, 0, TILE, TILE);
      g.fillStyle(palette.floorB, 1); g.fillRect(1 * TILE, 0, TILE, TILE);
      g.fillStyle(0x000000, 0.15);
      for (let y = 2; y < TILE; y += 4) for (let x = 2; x < TILE; x += 4) g.fillRect(1 * TILE + x, y, 1, 1);
      g.fillStyle(palette.wall, 1); g.fillRect(2 * TILE, 0, TILE, TILE);
      g.fillStyle(palette.shelf, 1); g.fillRect(3 * TILE + 2, 2, TILE - 4, TILE - 4);
      g.fillStyle(palette.counter, 1); g.fillRect(4 * TILE + 1, 3, TILE - 2, TILE - 6);
      g.fillStyle(palette.light, 1); g.fillRect(5 * TILE + 4, 2, 8, 4);
      g.generateTexture('store-tiles', TILE * 6, TILE);
      g.destroy();
    }

    // Tiny sprites (player/NPC)
    if (!this.textures.exists('sprite-player')) {
      const pg = this.make.graphics({ x: 0, y: 0, add: false });
      pg.fillStyle(0xebb35e, 1); pg.fillRect(2, 3, 4, 7); // body
      pg.fillStyle(0x3a2a1a, 1); pg.fillRect(2, 10, 1, 2); pg.fillRect(5, 10, 1, 2); // shoes
      pg.fillStyle(0x5a3a2a, 1); pg.fillRect(2, 2, 4, 1); // hair band
      pg.generateTexture('sprite-player', 8, 12); pg.clear();
      pg.fillStyle(0xaec6cf, 1); pg.fillRect(2, 3, 4, 7);
      pg.fillStyle(0x2a3a4a, 1); pg.fillRect(2, 10, 1, 2); pg.fillRect(5, 10, 1, 2);
      pg.generateTexture('sprite-npc', 8, 12); pg.destroy();
    }
  }

  create() {
    this.cameras.main.setBackgroundColor('#0d1220');
    this.cameras.main.setRoundPixels(true);
    // 進入商店時強制使用 cover 以避免畫面縮放異常（等同於自動按下 Fit=>Cover）
    try { (window as any).__setFillMode?.('cover'); } catch {}
    try { (window as any).__applyCameraZoom?.(); } catch {}
    // 下一幀再套用一次，避免剛啟動場景時未被收集到而維持 1x/左上
    try { this.time.delayedCall(0, () => { try { (window as any).__applyCameraZoom?.(); } catch {} }); } catch {}
    // 場景喚醒/恢復時也補一次，避免切換瞬間出現 1x 閃動
    this.events.on(Phaser.Scenes.Events.WAKE, () => { try { (window as any).__applyCameraZoom?.(); } catch {} });
    this.events.on(Phaser.Scenes.Events.RESUME, () => { try { (window as any).__applyCameraZoom?.(); } catch {} });

    this.cursor = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('ESC,E,W,A,S,D') as any;

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
    const title = this.storeId === 'cosmetics' ? t('store.title.cosmetics') : t('store.title.liquor');
    this.registry.set('location', title);
    this.registry.set('locationType', this.storeId);
    this.registry.set('hint', t('store.hintApproach'));

    // Player & cashier
    this.player = this.add.image(16, 16 * 9, 'sprite-player');
    this.physics.add.existing(this.player);
    this.pBody = this.player.body as Phaser.Physics.Arcade.Body;
    this.pBody.setCollideWorldBounds(true);
    this.layer.setCollision([WALL, SHELF], true);
    this.physics.add.collider(this.player, this.layer);

    this.cashier = this.add.image(16 * 10, 16 * 3, 'sprite-npc');
    this.physics.add.existing(this.cashier);
    (this.cashier.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    // 與顧客區分：給店員不同色調
    this.cashier.setTint(0xffd966);

    // 化妝品店顧客：數名隨機移動的 NPC，與地圖/玩家/店員碰撞
    if (this.storeId === 'cosmetics' || this.storeId === 'liquor') { this.spawnCustomers(); }
    // 出口：左下角門框，靠近按 E 離開
    this.exitWorld = new Phaser.Math.Vector2(16 * 1 + 8, 2 + 16 * 9 + 8);
    this.add.rectangle(this.exitWorld.x, this.exitWorld.y - 6, 10, 12, 0x2e8b57).setOrigin(0.5, 1);
    this.add.rectangle(this.exitWorld.x, this.exitWorld.y - 6, 12, 14).setStrokeStyle(1, 0x4a5668).setOrigin(0.5, 1);

    // Dialog UI (hidden by default)
    this.dialogBox = this.add.rectangle(0, GAME_HEIGHT - 40 - 2, GAME_WIDTH, 40, 0x000000, 0.7).setOrigin(0).setDepth(1000).setVisible(false);
    this.dialogText = this.add.text(6, GAME_HEIGHT - 40 + 2 - 2, '', { fontSize: '12px', color: '#e6f0ff', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' }).setDepth(1001).setVisible(false);
  }

  // 產生顧客（化妝品店專用）
  private spawnCustomers() {
    const group = this.physics.add.group();
    this.customers = group;
    const count = 4;
    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Between(24, GAME_WIDTH - 24);
      const y = Phaser.Math.Between(16 * 4, 16 * 9);
      const npc = this.add.image(x, y, 'sprite-npc');
      npc.setTint(0x8fd3ff);
      this.physics.add.existing(npc);
      const body = npc.body as Phaser.Physics.Arcade.Body;
      body.setCollideWorldBounds(true);
      body.setBounce(1, 1);
      this.randomizeCustomerVelocity(body);
      group.add(npc);
      this.customerMeta.set(npc, { state: 'walk', nextAt: this.time.now + Phaser.Math.Between(900, 1600) });
    }
    this.physics.add.collider(this.customers, this.layer);
    this.physics.add.collider(this.customers, this.player);
    this.physics.add.collider(this.customers, this.cashier);
    this.physics.add.collider(this.customers, this.customers);
  }

  private randomizeCustomerVelocity(body: Phaser.Physics.Arcade.Body) {
    const vx = Phaser.Math.Between(-35, 35) || 20;
    const vy = Phaser.Math.Between(-25, 25) || 15;
    body.setVelocity(vx, vy);
  }

  private startDialog(lines: string[]) {
    this.phase = 'dialog';
    this.dialogLines = lines;
    this.dialogStep = 0;
    this.dialogBox.setVisible(true);
    this.dialogText.setVisible(true);
    this.dialogText.setText(t('store.dialog.l1') + t('store.dialog.cont'));
  }

  private endDialogToListing() {
    this.dialogBox.setVisible(false);
    this.dialogText.setVisible(false);
    this.phase = 'listing';
    this.registry.set('hint', t('store.hint'));
    this.ensureListPanel(true);
    this.renderList();
  }

  private renderList() {
    if (this.phase !== 'listing') return;
    this.ensureListPanel(true);
    this.rows.forEach(t => t.destroy());
    this.rows = [];
    const data = items.filter(i => i.store === this.storeId);
    const extended = [...data, { id: '__exit', name: '結束對話', price: 0, store: this.storeId as any }];
    const p = this.listPanel!;
    const startY = p.y + p.pad + 16; // 頁首留標題行
    const startX = p.x + p.pad;
    // 標題
    const title = this.add.text(startX, p.y + p.pad - 2, t('store.listTitle'), { fontSize: '12px', color: '#e6f0ff', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' });
    p.container.add(title);
    this.rows.push(title);
    extended.forEach((it, idx) => {
      const y = startY + idx * 14;
      const prefix = idx === this.selected ? '>' : ' ';
      const line = (it as any).id === '__exit' ? `${prefix} 結束對話` : `${prefix} ${it.name}  $${it.price}`;
      const txt = this.add.text(startX, y, line, { fontSize: '12px', color: idx === this.selected ? '#ffffff' : '#c0c8d0', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' });
      p.container.add(txt);
      this.rows.push(txt);
    });
  }

  // 建立或顯示右側框框
  private ensureListPanel(show: boolean) {
    if (this.listPanel) {
      this.listPanel.container.setVisible(show);
      return;
    }
    const pad = 6;
    const w = 140;
    const h = GAME_HEIGHT - 16;
    const x = GAME_WIDTH - w - 6;
    const y = 8;
    const container = this.add.container(0, 0).setDepth(900);
    const gfx = this.add.graphics();
    gfx.fillStyle(0x0b111a, 0.85);
    gfx.fillRect(x, y, w, h);
    gfx.lineStyle(1, 0x4a5668, 1);
    // 0.5 對齊像素獲得銳利邊緣
    gfx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    container.add(gfx);
    this.listPanel = { container, gfx, x, y, w, h, pad };
    container.setVisible(show);
  }

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
    const speed = 70;
    if (this.pBody) {
      this.pBody.setVelocity(0);
      if (this.phase !== 'dialog') {
        if (this.cursor.left?.isDown || (this.keys as any).A.isDown) this.pBody.setVelocityX(-speed);
        else if (this.cursor.right?.isDown || (this.keys as any).D.isDown) this.pBody.setVelocityX(speed);
        if (this.cursor.up?.isDown || (this.keys as any).W.isDown) this.pBody.setVelocityY(-speed);
        else if (this.cursor.down?.isDown || (this.keys as any).S.isDown) this.pBody.setVelocityY(speed);
      }
    }

    // 顧客 AI：走動/暫停的簡單狀態機
    if (this.customers) {
      const now = this.time.now;
      this.customers.children.iterate((obj: any) => {
        const npc = obj as Phaser.GameObjects.Image;
        const meta = this.customerMeta.get(npc);
        const body = (npc.body as Phaser.Physics.Arcade.Body);
        if (!meta || !body) return undefined;
        if (now >= meta.nextAt) {
          if (meta.state === 'walk') {
            // 切換到暫停
            meta.state = 'pause';
            meta.nextAt = now + Phaser.Math.Between(500, 900);
            body.setVelocity(0, 0);
          } else {
            // 切回走動
            meta.state = 'walk';
            meta.nextAt = now + Phaser.Math.Between(900, 1600);
            this.randomizeCustomerVelocity(body);
          }
        }
        return undefined;
      });
    }

    // 取消 ESC 強制返回大廳（改由清單的「離開」或出口互動離開）

    if (!this.player || !this.cashier) return;
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.cashier.x, this.cashier.y);
    // 出口互動（全階段檢查）：靠近門口按 E 離開
    if (this.exitWorld) {
      const distExitEarly = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.exitWorld.x, this.exitWorld.y);
      if (distExitEarly < 18) {
        this.registry.set('hint', t('store.hintExitDoor'));
        if (Phaser.Input.Keyboard.JustDown((this.keys as any).E)) { this.leaveStore(); return; }
      }
    }

    if (this.phase === 'browse') {
      if (dist < 18) this.registry.set('hint', t('store.hintTalk'));
      if (dist < 18 && Phaser.Input.Keyboard.JustDown((this.keys as any).E)) {
        this.startDialog([t('store.dialog.l1'), t('store.dialog.l2'), t('store.dialog.l3')]);
      }
      return;
    }

    if (this.phase === 'dialog') {
      if (Phaser.Input.Keyboard.JustDown((this.keys as any).E)) {
        this.dialogStep++;
        if (this.dialogStep < this.dialogLines.length) {
          this.dialogText.setText((this.dialogLines[this.dialogStep] || '') + t('store.dialog.cont'));
        } else {
          this.endDialogToListing();
        }
      }
      return;
    }

    // phase === 'listing': list navigation
    const data = items.filter(i => i.store === this.storeId);
    const listExt = [...data, { id: '__exit', name: '結束對話', price: 0, store: this.storeId as any }];
    // 支援方向鍵與 W/S 進行選取
    if (Phaser.Input.Keyboard.JustDown(this.cursor.down!) || Phaser.Input.Keyboard.JustDown((this.keys as any).S)) {
      this.selected = (this.selected + 1) % listExt.length;
      this.renderList();
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursor.up!) || Phaser.Input.Keyboard.JustDown((this.keys as any).W)) {
      this.selected = (this.selected - 1 + listExt.length) % listExt.length;
      this.renderList();
    }
    // Enter 或 Space 加入購物車
    if (Phaser.Input.Keyboard.JustDown((this.keys as any).E)) {
      const it = listExt[this.selected];
      if (it?.id === '__exit') { this.endListingToBrowse(); return; }
      const basket = ((this.registry.get('basket') as any[]) ?? []).slice();
      const money = (this.registry.get('money') as number) ?? 0;
      if (money >= it.price) {
        basket.push({ id: it.id, name: it.name, price: it.price });
        this.registry.set('basket', basket);
        this.registry.set('money', money - it.price);
      }
      this.renderList();
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
    this.scene.resume('ConcourseScene');
    this.scene.stop();
  }
}







