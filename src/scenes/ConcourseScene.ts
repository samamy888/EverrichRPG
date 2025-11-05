import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../main';
import { createCrowd, updateCrowd, updateNameplates } from '../actors/NpcCrowd';
import { CONFIG } from '../config';
import { fetchTravelers } from '../api/travelers';
import { t } from '../i18n';

export class ConcourseScene extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: { [k: string]: Phaser.Input.Keyboard.Key };
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private layer!: Phaser.Tilemaps.TilemapLayer;
  private doors: { world: Phaser.Math.Vector2; id: string; label: string }[] = [];
  private crowd?: Phaser.Physics.Arcade.Group;
  private hubX!: number; // 中央大廳（安檢線）X 位置（以 tile 計）
  private doorLabels: Map<string, Phaser.GameObjects.Text> = new Map();

  constructor() { super('ConcourseScene'); }

  preload() {
    // Generate a nicer tiny tileset (8 tiles, 16x16): floor A/B, border, stripe, facade, glass, door, light
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const TILE = 16;
    const palette = {
      // 明亮機場風調色盤（柔和藍灰與亮玻璃）
      floorA: 0xeaf2f9,
      floorB: 0xdfeaf5,
      border: 0xbdcfe1,
      stripe: 0xb3d4f0,
      facade: 0xe4f1fa,
      glass:  0x8ad4ff,
      door:   0x8bc34a,
      light:  0xfff7cc,
      shadow: 0xb0c6d8,
    };
    // floorA
    g.fillStyle(palette.floorA, 1); g.fillRect(0 * TILE, 0, TILE, TILE);
    // floorB with dots
    g.fillStyle(palette.floorB, 1); g.fillRect(1 * TILE, 0, TILE, TILE);
    g.fillStyle(0x000000, 0.15);
    for (let y = 2; y < TILE; y += 4) for (let x = 2; x < TILE; x += 4) g.fillRect(1 * TILE + x, y, 1, 1);
    // border
    g.fillStyle(palette.border, 1); g.fillRect(2 * TILE, 0, TILE, TILE);
    // stripe (decor line)
    g.fillStyle(palette.floorA, 1); g.fillRect(3 * TILE, 0, TILE, TILE);
    g.fillStyle(palette.stripe, 1); g.fillRect(3 * TILE, TILE - 3, TILE, 2);
    // facade
    g.fillStyle(palette.facade, 1); g.fillRect(4 * TILE, 0, TILE, TILE);
    // glass（亮色玻璃，附高光）
    g.fillStyle(palette.glass, 1); g.fillRect(5 * TILE, 2, TILE, TILE - 4);
    g.fillStyle(0xffffff, 0.25); g.fillRect(5 * TILE + 2, 2, 3, TILE - 4);
    // door
    g.fillStyle(palette.door, 1); g.fillRect(6 * TILE + 3, 2, TILE - 6, TILE - 4);
    // light
    g.fillStyle(palette.shadow, 1); g.fillRect(7 * TILE, 0, TILE, TILE);
    g.fillStyle(palette.light, 1); g.fillRect(7 * TILE + 4, 2, 8, 4);
    g.generateTexture('df-tiles', TILE * 8, TILE);
    g.destroy();

    // Player/NPC placeholder sprites (16x16)
    const pg = this.make.graphics({ x: 0, y: 0, add: false });
    // player: simple 16x16 figure (torso/shoes/headband)
    pg.clear();
    pg.fillStyle(0xebb35e, 1); pg.fillRect(6, 5, 4, 8); // torso
    pg.fillStyle(0x3a2a1a, 1); pg.fillRect(6, 13, 2, 2); pg.fillRect(8, 13, 2, 2); // shoes
    pg.fillStyle(0x5a3a2a, 1); pg.fillRect(6, 4, 4, 1); // hair band
    pg.generateTexture('sprite-player', 16, 16); pg.clear();
    // npc simple (cooler palette)
    pg.fillStyle(0xaec6cf, 1); pg.fillRect(6, 5, 4, 8);
    pg.fillStyle(0x2a3a4a, 1); pg.fillRect(6, 13, 2, 2); pg.fillRect(8, 13, 2, 2);
    pg.generateTexture('sprite-npc', 16, 16); pg.destroy();
  }

  create() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,E,SHIFT') as any;

    // Build tilemap: 140x11 tiles，中央大廳＋A/B 兩翼走廊（T1 風格）
    const map = this.make.tilemap({ width: 140, height: 11, tileWidth: 16, tileHeight: 16 });
    this.hubX = Math.floor(map.width / 2);
    const tiles = map.addTilesetImage('df-tiles');
    this.layer = map.createBlankLayer('floor', tiles!, 0, 2);

    // Tile indices (offset by tileset firstgid)
    const base = (tiles as any).firstgid ?? 1;
    const FLOOR_A = base + 0, FLOOR_B = base + 1, BORDER = base + 2, STRIPE = base + 3, FACADE = base + 4, GLASS = base + 5, DOOR = base + 6, LIGHT = base + 7;
    // Checker floor（全圖）
    for (let y = 0; y < 11; y++) {
      for (let x = 0; x < 140; x++) {
        this.layer.putTileAt(((x + y) % 2 === 0) ? FLOOR_A : FLOOR_B, x, y);
      }
    }
    // Borders top/bottom and stripe
    this.layer.fill(BORDER, 0, 0, 140, 1);
    this.layer.fill(BORDER, 0, 10, 140, 1);
    this.layer.fill(STRIPE, 0, 9, 140, 1);
    // 工字形結構：在第3列與第7列鋪一條可碰撞的橫向隔牆，只在中央豎向走道留缺口
    const hubX = this.hubX; // 中央 X（tile）
    this.layer.fill(FACADE, 0, 3, 140, 1);
    this.layer.fill(FACADE, 0, 7, 140, 1);
    // 開豎向走道 3 格寬的開口
    for (let dx = -1; dx <= 1; dx++) {
      const cx = hubX + dx;
      // 用地板覆蓋掉隔牆，恢復可通行
      const topTile = ((cx + 3) % 2 === 0) ? FLOOR_A : FLOOR_B;
      const botTile = ((cx + 7) % 2 === 0) ? FLOOR_A : FLOOR_B;
      this.layer.putTileAt(topTile, cx, 3);
      this.layer.putTileAt(botTile, cx, 7);
    }
    // Ensure small icon textures for door signage
    this.ensureDoorIcons();
    // Multiple store facades（工字型）：
    // A 區（上方橫向長廊，貼牆第1-2列，門在第2列）
    // B 區（下方橫向長廊，貼牆第9-8列，門在第8列）
    const entries: { x: number; id: string; label: string; side: 'top' | 'bottom'; wing: 'A' | 'B' }[] = [
      // A（上）五家，避開中央豎道（hubX）附近
      { x: 14, id: 'cosmetics',   label: t('store.title.cosmetics'),   side: 'top',    wing: 'A' },
      { x: 28, id: 'liquor',      label: t('store.title.liquor'),      side: 'top',    wing: 'A' },
      { x: 42, id: 'snacks',      label: t('store.title.snacks'),      side: 'top',    wing: 'A' },
      { x: 96, id: 'electronics', label: t('store.title.electronics'), side: 'top',    wing: 'A' },
      { x: 110, id: 'fashion',    label: t('store.title.fashion'),     side: 'top',    wing: 'A' },
      // B（下）五家
      { x: 18,  id: 'books',      label: t('store.title.books'),       side: 'bottom', wing: 'B' },
      { x: 32,  id: 'tobacco',    label: t('store.title.tobacco'),     side: 'bottom', wing: 'B' },
      { x: 46,  id: 'perfume',    label: t('store.title.perfume'),     side: 'bottom', wing: 'B' },
      { x: 100, id: 'souvenirs',  label: t('store.title.souvenirs'),   side: 'bottom', wing: 'B' },
      { x: 114, id: 'food',       label: t('store.title.food'),        side: 'bottom', wing: 'B' },
    ];
    for (const e of entries) {
      // 完全貼牆且店面高度 3x2：
      // 上側使用列 [1,2]（1=貼牆立面、2=靠走道玻璃，門在 2）；
      // 下側貼到底邊：使用列 [8,9]（9=貼牆立面緊貼底邊、8=靠走道玻璃，門在 8）。
      const facadeRow = e.side === 'top' ? 1 : 9;
      const glassRow = e.side === 'top' ? 2 : 8;
      const doorRow = glassRow;
      // 橫向三格（x-1..x+1）
      for (let cx = e.x - 1; cx <= e.x + 1; cx++) {
        // 貼牆那列放立面，靠走道那列放玻璃（單層圖塊，後者會覆蓋前者）
        this.layer.putTileAt(FACADE, cx, facadeRow);
        this.layer.putTileAt(GLASS, cx, glassRow);
      }
      // 門放在靠走道的那列中央
      this.layer.putTileAt(DOOR, e.x, doorRow);
      const world = new Phaser.Math.Vector2(e.x * 16 + 8, 2 + doorRow * 16 + 8);
      this.doors.push({ world, id: e.id, label: e.label });
      // 移除門邊 icon，改用靠近時名牌

      // 商店外觀黑框（3x2 區塊外框）
      const minRow = Math.min(facadeRow, glassRow);
      const x0 = (e.x - 1) * 16;
      const y0 = 2 + minRow * 16;
      const w = 3 * 16;
      const h = 2 * 16;
      const frame = this.add.graphics();
      frame.lineStyle(1, 0x000000, 1);
      frame.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);
      frame.setDepth(6);
    }
    // Central hub signage & facilities
    {
      const hub = this.hubX;
      const sign = this.add.graphics();
      sign.fillStyle(0x0b111a, 0.85).fillRect((hub - 3) * 16 + 2, 2 + 1 * 16, 6 * 16 - 4, 12).setDepth(7);
      this.add.text(hub * 16, 2 + 1 * 16 + 2, 'A | B', { fontSize: '10px', color: '#e6f0ff', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' })
        .setOrigin(0.5, 0).setDepth(8).setStroke('#24424e', 1);
      // Info / WC icons
      this.add.image((hub - 6) * 16, 2 + 2 * 16, 'icon-info').setOrigin(0.5).setDepth(8);
      this.add.image((hub + 6) * 16, 2 + 2 * 16, 'icon-wc').setOrigin(0.5).setDepth(8);
      // Security arches
      const s = this.add.graphics(); s.lineStyle(1, 0x375a7f, 1).setDepth(6);
      for (let x = hub - 4; x <= hub + 4; x += 2) s.strokeRoundedRect(x * 16 + 4, 2 + 5 * 16 - 10, 12, 10, 3);
    }
    // Gate signage along wings (visual)
    const gate = (tx: number, label: string, side: 'top'|'bottom') => {
      const y = side === 'top' ? 2 + 2 * 16 : 2 + 8 * 16;
      this.add.text(tx * 16, y, label, { fontSize: '9px', color: '#243b53', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' })
        .setOrigin(0.5, side === 'top' ? 1 : 0).setDepth(8).setStroke('#ffffff', 2);
      this.add.image(tx * 16, y + (side === 'top' ? -10 : 10), 'icon-gate').setOrigin(0.5, side === 'top' ? 1 : 0).setDepth(8);
    };
    gate(14, 'Gate A1', 'top'); gate(22, 'Gate A2', 'bottom'); gate(34, 'Gate A3', 'top'); gate(46, 'Gate A4', 'bottom');
    gate(102, 'Gate B1', 'bottom'); gate(114, 'Gate B2', 'top'); gate(126, 'Gate B3', 'bottom');
    // Light panels on top（中央＋左右翼）
    for (let x = 2; x <= 20; x += 7) this.layer.putTileAt(LIGHT, x, 1);
    for (let x = 96; x <= 136; x += 7) this.layer.putTileAt(LIGHT, x, 1);
    // Doors created above

    // 中央大廳視覺安檢線（僅視覺，不設碰撞）
    // 中央視覺安檢線
    // 注意：上方已使用 hubX 變數
    for (let y = 4; y <= 6; y++) this.layer.putTileAt(STRIPE, hubX, y);
    // Collisions with borders/facade
    this.layer.setCollision([BORDER, FACADE], true);

    // Location status via global UIOverlay (right-top)
    this.registry.set('location', t('concourse.sign'));
    this.registry.set('locationType', 'concourse');

    // Player
    const idleKey = this.textures.exists('player_idle') ? 'player_idle' : 'sprite-player';
    const ps = this.add.sprite(0, 0, idleKey, 0).setOrigin(0.5, 1).setDepth(100);
    this.physics.add.existing(ps);
    this.player = ps as unknown as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    this.player.body.setCollideWorldBounds(true);
    // 32x32 幀中，實際角色 16x16，腳底碰撞盒縮小貼地
    try {
      const frame: any = (ps as any).frame;
      const fw = Math.max(1, Number(frame?.width ?? 32));
      const fh = Math.max(1, Number(frame?.height ?? 32));
      const bw = Math.max(6, Math.round(fw * 0.35));
      const bh = Math.max(4, Math.round(fh * 0.25));
      const offX = Math.round((fw - bw) / 2);
      const offY = Math.round(fh - bh - fh * 0.06);
      (this.player.body as any).setSize(bw, bh).setOffset(offX, offY);
    } catch {}
    // 主人公出生在大廳正中央
    this.player.setPosition(GAME_WIDTH / 2, GAME_HEIGHT / 2);

    // Collide with walls
    this.physics.add.collider(this.player, this.layer);

    // Crowd NPCs（從名單隨機抽人；僅在中央豎向走道活動）
    fetchTravelers().then((list) => {
      const pool = list.slice();
      const pick = (n: number) => { const out: any[] = []; for (let i=0;i<n && pool.length;i++){ out.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]); } return out; };
      const chosen = pick(8);
      this.crowd = createCrowd(this, {
        count: chosen.length,
        // 中央豎向走道範圍：以 hubX 為中心，寬約 3 格，貫通 A/B 之間
        area: { xMin: this.hubX * 16 - 24, xMax: this.hubX * 16 + 24, yMin: 2 * 16 + 2, yMax: 8 * 16 + 14 },
        texture: 'sprite-npc',
        tint: 0xffffff,
        layer: this.layer,
        collideWith: [this.player as unknown as any],
        speed: { vx: [-40, 40], vy: [-10, 10] },
        bounce: { x: 1, y: 1 },
        travelers: chosen,
        texturesByGender: { default: 'sprite-npc' },
      });
    });

    // 初始提示交由全域 UIOverlay 顯示
    this.registry.set('hint', `${t('concourse.hintMoveEnter')}｜ESC 購物籃`);

    // 物理世界使用設計解析度，視圖大小由相機 zoom 控制
    this.physics.world.setBounds(0, 0, map.width * 16, GAME_HEIGHT);
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.startFollow(this.player, true, 1, 1, 0, 0);
    // 重新套用全域相機縮放於喚醒/恢復時
    this.events.on(Phaser.Scenes.Events.WAKE, () => { try { (window as any).__applyCameraZoom?.(); } catch {} this.registry.set('location', t('concourse.sign')); this.registry.set('locationType', 'concourse'); });
    this.events.on(Phaser.Scenes.Events.RESUME, () => { try { (window as any).__applyCameraZoom?.(); } catch {} this.registry.set('location', t('concourse.sign')); this.registry.set('locationType', 'concourse'); });
  }

  private spawnCrowd() {
    const group = this.physics.add.group(); // kept stub to preserve method structure
    this.crowd = this.crowd ?? group;
  }

  private ensureDoorIcons() {
    const make = (key: string, draw: (g: Phaser.GameObjects.Graphics) => void) => {
      if (this.textures.exists(key)) return;
      const g = this.add.graphics({ x: 0, y: 0, add: false });
      draw(g);
      g.generateTexture(key, 12, 12);
      g.destroy();
    };
    // Cosmetics: lipstick
    make('icon-cosmetics', (g) => {
      g.fillStyle(0xff6fae, 1); g.fillRect(6, 2, 2, 5);
      g.fillStyle(0x333333, 1); g.fillRect(5, 7, 4, 3);
    });
    // Liquor: bottle
    make('icon-liquor', (g) => {
      g.fillStyle(0x2e8b57, 1); g.fillRect(4, 3, 4, 6);
      g.fillStyle(0xcce8ff, 1); g.fillRect(5, 2, 2, 1);
    });
    // Snacks: box
    make('icon-snacks', (g) => {
      g.fillStyle(0xf4b183, 1); g.fillRect(3, 4, 6, 5);
      g.fillStyle(0xc55a11, 1); g.fillRect(3, 3, 6, 1);
    });
    // Tobacco: cigar
    make('icon-tobacco', (g) => {
      g.fillStyle(0x8d6e63, 1); g.fillRect(3, 5, 6, 2);
      g.fillStyle(0xff7043, 1); g.fillRect(8, 5, 1, 2);
    });
    // Perfume: bottle
    make('icon-perfume', (g) => {
      g.fillStyle(0x6fa8dc, 1); g.fillRect(4, 4, 4, 5);
      g.fillStyle(0x674ea7, 1); g.fillRect(5, 2, 2, 2);
    });
  }

  update(_time: number, delta: number) {
    const spr = this.player as unknown as Phaser.GameObjects.Sprite;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0);
    const baseSpeed = CONFIG.controls.baseSpeed;
    const runMul = CONFIG.controls.runMultiplier;
    const speed = (this.keys as any).SHIFT?.isDown ? Math.round(baseSpeed * runMul) : baseSpeed;
    if (this.cursors.left?.isDown || this.keys.A.isDown) body.setVelocityX(-speed);
    else if (this.cursors.right?.isDown || this.keys.D.isDown) body.setVelocityX(speed);
    if (this.cursors.up?.isDown || this.keys.W.isDown) body.setVelocityY(-speed);
    else if (this.cursors.down?.isDown || this.keys.S.isDown) body.setVelocityY(speed);
    // 動畫播放（方向）：down/up/side，side 以 flipX 控左右
    try {
      const moving = Math.abs(body.velocity.x) + Math.abs(body.velocity.y) > 0;
      const ax = body.velocity.x; const ay = body.velocity.y;
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
    updateCrowd(this, this.crowd);
    // 縮短名牌觸發距離，需更接近才顯示
    updateNameplates(this, this.crowd, this.player as any, 22);

    // Door interaction (multiple stores) + 名牌顯示（靠近才顯示）
    let nearest: { world: Phaser.Math.Vector2; id: string; label: string } | null = null;
    let nd = Number.POSITIVE_INFINITY;
    for (const d of this.doors) {
      const dd = Phaser.Math.Distance.Between(this.player.x, this.player.y, d.world.x, d.world.y);
      if (dd < nd) { nd = dd; nearest = d; }
    }
    // 顯示最近門的名牌（距離閾值內）
    const showDist = 22;
    const zoom = Math.max(0.0001, this.cameras.main.zoom || 1);
    const fsWorld = Math.max(8, Math.round(CONFIG.ui.fontSize / zoom));
    for (const d of this.doors) {
      let lbl = this.doorLabels.get(d.id);
      if (!lbl) {
        lbl = this.add.text(d.world.x, d.world.y - (fsWorld + 6), d.label, {
          fontSize: `${fsWorld}px`, color: '#243b53', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif'
        }).setOrigin(0.5, 1).setDepth(12).setVisible(false)
          .setStroke('#ffffff', 2);
        this.doorLabels.set(d.id, lbl);
      }
      // 僅顯示最近且在距離內的門名牌
      if (nearest && d.id === nearest.id && nd < showDist) {
        if ((lbl.style.fontSize as any) !== `${fsWorld}px`) lbl.setFontSize(fsWorld);
        try { lbl.setStroke('#ffffff', 2); } catch {}
        lbl.setPosition(d.world.x, d.world.y - (fsWorld + 6)).setText(d.label).setVisible(true);
      } else {
        lbl.setVisible(false);
      }
    }
    // 根據玩家位置更新地點（A 區 / 大廳 / B 區），以 y 軸判定
    const py = this.player.y;
    let zone = '大廳'; let ltype = 'concourse';
    if (py <= 3 * 16 + 8) { zone = 'A 區'; ltype = 'concourse-A'; }
    else if (py >= 7 * 16 + 8) { zone = 'B 區'; ltype = 'concourse-B'; }
    this.registry.set('location', zone);
    this.registry.set('locationType', ltype);

    if (nearest && nd < 18) {
      this.registry.set('hint', `${nearest.label}｜${t('concourse.hintEnter')}｜ESC 購物籃`);
      if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
        this.scene.pause();
        this.scene.launch('StoreScene', { storeId: nearest.id });
      }
      return;
    } else {
      this.registry.set('hint', `${t('concourse.hintMoveEnter')}｜ESC 購物籃`);
      return;
    }
  }
}





