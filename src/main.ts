import * as Phaser from 'phaser';
import { StoreScene } from './scenes/StoreScene';
import { UIOverlay } from './ui/UIOverlay';
import { BootScene } from './scenes/BootScene';
import { LoginScene } from './scenes/LoginScene';
import { CONFIG } from './config';
import { initConnection } from './net/ws';
import { initClientLogging } from './utils/logger';
import { initChat } from './ui/chat';
import { getApiBase } from './net/http';
import { TPE2LobbyScene } from './scenes/TPE2LobbyScene';

export const GAME_WIDTH = 320;
export const GAME_HEIGHT = 180;

const appContainer = document.getElementById('app')!;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: appContainer,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  // 明亮基底背景（實際場景會覆蓋，但可避免進場黑畫面）
  backgroundColor: '#eef4fb',
  pixelArt: true,
  render: { antialias: false, pixelArt: true, roundPixels: true },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.NO_CENTER },
  scene: [BootScene, LoginScene, TPE2LobbyScene, StoreScene, UIOverlay],
};

const game = new Phaser.Game(config);

// Initial state
game.registry.set('money', CONFIG.player.initialMoney);
game.registry.set('basket', [] as { id: string; name: string; price: number }[]);

// Start boot (will launch main scenes after preloading optional fonts)
game.scene.start('BootScene');

// 原生滿版：使用 RESIZE 讓 canvas 跟隨視窗大小，並以相機 zoom 做整數縮放（不做 CSS 縮放）
let integerZoom = CONFIG.scale.integerZoomEnabled; // 預設啟用整數縮放 // 預設啟用整數縮放 // true: 整數縮放最清晰；false: 連續縮放可完全滿版
let preferredIntZoom: number | null = CONFIG.scale.preferredIntZoom; // 預設倍率（可由 UI/快捷鍵調整） // 預設 5x（可由 UI/快捷鍵調整） // 使用者指定的整數倍率（1~8），null 代表自動


function applyCameraZoom() {
  // 取得實際渲染尺寸；若初始為 0，回退到 window 尺寸
  let w = game.scale.width;
  let h = game.scale.height;
  if (!w || !h) {
    w = appContainer.clientWidth || window.innerWidth || GAME_WIDTH;
    h = appContainer.clientHeight || window.innerHeight || GAME_HEIGHT;
  }

  const ratioW = w / GAME_WIDTH;
  const ratioH = h / GAME_HEIGHT;
  let base = Math.min(ratioW, ratioH); // 固定使用 fit（保留完整畫面）
  if (!isFinite(base) || base <= 0) base = 1; // 避免 0 造成黑屏
  let zoom = integerZoom ? Math.max(1, Math.floor(base)) : Math.max(1, base);
  if (integerZoom && preferredIntZoom) { zoom = Math.max(CONFIG.scale.minZoom, Math.min(CONFIG.scale.maxZoom, preferredIntZoom)); }

  game.scene.getScenes(true).forEach(s => {
    const cam: any = (s as any).cameras?.main as any;
    if (!cam) return;
    // UI 覆蓋層不隨遊戲縮放，固定以 1x 呈現並使用視窗尺寸排版
    if ((s as any).scene?.key === 'UIOverlay') {
      cam.setZoom(1).setRoundPixels(true);
      cam.setScroll(0, 0);
      try { (s as any).layoutHUD?.(); } catch {}
      return;
    }
    cam.setZoom(zoom).setRoundPixels(true);
    // Skip centering if camera is following a target (e.g., large horizontal map)
    if ((cam as any)._follow) return;
    cam.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
  });
}

function applyCameraZoomNextFrame() { requestAnimationFrame(() => applyCameraZoom()); }

game.scale.on('resize', applyCameraZoom);
window.addEventListener('load', applyCameraZoom);
// 初始延遲再套用一次，避免首幀 scale 為 0
window.setTimeout(applyCameraZoom, 0);
// 暴露給其他場景在啟動後可呼叫（避免場景尚未建立時未套用 zoom）
(window as any).__applyCameraZoom = applyCameraZoom;

try {
  const sceneEvents = (game.scene as any).events;
  sceneEvents.on('start', applyCameraZoomNextFrame);
  sceneEvents.on('wake', applyCameraZoomNextFrame);
  sceneEvents.on('resume', applyCameraZoomNextFrame);
  sceneEvents.on('transitioncomplete', applyCameraZoomNextFrame);
} catch {}


