import Phaser from 'phaser';
import { items } from '../data/items';

type StoreData = { storeId: 'cosmetics' | 'liquor' };

export class StoreScene extends Phaser.Scene {
  private cursor!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: { [k: string]: Phaser.Input.Keyboard.Key };
  private listText: Phaser.GameObjects.Text[] = [];
  private selected = 0;
  private storeId: StoreData['storeId'] = 'cosmetics';

  constructor() { super('StoreScene'); }

  init(data: StoreData) {
    if (data?.storeId) this.storeId = data.storeId;
  }

  create() {
    this.cameras.main.setBackgroundColor('#0d1220');
    this.cursor = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('ESC,ENTER,SPACE,Q') as any;

    this.add.text(8, 6, this.storeId === 'cosmetics' ? '美妝店' : '菸酒店', { fontSize: '10px', color: '#cce8ff' });
    this.add.text(8, 18, '上下選擇，Space 加入購物籃，Esc 離店', { fontSize: '8px', color: '#9fb3c8' });

    this.renderList();
  }

  private renderList() {
    this.listText.forEach(t => t.destroy());
    this.listText = [];
    const data = items.filter(i => i.store === this.storeId);
    data.forEach((it, idx) => {
      const y = 36 + idx * 12;
      const prefix = idx === this.selected ? '>' : ' ';
      const line = `${prefix} ${it.name} - $${it.price}`;
      const txt = this.add.text(12, y, line, { fontSize: '8px', color: idx === this.selected ? '#ffffff' : '#c0c8d0' });
      this.listText.push(txt);
    });

    const money = this.registry.get('money') as number;
    const basket = this.registry.get('basket') as any[];
    const total = basket.reduce((s, b) => s + b.price, 0);
    this.add.rectangle(0, 0, this.scale.width, 14, 0x000000, 0.2).setOrigin(0);
    this.add.text(200, 6, `錢包 $${money} | 籃子 $${total}`, { fontSize: '8px', color: '#e6f0ff' }).setOrigin(0, 0.5);
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
      const basket = (this.registry.get('basket') as any[]).slice();
      const money = this.registry.get('money') as number;
      if (money >= it.price) {
        basket.push({ id: it.id, name: it.name, price: it.price });
        this.registry.set('basket', basket);
        this.registry.set('money', money - it.price);
        this.sound.play('ui-accept', { volume: 0 }); // 先不載音效，確保無資產依賴
      }
      this.renderList();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) {
      this.scene.stop();
      this.scene.resume('TerminalScene');
    }
  }
}

