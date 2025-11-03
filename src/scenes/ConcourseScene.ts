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
    // Generate a tiny tileset texture (6 tiles, 16x16 each)
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const colors = [0x1b2733, 0x2a3a4a, 0x203244, 0x345e6a, 0x497a84, 0x2e8b57];
    colors.forEach((c, i) => { g.fillStyle(c, 1); g.fillRect(i * 16, 0, 16, 16); });
    g.generateTexture('df-tiles', 16 * colors.length, 16);
    g.destroy();
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
    const WALK = base + 0, BORDER = base + 1, FACADE = base + 3, DOOR = base + 5;
    // Fill base walkway
    this.layer.fill(WALK, 0, 0, 20, 11);
    // Borders top/bottom
    this.layer.fill(BORDER, 0, 0, 20, 1);
    this.layer.fill(BORDER, 0, 10, 20, 1);
    // Store facade at right
    for (let y = 2; y <= 8; y++) this.layer.putTileAt(FACADE, 18, y);
    // Door position
    const doorTile = new Phaser.Math.Vector2(18, 5);
    this.layer.putTileAt(DOOR, doorTile.x, doorTile.y);
    this.doorWorld = new Phaser.Math.Vector2(doorTile.x * 16 + 8, 2 + doorTile.y * 16 + 8);

    // Collisions with borders/facade
    this.layer.setCollision([BORDER, FACADE], true);

    // Signage
    this.add.text(GAME_WIDTH - 112, 8, t('concourse.sign'), { fontSize: '10px', color: '#cce8ff' });

    // Player
    const p = this.add.rectangle(0, 0, 8, 12, 0xffcc66);
    this.physics.add.existing(p);
    this.player = p as unknown as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    this.player.body.setCollideWorldBounds(true);
    this.player.setPosition(24, GAME_HEIGHT / 2);

    // Collide with walls
    this.physics.add.collider(this.player, this.layer);

    // Crowd NPCs
    this.spawnCrowd();

    // Hint
    this.hint = this.add.text(6, 6, t('concourse.hintMoveEnter'), { fontSize: '10px', color: '#e6f0ff' });

    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.cameras.main.setRoundPixels(true);
  }

  private spawnCrowd() {
    const group = this.physics.add.group();
    for (let i = 0; i < 6; i++) {
      const yRow = Phaser.Math.Between(3, 8) * 16 + 2 + 8; // align to rows
      const x = Phaser.Math.Between(40, GAME_WIDTH - 60);
      const color = Phaser.Display.Color.HSLToColor(Phaser.Math.FloatBetween(0.05, 0.15), 0.4, 0.7).color;
      const npc = this.add.rectangle(x, yRow, 6, 10, color);
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
      this.hint.setText(t('concourse.hintEnter'));
      if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
        this.scene.pause();
        this.scene.launch('StoreScene', { storeId: 'cosmetics' });
      }
    } else {
      this.hint.setText(t('concourse.hintMoveEnter'));
    }

    // Countdown time
    const remaining = (this.registry.get('timeRemaining') as number) ?? 0;
    const next = Math.max(0, remaining - delta / 1000);
    if (Math.floor(next) !== Math.floor(remaining)) this.registry.set('timeRemaining', next);
  }
}
