import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../main';
import { t } from '../i18n';

export class ConcourseScene extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: { [k: string]: Phaser.Input.Keyboard.Key };
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private hint!: Phaser.GameObjects.Text;
  private layer!: Phaser.Tilemaps.TilemapLayer;
  private doorWorld!: Phaser.Math.Vector2;

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
    // Store facade and glass
    for (let y = 2; y <= 8; y++) this.layer.putTileAt(FACADE, 18, y);
    for (let y = 3; y <= 7; y++) this.layer.putTileAt(GLASS, 18, y);
    // Light panels on top
    for (let x = 2; x <= 16; x += 7) this.layer.putTileAt(LIGHT, x, 1);
    // Door position
    const doorTile = new Phaser.Math.Vector2(18, 5);
    this.layer.putTileAt(DOOR, doorTile.x, doorTile.y);
    this.doorWorld = new Phaser.Math.Vector2(doorTile.x * 16 + 8, 2 + doorTile.y * 16 + 8);

    // Collisions with borders/facade
    this.layer.setCollision([BORDER, FACADE], true);

    // Signage
    const hasHanBitmap = this.cache.bitmapFont.exists('han');
    const hasHanWeb = (document as any).fonts?.check?.('12px HanPixel') === true;
    const hasHan = hasHanBitmap || hasHanWeb;
    if (hasHanBitmap) this.add.bitmapText(GAME_WIDTH - 112, 4, 'han', t('concourse.sign'), 12).setTint(0xcce8ff);
    else this.add.text(GAME_WIDTH - 112, 8, t('concourse.sign'), { fontSize: '12px', color: '#cce8ff', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' });

    // Player
    const p = this.add.image(0, 0, 'sprite-player');
    this.physics.add.existing(p);
    this.player = p as unknown as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    this.player.body.setCollideWorldBounds(true);
    this.player.setPosition(24, GAME_HEIGHT / 2);

    // Collide with walls
    this.physics.add.collider(this.player, this.layer);

    // Crowd NPCs
    this.spawnCrowd();

    // Hint
    this.hint = hasHanBitmap
      ? (this.add.bitmapText(6, 4, 'han', t('concourse.hintMoveEnter'), 12).setTint(0xe6f0ff) as any)
      : this.add.text(6, 6, t('concourse.hintMoveEnter'), { fontSize: '12px', color: '#e6f0ff', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' });

    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.cameras.main.setRoundPixels(true);
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

    // Door interaction
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.doorWorld.x, this.doorWorld.y);
    if (dist < 18) {
      (this.hint as any).setText(t('concourse.hintEnter'));
      if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
        this.scene.pause();
        this.scene.launch('StoreScene', { storeId: 'cosmetics' });
      }
    } else {
      (this.hint as any).setText(t('concourse.hintMoveEnter'));
    }

    // Countdown time
    const remaining = (this.registry.get('timeRemaining') as number) ?? 0;
    const next = Math.max(0, remaining - delta / 1000);
    if (Math.floor(next) !== Math.floor(remaining)) this.registry.set('timeRemaining', next);
  }
}
