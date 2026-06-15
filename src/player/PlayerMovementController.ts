import Phaser from "phaser";
import {
  getPlayerIdleFrame,
  getPlayerMovementAnimationKey
} from "../animation/animationCatalog";
import { CONFIG } from "../config";
import type { Facing, RegionData } from "../data/prototypeRegions";

export interface MovementState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export interface JoystickVector {
  x: number;
  y: number;
  strength: number;
}

export interface MovementInput extends JoystickVector {
  facing: Facing;
  key: string;
}

interface PlayerMovementControllerOptions {
  scene: Phaser.Scene;
  player: Phaser.Physics.Arcade.Sprite;
  playerVariant: "male" | "female";
  getRegion: () => RegionData;
  getCollisionRects: () => readonly Phaser.Geom.Rectangle[];
  getTravelerBounds: () => readonly Phaser.Geom.Rectangle[];
  getFacing: () => Facing;
  setFacing: (facing: Facing) => void;
  isRunning: () => boolean;
  isPaused: () => boolean;
  onToggleRunning: () => void;
  onBeforeMove: () => void;
  onAfterMove: () => void;
  playFootstep: (running: boolean) => void;
}

export class PlayerMovementController {
  private readonly scene: Phaser.Scene;
  private readonly player: Phaser.Physics.Arcade.Sprite;
  private readonly options: PlayerMovementControllerOptions;
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly wasd: Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key>;
  private readonly runKey: Phaser.Input.Keyboard.Key;
  private touchState: MovementState = {
    up: false,
    down: false,
    left: false,
    right: false
  };
  private joystickVector: JoystickVector = { x: 0, y: 0, strength: 0 };
  private mouseMovementActive = false;
  private moving = false;
  private heldDirection: string | null = null;
  private repeatMoveAt = 0;

  constructor(options: PlayerMovementControllerOptions) {
    this.options = options;
    this.scene = options.scene;
    this.player = options.player;
    const keyboard = this.scene.input.keyboard;
    if (!keyboard) throw new Error("PlayerMovementController requires keyboard input.");
    this.cursors = keyboard.createCursorKeys();
    this.wasd = keyboard.addKeys("W,A,S,D") as Record<
      "W" | "A" | "S" | "D",
      Phaser.Input.Keyboard.Key
    >;
    this.runKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
  }

  bind(): void {
    this.scene.input.on("pointerdown", this.handlePointerDown);
    this.scene.input.on("pointerup", this.handlePointerUp);
    this.scene.input.on("gameout", this.handleGameOut);
  }

  destroy(): void {
    this.scene.input.off("pointerdown", this.handlePointerDown);
    this.scene.input.off("pointerup", this.handlePointerUp);
    this.scene.input.off("gameout", this.handleGameOut);
  }

  update(time: number): void {
    if (Phaser.Input.Keyboard.JustDown(this.runKey)) {
      this.toggleMovementMode();
    }
    if (this.options.isPaused()) return;

    const movement = this.readMovement();
    if (!movement) {
      this.heldDirection = null;
      this.repeatMoveAt = 0;
      if (!this.moving && this.player.anims.isPlaying) this.setIdleFrame();
      return;
    }
    if (movement.key !== this.heldDirection) {
      this.heldDirection = movement.key;
      this.tryMove(movement);
      this.repeatMoveAt = time + this.getRepeatDuration(movement);
      return;
    }
    if (!this.moving && time >= this.repeatMoveAt) {
      this.tryMove(movement);
      this.repeatMoveAt = time + this.getRepeatDuration(movement);
    }
  }

  setTouch(direction: keyof MovementState, pressed: boolean): void {
    this.touchState[direction] = pressed;
  }

  setJoystick(vector: JoystickVector): void {
    this.joystickVector = vector;
  }

  resetInput(): void {
    this.touchState = { up: false, down: false, left: false, right: false };
    this.joystickVector = { x: 0, y: 0, strength: 0 };
    this.mouseMovementActive = false;
    this.heldDirection = null;
    this.repeatMoveAt = 0;
  }

  toggleMovementMode(): void {
    if (this.options.isPaused()) return;
    this.repeatMoveAt = 0;
    this.options.onToggleRunning();
  }

