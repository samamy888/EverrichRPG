import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../main';
import { createCrowd, updateCrowd, updateNameplates } from '../actors/NpcCrowd';
import { fetchTravelers } from '../api/travelers';
import { t } from '../i18n';

export class ConcourseScene extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: { [k: string]: Phaser.Input.Keyboard.Key };
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private layer!: Phaser.Tilemaps.TilemapLayer;
  private doors: { world: Phaser.Math.Vector2; id: string; label: string }[] = [];
  private crowd?: Phaser.Physics.Arcade.Group;

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
    // Multiple store facades along corridor
    const entries: { x: number; id: string; label: string }[] = [
      { x: 18, id: 'cosmetics', label: t('store.title.cosmetics') },
      { x: 35, id: 'liquor', label: t('store.title.liquor') },
      { x: 52, id: 'snacks', label: t('store.title.snacks') },
      { x: 69, id: 'tobacco', label: t('store.title.tobacco') },
      { x: 86, id: 'perfume', label: t('store.title.perfume') },
    ];
    for (const e of entries) {
      for (let y = 2; y <= 8; y++) this.layer.putTileAt(FACADE, e.x, y);
      for (let y = 3; y <= 7; y++) this.layer.putTileAt(GLASS, e.x, y);
      this.layer.putTileAt(DOOR, e.x, 5);
      const world = new Phaser.Math.Vector2(e.x * 16 + 8, 2 + 5 * 16 + 8);
      this.doors.push({ world, id: e.id, label: e.label });

      // Small icon signage near the door side
      const iconKey = `icon-${e.id}`;
      const icon = this.add.image(world.x + 10, world.y, iconKey).setOrigin(0, 0.5).setDepth(5);
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

    // Crowd NPCs（從名單隨機抽人）
    fetchTravelers().then((list) => {
      const pool = list.slice();
      const pick = (n: number) => { const out: any[] = []; for (let i=0;i<n && pool.length;i++){ out.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]); } return out; };
      const chosen = pick(8);
      this.crowd = createCrowd(this, {
        count: chosen.length,
        area: { xMin: 40, xMax: GAME_WIDTH * 2, yMin: 3 * 16 + 2 + 8, yMax: 8 * 16 + 2 + 8 },
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

    // Door interaction (multiple stores)
    let nearest: { world: Phaser.Math.Vector2; id: string; label: string } | null = null;
    let nd = Number.POSITIVE_INFINITY;
    for (const d of this.doors) {
      const dd = Phaser.Math.Distance.Between(this.player.x, this.player.y, d.world.x, d.world.y);
      if (dd < nd) { nd = dd; nearest = d; }
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





