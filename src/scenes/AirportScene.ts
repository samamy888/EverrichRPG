import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../main';
import { CONFIG } from '../config';
import { t } from '../i18n';
import { createCrowd, updateCrowd, updateNameplates } from '../actors/NpcCrowd';

type Door = { world: Phaser.Math.Vector2; id: string; label: string };

export class AirportScene extends Phaser.Scene {
  private doorLabels: Map<string, Phaser.GameObjects.Text> = new Map();
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: { [k: string]: Phaser.Input.Keyboard.Key };
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  public layer!: Phaser.Tilemaps.TilemapLayer;
  private doors: Door[] = [];
  private crowd?: Phaser.Physics.Arcade.Group;
  private crowds: Phaser.Physics.Arcade.Group[] = [];
  private hubX!: number;

  // Layout (tiles)
  private MAP_W = 120; // 稍微加寬全域，讓 A/B 更寬敞
  private A_H = 20;    // A 區高度略增
  private H_H = 40;    // 大廳高度（縮短以讓直廊更短）
  private B_H = 20;    // B 區高度略增

  constructor() { super('AirportScene'); }

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

  create() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,E,SHIFT') as any;

    const MAP_H = this.A_H + this.H_H + this.B_H;
    const map = this.make.tilemap({ width: this.MAP_W, height: MAP_H, tileWidth: 16, tileHeight: 16 });
    this.hubX = Math.floor(map.width / 2);
    const tiles = map.addTilesetImage('df-tiles');
    this.layer = map.createBlankLayer('floor', tiles!, 0, 2);
    const base = (tiles as any).firstgid ?? 1;
    const FLOOR_A = base + 0, FLOOR_B = base + 1, BORDER = base + 2, STRIPE = base + 3, FACADE = base + 4, GLASS = base + 5, DOOR = base + 6, LIGHT = base + 7;

    // Fill blocked (facade) then carve open areas with floor tiles
    this.layer.fill(FACADE, 0, 0, map.width, map.height);
    const putFloor = (x0: number, y0: number, w: number, h: number) => {
      for (let y = y0; y < y0 + h; y++) {
        for (let x = x0; x < x0 + w; x++) this.layer.putTileAt(((x + y) % 2 === 0) ? FLOOR_A : FLOOR_B, x, y);
      }
    };

    const A_Y0 = 0, A_Y1 = this.A_H - 1;
    const H_Y0 = this.A_H, H_Y1 = this.A_H + this.H_H - 1;
    const B_Y0 = this.A_H + this.H_H, B_Y1 = MAP_H - 1;

    // A: horizontal-T (top band) + stem via central corridor
    const A_BAND_H = 10; // 橫向走廊加厚（A/B 區走道更寬）
    putFloor(0, A_Y0 + 2, map.width, A_BAND_H);
    // H: square (roughly) in center
    // 大廳改為直向長方形（高度 > 寬度）
    const H_W = Math.min(map.width - 8, Math.max(12, Math.floor(this.H_H / 2)));
    const hallX0 = Math.max(0, Math.floor(this.hubX - Math.floor(H_W / 2)));
    putFloor(hallX0, H_Y0 + 2, H_W, this.H_H - 4);
    // Central vertical corridor (connect A-H-B)
    const STEM_W = 7; // 中央走道加寬
    // 將直向走廊縮短為只覆蓋大廳，並各向上/下延伸少量以銜接 A/B 走廊
    // 縮短直廊：只在 A/B 橫廊邊界各重疊一列，仍連通
    const topRow = A_Y0 + 2;
const bottomRow = B_Y1 - (2 + (A_BAND_H - 1));
const hallTop = H_Y0 + 2;
const hallBot = H_Y1 - 2;
const stemY0a = topRow;
const stemHa = Math.max(1, hallTop - topRow + 1);
putFloor(this.hubX - Math.floor(STEM_W / 2), stemY0a, STEM_W, stemHa);
const stemY0b = hallBot;
const stemHb = Math.max(1, bottomRow - hallBot + 1);
putFloor(this.hubX - Math.floor(STEM_W / 2), stemY0b, STEM_W, stemHb);
    // B: inverse-T bottom band
    putFloor(0, B_Y1 - (2 + (A_BAND_H - 1)), map.width, A_BAND_H);

