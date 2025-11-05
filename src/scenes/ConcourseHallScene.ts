import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../main';
import { createCrowd, updateCrowd, updateNameplates } from '../actors/NpcCrowd';
import { CONFIG } from '../config';
import { fetchTravelers } from '../api/travelers';
import { t } from '../i18n';

// 中央大廳場景：目前暫時沿用原 ConcourseScene 的配置，
// 後續可針對大廳專屬互動做細分（如銀行／昇恆昌等）。
type EnterData = { spawnX?: number; spawnY?: number };

export class ConcourseHallScene extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: { [k: string]: Phaser.Input.Keyboard.Key };
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  public layer!: Phaser.Tilemaps.TilemapLayer;
  private doors: { world: Phaser.Math.Vector2; id: string; label: string }[] = [];
  private crowd?: Phaser.Physics.Arcade.Group;
  private hubX!: number;
  private doorLabels: Map<string, Phaser.GameObjects.Text> = new Map();
  private spawn?: Phaser.Math.Vector2;

  constructor() { super('ConcourseHallScene'); }

  preload() {
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

  init(data: EnterData) {
    if (typeof data?.spawnX === 'number' && typeof data?.spawnY === 'number') {
      this.spawn = new Phaser.Math.Vector2(data.spawnX, data.spawnY);
    }
  }

  create() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,E,SHIFT') as any;

    const map = this.make.tilemap({ width: 32, height: 56, tileWidth: 16, tileHeight: 16 });
    this.hubX = Math.floor(map.width / 2);
    const tiles = map.addTilesetImage('df-tiles');
    this.layer = map.createBlankLayer('floor', tiles!, 0, 2);

    const base = (tiles as any).firstgid ?? 1;
    const FLOOR_A = base + 0, FLOOR_B = base + 1, BORDER = base + 2, STRIPE = base + 3, FACADE = base + 4, GLASS = base + 5, DOOR = base + 6, LIGHT = base + 7;

    for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) this.layer.putTileAt(((x + y) % 2 === 0) ? FLOOR_A : FLOOR_B, x, y);
    this.layer.fill(BORDER, 0, 0, map.width, 1);
    this.layer.fill(BORDER, 0, map.height - 1, map.width, 1);
    this.layer.fill(STRIPE, 0, map.height - 2, map.width, 1);
    for (let y = 2; y <= map.height - 4; y += 7) this.layer.putTileAt(LIGHT, this.hubX, y);
    // A/B 廳指示（世界內標示）
    const sA = t('concourse.signA'); const labelA = (sA === 'concourse.signA') ? 'A 廳' : sA;
    const signTop = this.add.text(this.hubX * 16, 2 * 16, labelA, { fontSize: `${Math.max(10, CONFIG.ui.fontSize)}px`, color: '#243b53', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' }).setOrigin(0.5, 0).setDepth(6);
    try { (signTop as any).setStroke?.('#ffffff', 2); } catch {}
    const sB = t('concourse.signB'); const labelB = (sB === 'concourse.signB') ? 'B 廳' : sB;
    const signBot = this.add.text(this.hubX * 16, map.height * 16 - 3 * 16, labelB, { fontSize: `${Math.max(10, CONFIG.ui.fontSize)}px`, color: '#243b53', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' }).setOrigin(0.5, 1).setDepth(6);
    try { (signBot as any).setStroke?.('#ffffff', 2); } catch {}

    this.ensureDoorIcons();
    const entries: { x: number; id: string; label: string; side: 'top' | 'bottom' }[] = [];
    for (const e of entries) {
      const facadeRow = e.side === 'top' ? 1 : 20; const glassRow = e.side === 'top' ? 2 : 19; const doorRow = glassRow;
      for (let cx = e.x - 1; cx <= e.x + 1; cx++) { this.layer.putTileAt(FACADE, cx, facadeRow); this.layer.putTileAt(GLASS, cx, glassRow); }
      this.layer.putTileAt(DOOR, e.x, doorRow);
      const world = new Phaser.Math.Vector2(e.x * 16 + 8, 2 + doorRow * 16 + 8); this.doors.push({ world, id: e.id, label: e.label });
      const x0 = (e.x - 1) * 16, y0 = 2 + Math.min(facadeRow, glassRow) * 16; this.add.graphics().lineStyle(1, 0x000000, 1).strokeRect(x0 + 0.5, y0 + 0.5, 3 * 16 - 1, 2 * 16 - 1).setDepth(6);
    }

    this.cameras.main.setBackgroundColor('#eef4fb');
    const idleKey = this.textures.exists('player_idle') ? 'player_idle' : undefined;
    const px = this.spawn?.x ?? GAME_WIDTH / 2;
    const py = this.spawn?.y ?? GAME_HEIGHT / 2;
    const ps = idleKey ? this.add.sprite(px, py, idleKey, 0).setOrigin(0.5, 1) : this.add.rectangle(px, py, 8, 12, 0xebb35e) as any;
    (ps as any).setDepth?.(100);
    this.physics.add.existing(ps as any);
    this.player = ps as any;
    const pBody = (this.player as any).body as Phaser.Physics.Arcade.Body;
    try { pBody.setSize(10, 10).setOffset(3, 20).setCollideWorldBounds(true); } catch {}
    try { (this.player as any).setData?.('facing', 'down'); (this.player as any).anims?.play?.('player-idle-down'); } catch {}

    const worldW = map.width * 16;
    const worldH = map.height * 16 + 2;
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.physics.world.setBounds(0, 0, worldW, worldH);
    try { this.cameras.main.startFollow(this.player, true, 0.08, 0.08); } catch {}

    fetchTravelers().then((list) => {
      const pool = list.slice();
      const out: any[] = [];
      for (let i = 0; i < 8 && pool.length; i++) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
      this.crowd = createCrowd(this, {
        count: out.length,
        area: { xMin: 16 * (this.hubX - 3), xMax: 16 * (this.hubX + 3), yMin: 2 * 16, yMax: (map.height - 2) * 16 },
        texture: 'sprite-npc',
        tint: 0x8fd3ff,
        layer: this.layer,
        collideWith: [this.player as any],
        speed: { vx: [-40, 40], vy: [-20, 20] },
        bounce: { x: 1, y: 1 },
        travelers: out,
        texturesByGender: { default: 'sprite-npc' },
      });
      // createCrowd 內已設定預設 depth，這裡不再額外遍歷
    });
  }

  private ensureDoorIcons() {
    if (this.textures.exists('icon-door')) return;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x222222, 1).fillRect(0, 0, 10, 10);
    g.fillStyle(0xffffff, 1).fillRect(2, 2, 6, 6);
    g.generateTexture('icon-door', 10, 10);
    g.destroy();
  }

  update() {
    if (!this.player) return;
    const pBody = (this.player as any).body as Phaser.Physics.Arcade.Body;
    const base = CONFIG.controls.baseSpeed;
    const run = CONFIG.controls.runMultiplier;
    const speed = (this.keys as any).SHIFT?.isDown ? Math.round(base * run) : base;
    pBody.setVelocity(0);
    if (this.cursors.left?.isDown || (this.keys as any).A.isDown) pBody.setVelocityX(-speed);
    else if (this.cursors.right?.isDown || (this.keys as any).D.isDown) pBody.setVelocityX(speed);
    if (this.cursors.up?.isDown || (this.keys as any).W.isDown) pBody.setVelocityY(-speed);
    else if (this.cursors.down?.isDown || (this.keys as any).S.isDown) pBody.setVelocityY(speed);

    // Player animations (walk/idle + facing)
    try {
      const spr: any = this.player as any;
      const ax = pBody.velocity.x, ay = pBody.velocity.y;
      const moving = Math.abs(ax) + Math.abs(ay) > 0;
      let facing: 'down' | 'up' | 'side' = (spr.getData?.('facing') as any) || 'down';
      let flipX = spr.flipX;
      if (moving) {
        if (Math.abs(ax) >= Math.abs(ay)) { facing = 'side'; flipX = ax < 0; }
        else { facing = ay < 0 ? 'up' : 'down'; }
        spr.setData?.('facing', facing);
        spr.setFlipX?.(facing === 'side' ? flipX : false);
        const key = (this.anims as any).exists?.(`player-walk-${facing}`) ? `player-walk-${facing}` : undefined;
        if (key) spr.anims.play(key, true); else spr.anims.stop();
      } else {
        const key = (this.anims as any).exists?.(`player-idle-${facing}`) ? `player-idle-${facing}` : undefined;
        spr.setFlipX?.(facing === 'side' ? flipX : false);
        if (key) spr.anims.play(key, true); else spr.anims.stop();
      }
    } catch {}

    if (this.crowd) updateCrowd(this, this.crowd as any);
    try { updateNameplates(this); } catch {}

    // 已移除邊界觸發的場景切換（Hall -> A / B）

    let nearest: { world: Phaser.Math.Vector2; id: string; label: string } | null = null; let nd = 1e9;
    for (const d of this.doors) { const dx = d.world.x - this.player.x; const dy = d.world.y - this.player.y; const dd = Math.hypot(dx, dy); if (dd < nd) { nd = dd; nearest = d; } }
    // 固定為大廳
    this.registry.set('location', '大廳');
    this.registry.set('locationType', 'concourse');

    if (nearest && nd < 18) { this.registry.set('hint', `${nearest.label}｜${t('concourse.hintEnter')}｜ESC 購物籃`); if (Phaser.Input.Keyboard.JustDown(this.keys.E)) { this.scene.pause(); this.scene.launch('StoreScene', { storeId: nearest.id, returnTo: this.scene.key }); } return; }
    else { this.registry.set('hint', `${t('concourse.hintMoveEnter')}｜ESC 購物籃`); return; }
  }
}
