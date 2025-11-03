import Phaser from 'phaser';
import { t } from '../i18n';

export class UIOverlay extends Phaser.Scene {
  private timeText!: Phaser.GameObjects.Text;
  private moneyText!: Phaser.GameObjects.Text;
  private basketText!: Phaser.GameObjects.Text;

  constructor() { super('UIOverlay'); }

  create() {
    this.cameras.main.setBackgroundColor(0x000000);
    this.cameras.main.setAlpha(0);
    this.cameras.main.setRoundPixels(true);

    this.timeText = this.add.text(4, 2, '', { fontSize: '10px', color: '#ffd966', resolution: 2 }).setDepth(1000);
    this.moneyText = this.add.text(120, 2, '', { fontSize: '10px', color: '#cfe2f3', resolution: 2 }).setDepth(1000);
    this.basketText = this.add.text(220, 2, '', { fontSize: '10px', color: '#d9ead3', resolution: 2 }).setDepth(1000);
    this.timeText.setResolution?.(2);
    this.moneyText.setResolution?.(2);
    this.basketText.setResolution?.(2);

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

    this.timeText.setText(t('ui.time', { mm, ss }));
    this.moneyText.setText(t('ui.money', { money }));
    this.basketText.setText(t('ui.basket', { total: basketTotal }));
  }
}
