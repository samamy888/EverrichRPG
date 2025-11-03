import Phaser from 'phaser';
import { ConcourseScene } from './scenes/ConcourseScene';
import { StoreScene } from './scenes/StoreScene';
import { UIOverlay } from './ui/UIOverlay';
import { BootScene } from './scenes/BootScene';

export const GAME_WIDTH = 320;
export const GAME_HEIGHT = 180;

const appContainer = document.getElementById('app')!;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: appContainer,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#10141a',
  pixelArt: true,
  render: { antialias: false, pixelArt: true, roundPixels: true },
  physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.NO_CENTER },
  scene: [BootScene, ConcourseScene, StoreScene, UIOverlay],
};

const game = new Phaser.Game(config);

// Initial state
game.registry.set('money', 3000);
game.registry.set('timeRemaining', 60 * 5);
game.registry.set('basket', [] as { id: string; name: string; price: number }[]);

// Start boot (will launch main scenes after preloading optional fonts)
game.scene.start('BootScene');

// 原生滿版：使用 RESIZE 讓 canvas 跟隨視窗大小，並以相機 zoom 做整數縮放（不做 CSS 縮放）
let fillMode: 'fit' | 'cover' = 'cover'; // fit: 內含留黑邊；cover: 充滿螢幕（可能裁切）
let integerZoom = false; // true: 整數縮放最清晰；false: 連續縮放可完全滿版

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
  let base = fillMode === 'cover' ? Math.max(ratioW, ratioH) : Math.min(ratioW, ratioH);
  if (!isFinite(base) || base <= 0) base = 1; // 避免 0 造成黑屏
  const zoom = integerZoom ? Math.max(1, Math.floor(base)) : Math.max(1, base);

  game.scene.getScenes(true).forEach(s => {
    const cam = s.cameras?.main;
    if (!cam) return;
    cam.setZoom(zoom).setRoundPixels(true);
    cam.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
  });
}

game.scale.on('resize', applyCameraZoom);
window.addEventListener('load', applyCameraZoom);
// 初始延遲再套用一次，避免首幀 scale 為 0
window.setTimeout(applyCameraZoom, 0);
// 暴露給其他場景在啟動後可呼叫（避免場景尚未建立時未套用 zoom）
(window as any).__applyCameraZoom = applyCameraZoom;

// 快捷鍵：Ctrl+Shift+F 切換 fit/cover；Ctrl+Shift+I 切換整數/連續縮放
window.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.code === 'KeyF') {
    fillMode = fillMode === 'cover' ? 'fit' : 'cover';
    applyCameraZoom();
  }
  if (e.ctrlKey && e.shiftKey && e.code === 'KeyI') {
    integerZoom = !integerZoom;
    applyCameraZoom();
  }
});

// 介面：右下角縮放面板（Cover/Fit、Snap 整數）
function createZoomControls() {
  const panel = document.createElement('div');
  panel.id = 'zoom-controls';
  panel.style.cssText = [
    'position:fixed','right:8px','bottom:8px','z-index:2147483647',
    'display:flex','gap:6px','align-items:center','padding:6px 8px',
    'border-radius:8px','background:rgba(0,0,0,0.45)','border:1px solid #3a4556',
    'color:#cce8ff','font:12px/1.2 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif'
  ].join(';');

  const label = document.createElement('span');
  const btnMode = document.createElement('button');
  const btnSnap = document.createElement('button');
  const styleBtn = (b: HTMLButtonElement) => b.style.cssText = [
    'cursor:pointer','padding:2px 6px','border-radius:6px',
    'border:1px solid #4a5668','background:#1a2330','color:#e6f0ff'
  ].join(';');
  styleBtn(btnMode); styleBtn(btnSnap);

  function updateLabel() {
    label.textContent = `Mode: ${fillMode.toUpperCase()}  |  Snap: ${integerZoom ? 'ON' : 'OFF'}`;
    btnMode.textContent = fillMode === 'cover' ? 'Cover→Fit' : 'Fit→Cover';
    btnSnap.textContent = integerZoom ? 'Snap 6×' : 'Smooth';
  }

  btnMode.addEventListener('click', () => { fillMode = fillMode === 'cover' ? 'fit' : 'cover'; applyCameraZoom(); updateLabel(); });
  btnSnap.addEventListener('click', () => { integerZoom = !integerZoom; applyCameraZoom(); updateLabel(); });

  panel.append(label, btnMode, btnSnap);
  document.body.appendChild(panel);
  updateLabel();
}

window.addEventListener('load', () => { createZoomControls(); });
