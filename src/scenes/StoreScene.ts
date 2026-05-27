import * as Phaser from 'phaser';
import { BaseScene, BaseSceneData } from './BaseScene';
import { items } from '../data/items';
import { createCrowd, updateCrowd, updateNameplates, updateNameplateForSprite } from '../actors/NpcCrowd';
import { fetchClerk, fetchTravelers } from '../api/travelers';
import { t } from '../i18n';
import { CONFIG } from '../config';
import { GAME_WIDTH, GAME_HEIGHT } from '../main';
import { getClient } from '../net/ws';
import { attachOthers } from '../net/others';

type StoreData = BaseSceneData & { storeId: string; returnTo?: string };

export class StoreScene extends BaseScene {
  private rows: (Phaser.GameObjects.Text | Phaser.GameObjects.BitmapText)[] = [];
  private selected = 0;
  private storeId: string = 'cosmetics';
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
  private cashier!: Phaser.GameObjects.Sprite;
  private customers?: Phaser.Physics.Arcade.Group;
  public layer!: Phaser.Tilemaps.TilemapLayer;
  private exitWorld!: Phaser.Math.Vector2;
  private nameplate?: Phaser.GameObjects.Text;

  constructor() { super('StoreScene'); }

  init(data: StoreData) {
    if (data?.storeId) this.storeId = data.storeId;
    if (data?.returnTo) this.returnTo = data.returnTo;
    // 確保每次進入商店都重置狀態
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
  }

  preload() {
    // Procedural store tiles (16x16)
    if (!this.textures.exists('store-tiles')) {
      const g = this.make.graphics({ x: 0, y: 0 });
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
  }

  create(data: StoreData) {
    this.fadeIn();
    this.initInputs();
    this.cameras.main.setBackgroundColor('#0d1220');

    // Build store map (20x11 tiles = 320x176)
    const map = this.make.tilemap({ width: 20, height: 11, tileWidth: 16, tileHeight: 16 });
    const tiles = map.addTilesetImage('store-tiles');
    this.layer = map.createBlankLayer('floor', tiles!, 0, 2)!;
    const base = (tiles as any).firstgid ?? 1;
    const FLOOR_A = base + 0, FLOOR_B = base + 1, WALL = base + 2, SHELF = base + 3, COUNTER = base + 4, LIGHT = base + 5;
    for (let y = 0; y < 11; y++) { for (let x = 0; x < 20; x++) { this.layer.putTileAt(((x + y) % 2 === 0) ? FLOOR_A : FLOOR_B, x, y); } }
    this.layer.fill(WALL, 0, 0, 20, 1); this.layer.fill(WALL, 0, 10, 20, 1);
    [3,5,7].forEach(row => { for (let x=3; x<=16; x+=4) this.layer.putTileAt(SHELF, x, row); });
    for (let x=8; x<=11; x++) this.layer.putTileAt(COUNTER, x, 2);
    for (let x=2; x<=16; x+=7) this.layer.putTileAt(LIGHT, x, 1);

    // Location 顯示
    const key = `store.title.${this.storeId}`;
    let title = t(key);
    if (!title || title === key) title = this.storeId;
    this.setLocation(title, this.storeId);

    // Player
    const px = typeof data?.spawnX === 'number' ? data!.spawnX : (16 * 1 + 8);
    const py = typeof data?.spawnY === 'number' ? data!.spawnY : (16 * 9);
    this.setupPlayer(px, py);
    this.player.setDepth(100);
    this.physics.add.collider(this.player, this.layer);
    this.layer.setCollision([WALL, SHELF], true);

    // 自己名牌
    try {
      const nm = (localStorage.getItem('pname') || '').trim();
      if (nm) {
        this.nameplate = this.add.text(this.player.x, this.player.y - 22, nm, { fontSize: `${CONFIG.ui.small}px`, color: '#243b53', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' })
          .setOrigin(0.5, 1).setDepth(101).setScrollFactor(1);
        try { this.nameplate.setStroke('#ffffff', 2); } catch {}
      }
    } catch {}

    const clerk = this.add.sprite(16 * 10, 16 * 3, 'characters', 'clerk_0_0').setOrigin(0.5, 1).setDepth(10);
    this.cashier = clerk;
    this.physics.add.existing(clerk);
    (clerk.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    // 與顧客區分
    this.cashier.setTint(0xffd966);
    // 取得店員資料
    ;(async () => {
      try {
        const c = await fetchClerk(this.storeId);
        this.cashier.setData('traveler', c);
        this.cashier.setData('animPrefix', 'clerk');
        try { (this.cashier as any).anims?.play?.('clerk-idle-down'); } catch {}
      } catch {}
    })();

    // 顧客
    if (['cosmetics','liquor','snacks','tobacco','perfume','electronics','fashion','books','souvenirs','food'].includes(this.storeId)) {
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
          collideWith: [this.player as any, this.cashier as any],
          speed: { vx: [-30, 30], vy: [-20, 20] },
          bounce: { x: 1, y: 1 },
          travelers: out,
          texturesByGender: { default: 'sprite-npc' },
        });
      });
    }
    // 出口
    this.exitWorld = new Phaser.Math.Vector2(16 * 1 + 8, 2 + 16 * 9 + 8);
    this.add.rectangle(this.exitWorld.x, this.exitWorld.y - 6, 10, 12, 0x2e8b57).setOrigin(0.5, 1);
    this.add.rectangle(this.exitWorld.x, this.exitWorld.y - 6, 12, 14).setStrokeStyle(1, 0x4a5668).setOrigin(0.5, 1);
    
    // 他人顯示
    try { attachOthers(this, { getArea: () => `store:${this.storeId}`, crossArea: false }); } catch {}
  }

