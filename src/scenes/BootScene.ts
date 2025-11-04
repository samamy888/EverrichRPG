import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    // 嘗試載入中文字型（位圖字）
    // 將字型檔放在 public/fonts/han.fnt 與 public/fonts/han.png
    // 若不存在，載入會失敗，但不影響後續流程（採用系統字/高解析 Text 作為後備）
    // 僅在 URL 顯式要求時載入位圖字型，避免沒有檔案時噴錯
    const url = new URL(window.location.href);
    const wantBitmap = url.searchParams.get('useBitmapFont') === '1' || url.hash.includes('useBitmapFont');
    if (wantBitmap) {
      // 注意順序：先貼圖 PNG，再 XML/FNT
      this.load.bitmapFont('han', 'fonts/han.png', 'fonts/han.fnt');
    }
  }

  create() {
    // 等待 WebFont（HanPixel）就緒，避免初次顯示/切換時字體跳動
    const waitWebFont = async () => {
      try {
        const fonts: any = (document as any).fonts;
        const ready = fonts?.ready;
        // 最多等 1200ms，超時就先啟動場景
        if (fonts?.load) { await fonts.load("12px \"HanPixel\""); } if (fonts?.ready) { await fonts.ready; }
      } catch {}
    };

    (async () => {
      await waitWebFont();
      this.scene.start('ConcourseScene');
      this.scene.launch('UIOverlay');
      try { (window as any).__applyCameraZoom?.(); } catch {}
    })();
  }
}

