import Phaser from 'phaser';
import { t } from '../i18n';
import { registerTinyBitmapFont } from './BitmapFont';

export class UIOverlay extends Phaser.Scene {
  private timeLabelText?: Phaser.GameObjects.Text;
  private moneyLabelText?: Phaser.GameObjects.Text;
  private basketLabelText?: Phaser.GameObjects.Text;
  private timeLabelBmp?: Phaser.GameObjects.BitmapText;
  private moneyLabelBmp?: Phaser.GameObjects.BitmapText;
  private basketLabelBmp?: Phaser.GameObjects.BitmapText;
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

    const hasHanBitmap = this.cache.bitmapFont.exists('han');
    const hasHanWeb = (document as any).fonts?.check?.('12px HanPixel') === true;
    const hasHan = hasHanBitmap || hasHanWeb;
    if (hasHan) {
      this.timeLabelBmp = this.add.bitmapText(4, 3, 'han', '時間 ', 12).setDepth(1000).setTint(0xffd966);
      this.moneyLabelBmp = this.add.bitmapText(110, 3, 'han', '金額 ', 12).setDepth(1000).setTint(0xcfe2f3);
      this.basketLabelBmp = this.add.bitmapText(200, 3, 'han', '購物籃 ', 12).setDepth(1000).setTint(0xd9ead3);
    } else {
      const base = { fontSize: '10px', resolution: 2, fontFamily: hasHanWeb ? 'HanPixel, system-ui, sans-serif' : undefined } as any;
      this.timeLabelText = this.add.text(4, 2, '時間 ', { ...base, color: '#ffd966' }).setDepth(1000);
      this.moneyLabelText = this.add.text(110, 2, '金額 ', { ...base, color: '#cfe2f3' }).setDepth(1000);
      this.basketLabelText = this.add.text(200, 2, '購物籃 ', { ...base, color: '#d9ead3' }).setDepth(1000);
    }

    // Values (ASCII via bitmap font, very crisp)
    const tlx = (this.timeLabelBmp?.x ?? this.timeLabelText!.x) + (this.timeLabelBmp?.width ?? this.timeLabelText!.width);
    const mlx = (this.moneyLabelBmp?.x ?? this.moneyLabelText!.x) + (this.moneyLabelBmp?.width ?? this.moneyLabelText!.width);
    const blx = (this.basketLabelBmp?.x ?? this.basketLabelText!.x) + (this.basketLabelBmp?.width ?? this.basketLabelText!.width);
    this.timeValue = this.add.bitmapText(tlx, 3, 'tiny5x7', '00:00', 10).setDepth(1000);
    this.moneyValue = this.add.bitmapText(mlx, 3, 'tiny5x7', '$0', 10).setDepth(1000);
    this.basketValue = this.add.bitmapText(blx, 3, 'tiny5x7', '$0', 10).setDepth(1000);

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
