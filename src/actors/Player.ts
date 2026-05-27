import * as Phaser from 'phaser';
import { CONFIG } from '../config';

export type PlayerKeys = {
  cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  keys: { [k: string]: Phaser.Input.Keyboard.Key };
};

type Facing = 'down' | 'up' | 'side';

function getGender(): 'M' | 'F' {
  try {
    const g = (localStorage.getItem('pgender') || 'M').toUpperCase();
    return g === 'F' ? 'F' : 'M';
  } catch { return 'M'; }
}

function getPrefix(): 'player-m' | 'player-f' { return getGender() === 'F' ? 'player-f' : 'player-m'; }

export function spawnPlayer(scene: Phaser.Scene, x: number, y: number, customPrefix?: string) {
  const prefix = customPrefix || getPrefix();
  let spr: Phaser.GameObjects.Sprite;
  
  if (prefix === 'clerk-new') {
    spr = scene.add.sprite(x, y, 'clerk_new', 0).setOrigin(0.5, 1) as Phaser.GameObjects.Sprite;
  } else {
    const sheet = getGender() === 'F' ? 'player_f' : 'player_m';
    const frame = `${sheet}_0_0`;
    spr = scene.add.sprite(x, y, 'characters', frame).setOrigin(0.5, 1) as Phaser.GameObjects.Sprite;
  }
  
  (spr as any).setDepth?.(100);
  scene.physics.add.existing(spr as any);
  const body = (spr as any).body as Phaser.Physics.Arcade.Body;
  try { body.setSize(12, 10).setOffset(10, 22).setCollideWorldBounds(true); } catch {}
  try { (spr as any).setData?.('facing', 'down'); spr.anims.play(`${prefix}-idle-down`); } catch {}
  (spr as any).setData?.('animPrefix', prefix);
  return spr as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
}

export function updatePlayer(
  scene: Phaser.Scene,
  player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
  controls: PlayerKeys
) {
  const pBody = (player as any).body as Phaser.Physics.Arcade.Body;
  const lock = !!scene.registry.get('inputLocked');
  const base = CONFIG.controls.baseSpeed;
  const runMul = CONFIG.controls.runMultiplier;
  const speed = (!lock && (controls.keys as any).SHIFT?.isDown) ? Math.round(base * runMul) : base;
  if (lock) { pBody.setVelocity(0, 0); return; }
  pBody.setVelocity(0);
  if (controls.cursors.left?.isDown || (controls.keys as any).A.isDown) pBody.setVelocityX(-speed);
  else if (controls.cursors.right?.isDown || (controls.keys as any).D.isDown) pBody.setVelocityX(speed);
  if (controls.cursors.up?.isDown || (controls.keys as any).W.isDown) pBody.setVelocityY(-speed);
  else if (controls.cursors.down?.isDown || (controls.keys as any).S.isDown) pBody.setVelocityY(speed);

  // Animations
  try {
    const spr: any = player as any;
    const ax = pBody.velocity.x, ay = pBody.velocity.y;
    const adx = Math.abs(ax), ady = Math.abs(ay);
    const moving = adx + ady > 1; // 增加門檻避免微小位移觸發
    
    let facing: 'down' | 'up' | 'side' = (spr.getData?.('facing') as any) || 'down';
    let flipX = spr.flipX;
    const prefix: string = spr.getData?.('animPrefix') || getPrefix();
    
    // 增加「轉向權重」防止斜向移動時頻繁切換
    // 如果目前是左右走，除非垂直速度明顯大於水平速度，否則不切換上下
    const BIAS = 1.4; 

    if (moving) {
      if (facing === 'side') {
        if (ady > adx * BIAS) facing = ay < 0 ? 'up' : 'down';
        else flipX = ax < 0;
      } else {
        if (adx > ady * BIAS) { facing = 'side'; flipX = ax < 0; }
        else facing = ay < 0 ? 'up' : 'down';
      }
      
      spr.setData?.('facing', facing);
      spr.setFlipX?.(facing === 'side' ? flipX : false);
      const key = (scene.anims as any).exists?.(`${prefix}-walk-${facing}`) ? `${prefix}-walk-${facing}` : undefined;
      if (key) spr.anims.play(key, true); else spr.anims.stop();
    } else {
      // 停止時，讀取最後一次儲存的轉向
      const lastFacing = (spr.getData?.('facing') as Facing) || 'down';
      const key = (scene.anims as any).exists?.(`${prefix}-idle-${lastFacing}`) ? `${prefix}-idle-${lastFacing}` : undefined;
      spr.setFlipX?.(lastFacing === 'side' ? flipX : false);
      if (key) spr.anims.play(key, true); else spr.anims.stop();
    }
  } catch {}
}

