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
  ui: {
    fontSize: 10,
    small: 9,
    tiny: 8,
    hudHeight: 14,
    lineStep: 12,
    dialogHeight: 20,
  }
};

