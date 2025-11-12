import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../main';
import { CONFIG } from '../config';
import { getClient } from '../net/ws';
import { createCrowd, updateCrowd, updateNameplates } from '../actors/NpcCrowd';
import { fetchTravelers } from '../api/travelers';

type EnterData = { spawnX?: number; spawnY?: number };
type Door = { world: Phaser.Math.Vector2; label: string; to: 'up' | 'down' | 'store'; payload?: any };

// 桃園機場 2F 商場（Duty Free）
export class TaoyuanF2Scene extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: { [k: string]: Phaser.Input.Keyboard.Key };
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  public layer!: Phaser.Tilemaps.TilemapLayer;
  private doors: Door[] = [];
  private crowd?: Phaser.Physics.Arcade.Group;
  private lastMoveSent = 0;

  constructor() { super('TaoyuanF2Scene'); }

  preload() {
    if (!this.textures.exists('df-tiles')) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      const TILE = 16;
      const palette = { floorA: 0xeaf2f9, floorB: 0xdfeaf5, border: 0xbdcfe1, stripe: 0xb3d4f0, facade: 0xe4f1fa, glass: 0x8ad4ff, door: 0x8bc34a, light: 0xfff7cc } as const;
      g.fillStyle(palette.floorA, 1); g.fillRect(0 * TILE, 0, TILE, TILE);
      g.fillStyle(palette.floorB, 1); g.fillRect(1 * TILE, 0, TILE, TILE);
      g.fillStyle(0x000000, 0.15); for (let y = 2; y < TILE; y += 4) for (let x = 2; x < TILE; x += 4) g.fillRect(1 * TILE + x, y, 1, 1);
      g.fillStyle(palette.border, 1); g.fillRect(2 * TILE, 0, TILE, TILE);
      g.fillStyle(palette.floorA, 1); g.fillRect(3 * TILE, 0, TILE, TILE); g.fillStyle(palette.stripe, 1); g.fillRect(3 * TILE, TILE - 3, TILE, 2);
      g.fillStyle(palette.facade, 1); g.fillRect(4 * TILE, 0, TILE, TILE);
      g.fillStyle(palette.glass, 1); g.fillRect(5 * TILE, 2, TILE, TILE - 4); g.fillStyle(0xffffff, 0.25); g.fillRect(5 * TILE + 2, 2, 3, TILE - 4);
      g.fillStyle(palette.door, 1); g.fillRect(6 * TILE + 3, 2, TILE - 6, TILE - 4);
      g.fillStyle(palette.light, 1); g.fillRect(7 * TILE + 4, 2, 8, 4);
      g.generateTexture('df-tiles', TILE * 8, TILE); g.destroy();
    }
  }

  create(data: EnterData) {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,E,SHIFT') as any;

    const MAP_W = 100, MAP_H = 50;
    const map = this.make.tilemap({ width: MAP_W, height: MAP_H, tileWidth: 16, tileHeight: 16 });
    const tiles = map.addTilesetImage('df-tiles');
    this.layer = map.createBlankLayer('floor', tiles!, 0, 2);
    const base = (tiles as any).firstgid ?? 1;
    const FLOOR_A = base + 0, FLOOR_B = base + 1, BORDER = base + 2, STRIPE = base + 3, FACADE = base + 4, GLASS = base + 5, DOOR = base + 6, LIGHT = base + 7;

    // 中央長廊 + 左右店面窗牆
    for (let y = 8; y < map.height - 8; y++) for (let x = 2; x < map.width - 2; x++) this.layer.putTileAt(((x + y) % 2 === 0) ? FLOOR_A : FLOOR_B, x, y);
    // 上下邊框
    this.layer.fill(BORDER, 2, 7, map.width - 4, 1);
    this.layer.fill(BORDER, 2, map.height - 8, map.width - 4, 1);
    this.layer.fill(STRIPE, 2, map.height - 9, map.width - 4, 1);

    // 三個店門（示意，可接 StoreScene）
    const mkShop = (cx: number, cy: number) => { this.layer.putTileAt(FACADE, cx - 1, cy - 1); this.layer.putTileAt(GLASS, cx, cy - 1); this.layer.putTileAt(DOOR, cx, cy); };
    mkShop(30, 20); mkShop(70, 20); mkShop(50, 32);

    // 電梯/樓梯（上下樓）
    const downLift = new Phaser.Math.Vector2(10 * 16 + 8, 45 * 16 + 8);
    const upLift = new Phaser.Math.Vector2(10 * 16 + 8, 9 * 16 + 8);
    const downStair = new Phaser.Math.Vector2(90 * 16 + 8, 45 * 16 + 8);
    const upStair = new Phaser.Math.Vector2(90 * 16 + 8, 9 * 16 + 8);
    this.doors.push({ world: downLift, label: '電梯 下樓（1F）', to: 'down', payload: { to: 'TaoyuanF1Scene', spawnX: 10 * 16 + 8, spawnY: 34 * 16 + 8 } });
    this.doors.push({ world: downStair, label: '樓梯 下樓（1F）', to: 'down', payload: { to: 'TaoyuanF1Scene', spawnX: 70 * 16 + 8, spawnY: 34 * 16 + 8 } });
    this.doors.push({ world: upLift, label: '電梯 上樓（3F）', to: 'up', payload: { to: 'AirportScene', spawnX: 12 * 16 + 8, spawnY: 18 * 16 + 8 } });
    this.doors.push({ world: upStair, label: '樓梯 上樓（3F）', to: 'up', payload: { to: 'AirportScene', spawnX: 68 * 16 + 8, spawnY: 18 * 16 + 8 } });

    // 指示燈箱
    for (let x = 6; x <= 94; x += 7) this.layer.putTileAt(LIGHT, x, 12);

    // 玩家
    const px = typeof data?.spawnX === 'number' ? data!.spawnX : (GAME_WIDTH / 2);
    const py = typeof data?.spawnY === 'number' ? data!.spawnY : (GAME_HEIGHT / 2 + 40);
    const ps = this.add.rectangle(px, py, 8, 12, 0xebb35e) as any;
    (ps as any).setOrigin?.(0.5, 1).setDepth?.(100);
    this.physics.add.existing(ps as any);
    this.player = ps as any;
    try { (this.player.body as Phaser.Physics.Arcade.Body).setSize(10, 10).setOffset(3, 20).setCollideWorldBounds(true); } catch {}

    const worldW = map.width * 16; const worldH = map.height * 16 + 2;
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.physics.world.setBounds(0, 0, worldW, worldH);
    try { this.cameras.main.startFollow(this.player, true, 0.08, 0.08); } catch {}

    // 人潮較多
    fetchTravelers().then((list) => {
      const count = Phaser.Math.Between(14, 18);
      const group = createCrowd(this, {
        count,
        area: { xMin: 6 * 16, xMax: (map.width - 6) * 16, yMin: 10 * 16, yMax: (map.height - 10) * 16 },
        texture: 'sprite-npc',
        tint: 0xa8d1ff,
        layer: this.layer,
        collideWith: [this.player as any],
        speed: { vx: [-40, 40], vy: [-20, 20] },
        bounce: { x: 1, y: 1 },
        travelers: list.slice(0, count),
        texturesByGender: { default: 'sprite-npc' },
      });
      this.crowd = group;
    });
  }

  update() {
    if (!this.player) return;
    const pBody = (this.player.body as Phaser.Physics.Arcade.Body);
    const base = CONFIG.controls.baseSpeed;
    const run = CONFIG.controls.runMultiplier;
    const speed = (this.keys as any).SHIFT?.isDown ? Math.round(base * run) : base;
    pBody.setVelocity(0);
    if (this.cursors.left?.isDown || (this.keys as any).A.isDown) pBody.setVelocityX(-speed);
    else if (this.cursors.right?.isDown || (this.keys as any).D.isDown) pBody.setVelocityX(speed);
    if (this.cursors.up?.isDown || (this.keys as any).W.isDown) pBody.setVelocityY(-speed);
    else if (this.cursors.down?.isDown || (this.keys as any).S.isDown) pBody.setVelocityY(speed);

    if (this.crowd) updateCrowd(this, this.crowd);
    try { updateNameplates(this, this.crowd, this.player, 42, 0); } catch {}

    // 標題/提示
    this.registry.set('location', '2F 商場');
    this.registry.set('locationType', 'store');

    // 最近門＆互動
    let nearest: Door | null = null; let nd = 1e9;
    for (const d of this.doors) { const dx = d.world.x - this.player.x; const dy = d.world.y - this.player.y; const dd = Math.hypot(dx, dy); if (dd < nd) { nd = dd; nearest = d; } }
    if (nearest && nd < 18) {
      this.registry.set('hint', `${nearest.label}｜E 確認｜ESC 選單`);
      if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
        const pay = nearest.payload || {};
        if (nearest.to === 'down') this.scene.start(pay.to || 'TaoyuanF1Scene', { spawnX: pay.spawnX, spawnY: pay.spawnY });
        else if (nearest.to === 'up') this.scene.start(pay.to || 'AirportScene', { spawnX: pay.spawnX, spawnY: pay.spawnY });
      }
    } else {
      this.registry.set('hint', `WASD/方向鍵移動｜ESC 選單`);
    }

    // 位置上報（節流）
    const now = Date.now();
    if (now - this.lastMoveSent >= (CONFIG.network.moveIntervalMs || 120)) {
      try { getClient().sendMove(this.player.x, this.player.y, 'floor:2'); } catch {}
      this.lastMoveSent = now;
    }
  }
}

export default TaoyuanF2Scene;
