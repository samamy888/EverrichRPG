import Phaser from "phaser";
import type {
  AnimationDefinition,
  AnimationGateway
} from "./AnimationDefinition";

export class PhaserAnimationGateway implements AnimationGateway {
  constructor(private readonly manager: Phaser.Animations.AnimationManager) {}

  exists(key: string): boolean {
    return this.manager.exists(key);
  }

  create(definition: AnimationDefinition): void {
    this.manager.create({
      key: definition.key,
      frames: this.manager.generateFrameNumbers(definition.texture, {
        start: definition.startFrame,
        end: definition.endFrame
      }),
      frameRate: definition.frameRate,
      repeat: definition.repeat
    });
  }
}
