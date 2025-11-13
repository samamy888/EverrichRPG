import Phaser from 'phaser';
import { registerTinyBitmapFont } from './BitmapFont';
import { CONFIG } from '../config';
import { t } from '../i18n';
import { GAME_WIDTH, GAME_HEIGHT } from '../main';
import { ensureMinimap, positionMinimap, renderMinimap } from './overlays/minimap';
import { initChat } from './chat';
import { openBasket as extOpenBasket, closeBasket as extCloseBasket, renderBasket as extRenderBasket, moveBasket as extMoveBasket, pickBasket as extPickBasket } from './overlays/basket';

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
  // Basket overlay state
  private basketOpen = false;
  private basketBox?: Phaser.GameObjects.Rectangle;
  private basketRows: Phaser.GameObjects.Text[] = [];
  private basketSelected = 0;
  private lastHint: string | null = null;
  // Dialog overlay state
  private dialogOpen = false;
  private dialogBox?: Phaser.GameObjects.Rectangle;
  private dialogRows: Phaser.GameObjects.Text[] = [];
  private dialogForceFrames = 0;
  // Listing overlay state (store right panel)
  private listingOpen = false;
  private listingBox?: Phaser.GameObjects.Graphics;
  private listingRows: Phaser.GameObjects.Text[] = [];
  private listingForceFrames = 0;
  private listingMeasure?: Phaser.GameObjects.Text;
  // Main menu overlay (ESC)
  private menuOpen = false;
  private menuLevel: 1 | 2 = 1; // 1=主選單, 2=地點清單
  private menuBox?: Phaser.GameObjects.Graphics;
  private menuRows: Phaser.GameObjects.Text[] = [];
  private menuSelected = 0;
  private menuSavedHint: string | null = null;
  // Interact overlay state (context options near player)
  private interactOpen = false;
  private interactBox?: Phaser.GameObjects.Graphics;
  private interactRows: Phaser.GameObjects.Text[] = [];
  private interactMeasure?: Phaser.GameObjects.Text;
  // Minimap
  public minimapBox?: Phaser.GameObjects.Rectangle;
  public minimapGfx?: Phaser.GameObjects.Graphics;
  public minimapScaleX = 1;
  public minimapScaleY = 1;
  private shouldShowMinimap(): boolean {
    try {
      if (!CONFIG.ui.minimap.enabled) return false;
      const active = this.game.scene.getScenes(true).filter((s: any) => s.scene?.key !== 'UIOverlay');
      const top: any = active[active.length - 1];
      const topKey: string | undefined = top?.scene?.key;
      if (topKey === 'StoreScene') return false;
      // 若頂層場景提供 tilemap layer，則一律顯示（支援位圖地圖生成的虛擬層）
      if (top && top.layer && typeof top.layer.getTileAt === 'function') return true;
      // 後備：依 locationType 判定
      const locType = (this.registry.get('locationType') as string) || '';
      return locType.startsWith('concourse');
    } catch { return !!CONFIG.ui.minimap.enabled; }
  }

  constructor() { super('UIOverlay'); }

  create() {
    // 透明背景，不覆蓋主場景；相機本身維持可見
    // 將常用工具掛到場景實例，便於外部模組（若以 any 取用）
    ;(this as any).CONFIG = CONFIG; (this as any).t = t;
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
    const HFS = FS + (((CONFIG.ui as any).hintDelta || 0));
    this.hintBox = this.add.rectangle(0, 0, GAME_WIDTH, HUD, 0x000000, 0.55).setOrigin(0).setDepth(999).setScrollFactor(0);
    this.hintText = this.add.text(4, Math.max(1, Math.floor((HUD - HFS) / 2)), '', { fontSize: `${HFS}px`, resolution: 2, color: '#e6f0ff', fontFamily: 'HanPixel, system-ui, sans-serif' }).setDepth(1000).setScrollFactor(0);
    this.locationText = this.add.text(GAME_WIDTH - 4, Math.max(1, Math.floor((HUD - FS) / 2)), '', { fontSize: `${FS}px`, resolution: 2, color: '#cfe2f3', fontFamily: 'HanPixel, system-ui, sans-serif' })
      .setOrigin(1, 0)
      .setDepth(1000)
      .setScrollFactor(0);
    this.ensureLocationIcons();
    this.locationIcon = this.add.image(GAME_WIDTH - 4, 3, 'icon-concourse').setOrigin(1, 0).setDepth(1000).setVisible(false).setScrollFactor(0);

    const hasHanBitmap = this.cache.bitmapFont.exists('han');
    if (hasHanBitmap) {
      this.timeLabelBmp = this.add.bitmapText(-9999, -9999, 'han', '', 12).setVisible(false).setScrollFactor(0);
      this.moneyLabelBmp = this.add.bitmapText(-9999, -9999, 'han', '', 12).setVisible(false).setScrollFactor(0);
      this.basketLabelBmp = this.add.bitmapText(-9999, -9999, 'han', '', 12).setVisible(false).setScrollFactor(0);
    } else {
      const base = { fontSize: '12px', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' } as any;
      this.timeLabelText = this.add.text(-9999, -9999, '', { fontSize: '12px' }).setVisible(false).setScrollFactor(0);
      this.moneyLabelText = this.add.text(-9999, -9999, '', { fontSize: '12px' }).setVisible(false).setScrollFactor(0);
      this.basketLabelText = this.add.text(-9999, -9999, '', { fontSize: '12px' }).setVisible(false).setScrollFactor(0);
    }

    // Values (ASCII via bitmap font, very crisp)
    this.timeValue = this.add.bitmapText(-9999, -9999, 'tiny5x7', '', 10).setVisible(false).setScrollFactor(0);
    this.moneyValue = this.add.bitmapText(-9999, -9999, 'tiny5x7', '', 10).setVisible(false).setScrollFactor(0);
    this.basketValue = this.add.bitmapText(-9999, -9999, 'tiny5x7', '', 10).setVisible(false).setScrollFactor(0);

    this.registry.events.on('changedata', this.onDataChanged, this);

    // Bottom status box + text（實際位置在 layoutHUD 中計算）
    this.statusBox = this.add.rectangle(0, 0, GAME_WIDTH, HUD, 0x000000, 0.55).setOrigin(0).setDepth(999).setScrollFactor(0);
    this.statusText = this.add.text(4, 0, '', { fontSize: `${FS}px`, resolution: 2, color: '#e6f0ff', fontFamily: 'HanPixel, system-ui, sans-serif' }).setDepth(1000).setScrollFactor(0);

    // For webfont, after load the width may change; adjust once fonts are ready
    const fonts: any = (document as any).fonts;
    if (fonts?.ready) {
      this.refresh();
    }
    this.maybeInitFontDebug();
    this.refresh();
    this.layoutHUD();
    this.ensureMinimap();
    this.ensureMinimap();
    this.renderMinimap();
    // 確保登入後初始化聊天室並依儲存狀態顯示
    try { initChat(this.game as any); } catch {}
    // 以下一幀再套用一次縮放，避免初次啟動時場景尚未完成建立導致比例不正確
    try { this.time.delayedCall(0, () => { try { (window as any).__applyCameraZoom?.(); } catch {} }); } catch {}
    // 當視窗大小或比例變化時，確保覆蓋層也一起更新
    try {
      this.scale.on('resize', () => {
        try { (window as any).__applyCameraZoom?.(); } catch {}
        try { this.layoutHUD(); } catch {}
        try { this.renderMinimap(); } catch {}
      });
    } catch {}
    // Global ESC menu and navigation
    this.input.keyboard.on('keydown-ESC', () => {
      // 對話或清單開啟時，不處理主選單
      if (this.dialogOpen || this.listingOpen) return;
      if (this.menuOpen) {
        // 2 級返回到 1 級；1 級關閉
        if (this.menuLevel === 2) { this.menuLevel = 1; this.menuSelected = 0; this.renderMenu(); }
        else this.closeMenu();
      } else {
        this.openMenu();
      }
    });
    // 導覽（根據當前狀態切換行為：主選單 or 購物籃）
    const navUp = () => { if (this.menuOpen) this.moveMenu(-1); else this.moveBasket(-1); };
    const navDown = () => { if (this.menuOpen) this.moveMenu(1); else this.moveBasket(1); };
    this.input.keyboard.on('keydown-W', navUp);
    this.input.keyboard.on('keydown-UP', navUp);
    this.input.keyboard.on('keydown-S', navDown);
    this.input.keyboard.on('keydown-DOWN', navDown);
    const confirm = () => { if (this.menuOpen) this.pickMenu(); else this.pickBasket(); };
    this.input.keyboard.on('keydown-E', confirm);
    this.input.keyboard.on('keydown-ENTER', confirm);
  }

  private onDataChanged(_parent: any, key: string, value: any) {
    const isDialog = (key === 'dialogOpen' || key === 'dialogLines' || key === 'dialogStep');
    const isListing = (key === 'listingOpen' || key === 'listingItems' || key === 'listingSelected');
    const isInteract = (key === 'interactOpen' || key === 'interactOptions' || key === 'playerPos');
    if (key === 'money' || key === 'basket' || key === 'hint' || key === 'location' || key === 'locationType' || isDialog || isListing || isInteract) {
      this.refresh();
      if (this.basketOpen) this.renderBasket();
      this.renderDialog();
      this.renderMinimap();
      this.renderListing();
      this.renderInteract();
      if (isDialog) {
        // 對話剛開啟時，首幀可能尚未完成縮放/排版，追加多次保險重繪
        try { this.time.delayedCall(0, () => this.renderDialog()); } catch {}
        try { this.time.delayedCall(16, () => this.renderDialog()); } catch {}
        try { requestAnimationFrame(() => this.renderDialog()); } catch {}
      }
    // 若是從關閉->開啟，立即置頂
        if (key === 'dialogOpen' && !!value) {
          try { this.scene.bringToTop(); } catch {}
          this.dialogForceFrames = 2;
        }
      }
      if (isListing) {
        try { this.time.delayedCall(0, () => this.renderListing()); } catch {}
        try { requestAnimationFrame(() => this.renderListing()); } catch {}
      }
      if (isInteract) {
        try { this.time.delayedCall(0, () => this.renderInteract()); } catch {}
        try { requestAnimationFrame(() => this.renderInteract()); } catch {}
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
    const hintLarge = !!this.registry.get('hintLarge');
    if (this.menuOpen) {
      this.hintText.setText(this.menuTip());
    } else if (this.basketOpen) {
      const bh = (t('ui.basketHint') as string) || '';
      this.hintText.setText(bh && bh !== 'ui.basketHint' ? bh : '購物籃：W/S 選擇，E 移除，ESC 關閉');
    } else if (this.dialogOpen) {
      this.hintText.setText(t('store.dialog.cont') || '（按 E 繼續）');
    } else if (hint !== undefined) {
      // Apply dynamic larger font for entry/exit hints if requested
      try {
        const baseFS = CONFIG.ui.fontSize + ((CONFIG.ui as any).hintDelta || 0);
        const extra = hintLarge ? (((CONFIG.ui as any).hintDeltaLarge || 2)) : 0;
        const want = `${baseFS + extra}px`;
        if ((this.hintText.style.fontSize as any) !== want) this.hintText.setFontSize(baseFS + extra);
      } catch {}
      this.hintText.setText(hint || '');
    }
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
      const { w } = this.getViewSize();
      this.locationIcon.setPosition(w - 4, 3);
      const iconW = this.locationIcon.displayWidth || 10;
      this.locationText.setOrigin(1, 0);
      this.locationText.setPosition(w - 4 - iconW - 4, 3);
    } else {
      this.locationText.setOrigin(1, 0);
      const { w } = this.getViewSize();
      this.locationText.setPosition(w - 4, 3);
    }

    const itemsCount = basket.length;
    const localized = t('ui.status', { money, items: itemsCount, total: basketTotal }) as string;
    const text = localized && localized !== 'ui.status'
      ? localized
      : `Money $${money} | Basket ${itemsCount} items $${basketTotal}`;
    this.statusText.setText(text);
    this.layoutHUD();
  }

  // 開發模式顯示字型載入狀態（網址加上 ?debugFonts=1 或 #debugFonts 生效）
  private maybeInitFontDebug() {
    const isDev = !!((import.meta as any)?.env?.DEV);
    const url = new URL(window.location.href);
    const enabled = CONFIG.debugFonts || (url.searchParams.get('debugFonts') === '1' || url.hash.includes('debugFonts')) || isDev;
    if (!enabled) return;
    this.fontDebugText = this.add.text(4, 14, '', { fontSize: '9px', color: '#a8ffbf', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' }).setDepth(1000).setScrollFactor(0);
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

  private openBasket() { (extOpenBasket as any)(this); }
  private closeBasket() { (extCloseBasket as any)(this); }
  private renderBasket() { (extRenderBasket as any)(this); }
  private moveBasket(dir: 1 | -1) { (extMoveBasket as any)(this, dir); }
  private pickBasket() { (extPickBasket as any)(this); }

  // 對話覆蓋層（外觀與購物籃一致，置底）
  private renderDialog() {
    const open = !!this.registry.get('dialogOpen');
    this.dialogOpen = open;
    this.updateInputLock();
    const lines: string[] = (this.registry.get('dialogLines') as string[]) || [];
    const step = (this.registry.get('dialogStep') as number) ?? 0;
    const playerPos = (this.registry.get('playerPos') as { x: number; y: number } | undefined);

    // 清理先前元素
    try { this.dialogRows.forEach(r => { try { r.destroy(); } catch {} }); } catch {}
    this.dialogRows = [];
    if (!open) {
      try { this.dialogBox?.destroy(); } catch {}
      this.dialogBox = undefined;
      return;
    }
    const pad = 6;
    const FS = CONFIG.ui.fontSize;
    const { w: viewW, h: viewH } = this.getViewSize();
    const HUD = CONFIG.ui.hudHeight;

    // 準備文字內容（首句保底）
    const fallbackFirst = (t('store.dialog.l1') as string) || '';
    const currentLine = (Array.isArray(lines) && lines.length > step)
      ? (lines[step] || '')
      : (Array.isArray(lines) && lines.length > 0 ? (lines[0] || '') : fallbackFirst);
    const txt = `${currentLine} ${t('store.dialog.cont') || ''}`.trim();

    // 先建立文字以取得尺寸
    let tempText = this.add.text(0, 0, txt, { fontSize: `${FS}px`, color: '#e6f0ff', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' }).setDepth(2001).setScrollFactor(0);
    const textW = Math.ceil(tempText.width);
    const textH = Math.ceil(tempText.height);
    let panelW = Math.max(120, textW + pad * 2);
    let panelH = Math.max(CONFIG.ui.dialogHeight, textH + pad * 2);

    // 期望顯示在主角右側（若無主角座標則退回底部）
    let x = 0, y = 0;
    let placedByPlayer = false;
    try {
      // 取得 StoreScene 相機
      let cam: any = null;
      try { cam = (this.game.scene.getScene('StoreScene') as any)?.cameras?.main || null; } catch {}
      if (!cam) {
        const scenes = this.game.scene.getScenes(true).filter((s: any) => s.scene?.key !== 'UIOverlay');
        const guess = scenes.find((s: any) => s?.cameras?.main) || scenes[scenes.length - 1];
        cam = (guess as any)?.cameras?.main || null;
      }
      if (cam && playerPos) {
        const baseX = (typeof cam.worldView?.x === 'number') ? cam.worldView.x : (cam.scrollX || 0);
        const baseY = (typeof cam.worldView?.y === 'number') ? cam.worldView.y : (cam.scrollY || 0);
        const screenX = (playerPos.x - baseX) * (cam.zoom || 1);
        const screenY = (playerPos.y - baseY) * (cam.zoom || 1);
        const offset = 12;
        x = screenX + offset;
        y = Math.round(screenY - panelH / 2);
        // 邊界修正：避免壓到 HUD 與底欄，避免超出左右邊界
        const minY = HUD + pad;
        const maxY = viewH - HUD - panelH - pad;
        if (y < minY) y = minY;
        if (y > maxY) y = maxY;
        if (x + panelW + pad > viewW) x = Math.max(pad, viewW - panelW - pad);
        if (x < pad) x = pad;
        placedByPlayer = true;
      }
    } catch {}

    if (!placedByPlayer) {
      // 退回到底部 HUD 上方（與先前行為一致）
      x = 0;
      y = viewH - HUD - panelH - 2;
    }

    // 更新背景框
    if (!this.dialogBox) {
      this.dialogBox = this.add.rectangle(x, y, panelW, panelH, 0x000000, 0.8).setOrigin(0).setDepth(2000).setScrollFactor(0);
    } else {
      this.dialogBox.setPosition(x, y).setSize(panelW, panelH).setDepth(2000).setVisible(true).setScrollFactor(0);
    }

    // 移動文字到框內適當位置（左上內距）
    tempText.setPosition(x + pad, y + pad);
    this.dialogRows.push(tempText);
    try { this.scene.bringToTop(); } catch {}
  }

  // 公開 API：由遊戲場景直接控制對話（避免事件時序競態）
  public openDialog(lines: string[], step = 0) { const { openDialog } = require('./overlays/dialog'); openDialog(this, lines, step); }
  public advanceDialog(): boolean { const { advanceDialog } = require('./overlays/dialog'); return advanceDialog(this); }
  public closeDialog() { const { closeDialog } = require('./overlays/dialog'); closeDialog(this); }

  // 根據當前覆蓋層狀態，鎖定或解鎖玩家移動輸入
  private updateInputLock() {
    const lock = !!(this.basketOpen || this.dialogOpen || this.listingOpen || this.menuOpen);
    try { this.registry.set('inputLocked', lock); } catch {}
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

  // 計算目前可視區大小（以螢幕像素對應的世界座標；UI 相機固定 1x）
  private getViewSize() {
    let w = Number((this.scale as any)?.width) || 0;
    let h = Number((this.scale as any)?.height) || 0;
    if (!w || !h) {
      try { w = Number(this.cameras?.main?.width) || 0; h = Number(this.cameras?.main?.height) || 0; } catch {}
    }
    if (!w || !h) {
      try { const c: any = (this.game as any).canvas; w = Number(c?.width) || 0; h = Number(c?.height) || 0; } catch {}
    }
    if (!w || !h) {
      w = window.innerWidth || GAME_WIDTH;
      h = window.innerHeight || GAME_HEIGHT;
    }
    return { w, h };
  }

  // 依據可視區重新定位頂/底 HUD
  public layoutHUD() {
    const HUD = CONFIG.ui.hudHeight;
    const FS = CONFIG.ui.fontSize;
    const { w, h } = this.getViewSize();
    // Top bar
    this.hintBox.setPosition(0, 0).setSize(w, HUD);
    const HFS = CONFIG.ui.fontSize + ((CONFIG.ui as any).hintDelta || 0);
    this.hintText.setPosition(4, Math.max(1, Math.floor((HUD - HFS) / 2)));
    // Right-top location
    const hasIcon = this.locationIcon.visible;
    if (hasIcon) {
      const iconW = this.locationIcon.displayWidth || 10;
      this.locationIcon.setPosition(w - 4, 3);
      this.locationText.setOrigin(1, 0).setPosition(w - 4 - iconW - 4, 3);
    } else {
      this.locationText.setOrigin(1, 0).setPosition(w - 4, 3);
    }
    // Bottom bar
    this.statusBox.setPosition(0, h - HUD).setSize(w, HUD);
    this.statusText.setPosition(4, h - HUD + Math.max(1, Math.floor((HUD - FS) / 2)));
    // 若購物籃或對話框開啟，重繪以符合新尺寸
    if (this.basketOpen) this.renderBasket();
    if (this.dialogOpen) this.renderDialog();
    if (this.listingOpen) this.renderListing();
    this.renderInteract();
    this.positionMinimap();
  }

  private ensureMinimap() { ensureMinimap(this); }

  private positionMinimap() { positionMinimap(this); }

  private renderMinimap() { renderMinimap(this); }

  // ===== ESC 主選單（一級：功能；二級：地點）=====
  private getMenuItems(): { label: string; value: string }[] {
    if (this.menuLevel === 1) return [
      { label: '購物籃', value: 'basket' },
      { label: '地點', value: 'locations' },
    ];
    // level 2: locations（動態列出 TPE-01 ~ TPE-12）
    const tpeIds = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
    const tpeItems = tpeIds.map(id => ({ label: `TPE-${id} 地圖`, value: `TPE:${id}` }));
    return [
      ...tpeItems,
      { label: '桃園 1F 大廳', value: 'TaoyuanF1Scene' },
      { label: '桃園 2F 商場', value: 'TaoyuanF2Scene' },
      { label: '桃園 3F（現有）', value: 'AirportScene' },
    ];
  }
  private renderMenu() {
    // 清理舊元素
    try { this.menuRows.forEach(r => { try { r.destroy(); } catch {} }); } catch {}
    this.menuRows = [];
    const pad = 8;
    const FS = CONFIG.ui.fontSize;
    const HUD = CONFIG.ui.hudHeight;
    const { w: viewW, h: viewH } = this.getViewSize();
    const items = this.getMenuItems();
    // 簡單估算寬度（避免不同平台 make.text 行為差異造成錯誤）
    const maxChars = Math.max(6, ...items.map(i => i.label.length));
    const textW = Math.max(120, Math.ceil(maxChars * FS * 0.62));
    const rowH = FS + 8;
    let panelW = Math.min(viewW - pad * 2, textW + pad * 2 + 20);
    const panelH = Math.min(viewH - HUD * 2, items.length * rowH + pad * 2 + FS + 6);
    const x = Math.round((viewW - panelW) / 2);
    const y = Math.round((viewH - panelH) / 2);

    if (!this.menuBox) this.menuBox = this.add.graphics().setDepth(2100).setScrollFactor(0);
    const g = this.menuBox; g.clear();
    g.fillStyle(0x000000, 0.85).fillRect(x, y, panelW, panelH);
    g.lineStyle(1, 0x3a4558, 1).strokeRect(x + 0.5, y + 0.5, panelW - 1, panelH - 1);

    // 標題與提示
    const title = (this.menuLevel === 1) ? '選單' : '地點';
    const titleObj = this.add.text(x + pad, y + pad - Math.max(0, Math.round(FS * 0.2)), title, { fontSize: `${FS}px`, color: '#cfe2f3', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' }).setDepth(2101).setScrollFactor(0);
    this.menuRows.push(titleObj as any);

    // 列表項
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const rowY = y + pad + FS + 6 + i * rowH; // 留出標題區塊高度
      const row = this.add.text(x + pad, rowY, it.label, { fontSize: `${FS}px`, color: i === this.menuSelected ? '#ffd17a' : '#e6f0ff', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' }).setDepth(2101).setScrollFactor(0);
      this.menuRows.push(row);
    }
    this.scene.bringToTop();
  }
  private moveMenu(dir: 1 | -1) {
    if (!this.menuOpen) return;
    const items = this.getMenuItems();
    const max = items.length;
    if (!max) return;
    this.menuSelected = (this.menuSelected + (dir === 1 ? 1 : -1) + max) % max;
    this.renderMenu();
  }
  private pickMenu() {
    if (!this.menuOpen) return;
    const items = this.getMenuItems();
    if (!items.length) return;
    const chosen = items[this.menuSelected];
    if (this.menuLevel === 1) {
      if (chosen.value === 'basket') { this.closeMenu(); this.openBasket(); return; }
      if (chosen.value === 'locations') { this.menuLevel = 2; this.menuSelected = 0; this.renderMenu(); return; }
      return;
    }
    // level 2: switch scene — stop others then start target
    const val = chosen.value;
    const startClean = (key: string, data?: any) => {
      this.closeMenu();
      try {
        const actives = this.game.scene.getScenes(true).filter((s: any) => s.scene?.key && s.scene.key !== 'UIOverlay');
        for (const s of actives) { if (s.scene.key !== key) { try { this.game.scene.stop(s.scene.key); } catch {} } }
      } catch {}
      try { this.game.scene.start(key, data); } catch {}
    };
    if (val.startsWith('TPE:')) {
      const id = val.split(':')[1] || '01';
      startClean('TPEMapScene', { id });
      return;
    }
    startClean(val);
  }

  // 覆寫頂部提示為選單提示，並在關閉時恢復
  private menuTip(): string { return 'W/S 選擇｜Enter 確認｜ESC 返回'; }
  private setTopHint(text: string) {
    try { this.hintText.setText(text); } catch {}
  }
  private openMenu() {
    this.menuOpen = true; this.menuLevel = 1; this.menuSelected = 0; this.updateInputLock();
    try { this.menuSavedHint = (this.hintText?.text as any) || (this.registry.get('hint') as string) || ''; } catch { this.menuSavedHint = null; }
    this.setTopHint(this.menuTip());
    this.renderMenu();
  }
  private closeMenu() {
    this.menuOpen = false; this.menuLevel = 1; this.menuSelected = 0; this.updateInputLock();
    try { this.menuBox?.clear(); this.menuBox?.destroy(); } catch {}
    try { this.menuRows.forEach(r => { try { r.destroy(); } catch {} }); } catch {}
    this.menuRows = []; this.menuBox = undefined;
    if (this.menuSavedHint !== null) this.setTopHint(this.menuSavedHint || ''); else this.refresh();
  }

  // Render small interaction options panel near player (right side)
  private renderInteract() {
    // Do not show when dialog/listing/basket is open
    if (this.dialogOpen || this.listingOpen || this.basketOpen) {
      try { this.interactBox?.clear(); this.interactBox?.setVisible(false); } catch {}
      try { this.interactRows.forEach(r => { try { r.destroy(); } catch {} }); } catch {}
      this.interactRows = [];
      return;
    }
    const open = !!this.registry.get('interactOpen');
    const opts: string[] = (this.registry.get('interactOptions') as any[]) || [];
    const playerPos = (this.registry.get('playerPos') as { x: number; y: number } | undefined);
    if (!open || !opts.length || !playerPos) {
      try { this.interactBox?.clear(); this.interactBox?.setVisible(false); } catch {}
      try { this.interactRows.forEach(r => { try { r.destroy(); } catch {} }); } catch {}
      this.interactRows = [];
      return;
    }
    const FS = CONFIG.ui.small;
    if (!this.interactMeasure) {
      this.interactMeasure = this.add.text(-9999, -9999, '', { fontSize: `${FS}px`, color: '#e6f0ff', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' }).setVisible(false).setScrollFactor(0);
    } else {
      const cur = this.interactMeasure.style.fontSize as any; if (cur !== `${FS}px`) this.interactMeasure.setFontSize(FS);
    }
    let maxW = 0; const pad = 6; const gap = 2;
    for (const s of opts) { this.interactMeasure!.setText(s); maxW = Math.max(maxW, Math.ceil(this.interactMeasure!.width)); }
    const panelW = maxW + pad * 2;
    const panelH = pad * 2 + opts.length * (FS + gap);
    // World->screen conversion using top scene camera
    const active = this.game.scene.getScenes(true).filter((s: any) => s.scene?.key !== 'UIOverlay');
    const top: any = active[active.length - 1] as any;
    const cam: any = top?.cameras?.main;
    let x = 8, y = 8;
    if (cam) {
      const baseX = (typeof cam.worldView?.x === 'number') ? cam.worldView.x : (cam.scrollX || 0);
      const baseY = (typeof cam.worldView?.y === 'number') ? cam.worldView.y : (cam.scrollY || 0);
      const z = cam.zoom || 1;
      const screenX = (playerPos.x - baseX) * z;
      const screenY = (playerPos.y - baseY) * z;
      x = Math.round(screenX + 10);
      y = Math.round(screenY - panelH + 4);
    }
    if (!this.interactBox) this.interactBox = this.add.graphics().setDepth(1600).setScrollFactor(0);
    const g = this.interactBox;
    g.clear().fillStyle(0x0b111a, 0.85).fillRect(x, y, panelW, panelH).lineStyle(1, 0x4a5668, 1).strokeRect(x + 0.5, y + 0.5, panelW - 1, panelH - 1).setVisible(true);
    try { this.interactRows.forEach(r => { try { r.destroy(); } catch {} }); } catch {}
    this.interactRows = [];
    for (let i = 0; i < opts.length; i++) {
      const row = this.add.text(x + pad, y + pad + i * (FS + gap), opts[i], { fontSize: `${FS}px`, color: '#e6f0ff', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' }).setScrollFactor(0).setDepth(1601);
      this.interactRows.push(row);
    }
  }

  // 右側商店清單（固定在畫面右側，無視縮放）
  private renderListing() {
    const open = !!this.registry.get('listingOpen');
    this.listingOpen = open;
    this.updateInputLock();
    const items: { name: string; price: number; id: string }[] = (this.registry.get('listingItems') as any[]) || [];
    const selected: number = (this.registry.get('listingSelected') as number) ?? 0;
    const playerPos = (this.registry.get('playerPos') as { x: number; y: number } | undefined);

    // 清理舊行
    try { this.listingRows.forEach(r => { try { r.destroy(); } catch {} }); } catch {}
    this.listingRows = [];
    if (!open) {
      try { this.listingBox?.destroy(); } catch {}
      this.listingBox = undefined;
      return;
    }
    const FS = CONFIG.ui.fontSize;
    const HUD = CONFIG.ui.hudHeight;
    const { w: viewW, h: viewH } = this.getViewSize();
    const pad = 6;
    // 自適應寬度：量測標題與各列文字的最寬寬度
    if (!this.listingMeasure) {
      this.listingMeasure = this.add.text(-9999, -9999, '', { fontSize: `${FS}px`, color: '#e6f0ff', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' }).setVisible(false).setScrollFactor(0);
    } else {
      // 若字級變動，更新量測物件字級
      const cur = this.listingMeasure.style.fontSize as any;
      const want = `${FS}px`;
      if (cur !== want) this.listingMeasure.setFontSize(FS);
    }
    let maxTextW = 0;
    const toMeasure: string[] = [String(t('store.listTitle') || '商品')];
    items.forEach((it, idx) => {
      const prefix = idx === selected ? '>' : ' ';
      const line = (it as any).id === '__exit' ? `${prefix} ${t('store.listExit') || '結束對話'}` : `${prefix} ${it.name}  $${it.price}`;
      toMeasure.push(line);
    });
    toMeasure.forEach(txt => {
      this.listingMeasure!.setText(txt);
      maxTextW = Math.max(maxTextW, Math.ceil(this.listingMeasure!.width));
    });
    const minPanelW = Math.max(200, FS * 10);
    let panelW = Math.max(minPanelW, maxTextW + pad * 2);
    const h = Math.max(60, viewH - (HUD * 2) - pad * 2);
    // 目標：顯示在主角右側（螢幕座標）。
    // 先取得目前主要場景的相機與其 worldView/zoom
    // 取得目前主要內容場景（優先 StoreScene）
    let cam: any = null;
    try { cam = (this.game.scene.getScene('StoreScene') as any)?.cameras?.main || null; } catch {}
    if (!cam) {
      const scenes = this.game.scene.getScenes(true).filter((s: any) => s.scene?.key !== 'UIOverlay');
      const guess = scenes.find((s: any) => s?.cameras?.main) || scenes[scenes.length - 1];
      cam = (guess as any)?.cameras?.main || null;
    }
    let sx = viewW - panelW - pad; // fallback：螢幕右側
    let sy = HUD + pad;
    if (cam && playerPos) {
      // world -> screen（以像素計）：(world - scroll) * zoom
      const baseX = (typeof cam.worldView?.x === 'number') ? cam.worldView.x : (cam.scrollX || 0);
      const baseY = (typeof cam.worldView?.y === 'number') ? cam.worldView.y : (cam.scrollY || 0);
      const screenX = (playerPos.x - baseX) * (cam.zoom || 1);
      const screenY = (playerPos.y - baseY) * (cam.zoom || 1);
      const offset = 12; // 與主角的水平間距（像素）
      sx = screenX + offset;
      // 垂直置中，但不壓到 HUD 與底部狀態列
      sy = screenY - Math.floor(h / 2);
      // 邊界修正
      if (sx + panelW + pad > viewW) sx = Math.max(pad, viewW - panelW - pad);
      if (sx < pad) sx = pad;
      const minY = HUD + pad;
      const maxY = viewH - HUD - h - pad;
      if (sy < minY) sy = minY;
      if (sy > maxY) sy = maxY;
    }
    if (!this.listingBox) {
      const g = this.add.graphics();
      g.fillStyle(0x0b111a, 0.85);
      g.fillRect(sx, sy, panelW, h);
      g.lineStyle(1, 0x4a5668, 1);
      g.strokeRect(sx + 0.5, sy + 0.5, panelW - 1, h - 1);
      g.setDepth(1500).setScrollFactor(0);
      this.listingBox = g;
    } else {
      this.listingBox.clear().fillStyle(0x0b111a, 0.85).fillRect(sx, sy, panelW, h).lineStyle(1, 0x4a5668, 1).strokeRect(sx + 0.5, sy + 0.5, panelW - 1, h - 1).setScrollFactor(0).setDepth(1500);
    }
    // 內容
    const startX = sx + pad;
    let curY = sy + pad;
    const title = this.add.text(startX, curY, t('store.listTitle') || '商品', { fontSize: `${FS}px`, color: '#e6f0ff', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' }).setDepth(1501).setScrollFactor(0);
    this.listingRows.push(title);
    curY += (FS + 4);
    items.forEach((it, idx) => {
      const prefix = idx === selected ? '>' : ' ';
      const line = (it as any).id === '__exit' ? `${prefix} ${t('store.listExit') || '結束對話'}` : `${prefix} ${it.name}  $${it.price}`;
      const row = this.add.text(startX, curY, line, { fontSize: `${FS}px`, color: idx === selected ? '#ffffff' : '#c0c8d0', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' }).setDepth(1501).setScrollFactor(0);
      this.listingRows.push(row);
      curY += CONFIG.ui.lineStep;
    });
    try { this.scene.bringToTop(); } catch {}
  }

  update() {
    // 開啟對話時每幀校正位置與內容，避免首幀或縮放時跑位
    if (this.dialogOpen || this.dialogForceFrames > 0) {
      try { this.renderDialog(); this.scene.bringToTop(); } catch {}
      if (this.dialogForceFrames > 0) this.dialogForceFrames--;
    }
    // 開啟清單時每幀校正，跟隨主角位置
    if (this.listingOpen || this.listingForceFrames > 0) {
      try { this.renderListing(); this.scene.bringToTop(); } catch {}
      if (this.listingForceFrames > 0) this.listingForceFrames--;
    }
  }
}







