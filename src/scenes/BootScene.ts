import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    // 嘗試載入中文字型（位圖字）
    // 將字型檔放在 public/fonts/han.fnt 與 public/fonts/han.png
    // 若不存在，載入會失敗，但不影響後續流程（採用系統字/高解析 Text 作為後備）
    this.load.on('loaderror', (_file) => {
      // ignore missing fonts
    });
    this.load.bitmapFont('han', 'fonts/han.fnt', 'fonts/han.png');
  }

  create() {
    // 進入主場景與 UI
    this.scene.start('ConcourseScene');
    this.scene.launch('UIOverlay');
  }
}

