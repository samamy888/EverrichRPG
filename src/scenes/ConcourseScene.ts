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
  public layer!: Phaser.Tilemaps.TilemapLayer;
  private doors: { world: Phaser.Math.Vector2; id: string; label: string }[] = [];
  private crowd?: Phaser.Physics.Arcade.Group;
  private hubX!: number; // 中央大廳（豎走道）X（tile）
  private doorLabels: Map<string, Phaser.GameObjects.Text> = new Map();

  constructor() { super('ConcourseScene'); }

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

  create() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,E,SHIFT') as any;

    // 擴高：工字形（上=A 區，中央=大廳豎走道，下=B 區）
    const map = this.make.tilemap({ width: 140, height: 22, tileWidth: 16, tileHeight: 16 });
    this.hubX = Math.floor(map.width / 2);
    const tiles = map.addTilesetImage('df-tiles');
    this.layer = map.createBlankLayer('floor', tiles!, 0, 2);

    const base = (tiles as any).firstgid ?? 1;
    const FLOOR_A = base + 0, FLOOR_B = base + 1, BORDER = base + 2, STRIPE = base + 3, FACADE = base + 4, GLASS = base + 5, DOOR = base + 6, LIGHT = base + 7;

    // 全域地板
    for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) this.layer.putTileAt(((x + y) % 2 === 0) ? FLOOR_A : FLOOR_B, x, y);
    // 上下邊界與上方燈帶
    this.layer.fill(BORDER, 0, 0, map.width, 1);
    this.layer.fill(BORDER, 0, map.height - 1, map.width, 1);
    this.layer.fill(STRIPE, 0, map.height - 2, map.width, 1);
    for (let x = 2; x <= map.width - 4; x += 7) this.layer.putTileAt(LIGHT, x, 1);

    // 門面與門
    this.ensureDoorIcons();
    const entries: { x: number; id: string; label: string; side: 'top' | 'bottom' }[] = [
      { x: 14, id: 'cosmetics', label: t('store.title.cosmetics'), side: 'top' },
      { x: 28, id: 'liquor', label: t('store.title.liquor'), side: 'top' },
      { x: 42, id: 'snacks', label: t('store.title.snacks'), side: 'top' },
      { x: 96, id: 'electronics', label: t('store.title.electronics'), side: 'top' },
      { x: 110, id: 'fashion', label: t('store.title.fashion'), side: 'top' },
      { x: 18, id: 'books', label: t('store.title.books'), side: 'bottom' },
      { x: 32, id: 'tobacco', label: t('store.title.tobacco'), side: 'bottom' },
      { x: 46, id: 'perfume', label: t('store.title.perfume'), side: 'bottom' },
      { x: 100, id: 'souvenirs', label: t('store.title.souvenirs'), side: 'bottom' },
      { x: 114, id: 'food', label: t('store.title.food'), side: 'bottom' },
    ];
    for (const e of entries) {
      const facadeRow = e.side === 'top' ? 1 : 20; const glassRow = e.side === 'top' ? 2 : 19; const doorRow = glassRow;
      for (let cx = e.x - 1; cx <= e.x + 1; cx++) { this.layer.putTileAt(FACADE, cx, facadeRow); this.layer.putTileAt(GLASS, cx, glassRow); }
      this.layer.putTileAt(DOOR, e.x, doorRow);
      const world = new Phaser.Math.Vector2(e.x * 16 + 8, 2 + doorRow * 16 + 8); this.doors.push({ world, id: e.id, label: e.label });
      const x0 = (e.x - 1) * 16, y0 = 2 + Math.min(facadeRow, glassRow) * 16; this.add.graphics().lineStyle(1, 0x000000, 1).strokeRect(x0 + 0.5, y0 + 0.5, 3 * 16 - 1, 2 * 16 - 1).setDepth(6);
    }

    // 中央安檢線（視覺）
    for (let y = Math.floor(map.height / 2) - 1; y <= Math.floor(map.height / 2) + 1; y++) this.layer.putTileAt(STRIPE, this.hubX, y);

    // 初始地點
    this.registry.set('location', t('concourse.sign')); this.registry.set('locationType', 'concourse');

    // 玩家
    const idleKey = this.textures.exists('player_idle') ? 'player_idle' : 'sprite-player';
    const ps = this.add.sprite(0, 0, idleKey, 0).setOrigin(0.5, 1).setDepth(100);
    this.physics.add.existing(ps); this.player = ps as any; this.player.body.setCollideWorldBounds(true);
    try { const frame: any = (ps as any).frame; const fw = Number(frame?.width ?? 32), fh = Number(frame?.height ?? 32); const bw = Math.max(6, Math.round(fw * 0.35)); const bh = Math.max(4, Math.round(fh * 0.25)); const offX = Math.round((fw - bw) / 2), offY = Math.round(fh - bh - fh * 0.06); (this.player.body as any).setSize(bw, bh).setOffset(offX, offY); } catch {}
    this.player.setPosition(GAME_WIDTH / 2, GAME_HEIGHT / 2);

    // 物理/相機
    this.layer.setCollision([BORDER, FACADE], true); this.physics.world.setBounds(0, 0, map.width * 16, map.height * 16);
    this.cameras.main.setRoundPixels(true); this.cameras.main.startFollow(this.player, true, 1, 1);

    // 人群：中央豎走道
    fetchTravelers().then((list) => {
      const pool = list.slice(); const pick = (n: number) => { const out: any[] = []; for (let i = 0; i < n && pool.length; i++) out.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]); return out; };
      const chosen = pick(10);
      this.crowd = createCrowd(this, { count: chosen.length, area: { xMin: this.hubX * 16 - 24, xMax: this.hubX * 16 + 24, yMin: 4 * 16, yMax: 18 * 16 }, texture: 'sprite-npc', tint: 0xffffff, layer: this.layer, collideWith: [this.player as any], speed: { vx: [-40, 40], vy: [-10, 10] }, bounce: { x: 1, y: 1 }, travelers: chosen, texturesByGender: { default: 'sprite-npc' } });
    });
  }

  private ensureDoorIcons() {
    const make = (key: string, draw: (g: Phaser.GameObjects.Graphics) => void) => { if (this.textures.exists(key)) return; const g = this.add.graphics({ x: 0, y: 0, add: false }); draw(g); g.generateTexture(key, 12, 12); g.destroy(); };
    make('icon-cosmetics', (g) => { g.fillStyle(0xff6fae, 1); g.fillRect(6, 2, 2, 5); g.fillStyle(0x333333, 1); g.fillRect(5, 7, 4, 3); });
    make('icon-liquor', (g) => { g.fillStyle(0x2e8b57, 1); g.fillRect(4, 3, 4, 6); g.fillStyle(0xcce8ff, 1); g.fillRect(5, 2, 2, 1); });
    make('icon-snacks', (g) => { g.fillStyle(0xf4b183, 1); g.fillRect(3, 4, 6, 5); g.fillStyle(0xc55a11, 1); g.fillRect(3, 3, 6, 1); });
    make('icon-tobacco', (g) => { g.fillStyle(0x8d6e63, 1); g.fillRect(3, 5, 6, 2); g.fillStyle(0xff7043, 1); g.fillRect(8, 5, 1, 2); });
    make('icon-perfume', (g) => { g.fillStyle(0x6fa8dc, 1); g.fillRect(4, 4, 4, 5); g.fillStyle(0x674ea7, 1); g.fillRect(5, 2, 2, 2); });
  }

  update() {
    const spr = this.player as unknown as Phaser.GameObjects.Sprite; const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0);
    const speed = (this.keys as any).SHIFT?.isDown ? Math.round(CONFIG.controls.baseSpeed * CONFIG.controls.runMultiplier) : CONFIG.controls.baseSpeed;
    if (this.cursors.left?.isDown || this.keys.A.isDown) body.setVelocityX(-speed); else if (this.cursors.right?.isDown || this.keys.D.isDown) body.setVelocityX(speed);
    if (this.cursors.up?.isDown || this.keys.W.isDown) body.setVelocityY(-speed); else if (this.cursors.down?.isDown || this.keys.S.isDown) body.setVelocityY(speed);
    try { const moving = Math.abs(body.velocity.x) + Math.abs(body.velocity.y) > 0; const ax = body.velocity.x, ay = body.velocity.y; const absx = Math.abs(ax), absy = Math.abs(ay); let facing: 'down'|'up'|'side' = (spr.getData('facing') as any) || 'down'; let flipX = spr.flipX; if (moving) { if (absx >= absy) { facing = 'side'; flipX = ax < 0; } else { facing = ay < 0 ? 'up' : 'down'; } spr.setData('facing', facing); spr.setFlipX(facing === 'side' ? flipX : false); const key = this.anims.exists(`player-walk-${facing}`) ? `player-walk-${facing}` : undefined; if (key) (spr as any).anims.play(key, true); else (spr as any).anims.stop(); } else { const key = this.anims.exists(`player-idle-${facing}`) ? `player-idle-${facing}` : undefined; spr.setFlipX(facing === 'side' ? flipX : false); if (key) (spr as any).anims.play(key, true); else (spr as any).anims.stop(); } } catch {}
    updateCrowd(this, this.crowd); updateNameplates(this, this.crowd, this.player as any, 22);

    // 門口名牌與進入
    let nearest: { world: Phaser.Math.Vector2; id: string; label: string } | null = null; let nd = Number.POSITIVE_INFINITY;
    for (const d of this.doors) { const dd = Phaser.Math.Distance.Between(this.player.x, this.player.y, d.world.x, d.world.y); if (dd < nd) { nd = dd; nearest = d; } }
    const showDist = 22; const zoom = Math.max(0.0001, this.cameras.main.zoom || 1); const fsWorld = Math.max(8, Math.round(CONFIG.ui.fontSize / zoom));
    for (const d of this.doors) {
      let lbl = this.doorLabels.get(d.id); if (!lbl) { lbl = this.add.text(d.world.x, d.world.y - (fsWorld + 6), d.label, { fontSize: `${fsWorld}px`, color: '#243b53', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' }).setOrigin(0.5, 1).setDepth(12).setVisible(false).setStroke('#ffffff', 2); this.doorLabels.set(d.id, lbl); }
      if (nearest && d.id === nearest.id && nd < showDist) { if ((lbl.style.fontSize as any) !== `${fsWorld}px`) lbl.setFontSize(fsWorld); try { lbl.setStroke('#ffffff', 2); } catch {} lbl.setPosition(d.world.x, d.world.y - (fsWorld + 6)).setText(d.label).setVisible(true); } else lbl.setVisible(false);
    }

    // 區域顯示（A / 大廳 / B）
    const py = this.player.y; let zone = '大廳'; let ltype = 'concourse'; if (py <= 3 * 16 + 8) { zone = 'A 區'; ltype = 'concourse-A'; } else if (py >= 19 * 16 - 8) { zone = 'B 區'; ltype = 'concourse-B'; }
    this.registry.set('location', zone); this.registry.set('locationType', ltype);

    if (nearest && nd < 18) { this.registry.set('hint', `${nearest.label}｜${t('concourse.hintEnter')}｜ESC 購物籃`); if (Phaser.Input.Keyboard.JustDown(this.keys.E)) { this.scene.pause(); this.scene.launch('StoreScene', { storeId: nearest.id }); } return; }
    else { this.registry.set('hint', `${t('concourse.hintMoveEnter')}｜ESC 購物籃`); return; }
  }
}
