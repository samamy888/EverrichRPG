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
function applyCameraZoom() {
  const w = game.scale.width;
  const h = game.scale.height;
  // 以設計解析度計算整數 zoom（320x180 為基準）
  const zoom = Math.max(1, Math.floor(Math.min(w / GAME_WIDTH, h / GAME_HEIGHT)));
  game.scene.getScenes(true).forEach(s => {
    s.cameras?.main?.setZoom(zoom).setRoundPixels(true);
  });
}

game.scale.on('resize', applyCameraZoom);
window.addEventListener('load', applyCameraZoom);
