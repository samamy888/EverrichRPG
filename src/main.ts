import Phaser from 'phaser';
import { TerminalScene } from './scenes/TerminalScene';
import { StoreScene } from './scenes/StoreScene';
import { UIOverlay } from './ui/UIOverlay';

const parent = document.getElementById('app')!;

export const GAME_WIDTH = 320; // 基底寬度（像素）
export const GAME_HEIGHT = 180; // 基底高度（像素）

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#10141a',
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [TerminalScene, StoreScene, UIOverlay],
};

// 初始化全域註冊狀態
const initialState = {
  money: 3000, // 預算
  timeRemaining: 60 * 5, // 5 分鐘（秒）
  basket: [] as { id: string; name: string; price: number }[],
};

const game = new Phaser.Game(config);

game.registry.set('money', initialState.money);
game.registry.set('timeRemaining', initialState.timeRemaining);
game.registry.set('basket', initialState.basket);

// 啟動 UI 覆蓋層
game.scene.start('TerminalScene');
game.scene.launch('UIOverlay');

