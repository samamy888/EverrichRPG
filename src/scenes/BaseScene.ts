import Phaser from 'phaser';
import { CONFIG } from '../config';
import { getClient } from '../net/ws';
import { spawnPlayer, updatePlayer } from '../actors/Player';

export type BaseSceneData = {
  spawnX?: number;
  spawnY?: number;
};

export class BaseScene extends Phaser.Scene {
  protected cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  protected keys!: { [k: string]: Phaser.Input.Keyboard.Key };
  protected player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  protected controls!: { cursors: Phaser.Types.Input.Keyboard.CursorKeys; keys: any };
  private lastMoveSent = 0;
  protected areaName: string = '';

  constructor(key: string) {
    super(key);
  }

  protected initInputs() {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,E,SHIFT,ESC,C') as any;
    this.controls = { cursors: this.cursors, keys: this.keys };
  }

  protected setupPlayer(x: number, y: number, prefix?: string) {
    this.player = spawnPlayer(this, x, y, prefix);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    try { (window as any).__applyCameraZoom?.(); } catch {}
    // Delay call to ensure zoom is applied after follow
    this.time.delayedCall(0, () => { try { (window as any).__applyCameraZoom?.(); } catch {} });
    return this.player;
  }

  protected updateNetworkMovement(areaId: string) {
    const now = Date.now();
    if (now - this.lastMoveSent >= (CONFIG.network.moveIntervalMs || 60)) {
      try {
        getClient().sendMove(this.player.x, this.player.y, areaId);
      } catch {}
      this.lastMoveSent = now;
    }
  }

  protected setLocation(name: string, type: string) {
    this.areaName = name;
    this.registry.set('location', name);
    this.registry.set('locationType', type);
  }

  protected setHint(text: string) {
    this.registry.set('hint', text);
  }

  protected updatePlayerMovement() {
    if (this.player) {
      updatePlayer(this, this.player, this.controls);
    }
  }

  // Phase 2 helper
  protected changeScene(sceneKey: string, data?: any) {
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(sceneKey, data);
    });
  }

  protected fadeIn() {
    this.cameras.main.fadeIn(250, 0, 0, 0);
  }
}