  private startDialog(lines: string[]) {
    this.phase = 'dialog';
    this.dialogLines = lines;
    this.dialogStep = 0;
    try { (this.scene.get('UIOverlay') as any).openDialog(this.dialogLines, this.dialogStep); } catch {
      this.registry.set('dialogLines', this.dialogLines);
      this.registry.set('dialogStep', this.dialogStep);
      this.registry.set('dialogOpen', true);
    }
  }

  private endDialogToListing() {
    this.registry.set('dialogOpen', false);
    this.phase = 'listing';
    this.setHint(t('store.hint'));
    // 將清單交由 UIOverlay 顯示
    const data = items.filter(i => i.store === this.storeId);
    const extended = [...data, { id: '__exit', name: t('store.listExit') || '結束對話', price: 0, store: this.storeId as any } as any];
    this.selected = 0;
    this.registry.set('listingItems', extended);
    this.registry.set('listingSelected', this.selected);
    this.registry.set('listingOpen', true);
    try { (this.scene.get('UIOverlay') as any).listingForceFrames = 2; } catch {}
  }

  private renderList() {
    if (this.phase !== 'listing') return;
    const data = items.filter(i => i.store === this.storeId);
    const extended = [...data, { id: '__exit', name: t('store.listExit') || '結束對話', price: 0, store: this.storeId as any } as any];
    this.registry.set('listingItems', extended);
    this.registry.set('listingSelected', this.selected);
  }

  private endListingToBrowse() {
    this.phase = 'browse';
    try {
      this.rows.forEach(r => { try { r.destroy(); } catch {} });
    } catch {}
    this.rows = [];
    this.setHint(t('store.hintApproach'));
  }

  update() {
    if (!this.player) return;
    
    const inputLocked = !!this.registry.get('inputLocked');
    if (this.phase === 'browse' && !inputLocked) {
      this.updatePlayerMovement();
    } else {
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    }

    // 顧客 AI
    updateCrowd(this, this.customers);
    updateNameplates(this, this.customers, this.player as any, 20, 10);
    updateNameplateForSprite(this, this.cashier as any, this.player as any, 20, 10);
    try { if (this.nameplate) this.nameplate.setPosition(this.player.x, this.player.y - 22); } catch {}
    
    // 位置上報
    this.updateNetworkMovement(`store:${this.storeId}`);
    try { if (this.player) this.registry.set('playerPos', { x: this.player.x, y: this.player.y }); } catch {}

    if (inputLocked) { this.registry.set('interactOpen', false); }

    if (!this.cashier) return;
    const talkTargetX = this.cashier.x;
    const talkTargetY = this.cashier.y + 10;
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, talkTargetX, talkTargetY);
    
    let nearExit = false;
    if (!inputLocked && this.exitWorld) {
      const distExitEarly = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.exitWorld.x, this.exitWorld.y);
      if (distExitEarly < 18) {
        nearExit = true;
        this.registry.set('hintLarge', true);
        this.setHint((t('store.hintExitDoor') || '按 E 離開') + ' | ESC 選單');
        this.registry.set('interactOptions', [t('store.hintExitDoor') || '離開']);
        this.registry.set('interactOpen', true);
        if (Phaser.Input.Keyboard.JustDown(this.keys.E)) { this.leaveStore(); return; }
      }
    }

    if (this.phase === 'browse') {
      if (nearExit) return;
      if (dist < 24) {
        this.registry.set('hintLarge', true);
        this.setHint(t('store.hintTalk') + ' | ESC 選單');
        if (!inputLocked) {
          this.registry.set('interactOptions', [t('store.hintTalk') || '對話']);
          this.registry.set('interactOpen', true);
        }
      } else {
        this.registry.set('hintLarge', false);
        this.registry.set('interactOpen', false);
      }
      if (!inputLocked && dist < 24 && Phaser.Input.Keyboard.JustDown(this.keys.E)) {
        this.startDialog([t('store.dialog.l1'), t('store.dialog.l2'), t('store.dialog.l3')]);
      }
      return;
    }
    if (this.phase === 'dialog') {
      if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
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

    // phase === 'listing'
    const data = items.filter(i => i.store === this.storeId);
    const listExt = [...data, { id: '__exit', name: t('store.listExit') || '結束對話', price: 0, store: this.storeId as any }];
    if (Phaser.Input.Keyboard.JustDown(this.cursors.down!) || Phaser.Input.Keyboard.JustDown(this.keys.S)) {
      this.selected = (this.selected + 1) % listExt.length;
      this.renderList();
      this.registry.set('listingSelected', this.selected);
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up!) || Phaser.Input.Keyboard.JustDown(this.keys.W)) {
      this.selected = (this.selected - 1 + listExt.length) % listExt.length;
      this.renderList();
      this.registry.set('listingSelected', this.selected);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
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
  }

  private leaveStore() {
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      try { (window as any).__applyCameraZoom?.(); } catch {}
      this.registry.set('dialogOpen', false);
      this.registry.set('listingOpen', false);
      this.scene.resume(this.returnTo || 'ConcourseHallScene');
      this.scene.stop();
    });
  }
}
