import Phaser from 'phaser';
import { ConcourseScene } from './scenes/ConcourseScene';
import { StoreScene } from './scenes/StoreScene';
import { UIOverlay } from './ui/UIOverlay';

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
  scale: { mode: Phaser.Scale.NONE },
  scene: [ConcourseScene, StoreScene, UIOverlay],
};

const game = new Phaser.Game(config);

// Initial state
game.registry.set('money', 3000);
game.registry.set('timeRemaining', 60 * 5);
game.registry.set('basket', [] as { id: string; name: string; price: number }[]);

// Start scenes
game.scene.start('ConcourseScene');
game.scene.launch('UIOverlay');

// Scaling helpers: prefer 6x (1920x1080) when possible; otherwise fit while keeping pixel look
let integerScalePreferred = true;

function applyScale() {
  const cw = appContainer.clientWidth || window.innerWidth;
  const ch = appContainer.clientHeight || window.innerHeight;
  const canvas = game.canvas as HTMLCanvasElement;
  (canvas.style as any).imageRendering = 'pixelated';

  // Try 6x first if space allows
  const scale6 = 6;
  const can6 = GAME_WIDTH * scale6 <= cw && GAME_HEIGHT * scale6 <= ch;
  let w: number, h: number;
  if (integerScalePreferred && can6) {
    w = GAME_WIDTH * scale6; h = GAME_HEIGHT * scale6;
  } else if (integerScalePreferred) {
    const maxScale = Math.max(1, Math.floor(Math.min(cw / GAME_WIDTH, ch / GAME_HEIGHT)));
    w = GAME_WIDTH * maxScale; h = GAME_HEIGHT * maxScale;
  } else {
    const ratio = Math.min(cw / GAME_WIDTH, ch / GAME_HEIGHT);
    w = Math.floor(GAME_WIDTH * ratio); h = Math.floor(GAME_HEIGHT * ratio);
  }
  if ((game.scale as any).resize) (game.scale as any).resize(w, h);
  canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
}

window.addEventListener('resize', applyScale);
applyScale();