  private readMovement(): MovementInput | null {
    let inputX =
      Number(this.cursors.right.isDown || this.wasd.D.isDown || this.touchState.right) -
      Number(this.cursors.left.isDown || this.wasd.A.isDown || this.touchState.left);
    let inputY =
      Number(this.cursors.down.isDown || this.wasd.S.isDown || this.touchState.down) -
      Number(this.cursors.up.isDown || this.wasd.W.isDown || this.touchState.up);
    let strength = 1;

    if (inputX === 0 && inputY === 0 && this.joystickVector.strength > 0) {
      inputX = this.joystickVector.x;
      inputY = this.joystickVector.y;
      strength = this.joystickVector.strength;
    }
    if (
      inputX === 0 &&
      inputY === 0 &&
      this.mouseMovementActive &&
      this.scene.input.activePointer
    ) {
      const pointer = this.scene.input.activePointer;
      inputX = pointer.worldX - this.player.x;
      inputY = pointer.worldY - this.player.y;
      if (Math.hypot(inputX, inputY) < CONFIG.tileSize * 0.7) return null;
    }
    if (inputX === 0 && inputY === 0) return null;

    const magnitude = Math.hypot(inputX, inputY);
    const x = inputX / magnitude;
    const y = inputY / magnitude;
    const facing =
      Math.abs(y) >= Math.abs(x)
        ? y < 0
          ? "up"
          : "down"
        : x < 0
          ? "left"
          : "right";
    const angle = Math.atan2(y, x);
    return {
      x,
      y,
      strength,
      facing,
      key: `${Math.round(angle * 12)},${Math.round(strength * 4)}`
    };
  }

  private tryMove(movement: MovementInput): void {
    this.options.setFacing(movement.facing);
    this.options.onBeforeMove();
    if (this.moving || this.options.isPaused()) return;

    const stepDistance =
      CONFIG.tileSize * Phaser.Math.Clamp(movement.strength, 0.35, 1);
    const targetX = this.player.x + movement.x * stepDistance;
    const targetY = this.player.y + movement.y * stepDistance;
    const isDiagonal = Math.abs(movement.x) > 0.2 && Math.abs(movement.y) > 0.2;
    if (
      this.isBlocked(targetX, targetY) ||
      (isDiagonal &&
        (this.isBlocked(targetX, this.player.y) ||
          this.isBlocked(this.player.x, targetY)))
    ) {
      this.setIdleFrame();
      return;
    }

    this.moving = true;
    this.options.playFootstep(this.options.isRunning());
    this.playMovementAnimation();
    this.scene.tweens.add({
      targets: this.player,
      x: targetX,
      y: targetY,
      duration: this.getRepeatDuration(movement),
      ease: "Linear",
      onUpdate: () => this.player.setDepth(this.player.y),
      onComplete: () => {
        this.moving = false;
        if (!this.readMovement()) this.setIdleFrame();
        this.options.onAfterMove();
      }
    });
  }

  private isBlocked(x: number, y: number): boolean {
    const region = this.options.getRegion();
    const footBox = new Phaser.Geom.Rectangle(x - 5, y - 10, 10, 10);
    return (
      x < CONFIG.tileSize ||
      y < CONFIG.tileSize ||
      x > region.width - CONFIG.tileSize ||
      y > region.height - CONFIG.tileSize ||
      this.options
        .getCollisionRects()
        .some((rect) =>
          Phaser.Geom.Intersects.RectangleToRectangle(rect, footBox)
        ) ||
      this.options
        .getTravelerBounds()
        .some((rect) =>
          Phaser.Geom.Intersects.RectangleToRectangle(rect, footBox)
        )
    );
  }

  private getRepeatDuration(movement: MovementInput): number {
    const fullStepDuration = this.options.isRunning() ? 90 : 150;
    return Math.max(55, Math.round(fullStepDuration * movement.strength));
  }

  private playMovementAnimation(): void {
    const texture = `traveler-${this.options.playerVariant}-sheet`;
    const key = getPlayerMovementAnimationKey(
      this.options.playerVariant,
      this.options.getFacing(),
      this.options.isRunning()
    );
    if (this.player.texture.key !== texture) this.player.setTexture(texture);
    if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== key) {
      this.player.play(key);
    }
  }

  private setIdleFrame(): void {
    this.player.anims.stop();
    const texture = `traveler-${this.options.playerVariant}-idle-sheet`;
    if (this.player.texture.key !== texture) this.player.setTexture(texture);
    this.player.setFrame(getPlayerIdleFrame(this.options.getFacing()));
  }

  private readonly handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    const pointerType =
      "pointerType" in pointer.event ? String(pointer.event.pointerType) : "mouse";
    if (pointer.leftButtonDown() && pointerType === "mouse") {
      this.mouseMovementActive = true;
    }
  };

  private readonly handlePointerUp = (pointer: Phaser.Input.Pointer): void => {
    if (!pointer.leftButtonDown()) this.mouseMovementActive = false;
  };

  private readonly handleGameOut = (): void => {
    this.mouseMovementActive = false;
  };
}