// 快捷鍵：Ctrl+Shift+I 切換整數/連續縮放；[ / ] 調整倍率
window.addEventListener('keydown', (e) => {
if (e.ctrlKey && e.shiftKey && e.code === 'KeyI') {
  integerZoom = !integerZoom;
  applyCameraZoom();
}
if (e.code === 'BracketRight') { // ] increase int zoom
  if (!integerZoom) integerZoom = true;
  preferredIntZoom = Math.min(CONFIG.scale.maxZoom, (preferredIntZoom ?? CONFIG.scale.minZoom) + 1);
  applyCameraZoom();
}
if (e.code === 'BracketLeft') { // [ decrease int zoom
  if (!integerZoom) integerZoom = true;
  preferredIntZoom = Math.max(CONFIG.scale.minZoom, (preferredIntZoom ?? (CONFIG.scale.minZoom + 1)) - 1);
  applyCameraZoom();
}
});
// 預設：迷你地圖人群黑點關閉（可由面板開啟）
(window as any).__minimapCrowd = false;
// 預設：WebSocket 連線狀態（啟動時視為未連線）
(window as any).__netConnected = false;

// 介面：右下角縮放面板（Snap 整數）
function createZoomControls() {
  const panel = document.createElement('div');
  panel.id = 'zoom-controls';
  panel.style.cssText = [
    'position:fixed','left:50%','transform:translateX(-50%)','bottom:8px','z-index:2147483647',
    'display:flex','gap:6px','align-items:center','padding:6px 8px',
    'border-radius:6px','background:rgba(20,26,40,0.92)','border:1px solid #c59b53',
    'box-shadow:0 0 0 1px #3f4b64 inset, 0 4px 14px rgba(0,0,0,0.35)',
    'color:#d6def0','font:12px/1.2 HanPixel,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif'
  ].join(';');
  panel.style.display = 'none';

  const label = document.createElement('span');
  const btnSnap = document.createElement('button');
  const btnMinus = document.createElement('button');
  const btnPlus = document.createElement('button');
  const btnCrowd = document.createElement('button');
  const btnChat = document.createElement('button');
  const btnReset = document.createElement('button');
  const btnClearChat = document.createElement('button');
  const dot = document.createElement('span');
  const styleBtn = (b: HTMLButtonElement) => b.style.cssText = [
    'cursor:pointer','padding:2px 6px','border-radius:4px',
    'border:1px solid #586a8b','background:linear-gradient(#2a3448,#1b2334)','color:#f2f6ff',
    'box-shadow:0 0 0 1px rgba(14,18,29,0.9) inset'
  ].join(';');
  styleBtn(btnSnap); styleBtn(btnMinus); styleBtn(btnPlus); styleBtn(btnCrowd); styleBtn(btnChat); styleBtn(btnReset); styleBtn(btnClearChat);
  // WS 燈號樣式
  dot.style.cssText = [
    'display:inline-block','width:8px','height:8px','border-radius:50%',
    'border:1px solid #223042','box-shadow:0 0 0 1px rgba(0,0,0,0.2) inset'
  ].join(';');

  // Minimap crowd toggle (persist in localStorage)
  try {
    const stored = localStorage.getItem('minimapCrowd');
    (window as any).__minimapCrowd = stored === null ? false : stored === '1';
  } catch { (window as any).__minimapCrowd = false; }

  function updateLabel() {
    const baseInt = Math.max(CONFIG.scale.minZoom, Math.floor(Math.max(game.scale.width / GAME_WIDTH, game.scale.height / GAME_HEIGHT)));
    const snapInfo = integerZoom ? `開 (x${preferredIntZoom ?? baseInt})` : '關';
    label.textContent = `像素縮放：${snapInfo}`;
    btnSnap.textContent = integerZoom ? '縮放：開' : '縮放：關';
    btnMinus.textContent = '−';
    btnPlus.textContent = '+';
    btnClearChat.textContent = '清空訊息';
    let chatVisible = false;
    try {
      if ((window as any).__chatGetVisible) chatVisible = !!(window as any).__chatGetVisible();
      else {
        const s = localStorage.getItem('chatVisible');
        chatVisible = (s === null) ? true : (s === '1');
      }
    } catch { chatVisible = true; }
    btnChat.textContent = chatVisible ? '聊天：開' : '聊天：關';
    const crowdOn = (window as any).__minimapCrowd !== false;
    btnCrowd.textContent = crowdOn ? '人群：開' : '人群：關';
    const connected = (window as any).__netConnected === true;
    dot.style.background = connected ? '#21c064' : '#d04444';
    dot.title = connected ? 'WebSocket 已連線' : 'WebSocket 未連線';
  }
  btnSnap.addEventListener('click', () => { integerZoom = !integerZoom; applyCameraZoom(); updateLabel(); });
  btnMinus.addEventListener('click', () => { integerZoom = true; preferredIntZoom = Math.max(CONFIG.scale.minZoom, (preferredIntZoom ?? (CONFIG.scale.minZoom + 1)) - 1); applyCameraZoom(); updateLabel(); });
  btnPlus.addEventListener('click', () => { integerZoom = true; preferredIntZoom = Math.min(CONFIG.scale.maxZoom, (preferredIntZoom ?? CONFIG.scale.minZoom) + 1); applyCameraZoom(); updateLabel(); });

  btnCrowd.addEventListener('click', () => {
    const cur = (window as any).__minimapCrowd !== false;
    (window as any).__minimapCrowd = !cur;
    try { localStorage.setItem('minimapCrowd', ((window as any).__minimapCrowd ? '1' : '0')); } catch {}
    updateLabel();
  });
  // 讓 chat 模組可以回呼更新按鈕文字
  ;(window as any).__updateChatButton = (v: boolean) => { try { btnChat.textContent = v ? '聊天：開' : '聊天：關'; } catch {} };
  btnChat.addEventListener('click', () => {
    try {
      if ((window as any).__chatToggle) (window as any).__chatToggle();
      else {
        // 尚未初始化聊天室時，先切換預設並保存，下次 initChat 會套用
        const cur = ((window as any).__chatVisible !== false);
        (window as any).__chatVisible = !cur;
        try { localStorage.setItem('chatVisible', (!cur ? '1' : '0')); } catch {}
      }
    } catch {}
    updateLabel();
  });
  btnClearChat.addEventListener('click', () => {
    try { (window as any).__chatClear?.(); } catch {}
  });

  // Reset identity/storage button (dev helper)
  btnReset.textContent = '重設玩家';
  btnReset.title = '清除 pid/sid/名稱/性別 並重新載入';
  btnReset.addEventListener('click', () => {
    try {
      localStorage.removeItem('pid');
      localStorage.removeItem('pname');
      localStorage.removeItem('pgender');
    } catch {}
    try { sessionStorage.removeItem('sid'); } catch {}
    try { (window as any).__netConnected = false; (window as any).__updateWsDot?.(false); } catch {}
    try { location.reload(); } catch {}
  });

  const dotWrap = document.createElement('span');
  dotWrap.textContent = '連線';
  dotWrap.style.cssText = 'opacity:.8;margin-left:4px;margin-right:2px;';
  panel.append(label, btnSnap, btnMinus, btnPlus, btnCrowd, btnChat, btnClearChat, btnReset, dotWrap, dot);
  document.body.appendChild(panel);
  updateLabel();
  // 提供全域更新介面給連線事件呼叫
  (window as any).__updateWsDot = (state: boolean) => {
    try {
      (window as any).__netConnected = !!state;
      const connected = (window as any).__netConnected === true;
      dot.style.background = connected ? '#21c064' : '#d04444';
      dot.title = connected ? 'WebSocket 已連線' : 'WebSocket 未連線';
    } catch {}
  };

  // Toggle debug panel with backquote (~) key
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Backquote') return;
    const isHidden = panel.style.display === 'none';
    panel.style.display = isHidden ? 'flex' : 'none';
  });
}

