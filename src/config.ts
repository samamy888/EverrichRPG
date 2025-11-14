export const CONFIG = {
  // 是否在執行時預設顯示字型偵測面板（可用於開發階段）
  debugFonts: false,

  scale: {
    // 是否啟用整數縮放（像素最清晰）
    integerZoomEnabled: true,
    // 預設整數倍率（1~8）
    preferredIntZoom: 3,
    // 允許的整數倍率範圍
    minZoom: 1,
    maxZoom: 8,
  },
  controls: {
    baseSpeed: 200,
    runMultiplier: 3.0,
  },
  player: {
    initialMoney: 5000,
    // 可自訂玩家顯示名稱（預設使用瀏覽器暱稱或隨機）
    name: '' as string,
  },
  ui: {
    // 唯一需要人工調整的值：其他皆為衍生值
    fontSize: 24,
    hintDelta: 2,
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
      maxHeight: 80,
      pad: 4,
      backgroundAlpha: 0.35,
      tileScaleX: 1,
      tileScaleY: 3,
    }
  },
  network: {
    // WebSocket 伺服器位址
    // 留空表示自動依據目前頁面位置組合（避免部署時連到用戶端 localhost）
    wsUrl: '',
    // 自動模式參數：協定/路徑/埠（null=沿用目前頁面埠）
    wsPath: '/ws',
    wsPort: null as number | null,
    // 協定：auto=依據 http/https 選擇 ws/wss；always=一律 wss；never=一律 ws
    secure: 'auto' as 'auto' | 'always' | 'never',
    // 依執行環境（dev/build）選擇預設 WS URL（當 wsUrl 未設定時）
    useEnvDefault: true,
    devUrl: 'ws://localhost:5000/ws',
    prodUrl: 'wss://www.biudream.com:5050/ws',
    // REST API base
    apiBase: '',
    apiDev: 'http://localhost:5000/api',
    apiProd: 'https://www.biudream.com:5050/api',
    // 位置同步頻率（毫秒）
    moveIntervalMs: 60,
  },
  maps: {
    // 縮放 TPE 位圖地圖的比例（1 = 原尺寸；<1 縮小，>1 放大）
    tpeScale: 0.2,
  },
  npc: {
    // 人潮預設數量配置（可依偏好調整分佈）
    crowdCounts: { a: 6, hall: 8, b: 6 },
  }
};
