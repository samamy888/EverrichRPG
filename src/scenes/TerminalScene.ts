import { BaseScene, BaseSceneData } from './BaseScene';
import { GAME_WIDTH, GAME_HEIGHT } from '../main';
import { CONFIG } from '../config';

export class TerminalScene extends BaseScene {
  private door!: Phaser.GameObjects.Rectangle;

  constructor() {
    super('TerminalScene');
  }

  create(data: BaseSceneData) {
    this.fadeIn();
    this.initInputs();

    // 用矩形代表走道與門口
    const corridor = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH - 16, GAME_HEIGHT - 32, 0x1e2733);
    corridor.setStrokeStyle(1, 0x3a4556);

    // 門口
    this.door = this.add.rectangle(GAME_WIDTH - 24, GAME_HEIGHT / 2, 16, 32, 0x2e8b57);
    this.add.text(GAME_WIDTH - 60, GAME_HEIGHT / 2 - 28, '美妝店', { fontSize: `${CONFIG.ui.tiny}px`, color: '#cce8ff' });

    // 玩家
    const px = data?.spawnX ?? 24;
    const py = data?.spawnY ?? (GAME_HEIGHT / 2);
    this.setupPlayer(px, py);

    // 邊界
    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }

  update(time: number, delta: number) {
    if (!this.player) return;
    this.updatePlayerMovement();

    // 與門口接近時提示
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.door.x, this.door.y);
    if (dist < 20) {
      this.setHint('按 E 進入美妝店');
      if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
        this.changeScene('StoreScene', { storeId: 'cosmetics' });
      }
    } else {
      this.setHint('方向鍵/WASD移動，E 進入商店');
    }

    this.updateNetworkMovement('terminal');
  }
}



