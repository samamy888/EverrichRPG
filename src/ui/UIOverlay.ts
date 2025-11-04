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
  private locationText!: Phaser.GameObjects.Text;
  private locationIcon!: Phaser.GameObjects.Image;
  private statusBox!: Phaser.GameObjects.Rectangle;
  private statusText!: Phaser.GameObjects.Text;

  constructor() { super('UIOverlay'); }

  create() {
    // 透明背景，不覆蓋主場景；相機本身維持可見
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
    this.cameras.main.setAlpha(1);
    this.cameras.main.setRoundPixels(true);
    // 重新套用全域相機縮放於喚醒/恢復時
    this.events.on(Phaser.Scenes.Events.WAKE, () => { try { (window as any).__applyCameraZoom?.(); } catch {} });
    this.events.on(Phaser.Scenes.Events.RESUME, () => { try { (window as any).__applyCameraZoom?.(); } catch {} });
    try { (window as any).__applyCameraZoom?.(); } catch {}
    // 確保覆蓋層永遠在最上層
    this.scene.bringToTop();
    this.events.on(Phaser.Scenes.Events.WAKE, () => this.scene.bringToTop());
    this.events.on(Phaser.Scenes.Events.RESUME, () => this.scene.bringToTop());

    // Register bitmap font for numeric values
    registerTinyBitmapFont(this);

    // Top hint box + texts (left: hint, right: location)
    const HUD = CONFIG.ui.hudHeight;
    const FS = CONFIG.ui.fontSize;
    this.hintBox = this.add.rectangle(0, 0, GAME_WIDTH, HUD, 0x000000, 0.55).setOrigin(0).setDepth(999);
    this.hintText = this.add.text(4, Math.max(1, Math.floor((HUD - FS) / 2)), '', { fontSize: `${FS}px`, resolution: 2, color: '#e6f0ff', fontFamily: 'HanPixel, system-ui, sans-serif' }).setDepth(1000);
    this.locationText = this.add.text(GAME_WIDTH - 4, Math.max(1, Math.floor((HUD - FS) / 2)), '', { fontSize: `${FS}px`, resolution: 2, color: '#cfe2f3', fontFamily: 'HanPixel, system-ui, sans-serif' })
      .setOrigin(1, 0)
      .setDepth(1000);
    this.ensureLocationIcons();
    this.locationIcon = this.add.image(GAME_WIDTH - 4, 3, 'icon-concourse').setOrigin(1, 0).setDepth(1000).setVisible(false);

    const hasHanBitmap = this.cache.bitmapFont.exists('han');
    if (hasHanBitmap) {
      this.timeLabelBmp = this.add.bitmapText(-9999, -9999, 'han', '', 12).setVisible(false);
      this.moneyLabelBmp = this.add.bitmapText(-9999, -9999, 'han', '', 12).setVisible(false);
      this.basketLabelBmp = this.add.bitmapText(-9999, -9999, 'han', '', 12).setVisible(false);
    } else {
      const base = { fontSize: '12px', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' } as any;
      this.timeLabelText = this.add.text(-9999, -9999, '', { fontSize: '12px' }).setVisible(false);
      this.moneyLabelText = this.add.text(-9999, -9999, '', { fontSize: '12px' }).setVisible(false);
      this.basketLabelText = this.add.text(-9999, -9999, '', { fontSize: '12px' }).setVisible(false);
    }

    // Values (ASCII via bitmap font, very crisp)
    this.timeValue = this.add.bitmapText(-9999, -9999, 'tiny5x7', '', 10).setVisible(false);
    this.moneyValue = this.add.bitmapText(-9999, -9999, 'tiny5x7', '', 10).setVisible(false);
    this.basketValue = this.add.bitmapText(-9999, -9999, 'tiny5x7', '', 10).setVisible(false);

    this.registry.events.on('changedata', this.onDataChanged, this);

    // Bottom status box + text
    this.statusBox = this.add.rectangle(0, GAME_HEIGHT - HUD, GAME_WIDTH, HUD, 0x000000, 0.55).setOrigin(0).setDepth(999);
    this.statusText = this.add.text(4, GAME_HEIGHT - HUD + Math.max(1, Math.floor((HUD - FS) / 2)), '', { fontSize: `${FS}px`, resolution: 2, color: '#e6f0ff', fontFamily: 'HanPixel, system-ui, sans-serif' }).setDepth(1000);

    // For webfont, after load the width may change; adjust once fonts are ready
    const fonts: any = (document as any).fonts;
    if (fonts?.ready) {
      this.refresh();
    }
    this.maybeInitFontDebug();
    this.refresh();
    // 以下一幀再套用一次縮放，避免初次啟動時場景尚未完成建立導致比例不正確
    try { this.time.delayedCall(0, () => { try { (window as any).__applyCameraZoom?.(); } catch {} }); } catch {}
    // 當視窗大小或比例變化時，確保覆蓋層也一起更新
    try { this.scale.on('resize', () => { try { (window as any).__applyCameraZoom?.(); } catch {} }); } catch {}
  }

  private onDataChanged(_parent: any, key: string, _value: any) {
    if (key === 'money' || key === 'basket' || key === 'hint' || key === 'location' || key === 'locationType') {
      this.refresh();
    }
  }

  private refresh() {
    const money = (this.registry.get('money') as number) ?? 0;
    const basket = ((this.registry.get('basket') as { price: number }[]) ?? []);
    const basketTotal = basket.reduce((s, b) => s + b.price, 0);

    // 移除時間欄位顯示
    this.moneyValue.setText(`$${money}`);
    this.basketValue.setText(`$${basketTotal}`);

    const hint = (this.registry.get('hint') as string) ?? '';
    if (hint !== undefined) this.hintText.setText(hint || '');
    const loc = (this.registry.get('location') as string) ?? '';
    if (loc !== undefined) this.locationText.setText(loc || '');
    const locType = (this.registry.get('locationType') as string) ?? '';
    let key: string | null = null;
    if (locType === 'cosmetics') key = 'icon-cosmetics';
    else if (locType === 'liquor') key = 'icon-liquor';
    else if (locType === 'concourse') key = 'icon-concourse';
    this.locationIcon.setVisible(!!key);
    if (key) {
      if (this.locationIcon.texture.key !== key) this.locationIcon.setTexture(key);
      this.locationIcon.setPosition(GAME_WIDTH - 4, 3);
      const iconW = this.locationIcon.displayWidth || 10;
      this.locationText.setOrigin(1, 0);
      this.locationText.setPosition(GAME_WIDTH - 4 - iconW - 4, 3);
    } else {
      this.locationText.setOrigin(1, 0);
      this.locationText.setPosition(GAME_WIDTH - 4, 3);
    }

    const itemsCount = basket.length;
    this.statusText.setText(`Money $${money} | Basket ${itemsCount} items $${basketTotal}`);
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

  private ensureLocationIcons() {
    const makeIcon = (key: string, draw: (g: Phaser.GameObjects.Graphics) => void) => {
      if (this.textures.exists(key)) return;
      const g = this.add.graphics({ x: 0, y: 0, add: false });
      g.clear();
      draw(g);
      g.generateTexture(key, 12, 12);
      g.destroy();
    };
    makeIcon('icon-concourse', (g) => {
      g.fillStyle(0x3aa1bf, 1); g.fillRect(2, 5, 8, 3);
      g.fillStyle(0x24424e, 1); g.fillRect(1, 3, 10, 2);
    });
    makeIcon('icon-cosmetics', (g) => {
      g.fillStyle(0xff6fae, 1); g.fillRect(5, 2, 2, 5);
      g.fillStyle(0x333333, 1); g.fillRect(4, 7, 4, 3);
    });
    makeIcon('icon-liquor', (g) => {
      g.fillStyle(0x2e8b57, 1); g.fillRect(4, 3, 4, 6);
      g.fillStyle(0xcce8ff, 1); g.fillRect(5, 2, 2, 1);
    });
  }
}





