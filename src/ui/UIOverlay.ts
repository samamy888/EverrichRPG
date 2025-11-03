import Phaser from 'phaser';

export class UIOverlay extends Phaser.Scene {
  private timeText!: Phaser.GameObjects.Text;
  private moneyText!: Phaser.GameObjects.Text;
  private basketText!: Phaser.GameObjects.Text;

  constructor() { super('UIOverlay'); }

  create() {
    this.cameras.main.setBackgroundColor(0x000000);
    this.cameras.main.setAlpha(0);

    this.timeText = this.add.text(4, 2, '', { fontSize: '8px', color: '#ffd966' }).setDepth(1000);
    this.moneyText = this.add.text(110, 2, '', { fontSize: '8px', color: '#cfe2f3' }).setDepth(1000);
    this.basketText = this.add.text(210, 2, '', { fontSize: '8px', color: '#d9ead3' }).setDepth(1000);

    this.registry.events.on('changedata', this.onDataChanged, this);
    this.refresh();
  }

  private onDataChanged(_parent: any, key: string, _value: any) {
    if (key === 'timeRemaining' || key === 'money' || key === 'basket') {
      this.refresh();
    }
  }

  private refresh() {
    const totalSeconds = Math.max(0, Math.floor(this.registry.get('timeRemaining') as number));
    const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const ss = String(totalSeconds % 60).padStart(2, '0');
    const money = this.registry.get('money') as number;
    const basket = this.registry.get('basket') as { price: number }[];
    const basketTotal = basket.reduce((s, b) => s + b.price, 0);

    this.timeText.setText(`登機倒數 ${mm}:${ss}`);
    this.moneyText.setText(`錢包 $${money}`);
    this.basketText.setText(`籃子 $${basketTotal}`);
  }
}

