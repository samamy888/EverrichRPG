import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../main';
import { CONFIG } from '../config';

export class TerminalScene extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: { [k: string]: Phaser.Input.Keyboard.Key };
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private door!: Phaser.GameObjects.Rectangle;
  private hintText!: Phaser.GameObjects.Text;

  constructor() {
    super('TerminalScene');
  }

  create() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,E') as any;

    // 用矩形代表走道與門口
    const corridor = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH - 16, GAME_HEIGHT - 32, 0x1e2733);
    corridor.setStrokeStyle(1, 0x3a4556);

    // 門口（進入商店觸發區）
    this.door = this.add.rectangle(GAME_WIDTH - 24, GAME_HEIGHT / 2, 16, 32, 0x2e8b57);
    this.add.text(GAME_WIDTH - 60, GAME_HEIGHT / 2 - 28, '美妝店', { fontSize: `${CONFIG.ui.tiny}px`, color: '#cce8ff' });

    // 玩家（簡單矩形貼圖）
    const playerGfx = this.add.rectangle(0, 0, 8, 12, 0xffcc66);
    this.physics.add.existing(playerGfx);
    this.player = playerGfx as unknown as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    this.player.body.setCollideWorldBounds(true);
    this.player.setPosition(24, GAME_HEIGHT / 2);

    // 提示文字
    this.hintText = this.add.text(8, 8, '方向鍵/WASD移動，E 進入商店', { fontSize: `${CONFIG.ui.tiny}px`, color: '#e6f0ff' });

    // 邊界
    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 相機
    this.cameras.main.setRoundPixels(true);
  }

  update(time: number, delta: number) {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0);

    const speed = 60;
    if (this.cursors.left?.isDown || this.keys.A.isDown) body.setVelocityX(-speed);
    else if (this.cursors.right?.isDown || this.keys.D.isDown) body.setVelocityX(speed);
    if (this.cursors.up?.isDown || this.keys.W.isDown) body.setVelocityY(-speed);
    else if (this.cursors.down?.isDown || this.keys.S.isDown) body.setVelocityY(speed);

    // 與門口接近時提示
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.door.x, this.door.y);
    if (dist < 20) {
      this.hintText.setText('按 E 進入美妝店');
      if (Phaser.Input.Keyboard.JustDown(this.keys.E)) {
        this.scene.start('StoreScene', { storeId: 'cosmetics' });
        this.time.delayedCall(0, () => { try { (window as any).__applyCameraZoom?.(); } catch {} });
      }
    } else {
      this.hintText.setText('方向鍵/WASD移動，E 進入商店');
    }

    // 移除倒數計時\r\n  }
}



