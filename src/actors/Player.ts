import Phaser from 'phaser';
import { CONFIG } from '../config';

export type PlayerKeys = {
  cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  keys: { [k: string]: Phaser.Input.Keyboard.Key };
};

function getGender(): 'M' | 'F' {
  try {
    const g = (localStorage.getItem('pgender') || 'M').toUpperCase();
    return g === 'F' ? 'F' : 'M';
  } catch { return 'M'; }
}

function getPrefix(): 'player-m' | 'player-f' { return getGender() === 'F' ? 'player-f' : 'player-m'; }

export function spawnPlayer(scene: Phaser.Scene, x: number, y: number) {
  const prefix = getPrefix();
  const idleKey = prefix === 'player-f' ? 'player_f' : 'player_m';
  const spr = scene.add.sprite(x, y, idleKey, 0).setOrigin(0.5, 1) as Phaser.GameObjects.Sprite;
  (spr as any).setDepth?.(100);
  scene.physics.add.existing(spr as any);
  const body = (spr as any).body as Phaser.Physics.Arcade.Body;
  try { body.setSize(12, 10).setOffset(10, 22).setCollideWorldBounds(true); } catch {}
  try { (spr as any).setData?.('facing', 'down'); scene.anims?.play?.call(spr, `${prefix}-idle-down`); } catch {}
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
    const moving = Math.abs(ax) + Math.abs(ay) > 0;
    let facing: 'down' | 'up' | 'side' = (spr.getData?.('facing') as any) || 'down';
    let flipX = spr.flipX;
    const prefix: string = spr.getData?.('animPrefix') || getPrefix();
    if (moving) {
      if (Math.abs(ax) >= Math.abs(ay)) { facing = 'side'; flipX = ax < 0; }
      else { facing = ay < 0 ? 'up' : 'down'; }
      spr.setData?.('facing', facing);
      spr.setFlipX?.(facing === 'side' ? flipX : false);
      const key = (scene.anims as any).exists?.(`${prefix}-walk-${facing}`) ? `${prefix}-walk-${facing}` : undefined;
      if (key) spr.anims.play(key, true); else spr.anims.stop();
    } else {
      const key = (scene.anims as any).exists?.(`${prefix}-idle-${facing}`) ? `${prefix}-idle-${facing}` : undefined;
      spr.setFlipX?.(facing === 'side' ? flipX : false);
      if (key) spr.anims.play(key, true); else spr.anims.stop();
    }
  } catch {}
}

