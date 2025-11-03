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

  constructor() { super('StoreScene'); }

  init(data: StoreData) { if (data?.storeId) this.storeId = data.storeId; }

  create() {
    this.cameras.main.setBackgroundColor('#0d1220');
    this.cameras.main.setRoundPixels(true);
    this.cursor = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('ESC,ENTER,SPACE') as any;

    const title = this.storeId === 'cosmetics' ? t('store.title.cosmetics') : t('store.title.liquor');
    this.add.text(8, 6, title, { fontSize: '12px', color: '#cce8ff' });
    this.add.text(8, 18, t('store.hint'), { fontSize: '10px', color: '#9fb3c8' });
    this.renderList();
  }

  private renderList() {
    this.rows.forEach(t => t.destroy());
    this.rows = [];
    const data = items.filter(i => i.store === this.storeId);
    data.forEach((it, idx) => {
      const y = 36 + idx * 12;
      const prefix = idx === this.selected ? '>' : ' ';
      const line = `${prefix} ${it.name}  $${it.price}`;
      const txt = this.add.text(12, y, line, { fontSize: '10px', color: idx === this.selected ? '#ffffff' : '#c0c8d0' });
      this.rows.push(txt);
    });

    const money = (this.registry.get('money') as number) ?? 0;
    const basket = (this.registry.get('basket') as any[]) ?? [];
    const total = basket.reduce((s, b) => s + b.price, 0);
    this.add.rectangle(0, 0, this.scale.width, 16, 0x000000, 0.25).setOrigin(0);
    this.add.text(150, 7, t('store.status', { money, total }), { fontSize: '10px', color: '#e6f0ff' }).setOrigin(0, 0.5);
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
