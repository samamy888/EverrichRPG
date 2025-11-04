import Phaser from 'phaser';
import { registerTinyBitmapFont } from './BitmapFont';
import { CONFIG } from '../config';
import { GAME_WIDTH, GAME_HEIGHT } from '../main';

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
  private fontDebugText?: Phaser.GameObjects.Text;
  private hintBox!: Phaser.GameObjects.Rectangle;
  private hintText!: Phaser.GameObjects.Text;
  private statusBox!: Phaser.GameObjects.Rectangle;
  private statusText!: Phaser.GameObjects.Text;

  constructor() { super('UIOverlay'); }

  create() {
    this.cameras.main.setBackgroundColor(0x000000);
    this.cameras.main.setAlpha(0);
    this.cameras.main.setRoundPixels(true);
    // 重新套用全域相機縮放於喚醒/恢復時
    this.events.on(Phaser.Scenes.Events.WAKE, () => { try { (window as any).__applyCameraZoom?.(); } catch {} });
    this.events.on(Phaser.Scenes.Events.RESUME, () => { try { (window as any).__applyCameraZoom?.(); } catch {} });
    try { (window as any).__applyCameraZoom?.(); } catch {}

    // Register bitmap font for numeric values
    registerTinyBitmapFont(this);

    // Top hint box + text
    this.hintBox = this.add.rectangle(0, 0, GAME_WIDTH, 16, 0x000000, 0.55).setOrigin(0).setDepth(999);
    this.hintText = this.add.text(4, 3, '', { fontSize: '12px', resolution: 2, color: '#e6f0ff', fontFamily: 'HanPixel, system-ui, sans-serif' }).setDepth(1000);

    const hasHanBitmap = this.cache.bitmapFont.exists('han');
    if (hasHanBitmap) {
      this.timeLabelBmp = this.add.bitmapText(4, 3, 'han', '時間 ', 12).setDepth(1000).setTint(0xffd966);
      this.moneyLabelBmp = this.add.bitmapText(110, 3, 'han', '金額 ', 12).setDepth(1000).setTint(0xcfe2f3);
      this.basketLabelBmp = this.add.bitmapText(200, 3, 'han', '購物籃 ', 12).setDepth(1000).setTint(0xd9ead3);
    } else {
      const base = { fontSize: '12px', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' } as any;
      this.timeLabelText = this.add.text(4, 2, '時間 ', { ...base, color: '#ffd966' }).setDepth(1000);
      this.moneyLabelText = this.add.text(110, 2, '金額 ', { ...base, color: '#cfe2f3' }).setDepth(1000);
      this.basketLabelText = this.add.text(200, 2, '購物籃 ', { ...base, color: '#d9ead3' }).setDepth(1000);
    }

    // Values (ASCII via bitmap font, very crisp)
    const timeX = 52, moneyX = 162, basketX = 262;
    this.timeValue = this.add.bitmapText(timeX, 4, 'tiny5x7', '00:00', 10).setDepth(1000);
    this.moneyValue = this.add.bitmapText(moneyX, 4, 'tiny5x7', '', 10).setDepth(1000);
    this.basketValue = this.add.bitmapText(basketX, 4, 'tiny5x7', '', 10).setDepth(1000);

    this.registry.events.on('changedata', this.onDataChanged, this);

    // Bottom status box + text
    this.statusBox = this.add.rectangle(0, GAME_HEIGHT - 16, GAME_WIDTH, 16, 0x000000, 0.55).setOrigin(0).setDepth(999);
    this.statusText = this.add.text(4, GAME_HEIGHT - 14, '', { fontSize: '12px', resolution: 2, color: '#e6f0ff', fontFamily: 'HanPixel, system-ui, sans-serif' }).setDepth(1000);

    // For webfont, after load the width may change; adjust once fonts are ready
    const fonts: any = (document as any).fonts;
    if (fonts?.ready) {
      this.refresh();
    }
    this.maybeInitFontDebug();
    this.refresh();
  }

  private onDataChanged(_parent: any, key: string, _value: any) {
    if (key === 'timeRemaining' || key === 'money' || key === 'basket' || key === 'hint') {
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

    const hint = (this.registry.get('hint') as string) ?? '';
    if (hint) this.hintText.setText(hint);

    const itemsCount = basket.length;
    this.statusText.setText(`Money $${money} | Time ${mm}:${ss} | Basket ${itemsCount} items $${basketTotal}`);
  }

  // 開發模式顯示字型載入狀態（網址加上 ?debugFonts=1 或 #debugFonts 生效）
  private maybeInitFontDebug() {
    const isDev = !!((import.meta as any)?.env?.DEV);
    const url = new URL(window.location.href);
    const enabled = CONFIG.debugFonts || (url.searchParams.get('debugFonts') === '1' || url.hash.includes('debugFonts')) || isDev;
    if (!enabled) return;
    this.fontDebugText = this.add.text(4, 14, '', { fontSize: '9px', color: '#a8ffbf', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' }).setDepth(1000);
    this.updateFontDebug();
  }

  private updateFontDebug() {
    if (!this.fontDebugText) return;
    const hasBitmap = this.cache.bitmapFont.exists('han');
    let hasWeb = false;
    try { hasWeb = (document as any).fonts?.check?.('12px "HanPixel"') === true; } catch {}
    const msg = `字型 Bitmap(han): ${hasBitmap ? '是' : '否'}｜Web(HanPixel): ${hasWeb ? '已載入' : '尚未'}`;
    this.fontDebugText.setText(msg);
    console.info('[fonts]', { bitmap: hasBitmap, web: hasWeb });
  }
}