    // Borders & lights (cosmetic)
    this.layer.fill(BORDER, 0, 0, map.width, 1);
    this.layer.fill(BORDER, 0, map.height - 1, map.width, 1);
    this.layer.fill(STRIPE, 0, map.height - 2, map.width, 1);
    for (let y = H_Y0 + 3; y <= H_Y1 - 3; y += 6) this.layer.putTileAt(LIGHT, this.hubX, y);

    // 單一外框：沿著 walkable 與非 walkable 的邊界繪製，不重疊
    const isWalkable = (x: number, y: number): boolean => {
      const t = this.layer.getTileAt(x, y);
      if (!t) return false;
      const idx = t.index;
      return idx === FLOOR_A || idx === FLOOR_B || idx === DOOR;
    };
    const og = this.add.graphics().setDepth(6);
    og.lineStyle(1, 0x4a5668, 1);
    og.beginPath();
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        if (!isWalkable(x, y)) continue;
        const px = x * 16; const py = 2 + y * 16;
        // left edge
        if (!isWalkable(x - 1, y)) { og.moveTo(px + 0.5, py + 0.5); og.lineTo(px + 0.5, py + 16 - 0.5); }
        // right edge
        if (!isWalkable(x + 1, y)) { og.moveTo(px + 16 - 0.5, py + 0.5); og.lineTo(px + 16 - 0.5, py + 16 - 0.5); }
        // top edge
        if (!isWalkable(x, y - 1)) { og.moveTo(px + 0.5, py + 0.5); og.lineTo(px + 16 - 0.5, py + 0.5); }
        // bottom edge
        if (!isWalkable(x, y + 1)) { og.moveTo(px + 0.5, py + 16 - 0.5); og.lineTo(px + 16 - 0.5, py + 16 - 0.5); }
      }
    }
    og.strokePath();

    // Doors: A side (top band) and B side (bottom band)
    const doorA = [14, 28, 42, 96, 110];
    const doorB = [18, 32, 46, 100, 114];
    const addDoor = (cx: number, row: number, id: string, label: string) => {
      this.layer.putTileAt(DOOR, cx, row);
      const world = new Phaser.Math.Vector2(cx * 16 + 8, 2 + row * 16 + 8);
      this.doors.push({ world, id, label });
      const x0 = (cx - 1) * 16, y0 = 2 + (row - 1) * 16; this.add.graphics().lineStyle(1, 0x000000, 1).strokeRect(x0 + 0.5, y0 + 0.5, 3 * 16 - 1, 2 * 16 - 1).setDepth(6);
    };
    const A_DOOR_ROW = A_Y0 + 2 + Math.floor(A_BAND_H / 2);
    const kindsA = ['cosmetics','liquor','snacks','electronics','fashion'];
    doorA.forEach((x, idx) => {
      const id = kindsA[idx % kindsA.length];
      addDoor(x, A_DOOR_ROW, id, t('store.title.' + id));
    });
    const B_DOOR_ROW = B_Y1 - (2 + Math.floor(A_BAND_H / 2));
    const kindsB = ['books','tobacco','perfume','souvenirs','food'];
    doorB.forEach((x, idx) => {
      const id = kindsB[idx % kindsB.length];
      addDoor(x, B_DOOR_ROW, id, t('store.title.' + id));
    });

    // Collisions: block FACADE; allow movement on floor tiles
    this.layer.setCollision([FACADE, BORDER, STRIPE, GLASS, LIGHT], true);

    // Player
    const idleKey = this.textures.exists('player_idle') ? 'player_idle' : undefined;
    const spawnX = this.hubX * 16;
    const spawnY = Math.floor((H_Y0 + H_Y1) / 2) * 16 + 8;
    const ps = idleKey ? this.add.sprite(spawnX, spawnY, idleKey, 0).setOrigin(0.5, 1) : this.add.rectangle(spawnX, spawnY, 8, 12, 0xebb35e) as any;
    (ps as any).setDepth?.(100);
    this.physics.add.existing(ps as any);
    this.player = ps as any;
    const pBody = (this.player as any).body as Phaser.Physics.Arcade.Body;
    try { pBody.setSize(10, 10).setOffset(3, 20).setCollideWorldBounds(true); } catch {}
    try { (this.player as any).setData?.('facing', 'down'); (this.player as any).anims?.play?.('player-idle-down'); } catch {}
    // Collide player with blocked tiles
    try { this.physics.add.collider(this.player, this.layer); } catch {}

    // World and camera
    const worldW = map.width * 16; const worldH = map.height * 16 + 2;
    this.cameras.main.setBackgroundColor('#eef4fb');
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.physics.world.setBounds(0, 0, worldW, worldH);
    try { this.cameras.main.startFollow(this.player, true, 0.08, 0.08); } catch {}

    // Crowds in A / Hall / B (even distribution)
    this.time.delayedCall(0, () => {
      import('../api/travelers')
        .then(({ fetchTravelers }) => fetchTravelers())
        .then((list) => {
          const pool = list.slice();
          const take = (n: number) => {
            const arr: any[] = [];
            for (let i = 0; i < n && pool.length; i++) arr.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
            return arr;
          };
          const cc = (CONFIG as any)?.npc?.crowdCounts || { a: 6, hall: 8, b: 6 };
          const hallTrav = take(Math.max(0, Number(cc.hall) || 0));
          const aTrav = take(Math.max(0, Number(cc.a) || 0));
          const bTrav = take(Math.max(0, Number(cc.b) || 0));

          const add = (count: number, area: { xMin: number; xMax: number; yMin: number; yMax: number }, travelers: any[]) => {
            const g = createCrowd(this, {
              count,
              area,
              layer: this.layer,
              collideWith: [this.player as any],
              speed: { vx: [-40, 40], vy: [-20, 20] },
              bounce: { x: 1, y: 1 },
              travelers,
              texturesByGender: { default: 'sprite-npc' },
            });
            this.crowds.push(g);
          };

          // Hall area (central rectangle)
          add(hallTrav.length, {
            xMin: hallX0 * 16,
            xMax: (hallX0 + H_W) * 16,
            yMin: (H_Y0 + 2) * 16,
            yMax: (H_Y1 - 2) * 16,
          }, hallTrav);

          // A corridor (top band)
          add(aTrav.length, {
            xMin: 16 * 2,
            xMax: 16 * (map.width - 2),
            yMin: (A_Y0 + 2) * 16,
            yMax: (A_Y0 + 2 + A_BAND_H - 1) * 16,
          }, aTrav);

          // B corridor (bottom band)
          add(bTrav.length, {
            xMin: 16 * 2,
            xMax: 16 * (map.width - 2),
            yMin: (B_Y1 - (2 + (A_BAND_H - 1))) * 16,
            yMax: (B_Y1 - (2)) * 16,
          }, bTrav);
        })
        .catch(() => {});
    });
  }

  update() {
    if (!this.player) return;
    const pBody = (this.player as any).body as Phaser.Physics.Arcade.Body;
    const base = CONFIG.controls.baseSpeed; const run = CONFIG.controls.runMultiplier;
    const speed = (this.keys as any).SHIFT?.isDown ? Math.round(base * run) : base;
    pBody.setVelocity(0);
    if (this.cursors.left?.isDown || (this.keys as any).A.isDown) pBody.setVelocityX(-speed);
    else if (this.cursors.right?.isDown || (this.keys as any).D.isDown) pBody.setVelocityX(speed);
    if (this.cursors.up?.isDown || (this.keys as any).W.isDown) pBody.setVelocityY(-speed);
    else if (this.cursors.down?.isDown || (this.keys as any).S.isDown) pBody.setVelocityY(speed);

    // Player anims
    try {
      const spr: any = this.player as any;
      const ax = pBody.velocity.x, ay = pBody.velocity.y; const moving = Math.abs(ax) + Math.abs(ay) > 0;
      let facing: 'down' | 'up' | 'side' = (spr.getData?.('facing') as any) || 'down'; let flipX = spr.flipX;
      if (moving) {
        if (Math.abs(ax) >= Math.abs(ay)) { facing = 'side'; flipX = ax < 0; }
        else { facing = ay < 0 ? 'up' : 'down'; }
        spr.setData?.('facing', facing); spr.setFlipX?.(facing === 'side' ? flipX : false);
        const key = (this.anims as any).exists?.(`player-walk-${facing}`) ? `player-walk-${facing}` : undefined; if (key) spr.anims.play(key, true); else spr.anims.stop();
      } else {
        const key = (this.anims as any).exists?.(`player-idle-${facing}`) ? `player-idle-${facing}` : undefined; spr.setFlipX?.(facing === 'side' ? flipX : false); if (key) spr.anims.play(key, true); else spr.anims.stop();
      }
    } catch {}

    if (this.crowd) updateCrowd(this, this.crowd as any);
    try { if (this.crowds && this.crowds.length) this.crowds.forEach(g => updateCrowd(this, g)); } catch {}
    try {
      updateNameplates(this, this.crowd as any, { x: this.player.x, y: this.player.y }, 42, 0);
      if (this.crowds && this.crowds.length) this.crowds.forEach(g => updateNameplates(this, g as any, { x: this.player.x, y: this.player.y }, 42, 0));
    } catch {}

    // Location bands (A / Hall / B)
    const y = this.player.y;
    const A_END = this.A_H * 16; const H_END = (this.A_H + this.H_H) * 16;
    if (y < A_END) { this.registry.set('location', 'A 區'); this.registry.set('locationType', 'concourse-A'); }
    else if (y < H_END) { this.registry.set('location', '大廳'); this.registry.set('locationType', 'concourse'); }
    else { this.registry.set('location', 'B 區'); this.registry.set('locationType', 'concourse-B'); }

    // Enter nearest door
    let nearest: Door | null = null; let nd = 1e9;
    for (const d of this.doors) { const dx = d.world.x - this.player.x, dy = d.world.y - this.player.y; const dd = Math.hypot(dx, dy); if (dd < nd) { nd = dd; nearest = d; } }
    // Door labels + hint
try {
  const cam = (this.cameras as any)?.main as any;
  const zoom = Math.max(0.0001, cam?.zoom || 1);
  const fsWorld = Math.max(8, Math.round(CONFIG.ui.fontSize / zoom));
  const showDist = 22;
  for (const d of this.doors) {
    let lbl = this.doorLabels.get(d.id);
    if (!lbl) {
      lbl = this.add.text(d.world.x, d.world.y - (fsWorld + 6), d.label, { fontSize: `${fsWorld}px`, color: '#243b53', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' }).setOrigin(0.5, 1).setDepth(12).setVisible(false);
      try { lbl.setStroke('#ffffff', 2); } catch {}
      this.doorLabels.set(d.id, lbl);
    }
    if (nearest && d.id === nearest.id && nd < showDist) {
      if ((lbl.style.fontSize as any) !== `${fsWorld}px`) lbl.setFontSize(fsWorld);
      lbl.setPosition(d.world.x, d.world.y - (fsWorld + 6)).setText(d.label).setVisible(true);
    } else {
      lbl.setVisible(false);
    }
  }
} catch {}
if (nearest && nd < 22) {
  this.registry.set('hint', nearest.label + ' | ' + t('concourse.hintEnter') + ' | ESC 購物籃');
  if (Phaser.Input.Keyboard.JustDown(this.keys.E)) { this.scene.pause(); this.scene.launch('StoreScene', { storeId: nearest.id, returnTo: this.scene.key }); return; }
} else {
  this.registry.set('hint', t('concourse.hintMoveEnter') + ' | ESC 購物籃');
}
  }
}





