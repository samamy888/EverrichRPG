export type FillMode = 'fit' | 'cover';

export const CONFIG = {
  // 是否在執行時預設顯示字型偵測面板（可用於開發階段）
  debugFonts: false,

  scale: {
    // 是否啟用整數縮放（像素最清晰）
    integerZoomEnabled: true,
    // 預設整數倍率（1~8）
    preferredIntZoom: 3,
    // 視窗填滿策略：fit=完整顯示留黑邊；cover=充滿視窗可能裁切
    fillMode: 'cover' as FillMode,
    // 允許的整數倍率範圍
    minZoom: 1,
    maxZoom: 8,
  },
  controls: {
    baseSpeed: 80,
    runMultiplier: 1.9,
  },
  ui: {
    // 唯一需要人工調整的值：其他皆為衍生值
    fontSize: 24,
    get small(): number { return Math.max(9, Math.round(this.fontSize * 0.45)); },
    get tiny(): number { return Math.max(8, Math.round(this.fontSize * 0.35)); },
    // 頂/底 HUD 高度：字體大小 + 8 像素留白
    get hudHeight(): number { return Math.max(16, this.fontSize + 8); },
    // 行距：字體大小 + 2
    get lineStep(): number { return this.fontSize + 2; },
    // 對話框/購物籃最小高度：字體大小 + 16（至少 40）
    get dialogHeight(): number { return Math.max(40, this.fontSize + 16); },
    minimap: {
      enabled: true,
      maxWidth: 140,
      maxHeight: 60,
      pad: 4,
      backgroundAlpha: 0.35,
    }
  }
};
