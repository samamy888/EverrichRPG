import Phaser from 'phaser';
import { t } from '../i18n';
import { registerTinyBitmapFont } from './BitmapFont';

export class UIOverlay extends Phaser.Scene {
  private timeLabel!: Phaser.GameObjects.Text;
  private moneyLabel!: Phaser.GameObjects.Text;
  private basketLabel!: Phaser.GameObjects.Text;
  private timeValue!: Phaser.GameObjects.BitmapText;
  private moneyValue!: Phaser.GameObjects.BitmapText;
  private basketValue!: Phaser.GameObjects.BitmapText;

  constructor() { super('UIOverlay'); }

  create() {
    this.cameras.main.setBackgroundColor(0x000000);
    this.cameras.main.setAlpha(0);
    this.cameras.main.setRoundPixels(true);

    // Register bitmap font for numeric values
    registerTinyBitmapFont(this);

    // Labels (Chinese)
    this.timeLabel = this.add.text(4, 2, '時間 ', { fontSize: '10px', color: '#ffd966', resolution: 2 }).setDepth(1000);
    this.moneyLabel = this.add.text(110, 2, '金額 ', { fontSize: '10px', color: '#cfe2f3', resolution: 2 }).setDepth(1000);
    this.basketLabel = this.add.text(200, 2, '購物籃 ', { fontSize: '10px', color: '#d9ead3', resolution: 2 }).setDepth(1000);

    // Values (ASCII via bitmap font, very crisp)
    this.timeValue = this.add.bitmapText(this.timeLabel.x + this.timeLabel.width, 3, 'tiny5x7', '00:00', 10).setDepth(1000);
    this.moneyValue = this.add.bitmapText(this.moneyLabel.x + this.moneyLabel.width, 3, 'tiny5x7', '$0', 10).setDepth(1000);
    this.basketValue = this.add.bitmapText(this.basketLabel.x + this.basketLabel.width, 3, 'tiny5x7', '$0', 10).setDepth(1000);

    this.registry.events.on('changedata', this.onDataChanged, this);
    this.refresh();
  }

  private onDataChanged(_parent: any, key: string, _value: any) {
    if (key === 'timeRemaining' || key === 'money' || key === 'basket') {
      this.refresh();
    }
  }

  private refresh() {
    const totalSeconds = Math.max(0, Math.floor((this.registry.get('timeRemaining') as number) ?? 0));
    const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const ss = String(totalSeconds % 60).padStart(2, '0');
    const money = (this.registry.get('money') as number) ?? 0;
    const basket = ((this.registry.get('basket') as { price: number }[]) ?? []);
    const basketTotal = basket.reduce((s, b) => s + b.price, 0);

    this.timeValue.setText(`${mm}:${ss}`);
    this.moneyValue.setText(`$${money}`);
    this.basketValue.setText(`$${basketTotal}`);
  }
}
