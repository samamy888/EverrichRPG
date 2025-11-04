import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../main';
import { t } from '../i18n';

export class ConcourseScene extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: { [k: string]: Phaser.Input.Keyboard.Key };
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private layer!: Phaser.Tilemaps.TilemapLayer;
  private doorCosmetics!: Phaser.Math.Vector2;
  private doorLiquor!: Phaser.Math.Vector2;

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

    // Build tilemap: 20x11 tiles (320x176)
    const map = this.make.tilemap({ width: 20, height: 11, tileWidth: 16, tileHeight: 16 });
    const tiles = map.addTilesetImage('df-tiles');
    this.layer = map.createBlankLayer('floor', tiles!, 0, 2);

    // Tile indices (offset by tileset firstgid)
    const base = (tiles as any).firstgid ?? 1;
    const FLOOR_A = base + 0, FLOOR_B = base + 1, BORDER = base + 2, STRIPE = base + 3, FACADE = base + 4, GLASS = base + 5, DOOR = base + 6, LIGHT = base + 7;
    // Checker floor
    for (let y = 0; y < 11; y++) {
      for (let x = 0; x < 20; x++) {
        this.layer.putTileAt(((x + y) % 2 === 0) ? FLOOR_A : FLOOR_B, x, y);
      }
    }
    // Borders top/bottom and stripe
    this.layer.fill(BORDER, 0, 0, 20, 1);
    this.layer.fill(BORDER, 0, 10, 20, 1);
    this.layer.fill(STRIPE, 0, 9, 20, 1);
    // Store facades (right: cosmetics, left: liquor)
    for (let y = 2; y <= 8; y++) this.layer.putTileAt(FACADE, 18, y);
    for (let y = 3; y <= 7; y++) this.layer.putTileAt(GLASS, 18, y);
    for (let y = 2; y <= 8; y++) this.layer.putTileAt(FACADE, 1, y);
    for (let y = 3; y <= 7; y++) this.layer.putTileAt(GLASS, 1, y);
    // Light panels on top
    for (let x = 2; x <= 16; x += 7) this.layer.putTileAt(LIGHT, x, 1);
    // Door positions (right = cosmetics, left = liquor)
    const doorCosTile = new Phaser.Math.Vector2(18, 5);
    const doorLiqTile = new Phaser.Math.Vector2(1, 5);
    this.layer.putTileAt(DOOR, doorCosTile.x, doorCosTile.y);
    this.layer.putTileAt(DOOR, doorLiqTile.x, doorLiqTile.y);
    this.doorCosmetics = new Phaser.Math.Vector2(doorCosTile.x * 16 + 8, 2 + doorCosTile.y * 16 + 8);
    this.doorLiquor = new Phaser.Math.Vector2(doorLiqTile.x * 16 + 8, 2 + doorLiqTile.y * 16 + 8);

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

    // Crowd NPCs
    this.spawnCrowd();

    // 初始提示交由全域 UIOverlay 顯示
    this.registry.set('hint', t('concourse.hintMoveEnter'));

    // 物理世界使用設計解析度，視圖大小由相機 zoom 控制
    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.cameras.main.setRoundPixels(true);
    // 重新套用全域相機縮放於喚醒/恢復時
    this.events.on(Phaser.Scenes.Events.WAKE, () => { try { (window as any).__applyCameraZoom?.(); } catch {} this.registry.set('location', t('concourse.sign')); this.registry.set('locationType', 'concourse'); });
    this.events.on(Phaser.Scenes.Events.RESUME, () => { try { (window as any).__applyCameraZoom?.(); } catch {} this.registry.set('location', t('concourse.sign')); this.registry.set('locationType', 'concourse'); });
  }

  private spawnCrowd() {
    const group = this.physics.add.group();
    for (let i = 0; i < 6; i++) {
      const yRow = Phaser.Math.Between(3, 8) * 16 + 2 + 8; // align to rows
      const x = Phaser.Math.Between(40, GAME_WIDTH - 60);
      const npc = this.add.image(x, yRow, 'sprite-npc');
      group.add(npc);
      this.physics.add.existing(npc);
      const body = (npc.body as Phaser.Physics.Arcade.Body);
      body.setCollideWorldBounds(true);
      body.setVelocityX(Phaser.Math.Between(-40, 40) || 30);
      body.setBounce(1, 0);
    }
    this.physics.add.collider(group, this.layer);
  }

  update(_time: number, delta: number) {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0);
    const speed = 70;
    if (this.cursors.left?.isDown || this.keys.A.isDown) body.setVelocityX(-speed);
    else if (this.cursors.right?.isDown || this.keys.D.isDown) body.setVelocityX(speed);
    if (this.cursors.up?.isDown || this.keys.W.isDown) body.setVelocityY(-speed);
    else if (this.cursors.down?.isDown || this.keys.S.isDown) body.setVelocityY(speed);

    // Door interaction (two stores)
    const distCos = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.doorCosmetics.x, this.doorCosmetics.y);
    const distLiq = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.doorLiquor.x, this.doorLiquor.y);
    if (distCos < 18 || distLiq < 18) {
      this.registry.set('hint', t('concourse.hintEnter'));
      if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
        const target: 'cosmetics' | 'liquor' = distCos <= distLiq ? 'cosmetics' : 'liquor';
        this.scene.pause();
        this.scene.launch('StoreScene', { storeId: target });
      }
    } else {
      this.registry.set('hint', t('concourse.hintMoveEnter'));
    }

    // Countdown time
    const remaining = (this.registry.get('timeRemaining') as number) ?? 0;
    const next = Math.max(0, remaining - delta / 1000);
    if (Math.floor(next) !== Math.floor(remaining)) this.registry.set('timeRemaining', next);
  }
}



