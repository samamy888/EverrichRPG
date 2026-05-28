import * as Phaser from 'phaser';
import { registerTinyBitmapFont } from './BitmapFont';
import { CONFIG } from '../config';
import { t } from '../i18n';
import { GAME_WIDTH, GAME_HEIGHT } from '../main';
import { ensureMinimap, positionMinimap, renderMinimap } from './overlays/minimap';
import { initChat, destroyChat } from './chat';
import { openBasket as extOpenBasket, closeBasket as extCloseBasket, renderBasket as extRenderBasket, moveBasket as extMoveBasket, pickBasket as extPickBasket } from './overlays/basket';
import { openDialog as extOpenDialog, advanceDialog as extAdvanceDialog, closeDialog as extCloseDialog } from './overlays/dialog';

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
  private hintFrame!: Phaser.GameObjects.Graphics;
  private hintText!: Phaser.GameObjects.Text;
  private locationText!: Phaser.GameObjects.Text;
  private locationIcon!: Phaser.GameObjects.Image;
  private statusBox!: Phaser.GameObjects.Rectangle;
  private statusFrame!: Phaser.GameObjects.Graphics;
  private statusText!: Phaser.GameObjects.Text;
  private rpgStatusBox!: Phaser.GameObjects.Rectangle;
  private rpgStatusFrame!: Phaser.GameObjects.Graphics;
  private moneyIcon!: Phaser.GameObjects.Image;
  private basketIcon!: Phaser.GameObjects.Image;
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
  private menuLevel: 1 | 2 = 1; // 1=銝駁?? 2=?圈?皜
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
  public minimapImg?: Phaser.GameObjects.Image;
  // Track last known top (content) scene key to help minimap during transitions
  private currentTopKey: string | null = null;
  private hudProbeEl?: HTMLDivElement;
  private hudProbeGfx?: Phaser.GameObjects.Graphics;
  private domHudRoot?: HTMLDivElement;
  private domTop?: HTMLDivElement;
  private domLoc?: HTMLDivElement;
  private domBottom?: HTMLDivElement;
  private domMoney?: HTMLDivElement;
  private domProbeMode = false;
  private shouldShowMinimap(): boolean {
    try {
      if (!CONFIG.ui.minimap.enabled) return false;
      const active = this.game.scene.getScenes(true).filter((s: any) => s.scene?.key !== 'UIOverlay');
      const top: any = active[active.length - 1];
      const topKey: string | undefined = top?.scene?.key;
      if (topKey === 'StoreScene') return false;
      // ?仿?撅文?舀?靘?tilemap layer嚗?銝敺＊蝷綽??舀雿??啣??????砍惜嚗?
      if (top && top.layer && typeof top.layer.getTileAt === 'function') return true;
      // 敺?嚗? locationType ?文?
      const locType = (this.registry.get('locationType') as string) || '';
      return locType.startsWith('concourse');
    } catch { return !!CONFIG.ui.minimap.enabled; }
  }

  constructor() { super('UIOverlay'); }

  create() {
    // ???嚗?閬?銝餃?荔??豢??祈澈蝬剜??航?
    // 撠虜?典極?瑟??啣?臬祕靘?靘踵憭璅∠?嚗隞?any ?嚗?
    ;(this as any).CONFIG = CONFIG; (this as any).t = t;
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
    this.cameras.main.setAlpha(1);
    this.cameras.main.setRoundPixels(true);
    this.syncUICameraViewport();
    this.initHudProbe();
    this.initDomHud();

    // 閮餃?皜??摩
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.registry.events.off('changedata', this.onDataChanged, this);
      // 敺孵?皜??予摰?
      try { destroyChat(); } catch {}
      try { this.domHudRoot?.remove(); } catch {}
      this.domHudRoot = undefined;
    });
    this.events.on(Phaser.Scenes.Events.WAKE, () => { try { (window as any).__applyCameraZoom?.(); } catch {} });
    this.events.on(Phaser.Scenes.Events.RESUME, () => { try { (window as any).__applyCameraZoom?.(); } catch {} });
    try { (window as any).__applyCameraZoom?.(); } catch {}
    // 蝣箔?閬?撅斗偶??銝惜
    this.scene.bringToTop();
    this.events.on(Phaser.Scenes.Events.WAKE, () => this.scene.bringToTop());
    this.events.on(Phaser.Scenes.Events.RESUME, () => this.scene.bringToTop());

    // Register bitmap font for numeric values
    registerTinyBitmapFont(this);

    // Top hint box + texts (left: hint, right: location)
    const HUD = CONFIG.ui.hudHeight;
    const FS = CONFIG.ui.fontSize;
    const HFS = FS + (((CONFIG.ui as any).hintDelta || 0));
    this.hintBox = this.add.rectangle(0, 0, GAME_WIDTH, HUD, 0x111420, 0.92).setOrigin(0).setDepth(998).setScrollFactor(0);
    this.hintFrame = this.add.graphics().setDepth(999).setScrollFactor(0);
    this.hintText = this.add.text(8, Math.max(1, Math.floor((HUD - HFS) / 2)), '', { fontSize: `${HFS}px`, resolution: 2, color: '#f7f2df', fontFamily: 'HanPixel, system-ui, sans-serif' }).setDepth(1000).setScrollFactor(0);
    this.locationText = this.add.text(GAME_WIDTH - 8, Math.max(1, Math.floor((HUD - FS) / 2)), '', { fontSize: `${FS}px`, resolution: 2, color: '#f6c067', fontFamily: 'HanPixel, system-ui, sans-serif' })
      .setOrigin(1, 0)
      .setDepth(1000)
      .setScrollFactor(0);
    this.ensureLocationIcons();
    this.ensureStatusIcons();
    this.locationIcon = this.add.image(GAME_WIDTH - 4, 3, 'icon-concourse').setOrigin(1, 0).setDepth(1000).setVisible(false).setScrollFactor(0);
    this.moneyIcon = this.add.image(-9999, -9999, 'icon-money').setDepth(1206).setScrollFactor(0);
    this.basketIcon = this.add.image(-9999, -9999, 'icon-basket').setDepth(1206).setScrollFactor(0);

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
    this.moneyValue = this.add.bitmapText(-9999, -9999, 'tiny5x7', '', 10).setVisible(true).setDepth(1206).setScrollFactor(0);
    this.basketValue = this.add.bitmapText(-9999, -9999, 'tiny5x7', '', 10).setVisible(true).setDepth(1206).setScrollFactor(0);

    this.registry.events.on('changedata', this.onDataChanged, this);

    // Bottom status box + text嚗祕??蝵桀 layoutHUD 銝剛?蝞?
    this.statusBox = this.add.rectangle(0, 0, GAME_WIDTH, HUD, 0x111420, 0.92).setOrigin(0).setDepth(998).setScrollFactor(0);
    this.statusFrame = this.add.graphics().setDepth(999).setScrollFactor(0);
    this.statusText = this.add.text(8, 0, '', { fontSize: `${FS}px`, resolution: 2, color: '#d6def0', fontFamily: 'HanPixel, system-ui, sans-serif' }).setDepth(1000).setScrollFactor(0);
    this.rpgStatusBox = this.add.rectangle(0, 0, 1, 1, 0x141a28, 0.94).setOrigin(0).setDepth(1204).setScrollFactor(0);
    this.rpgStatusFrame = this.add.graphics().setDepth(1205).setScrollFactor(0);

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
    // 蝣箔??餃敺?憪??予摰支蒂靘摮??＊蝷?
    try { initChat(this.game as any); } catch {}
    // 隞乩?銝撟???其?甈∠葬?橘??踹??活????臬??芸??遣蝡??湔?靘?甇?Ⅱ
    try { this.time.delayedCall(0, () => { try { (window as any).__applyCameraZoom?.(); } catch {} }); } catch {}
    // ?嗉?蝒之撠?瘥?霈???蝣箔?閬?撅支?銝韏瑟??
    try {
      this.scale.on('resize', () => {
        try { this.syncUICameraViewport(); } catch {}
        try { (window as any).__applyCameraZoom?.(); } catch {}
        try { this.layoutHUD(); } catch {}
        try { this.renderMinimap(); } catch {}
      });
    } catch {}
    // Global scene lifecycle hooks to keep minimap in sync when switching maps
    try {
      const ge: any = (this.game.scene as any).events;
      const log = (...args: any[]) => { try { if (new URL(window.location.href).searchParams.get('debugMinimap') === '1' || (window as any).__debugMinimap) console.debug('[minimap]', ...args); } catch {} };
      const noteTop = (key?: string, sc?: any, tag?: string) => {
        const k = (typeof key === 'string' && key) ? key : (sc?.scene?.key || sc?.key);
        if (k && k !== 'UIOverlay') {
          this.currentTopKey = k; (window as any).__minimapTopKey = k; log('top:=', k, tag || '');
        }
      };
      const rerender = (evt?: string) => { log('rerender', evt || '', 'top=', this.currentTopKey); try { this.ensureMinimap(); this.positionMinimap(); this.renderMinimap(); } catch (e) { log('rerender error', e); } };
      ge.on('start', (key: any, sc: any) => { noteTop(key, sc, 'start'); rerender('start'); });
      ge.on('transitioncomplete', (key: any, sc: any) => { noteTop(key, sc, 'transitioncomplete'); rerender('transitioncomplete'); });
      ge.on('wake', (sc: any) => { noteTop(undefined as any, sc, 'wake'); rerender('wake'); });
      ge.on('resume', (sc: any) => { noteTop(undefined as any, sc, 'resume'); rerender('resume'); });
      // ???典??皜脫?隞蝯血??批捆?湔??create 敺??
      (window as any).__rerenderMinimap = () => { try { rerender('manual'); this.time.delayedCall(0, () => rerender('manual-next')); requestAnimationFrame(() => rerender('manual-raf')); } catch (e) { log('manual error', e); } };
    } catch {}

    // ?望??折?蝜迎?蝣箔??豢??摰嗥宏??嚗??啣????湔嚗????隞園?蝜芯???
    try {
      this.time.addEvent({ delay: 120, loop: true, callback: () => { try { if (this.shouldShowMinimap()) { (window as any).__rerenderMinimap?.(); } } catch {} } });
    } catch {}

    // Global ESC menu and navigation
    this.input.keyboard!.on('keydown-ESC', () => {
      // 撠店???桅???嚗???銝駁??
      if (this.dialogOpen || this.listingOpen) return;
      if (this.menuOpen) {
        // 2 蝝?? 1 蝝?1 蝝???
        if (this.menuLevel === 2) { this.menuLevel = 1; this.menuSelected = 0; this.renderMenu(); }
        else this.closeMenu();
      } else {
        this.openMenu();
      }
    });
    // 撠汗嚗????????綽?銝駁??or 鞈潛蝐?
    const navUp = () => { if (this.menuOpen) this.moveMenu(-1); else this.moveBasket(-1); };
    const navDown = () => { if (this.menuOpen) this.moveMenu(1); else this.moveBasket(1); };
    this.input.keyboard!.on('keydown-W', navUp);
    this.input.keyboard!.on('keydown-UP', navUp);
    this.input.keyboard!.on('keydown-S', navDown);
    this.input.keyboard!.on('keydown-DOWN', navDown);
    const confirm = () => { if (this.menuOpen) this.pickMenu(); else this.pickBasket(); };
    this.input.keyboard!.on('keydown-E', confirm);
    this.input.keyboard!.on('keydown-ENTER', confirm);
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
        // 撠店????嚗?撟?航撠摰?蝮格/??嚗蕭??甈∩??芷?蝜?
        try { this.time.delayedCall(0, () => this.renderDialog()); } catch {}
        try { this.time.delayedCall(16, () => this.renderDialog()); } catch {}
        try { requestAnimationFrame(() => this.renderDialog()); } catch {}
      }
    // ?交敺???>??嚗??喟蔭??
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

    // 蝘駁??甈?憿舐內
    this.moneyValue.setText(`$${money}`);
    this.basketValue.setText(`$${basketTotal}`);

    const hint = (this.registry.get('hint') as string) ?? '';
    const hintLarge = !!this.registry.get('hintLarge');
    if (this.menuOpen) {
      this.hintText.setText(this.menuTip());
    } else if (this.basketOpen) {
      const bh = (t('ui.basketHint') as string) || '';
      this.hintText.setText(bh && bh !== 'ui.basketHint' ? bh : '鞈潛蝐?W/S ?豢?嚗 蝘駁嚗SC ??');
    } else if (this.dialogOpen) {
      this.hintText.setText(t('store.dialog.cont') || 'Press E to continue');
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

    this.statusText.setText(this.hintText.text || '');
    this.layoutHUD();
    this.updateDomHud();
  }

  // ?璅∪?憿舐內摮?頛???蝬脣??? ?debugFonts=1 ??#debugFonts ??嚗?
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
    const msg = `Font Bitmap(han): ${hasBitmap ? 'OK' : 'MISS'} | Web(HanPixel): ${hasWeb ? 'OK' : 'MISS'}`;
    this.fontDebugText.setText(msg);
    console.info('[fonts]', { bitmap: hasBitmap, web: hasWeb });
  }

  private openBasket() { (extOpenBasket as any)(this); }
  private closeBasket() { (extCloseBasket as any)(this); }
  private renderBasket() { (extRenderBasket as any)(this); }
  private moveBasket(dir: 1 | -1) { (extMoveBasket as any)(this, dir); }
  private pickBasket() { (extPickBasket as any)(this); }

  // 撠店閬?撅歹?憭??頃?拍?銝?湛?蝵桀?嚗?
  private renderDialog() {
    const open = !!this.registry.get('dialogOpen');
    this.dialogOpen = open;
    this.updateInputLock();
    const lines: string[] = (this.registry.get('dialogLines') as string[]) || [];
    const step = (this.registry.get('dialogStep') as number) ?? 0;
    const playerPos = (this.registry.get('playerPos') as { x: number; y: number } | undefined);

    // 皜?????
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

    // 皞????批捆嚗??乩?摨?
    const fallbackFirst = (t('store.dialog.l1') as string) || '';
    const currentLine = (Array.isArray(lines) && lines.length > step)
      ? (lines[step] || '')
      : (Array.isArray(lines) && lines.length > 0 ? (lines[0] || '') : fallbackFirst);
    const txt = `${currentLine} ${t('store.dialog.cont') || ''}`.trim();

    // ?遣蝡?摮誑??撠箏站
    let tempText = this.add.text(0, 0, txt, { fontSize: `${FS}px`, color: '#e6f0ff', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' }).setDepth(2001).setScrollFactor(0);
    const textW = Math.ceil(tempText.width);
    const textH = Math.ceil(tempText.height);
    let panelW = Math.max(120, textW + pad * 2);
    let panelH = Math.max(CONFIG.ui.dialogHeight, textH + pad * 2);

    // ??憿舐內?其蜓閫?湛??亦銝餉?摨扳?????剁?
    let x = 0, y = 0;
    let placedByPlayer = false;
    try {
      // ?? StoreScene ?豢?
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
        // ??靽格迤嚗????HUD ??甈??踹?頞撌血??
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
      // ??摨 HUD 銝嚗???銵銝?湛?
      x = 0;
      y = viewH - HUD - panelH - 2;
    }

    // ?湔?獢?
    if (!this.dialogBox) {
      this.dialogBox = this.add.rectangle(x, y, panelW, panelH, 0x000000, 0.8).setOrigin(0).setDepth(2000).setScrollFactor(0);
    } else {
      this.dialogBox.setPosition(x, y).setSize(panelW, panelH).setDepth(2000).setVisible(true).setScrollFactor(0);
    }

    // 蝘餃????唳??折?嗡?蝵殷?撌虫??扯?嚗?
    tempText.setPosition(x + pad, y + pad);
    this.dialogRows.push(tempText);
    try { this.scene.bringToTop(); } catch {}
  }

  // ?祇? API嚗??湔?湔?批撠店嚗??隞嗆?摨奎??
  public openDialog(lines: string[], step = 0) { extOpenDialog(this, lines, step); }
  public advanceDialog(): boolean { return extAdvanceDialog(this); }
  public closeDialog() { extCloseDialog(this); }

  // ?寞??嗅?閬?撅斤??????圾?摰嗥宏?撓??
  private updateInputLock() {
    const lock = !!(this.basketOpen || this.dialogOpen || this.listingOpen || this.menuOpen);
    try { this.registry.set('inputLocked', lock); } catch {}
  }

  private ensureLocationIcons() {
    const makeIcon = (key: string, draw: (g: Phaser.GameObjects.Graphics) => void) => {
      if (this.textures.exists(key)) return;
      const g = this.add.graphics({ x: 0, y: 0 });
      g.clear();
      draw(g);
      g.generateTexture(key, 12, 12);
      g.destroy();
    };
    makeIcon('icon-concourse', (g) => {
      g.fillStyle(0xffd17a, 1); g.fillRect(2, 5, 8, 3);
      g.fillStyle(0x1b4f66, 1); g.fillRect(1, 3, 10, 2);
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

  private ensureStatusIcons() {
    const makeIcon = (key: string, draw: (g: Phaser.GameObjects.Graphics) => void) => {
      if (this.textures.exists(key)) return;
      const g = this.add.graphics({ x: 0, y: 0 });
      g.clear();
      draw(g);
      g.generateTexture(key, 12, 12);
      g.destroy();
    };
    makeIcon('icon-money', (g) => {
      g.fillStyle(0xd4a84b, 1); g.fillRect(2, 3, 8, 6);
      g.fillStyle(0xf6d98d, 1); g.fillRect(3, 4, 6, 4);
      g.fillStyle(0x7a5b21, 1); g.fillRect(5, 5, 2, 2);
    });
    makeIcon('icon-basket', (g) => {
      g.fillStyle(0x8b5a2b, 1); g.fillRect(2, 5, 8, 5);
      g.fillStyle(0xb07a45, 1); g.fillRect(3, 6, 6, 3);
      g.fillStyle(0xd8b588, 1); g.fillRect(4, 3, 1, 2); g.fillRect(7, 3, 1, 2);
      g.fillStyle(0x6b4522, 1); g.fillRect(5, 4, 2, 1);
    });
  }

  // 閮??桀??航??憭批?嚗誑?Ｗ???撠????漣璅?UI ?豢??箏? 1x嚗?
  private getViewSize() {
    let w = Number(this.cameras?.main?.width) || 0;
    let h = Number(this.cameras?.main?.height) || 0;
    if (!w || !h) {
      w = Number((this.scale as any)?.width) || 0;
      h = Number((this.scale as any)?.height) || 0;
    }
    try {
      const vw = Number((window as any).visualViewport?.width) || window.innerWidth || 0;
      const vh = Number((window as any).visualViewport?.height) || window.innerHeight || 0;
      if (vw && vh) {
        w = Math.round(vw);
        h = Math.round(vh);
      } else {
        const rect = (this.game as any).canvas?.getBoundingClientRect?.();
        if (rect?.width && rect?.height) {
          w = Math.round(rect.width);
          h = Math.round(rect.height);
        }
      }
    } catch {}
    if (!w || !h) {
      try { const c: any = (this.game as any).canvas; w = Number(c?.width) || 0; h = Number(c?.height) || 0; } catch {}
    }
    if (!w || !h) {
      w = window.innerWidth || GAME_WIDTH;
      h = window.innerHeight || GAME_HEIGHT;
    }
    return { w, h };
  }

  // 靘??航???摰???摨?HUD
  public layoutHUD() {
    const HUD = CONFIG.ui.hudHeight;
    const FS = CONFIG.ui.fontSize;
    const { w, h } = this.getViewSize();
    // Top thin navigation bar (location only)
    this.hintBox.setPosition(0, 0).setSize(w, HUD);
    this.hintFrame.clear();
    this.hintFrame.fillStyle(0x17141b, 0.84).fillRect(0, 0, w, HUD);
    this.hintFrame.fillStyle(0x2c2833, 0.3).fillRect(0, 0, w, 2);
    this.hintFrame.lineStyle(1, 0x3e4a63, 0.95).lineBetween(0, HUD - 0.5, w, HUD - 0.5);
    this.hintText.setVisible(false);
    // Right-top location
    const hasIcon = this.locationIcon.visible;
    if (hasIcon) {
      const iconW = this.locationIcon.displayWidth || 10;
      const topY = Math.max(2, Math.floor((HUD - FS) / 2));
      this.locationIcon.setPosition(w - 4, topY);
      this.locationText.setOrigin(1, 0).setPosition(w - 8 - iconW - 4, topY);
    } else {
      const topY = Math.max(2, Math.floor((HUD - FS) / 2));
      this.locationText.setOrigin(1, 0).setPosition(w - 8, topY);
    }
    // Bottom message window (RPG style)
    const msgH = Math.max(28, HUD + 6);
    this.statusBox.setVisible(true).setPosition(0, h - msgH).setSize(w, msgH);
    this.statusFrame.clear();
    this.statusFrame.fillStyle(0x17141b, 0.86).fillRect(0, h - msgH, w, msgH);
    this.statusFrame.fillStyle(0x2b2430, 0.3).fillRect(2, h - msgH + 2, w - 4, msgH - 4);
    this.statusFrame.lineStyle(1, 0xc59b53, 0.95).strokeRect(0.5, h - msgH + 0.5, w - 1, msgH - 1);
    this.statusFrame.lineStyle(1, 0x3e4a63, 0.95).strokeRect(1.5, h - msgH + 1.5, w - 3, msgH - 3);
    this.statusText.setVisible(true).setPosition(10, h - msgH + Math.max(4, Math.floor((msgH - FS) / 2)));
    this.statusText.setWordWrapWidth(Math.max(40, w - 20), true);

    // Place minimap first
    this.positionMinimap();

    this.layoutStatusPanel(h, HUD, msgH);
    // ?亥頃?拍???閰望???嚗?蝜芯誑蝚血??啣偕撖?    if (this.basketOpen) this.renderBasket();
    if (this.basketOpen) this.renderBasket();
    if (this.dialogOpen) this.renderDialog();
    if (this.listingOpen) this.renderListing();
    this.renderInteract();
    this.updateHudProbe();
    this.layoutDomHud();
  }

  private syncUICameraViewport() {
    try {
      const cam = this.cameras.main;
      const w = Number((this.scale as any)?.width) || window.innerWidth || GAME_WIDTH;
      const h = Number((this.scale as any)?.height) || window.innerHeight || GAME_HEIGHT;
      cam.setViewport(0, 0, w, h);
      cam.setSize(w, h);
    } catch {}
  }

  private initDomHud() {
    try {
      if (this.domHudRoot) return;
      const p = new URL(window.location.href).searchParams; const probeOn = p.get('hudprobe') === '1' || p.get('hudtest') === '1' || (navigator as any).webdriver === true;
      this.domProbeMode = probeOn;
      const root = document.createElement('div');
      root.id = 'ui-overlay-dom-hud';
      root.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483605;';

      const top = document.createElement('div');
      top.style.cssText = probeOn
        ? 'position:fixed;left:0;top:0;right:0;background:rgba(0,120,0,0.45);border-bottom:2px solid #00ff00;'
        : 'position:fixed;left:0;top:0;right:0;background:rgba(23,20,27,0.86);border-bottom:1px solid #3e4a63;';

      const loc = document.createElement('div');
      loc.style.cssText = 'position:absolute;right:10px;top:4px;color:#f6c067;font:24px HanPixel, system-ui, sans-serif;';
      top.appendChild(loc);

      const bottom = document.createElement('div');
      bottom.style.cssText = probeOn
        ? 'position:fixed;left:0;right:0;background:rgba(160,0,0,0.55);border-top:2px solid #ff4b4b;color:#ffffff;font:24px HanPixel, system-ui, sans-serif;padding-left:10px;box-sizing:border-box;display:flex;align-items:center;'
        : 'position:fixed;left:0;right:0;background:rgba(23,20,27,0.86);border-top:1px solid #c59b53;color:#d6def0;font:24px HanPixel, system-ui, sans-serif;padding-left:10px;box-sizing:border-box;display:flex;align-items:center;';

      const money = document.createElement('div');
      money.style.cssText = probeOn
        ? 'position:fixed;left:6px;background:rgba(255,0,255,0.9);border:2px solid #ffffff;color:#000000;font:20px HanPixel, system-ui, sans-serif;padding:4px 8px;'
        : 'position:fixed;left:6px;background:rgba(20,26,40,0.94);border:1px solid #c59b53;color:#f6d98d;font:20px HanPixel, system-ui, sans-serif;padding:4px 8px;';

      root.append(top, bottom, money);
      document.body.appendChild(root);
      this.domHudRoot = root;
      this.domTop = top;
      this.domLoc = loc;
      this.domBottom = bottom;
      this.domMoney = money;
      if (probeOn) {
        this.domBottom.textContent = 'DOM HUD PROBE';
        this.domMoney.textContent = 'DOM HUD';
      }
      this.layoutDomHud();
      this.updateDomHud();
    } catch {}
  }

  private layoutDomHud() {
    if (!this.domTop || !this.domBottom || !this.domMoney || !this.domHudRoot) return;
    try {
      const HUD = CONFIG.ui.hudHeight;
      const msgH = Math.max(28, HUD + 6);
      this.domTop.style.height = `${HUD}px`;
      this.domBottom.style.height = `${msgH}px`;
      this.domBottom.style.bottom = '0px';
      this.domBottom.style.lineHeight = '';
      this.domMoney.style.bottom = `${msgH + 8}px`;
    } catch {}
  }

  private updateDomHud() {
    if (!this.domLoc || !this.domBottom || !this.domMoney) return;
    try {
      const loc = (this.registry.get('location') as string) ?? '';
      const hint = (this.registry.get('hint') as string) ?? '';
      const money = (this.registry.get('money') as number) ?? 0;
      this.domLoc.textContent = loc;
      this.domBottom.textContent = hint || (this.domProbeMode ? 'DOM HUD PROBE' : '');
      this.domMoney.textContent = `$${money}`;
    } catch {}
  }

  private initHudProbe() {
    try {
      const params = new URL(window.location.href).searchParams;
      if (params.get('hudprobe') !== '1' && params.get('hudtest') !== '1' && (navigator as any).webdriver !== true) return;
      let el = document.getElementById('ui-overlay-probe') as HTMLDivElement | null;
      if (!el) {
        el = document.createElement('div');
        el.id = 'ui-overlay-probe';
        el.style.cssText = [
          'position:fixed',
          'left:8px',
          'top:48px',
          'z-index:2147483647',
          'background:rgba(0,0,0,0.78)',
          'color:#7bff9c',
          'padding:4px 6px',
          'font:11px/1.2 monospace',
          'border:1px solid #2d8f42',
          'pointer-events:none'
        ].join(';');
        document.body.appendChild(el);
      }
      this.hudProbeEl = el;
      if (!this.hudProbeGfx) {
        this.hudProbeGfx = this.add.graphics().setDepth(3000).setScrollFactor(0);
      }
      this.updateHudProbe();
    } catch {}
  }

  private updateHudProbe() {
    if (!this.hudProbeEl) return;
    try {
      const cam = this.cameras.main;
      const { w, h } = this.getViewSize();
      const statusY = Math.round(this.statusBox?.y || -1);
      const domRect = this.domBottom?.getBoundingClientRect?.();
      const domY = domRect ? `${Math.round(domRect.top)}-${Math.round(domRect.bottom)}` : 'n/a';
      this.hudProbeEl.textContent = `UIOverlay on | view=${w}x${h} cam=${Math.round(cam.width)}x${Math.round(cam.height)} z=${cam.zoom.toFixed(2)} sy=${Math.round(cam.scrollY)} y(status)=${statusY} domY=${domY}`;
      if (this.hudProbeGfx && statusY >= 0) {
        this.hudProbeGfx.clear();
        this.hudProbeGfx.fillStyle(0xff00ff, 0.85).fillRect(0, statusY, w, 3);
      }
    } catch {}
  }

  private layoutStatusPanel(viewH: number, hudH: number, messageH: number) {
    const panelConfig = CONFIG.ui.statusPanel;
    const showMoney = !!panelConfig.fields.money;
    const showBasket = !!panelConfig.fields.basket;
    const enabled = !!panelConfig.enabled && (showMoney || showBasket);

    if (!enabled) {
      this.rpgStatusBox.setVisible(false);
      this.rpgStatusFrame.clear();
      this.moneyIcon.setVisible(false);
      this.moneyValue.setVisible(false);
      this.basketIcon.setVisible(false);
      this.basketValue.setVisible(false);
      return;
    }

    const valueScale = panelConfig.valueScale;
    const pad = panelConfig.pad;
    const gap = panelConfig.gap;
    const iconW = 12;
    const iconGap = 8;
    const moneyTextW = showMoney ? Math.ceil((this.moneyValue.width || 0) * valueScale) : 0;
    const basketTextW = showBasket ? Math.ceil((this.basketValue.width || 0) * valueScale) : 0;
    const moneyW = showMoney ? iconW + iconGap + moneyTextW : 0;
    const basketW = showBasket ? iconW + iconGap + basketTextW : 0;
    const contentW = moneyW + basketW + (showMoney && showBasket ? gap : 0);
    const panelW = Math.max(panelConfig.minWidth, contentW + pad * 2);
    const panelH = panelConfig.height;
    const panelX = pad;
    const maxPanelY = viewH - messageH - panelH - pad;
    const panelY = Math.max(hudH + pad, maxPanelY);

    this.rpgStatusBox.setVisible(true).setPosition(panelX, panelY).setSize(panelW, panelH);
    this.rpgStatusFrame.clear();
    this.rpgStatusFrame.fillStyle(0x211b25, 0.38).fillRect(panelX + 2, panelY + 2, panelW - 4, panelH - 4);
    this.rpgStatusFrame.lineStyle(1, 0xc59b53, 0.95).strokeRect(panelX + 0.5, panelY + 0.5, panelW - 1, panelH - 1);
    this.rpgStatusFrame.lineStyle(1, 0x3e4a63, 0.95).strokeRect(panelX + 1.5, panelY + 1.5, panelW - 3, panelH - 3);

    const rowY = panelY + Math.max(5, Math.floor((panelH - 14) / 2));
    let cursorX = panelX + pad + 4;
    if (showMoney) {
      this.moneyIcon.setVisible(true).setPosition(cursorX, rowY + 1).setOrigin(0, 0).setScale(1.15);
      this.moneyValue.setVisible(true).setPosition(cursorX + iconW + iconGap, rowY + 2).setScale(valueScale);
      cursorX += moneyW + gap;
    } else {
      this.moneyIcon.setVisible(false);
      this.moneyValue.setVisible(false);
    }

    if (showBasket) {
      this.basketIcon.setVisible(true).setPosition(cursorX, rowY + 1).setOrigin(0, 0).setScale(1.15);
      this.basketValue.setVisible(true).setPosition(cursorX + iconW + iconGap, rowY + 2).setScale(valueScale);
    } else {
      this.basketIcon.setVisible(false);
      this.basketValue.setVisible(false);
    }
  }

  private ensureMinimap() { ensureMinimap(this); }

  private positionMinimap() { positionMinimap(this); }

  private renderMinimap() { renderMinimap(this); }

  // ===== ESC 銝駁?殷?銝蝝??嚗?蝝??圈?嚗?====
  private getMenuItems(): { label: string; value: string }[] {
    if (this.menuLevel === 1) return [
      { label: 'Basket', value: 'basket' },
      { label: 'Logout', value: 'logout' },
    ];
    return [
      { label: '獢? T2 憭批輒', value: 'TPE2LobbyScene' },
    ];
  }
  private renderMenu() {
    // 皜???蝝?
    try { this.menuRows.forEach(r => { try { r.destroy(); } catch {} }); } catch {}
    this.menuRows = [];
    const pad = 8;
    const FS = CONFIG.ui.fontSize;
    const HUD = CONFIG.ui.hudHeight;
    const { w: viewW, h: viewH } = this.getViewSize();
    const items = this.getMenuItems();
    // 蝪∪隡啁?撖砍漲嚗???像??make.text 銵撌桃???航炊嚗?
    const maxChars = Math.max(6, ...items.map(i => i.label.length));
    const textW = Math.max(120, Math.ceil(maxChars * FS * 0.62));
    const rowH = FS + 8;
    let panelW = Math.min(viewW - pad * 2, textW + pad * 2 + 20);
    const panelH = Math.min(viewH - HUD * 2, items.length * rowH + pad * 2 + FS + 6);
    const x = Math.round((viewW - panelW) / 2);
    const y = Math.round((viewH - panelH) / 2);

    if (!this.menuBox) this.menuBox = this.add.graphics().setDepth(2100).setScrollFactor(0);
    const g = this.menuBox; g.clear();
    g.fillStyle(0x151b28, 0.94).fillRect(x, y, panelW, panelH);
    g.fillStyle(0x0b1019, 0.45).fillRect(x + 2, y + 2, panelW - 4, panelH - 4);
    g.lineStyle(1, 0xc59b53, 1).strokeRect(x + 0.5, y + 0.5, panelW - 1, panelH - 1);
    g.lineStyle(1, 0x3e4a63, 1).strokeRect(x + 1.5, y + 1.5, panelW - 3, panelH - 3);
    g.lineStyle(1, 0x4f5f7e, 0.8).lineBetween(x + 4, y + FS + 8, x + panelW - 4, y + FS + 8);

    // 璅???蝷?
    const title = (this.menuLevel === 1) ? '?詨' : '?圈?';
    const titleObj = this.add.text(x + pad, y + pad - Math.max(0, Math.round(FS * 0.2)), title, { fontSize: `${FS}px`, color: '#f6c067', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' }).setDepth(2101).setScrollFactor(0);
    this.menuRows.push(titleObj as any);

    // ?”??
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const rowY = y + pad + FS + 6 + i * rowH; // ?璅??憛?摨?
      const row = this.add.text(x + pad, rowY, it.label, { fontSize: `${FS}px`, color: i === this.menuSelected ? '#ffe39b' : '#d6def0', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' }).setDepth(2101).setScrollFactor(0);
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
      if (chosen.value === 'logout') {
        this.closeMenu();
        // ?迫???臭蒂??餃?恍
        this.game.scene.getScenes(true).forEach(s => {
          if (s.scene.key !== 'UIOverlay') {
            try { this.game.scene.stop(s.scene.key); } catch {}
          }
        });
        this.game.scene.start('LoginScene');
        return;
      }
      return;
    }
    // level 2: switch scene ??stop others then start target
    const val = chosen.value;
    const startClean = (key: string, data?: any) => {
      this.closeMenu();
      // 閮??桀??湔???啣?蝮桀?鞈?雿?腹?
      try {
        const actives0 = this.game.scene.getScenes(true).filter((s: any) => s.scene?.key && s.scene.key !== 'UIOverlay');
        const curTop: any = actives0.length ? actives0[actives0.length - 1] : null;
        const k = (curTop as any)?.__minimapTex, w = (curTop as any)?.__minimapW, h = (curTop as any)?.__minimapH;
        if (k && w && h) (window as any).__minimapLast = { key: k, w, h };
      } catch {}
      // ????格??湔 key嚗?撠?隞交??唳炬?????
      try { this.currentTopKey = key; (window as any).__minimapTopKey = key; } catch {}
      // ???璅?荔??踹??函征蝒?瘝? top scene嚗??游??啣?皜征嚗?
      try { this.game.scene.start(key, data); } catch {}
      // 閫貊撠???唳葡??憭活靽嚗?
      try { (window as any).__rerenderMinimap?.(); } catch {}
      try { this.time.delayedCall(0, () => { try { (window as any).__rerenderMinimap?.(); } catch {} }); } catch {}
      try { this.time.delayedCall(80, () => { try { (window as any).__rerenderMinimap?.(); } catch {} }); } catch {}
      // ??甇Ｗ隞? UIOverlay???璅?舐??批捆?湔
      try {
        const actives = this.game.scene.getScenes(true).filter((s: any) => s.scene?.key && s.scene.key !== 'UIOverlay');
        for (const s of actives) { if (s.scene.key !== key) { try { this.game.scene.stop(s.scene.key); } catch {} } }
      } catch {}
    };
    startClean(val);
  }

  // 閬神??內?粹?格?蝷綽?銝血???敺?
  private menuTip(): string { return 'W/S ?豢?嚚nter 蝣箄?嚚SC 餈?'; }
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

  // ?喳??皜嚗摰?恍?喳嚗閬葬?橘?
  private renderListing() {
    const open = !!this.registry.get('listingOpen');
    this.listingOpen = open;
    this.updateInputLock();
    const items: { name: string; price: number; id: string }[] = (this.registry.get('listingItems') as any[]) || [];
    const selected: number = (this.registry.get('listingSelected') as number) ?? 0;
    const playerPos = (this.registry.get('playerPos') as { x: number; y: number } | undefined);

    // 皜???
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
    // ?芷?祝摨佗??葫璅?????摮??撖砍祝摨?
    if (!this.listingMeasure) {
      this.listingMeasure = this.add.text(-9999, -9999, '', { fontSize: `${FS}px`, color: '#e6f0ff', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' }).setVisible(false).setScrollFactor(0);
    } else {
      // ?亙?蝝????湔?葫?拐辣摮?
      const cur = this.listingMeasure.style.fontSize as any;
      const want = `${FS}px`;
      if (cur !== want) this.listingMeasure.setFontSize(FS);
    }
    let maxTextW = 0;
    const toMeasure: string[] = [String(t('store.listTitle') || '??')];
    items.forEach((it, idx) => {
      const prefix = idx === selected ? '>' : ' ';
      const line = (it as any).id === '__exit' ? `${prefix} ${t('store.listExit') || '蝯?撠店'}` : `${prefix} ${it.name}  $${it.price}`;
      toMeasure.push(line);
    });
    toMeasure.forEach(txt => {
      this.listingMeasure!.setText(txt);
      maxTextW = Math.max(maxTextW, Math.ceil(this.listingMeasure!.width));
    });
    const minPanelW = Math.max(200, FS * 10);
    let panelW = Math.max(minPanelW, maxTextW + pad * 2);
    const h = Math.max(60, viewH - (HUD * 2) - pad * 2);
    // ?格?嚗＊蝷箏銝餉??喳嚗撟漣璅???
    // ??敺?蜓閬?舐??豢?? worldView/zoom
    // ???桀?銝餉??批捆?湔嚗??StoreScene嚗?
    let cam: any = null;
    try { cam = (this.game.scene.getScene('StoreScene') as any)?.cameras?.main || null; } catch {}
    if (!cam) {
      const scenes = this.game.scene.getScenes(true).filter((s: any) => s.scene?.key !== 'UIOverlay');
      const guess = scenes.find((s: any) => s?.cameras?.main) || scenes[scenes.length - 1];
      cam = (guess as any)?.cameras?.main || null;
    }
    let sx = viewW - panelW - pad; // fallback嚗撟??
    let sy = HUD + pad;
    if (cam && playerPos) {
      // world -> screen嚗誑??閮?嚗?world - scroll) * zoom
      const baseX = (typeof cam.worldView?.x === 'number') ? cam.worldView.x : (cam.scrollX || 0);
      const baseY = (typeof cam.worldView?.y === 'number') ? cam.worldView.y : (cam.scrollY || 0);
      const screenX = (playerPos.x - baseX) * (cam.zoom || 1);
      const screenY = (playerPos.y - baseY) * (cam.zoom || 1);
      const offset = 12; // ?蜓閫?瘞游像??嚗?蝝?
      sx = screenX + offset;
      // ?蝵桐葉嚗?銝???HUD ???函???
      sy = screenY - Math.floor(h / 2);
      // ??靽格迤
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
    // ?批捆
    const startX = sx + pad;
    let curY = sy + pad;
    const title = this.add.text(startX, curY, t('store.listTitle') || '??', { fontSize: `${FS}px`, color: '#e6f0ff', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' }).setDepth(1501).setScrollFactor(0);
    this.listingRows.push(title);
    curY += (FS + 4);
    items.forEach((it, idx) => {
      const prefix = idx === selected ? '>' : ' ';
      const line = (it as any).id === '__exit' ? `${prefix} ${t('store.listExit') || '蝯?撠店'}` : `${prefix} ${it.name}  $${it.price}`;
      const row = this.add.text(startX, curY, line, { fontSize: `${FS}px`, color: idx === selected ? '#ffffff' : '#c0c8d0', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' }).setDepth(1501).setScrollFactor(0);
      this.listingRows.push(row);
      curY += CONFIG.ui.lineStep;
    });
    try { this.scene.bringToTop(); } catch {}
  }

  update() {
    try { this.scene.bringToTop(); } catch {}
    // ??撠店??撟?⊥迤雿蔭?摰對??踹?擐??葬?暹?頝?
    if (this.dialogOpen || this.dialogForceFrames > 0) {
      try { this.renderDialog(); this.scene.bringToTop(); } catch {}
      if (this.dialogForceFrames > 0) this.dialogForceFrames--;
    }
    // ??皜??撟?⊥迤嚗??其蜓閫?蝵?
    if (this.listingOpen || this.listingForceFrames > 0) {
      try { this.renderListing(); this.scene.bringToTop(); } catch {}
      if (this.listingForceFrames > 0) this.listingForceFrames--;
    }
  }
}








