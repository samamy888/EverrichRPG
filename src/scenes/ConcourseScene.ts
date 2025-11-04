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
  private doorLabels: Map<string, Phaser.GameObjects.Text> = new Map();

  constructor() { super('ConcourseScene'); }

  preload() {
    // Generate a nicer tiny tileset (8 tiles, 16x16): floor A/B, border, stripe, facade, glass, door, light
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const TILE = 16;
    const palette = {
      floorA: 0x1c2430,
      floorB: 0x1f2a38,
      border: 0x314150,
      stripe: 0x3b4d5f,
      facade: 0x24424e,
      glass: 0x3aa1bf,
      door: 0x2e8b57,
      light: 0xfff1b6,
      shadow: 0x0a0e12,
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
    // glass
    g.fillStyle(palette.glass, 1); g.fillRect(5 * TILE, 2, TILE, TILE - 4);
    g.fillStyle(0xffffff, 0.15); g.fillRect(5 * TILE + 2, 2, 3, TILE - 4);
    // door
    g.fillStyle(palette.door, 1); g.fillRect(6 * TILE + 3, 2, TILE - 6, TILE - 4);
    // light
    g.fillStyle(palette.shadow, 1); g.fillRect(7 * TILE, 0, TILE, TILE);
    g.fillStyle(palette.light, 1); g.fillRect(7 * TILE + 4, 2, 8, 4);
    g.generateTexture('df-tiles', TILE * 8, TILE);
    g.destroy();

    // Player/NPC tiny sprites
    const pg = this.make.graphics({ x: 0, y: 0, add: false });
    // player: body
    pg.fillStyle(0xebb35e, 1); pg.fillRect(2, 3, 4, 7); // torso
    pg.fillStyle(0x3a2a1a, 1); pg.fillRect(2, 10, 1, 2); pg.fillRect(5, 10, 1, 2); // shoes
    pg.fillStyle(0x5a3a2a, 1); pg.fillRect(2, 2, 4, 1); // hair band
    pg.generateTexture('sprite-player', 8, 12); pg.clear();
    // npc simple
    pg.fillStyle(0xaec6cf, 1); pg.fillRect(2, 3, 4, 7);
    pg.fillStyle(0x2a3a4a, 1); pg.fillRect(2, 10, 1, 2); pg.fillRect(5, 10, 1, 2);
    pg.generateTexture('sprite-npc', 8, 12); pg.destroy();
  }

  create() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,E') as any;

    // Build tilemap: 100x11 tiles (1600x176)
    const map = this.make.tilemap({ width: 100, height: 11, tileWidth: 16, tileHeight: 16 });
    const tiles = map.addTilesetImage('df-tiles');
    this.layer = map.createBlankLayer('floor', tiles!, 0, 2);

    // Tile indices (offset by tileset firstgid)
    const base = (tiles as any).firstgid ?? 1;
    const FLOOR_A = base + 0, FLOOR_B = base + 1, BORDER = base + 2, STRIPE = base + 3, FACADE = base + 4, GLASS = base + 5, DOOR = base + 6, LIGHT = base + 7;
    // Checker floor
    for (let y = 0; y < 11; y++) {
      for (let x = 0; x < 100; x++) {
        this.layer.putTileAt(((x + y) % 2 === 0) ? FLOOR_A : FLOOR_B, x, y);
      }
    }
    // Borders top/bottom and stripe
    this.layer.fill(BORDER, 0, 0, 100, 1);
    this.layer.fill(BORDER, 0, 10, 100, 1);
    this.layer.fill(STRIPE, 0, 9, 100, 1);
    // Ensure small icon textures for door signage
    this.ensureDoorIcons();
    // Multiple store facades along corridor（平行商店，中央走道給旅客走）
    // side: top/bottom，交錯配置；中央第 5 列為門口與走道
    const entries: { x: number; id: string; label: string; side: 'top' | 'bottom' }[] = [
      { x: 18, id: 'cosmetics', label: t('store.title.cosmetics'), side: 'top' },
      { x: 35, id: 'liquor',    label: t('store.title.liquor'),    side: 'bottom' },
      { x: 52, id: 'snacks',    label: t('store.title.snacks'),    side: 'top' },
      { x: 69, id: 'tobacco',   label: t('store.title.tobacco'),   side: 'bottom' },
      { x: 86, id: 'perfume',   label: t('store.title.perfume'),   side: 'top' },
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
    }
    // Light panels on top
    for (let x = 2; x <= 16; x += 7) this.layer.putTileAt(LIGHT, x, 1);
    // Doors created above

    // Collisions with borders/facade
    this.layer.setCollision([BORDER, FACADE], true);

    // Location status via global UIOverlay (right-top)
    this.registry.set('location', t('concourse.sign'));
    this.registry.set('locationType', 'concourse');

    // Player
    const p = this.add.image(0, 0, 'sprite-player');
    this.physics.add.existing(p);
    this.player = p as unknown as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    this.player.body.setCollideWorldBounds(true);
    // 主人公出生在大廳正中央
    this.player.setPosition(GAME_WIDTH / 2, GAME_HEIGHT / 2);

    // Collide with walls
    this.physics.add.collider(this.player, this.layer);

    // Crowd NPCs（從名單隨機抽人；只在中央走道活動）
    fetchTravelers().then((list) => {
      const pool = list.slice();
      const pick = (n: number) => { const out: any[] = []; for (let i=0;i<n && pool.length;i++){ out.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]); } return out; };
      const chosen = pick(8);
      this.crowd = createCrowd(this, {
        count: chosen.length,
        // 中央走道範圍：第 4~6 列（避開上下店面）
        area: { xMin: 40, xMax: GAME_WIDTH * 2, yMin: 4 * 16 + 2 + 4, yMax: 6 * 16 + 2 + 12 },
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
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0);
    const speed = 70;
    if (this.cursors.left?.isDown || this.keys.A.isDown) body.setVelocityX(-speed);
    else if (this.cursors.right?.isDown || this.keys.D.isDown) body.setVelocityX(speed);
    if (this.cursors.up?.isDown || this.keys.W.isDown) body.setVelocityY(-speed);
    else if (this.cursors.down?.isDown || this.keys.S.isDown) body.setVelocityY(speed);
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
          fontSize: `${fsWorld}px`, color: '#e6f0ff', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif'
        }).setOrigin(0.5, 1).setDepth(12).setVisible(false);
        this.doorLabels.set(d.id, lbl);
      }
      // 僅顯示最近且在距離內的門名牌
      if (nearest && d.id === nearest.id && nd < showDist) {
        if ((lbl.style.fontSize as any) !== `${fsWorld}px`) lbl.setFontSize(fsWorld);
        lbl.setPosition(d.world.x, d.world.y - (fsWorld + 6)).setText(d.label).setVisible(true);
      } else {
        lbl.setVisible(false);
      }
    }
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





