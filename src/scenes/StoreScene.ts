import Phaser from 'phaser';
import { items } from '../data/items';
import { t } from '../i18n';

type StoreData = { storeId: 'cosmetics' | 'liquor' };

export class StoreScene extends Phaser.Scene {
  private cursor!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: { [k: string]: Phaser.Input.Keyboard.Key };
  private rows: Phaser.GameObjects.Text[] = [];
  private selected = 0;
  private storeId: StoreData['storeId'] = 'cosmetics';
  private hasHanBitmap = false;
  private hasHanWeb = false;

  preload() {
    if (!this.textures.exists('store-tiles')) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      const TILE = 16;
      const palette = { floorA: 0x1d2430, floorB: 0x202b39, wall: 0x2d3a48, shelf: 0x4b5a6a, counter: 0x355a6a, light: 0xfff1b6 };
      g.fillStyle(palette.floorA, 1); g.fillRect(0 * TILE, 0, TILE, TILE);
      g.fillStyle(palette.floorB, 1); g.fillRect(1 * TILE, 0, TILE, TILE);
      g.fillStyle(0x000000, 0.15);
      for (let y = 2; y < TILE; y += 4) for (let x = 2; x < TILE; x += 4) g.fillRect(1 * TILE + x, y, 1, 1);
      g.fillStyle(palette.wall, 1); g.fillRect(2 * TILE, 0, TILE, TILE);
      g.fillStyle(palette.shelf, 1); g.fillRect(3 * TILE + 2, 2, TILE - 4, TILE - 4);
      g.fillStyle(palette.counter, 1); g.fillRect(4 * TILE + 1, 3, TILE - 2, TILE - 6);
      g.fillStyle(palette.light, 1); g.fillRect(5 * TILE + 4, 2, 8, 4);
      g.generateTexture('store-tiles', TILE * 6, TILE);
      g.destroy();
    }
  }\n  constructor() { super('StoreScene'); }

  init(data: StoreData) { if (data?.storeId) this.storeId = data.storeId; }

  create() {
    this.cameras.main.setBackgroundColor('#0d1220');
    this.cameras.main.setRoundPixels(true);
    try { (window as any).__applyCameraZoom?.(); } catch {}
    this.cursor = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('ESC,ENTER,SPACE') as any;
    // 店內地圖（20x11 tiles = 320x176）
    const map = this.make.tilemap({ width: 20, height: 11, tileWidth: 16, tileHeight: 16 });
    const tiles = map.addTilesetImage('store-tiles');
    const layer = map.createBlankLayer('floor', tiles!, 0, 2);
    const base = (tiles as any).firstgid ?? 1;
    const FLOOR_A = base + 0, FLOOR_B = base + 1, WALL = base + 2, SHELF = base + 3, COUNTER = base + 4, LIGHT = base + 5;
    for (let y = 0; y < 11; y++) { for (let x = 0; x < 20; x++) { layer.putTileAt(((x + y) % 2 === 0) ? FLOOR_A : FLOOR_B, x, y); } }
    layer.fill(WALL, 0, 0, 20, 1); layer.fill(WALL, 0, 10, 20, 1);
    [3,5,7].forEach((row)=>{ for (let x=3; x<=16; x+=4) layer.putTileAt(SHELF, x, row); });
    for (let x=8; x<=11; x++) layer.putTileAt(COUNTER, x, 2);
    for (let x=2; x<=16; x+=7) layer.putTileAt(LIGHT, x, 1);

    this.hasHanBitmap = this.cache.bitmapFont.exists('han');
    try { this.hasHanWeb = (document as any).fonts?.check?.('12px HanPixel') === true; } catch { this.hasHanWeb = false; }
    const title = this.storeId === 'cosmetics' ? t('store.title.cosmetics') : t('store.title.liquor');
    if (this.hasHanBitmap) {
      this.add.bitmapText(8, 4, 'han', title, 12).setTint(0xcce8ff);
      this.add.bitmapText(8, 18, 'han', t('store.hint'), 12).setTint(0x9fb3c8);
    } else {
      this.add.text(8, 6, title, { fontSize: '12px', color: '#cce8ff', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' });
      this.add.text(8, 18, t('store.hint'), { fontSize: '12px', color: '#9fb3c8', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' });
    }
    this.registry.set('hint', t('store.hint'));
    this.renderList();
  }

  private renderList() {
    this.rows.forEach(t => t.destroy());
    this.rows = [];
    const data = items.filter(i => i.store === this.storeId);
    data.forEach((it, idx) => {
      const y = 36 + idx * 14;
      const prefix = idx === this.selected ? '>' : ' ';
      const line = `${prefix} ${it.name}  $${it.price}`;
      if (this.hasHanBitmap) {
        const txt = this.add.bitmapText(12, y - 2, 'han', line, 12).setTint(idx === this.selected ? 0xffffff : 0xc0c8d0);
        this.rows.push(txt as any);
      } else {
        const txt = this.add.text(12, y, line, { fontSize: '12px', color: idx === this.selected ? '#ffffff' : '#c0c8d0', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' });
        this.rows.push(txt);
      }
    });

    // 狀態列改由 UIOverlay 顯示，避免重複與字體切換影響
  }

  update() {
    const data = items.filter(i => i.store === this.storeId);
    if (Phaser.Input.Keyboard.JustDown(this.cursor.down!)) {
      this.selected = (this.selected + 1) % data.length; this.renderList();
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursor.up!)) {
      this.selected = (this.selected - 1 + data.length) % data.length; this.renderList();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || Phaser.Input.Keyboard.JustDown(this.keys.ENTER)) {
      const it = data[this.selected];
      const basket = ((this.registry.get('basket') as any[]) ?? []).slice();
      const money = (this.registry.get('money') as number) ?? 0;
      if (money >= it.price) {
        basket.push({ id: it.id, name: it.name, price: it.price });
        this.registry.set('basket', basket);
        this.registry.set('money', money - it.price);
      }
      this.renderList();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) {
      this.scene.stop();
      this.scene.resume('ConcourseScene');
    }
  }
}
