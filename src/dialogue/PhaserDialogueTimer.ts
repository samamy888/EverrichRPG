import Phaser from "phaser";
import type {
  CancelableTimer,
  DialogueTimerPort
} from "./DialoguePorts";

export class PhaserDialogueTimer implements DialogueTimerPort {
  constructor(private readonly scene: Phaser.Scene) {}

  start(characterCount: number, onCharacter: () => void): CancelableTimer {
    const event = this.scene.time.addEvent({
      delay: 28,
      repeat: Math.max(0, characterCount - 1),
      callback: onCharacter
    });
    return {
      cancel: () => event.remove(false)
    };
  }
}