window.addEventListener('load', () => { createZoomControls(); });

// 初始化客戶端日誌收集（未捕捉錯誤、自訂上報）
try { initClientLogging(); } catch {}

// 延後 WebSocket 連線：若本地尚無名稱，等待登入場景後再連線
try {
  const hasName = (() => { try { return !!localStorage.getItem('pname'); } catch { return false; } })();
  if (hasName) {
    // 同步一次個人資料到後端（避免沿用舊資料）
    try {
      const pid = localStorage.getItem('pid') || '';
      const email = localStorage.getItem('pemail') || '';
      const name = localStorage.getItem('pname') || '';
      const gender = (localStorage.getItem('pgender') || 'M').toUpperCase() === 'F' ? 'F' : 'M';
      const base = getApiBase();
      fetch(`${base}/profile`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Id: pid, Email: email, Name: name, Gender: gender, Ts: new Date().toISOString() })
      }).catch(() => {});
    } catch {}
    const conn = initConnection();
    try {
      (conn as any).on?.('status', (s: any) => {
        try { game.registry.set('netConnected', !!s?.connected); } catch {}
        try { (window as any).__netConnected = !!s?.connected; } catch {}
        try { (window as any).__updateWsDot?.((window as any).__netConnected); } catch {}
      });
    } catch {}
  }
} catch {}



