import Phaser from "phaser";
import {
  getPlayerIdleFrame,
  getPlayerMovementAnimationKey,
  isDiagonalPlayerFacing,
  type PlayerAnimationFacing
} from "../animation/animationCatalog";
import { CONFIG } from "../config";
import type { Facing, RegionData } from "../data/prototypeRegions";
import { findGridPath, type PathPoint } from "../navigation/GridPathfinder";

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
  animationFacing: PlayerAnimationFacing;
  key: string;
  navigationDistance?: number;
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
  onPointerClick: (worldX: number, worldY: number) => void;
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
  private mousePointerDownAt = 0;
  private mousePointerDownX = 0;
  private mousePointerDownY = 0;
  private navigationPath: PathPoint[] = [];
  private navigationComplete: (() => void) | null = null;
  private navigationCancelled: (() => void) | null = null;
  private suppressNextPointerClick = false;
  private animationFacing: PlayerAnimationFacing = "down";
  private moving = false;
  private heldDirection: string | null = null;
  private repeatMoveAt = 0;
  private lastUpdateAt = 0;
  private lastFootstepAt = 0;

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
    const deltaSeconds =
      this.lastUpdateAt > 0 ? Math.min((time - this.lastUpdateAt) / 1000, 0.05) : 0;
    this.lastUpdateAt = time;
    if (this.options.isPaused()) return;

    const movement = this.readMovement();
    if (!movement) {
      this.heldDirection = null;
      this.repeatMoveAt = 0;
      if (!this.moving && this.player.anims.isPlaying) this.setIdleFrame();
      return;
    }

    if (deltaSeconds > 0) {
      this.moveContinuously(movement, deltaSeconds, time);
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
    this.cancelNavigation();
    this.heldDirection = null;
    this.repeatMoveAt = 0;
    this.lastFootstepAt = 0;
  }

  toggleMovementMode(): void {
    if (this.options.isPaused()) return;
    this.repeatMoveAt = 0;
    this.options.onToggleRunning();
  }

  moveTo(
    destination: PathPoint,
    onComplete?: () => void,
    onCancel?: () => void
  ): boolean {
    const region = this.options.getRegion();
    const path = findGridPath(
      { x: this.player.x, y: this.player.y },
      destination,
      {
        width: region.width,
        height: region.height,
        cellSize: CONFIG.tileSize,
        isBlocked: (x, y) => this.isBlocked(x, y)
      }
    );
    if (path.length === 0) return false;
    const destinationIsOpen = !this.isBlocked(destination.x, destination.y);
    const navigationPath = destinationIsOpen
      ? [...path.slice(0, -1), destination]
      : path;

    this.cancelNavigation();
    this.navigationPath = this.smoothNavigationPath([
      { x: this.player.x, y: this.player.y },
      ...navigationPath
    ]);
    this.navigationComplete = onComplete ?? null;
    this.navigationCancelled = onCancel ?? null;
    this.heldDirection = null;
    this.repeatMoveAt = 0;
    return true;
  }

  cancelNavigation(): void {
    const onCancel = this.navigationCancelled;
    this.navigationPath = [];
    this.navigationComplete = null;
    this.navigationCancelled = null;
    onCancel?.();
  }

  suppressNextClick(): void {
    this.suppressNextPointerClick = true;
  }

  private readMovement(): MovementInput | null {
    let inputX =
      Number(this.cursors.right.isDown || this.wasd.D.isDown || this.touchState.right) -
      Number(this.cursors.left.isDown || this.wasd.A.isDown || this.touchState.left);
    let inputY =
      Number(this.cursors.down.isDown || this.wasd.S.isDown || this.touchState.down) -
      Number(this.cursors.up.isDown || this.wasd.W.isDown || this.touchState.up);
    let strength = 1;
    let followingNavigation = false;
    let navigationDistance: number | undefined;
    const manualInputActive =
      inputX !== 0 ||
      inputY !== 0 ||
      this.joystickVector.strength > 0 ||
      this.mouseMovementActive;
    if (manualInputActive && this.navigationPath.length > 0) {
      this.cancelNavigation();
    }

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
    if (inputX === 0 && inputY === 0 && this.navigationPath.length > 0) {
      followingNavigation = true;
      const waypoint = this.navigationPath[0]!;
      inputX = waypoint.x - this.player.x;
      inputY = waypoint.y - this.player.y;
      if (Math.hypot(inputX, inputY) < 1) {
        this.navigationPath.shift();
        if (this.navigationPath.length === 0) {
          const onComplete = this.navigationComplete;
          this.navigationComplete = null;
          this.navigationCancelled = null;
          onComplete?.();
          return null;
        }
        return this.readMovement();
      }
    }
    if (inputX === 0 && inputY === 0) return null;

    const magnitude = Math.hypot(inputX, inputY);
    if (followingNavigation) {
      strength = Phaser.Math.Clamp(magnitude / CONFIG.tileSize, 0.05, 1);
      navigationDistance = magnitude;
    }
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
    const animationFacing = this.getAnimationFacing(x, y, facing);
    const angle = Math.atan2(y, x);
    return {
      x,
      y,
      strength,
      facing,
      animationFacing,
      key: `${Math.round(angle * 12)},${Math.round(strength * 4)}`,
      ...(navigationDistance !== undefined ? { navigationDistance } : {})
    };
  }

  private tryMove(movement: MovementInput): void {
    this.options.setFacing(movement.facing);
    this.animationFacing = movement.animationFacing;
    this.options.onBeforeMove();
    if (this.moving || this.options.isPaused()) return;

    const stepDistance =
      CONFIG.tileSize * Phaser.Math.Clamp(movement.strength, 0.05, 1);
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
        if (this.navigationPath.length > 0) {
          const waypoint = this.navigationPath[0]!;
          if (
            Phaser.Math.Distance.Between(
              this.player.x,
              this.player.y,
              waypoint.x,
              waypoint.y
            ) < 1
          ) {
            this.navigationPath.shift();
            this.completeNavigationIfFinished();
          }
        }
        if (!this.readMovement()) this.setIdleFrame();
        this.options.onAfterMove();
      }
    });
  }

  private moveContinuously(
    movement: MovementInput,
    deltaSeconds: number,
    time: number
  ): void {
    this.options.setFacing(movement.facing);
    this.animationFacing = movement.animationFacing;
    this.options.onBeforeMove();
    if (this.moving || this.options.isPaused()) return;

    const normalizedStrength = Phaser.Math.Clamp(movement.strength, 0.2, 1);
    const speed = this.options.isRunning() ? 168 : 112;
    const intendedDistance =
      speed * Math.pow(normalizedStrength, 0.9) * deltaSeconds;
    const distance =
      movement.navigationDistance !== undefined
        ? Math.min(intendedDistance, movement.navigationDistance)
        : intendedDistance;
    const targetX = this.player.x + movement.x * distance;
    const targetY = this.player.y + movement.y * distance;
    const moved = this.moveWithSlide(targetX, targetY);

    if (!moved) {
      this.setIdleFrame();
      this.options.onAfterMove();
      return;
    }

    this.playMovementAnimation();
    this.player.setDepth(this.player.y);
    this.advanceNavigationWaypoint();
    if (time - this.lastFootstepAt >= (this.options.isRunning() ? 180 : 260)) {
      this.lastFootstepAt = time;
      this.options.playFootstep(this.options.isRunning());
    }
    this.options.onAfterMove();
  }

  private moveWithSlide(targetX: number, targetY: number): boolean {
    if (!this.isBlocked(targetX, targetY)) {
      this.player.setPosition(targetX, targetY);
      return true;
    }

    const canMoveX = !this.isBlocked(targetX, this.player.y);
    const canMoveY = !this.isBlocked(this.player.x, targetY);

    if (canMoveX && canMoveY) {
      const deltaX = Math.abs(targetX - this.player.x);
      const deltaY = Math.abs(targetY - this.player.y);
      if (deltaX >= deltaY) this.player.x = targetX;
      else this.player.y = targetY;
      return true;
    }

    if (canMoveX) {
      this.player.x = targetX;
      return true;
    }

    if (canMoveY) {
      this.player.y = targetY;
      return true;
    }

    return false;
  }

  private smoothNavigationPath(path: PathPoint[]): PathPoint[] {
    if (path.length <= 2) return path.slice(1);

    const smoothed: PathPoint[] = [];
    let anchorIndex = 0;
    while (anchorIndex < path.length - 1) {
      let nextIndex = anchorIndex + 1;
      for (
        let candidateIndex = path.length - 1;
        candidateIndex > anchorIndex;
        candidateIndex -= 1
      ) {
        if (this.hasLineOfSight(path[anchorIndex]!, path[candidateIndex]!)) {
          nextIndex = candidateIndex;
          break;
        }
      }
      smoothed.push(path[nextIndex]!);
      anchorIndex = nextIndex;
    }

    return smoothed;
  }

  private hasLineOfSight(start: PathPoint, end: PathPoint): boolean {
    const distance = Phaser.Math.Distance.Between(start.x, start.y, end.x, end.y);
    const steps = Math.max(1, Math.ceil(distance / (CONFIG.tileSize / 4)));

    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps;
      const x = Phaser.Math.Linear(start.x, end.x, t);
      const y = Phaser.Math.Linear(start.y, end.y, t);
      if (this.isBlocked(x, y)) return false;
    }

    return true;
  }

  private advanceNavigationWaypoint(): void {
    if (this.navigationPath.length === 0) return;

    const waypoint = this.navigationPath[0]!;
    if (
      Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        waypoint.x,
        waypoint.y
      ) >= 1
    ) {
      return;
    }

    this.player.setPosition(waypoint.x, waypoint.y);
    this.navigationPath.shift();
    this.completeNavigationIfFinished();
  }

  private completeNavigationIfFinished(): void {
    if (this.navigationPath.length > 0) return;

    const onComplete = this.navigationComplete;
    this.navigationComplete = null;
    this.navigationCancelled = null;
    onComplete?.();
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
    const texture = isDiagonalPlayerFacing(this.animationFacing)
      ? `traveler-${this.options.playerVariant}-diagonal-sheet`
      : `traveler-${this.options.playerVariant}-sheet`;
    const key = getPlayerMovementAnimationKey(
      this.options.playerVariant,
      this.animationFacing,
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
    if (this.isPointerOnMenuButton(pointer)) {
      this.suppressNextClick();
      return;
    }
    const pointerType =
      "pointerType" in pointer.event ? String(pointer.event.pointerType) : "mouse";
    if (pointer.leftButtonDown() && pointerType === "mouse") {
      this.mousePointerDownAt = this.scene.time.now;
      this.mousePointerDownX = pointer.x;
      this.mousePointerDownY = pointer.y;
      this.scene.time.delayedCall(180, () => {
        if (pointer.leftButtonDown()) {
          this.cancelNavigation();
          this.mouseMovementActive = true;
        }
      });
    }
  };

  private readonly handlePointerUp = (pointer: Phaser.Input.Pointer): void => {
    if (this.isPointerOnMenuButton(pointer)) {
      this.suppressNextPointerClick = false;
      return;
    }
    const heldDuration = this.scene.time.now - this.mousePointerDownAt;
    const movedDistance = Phaser.Math.Distance.Between(
      this.mousePointerDownX,
      this.mousePointerDownY,
      pointer.x,
      pointer.y
    );
    const wasLongPress = this.mouseMovementActive || heldDuration >= 180;
    this.mouseMovementActive = false;
    if (this.suppressNextPointerClick) {
      this.suppressNextPointerClick = false;
      return;
    }
    if (!wasLongPress && movedDistance <= 8) {
      this.options.onPointerClick(pointer.worldX, pointer.worldY);
    }
  };

  private readonly handleGameOut = (): void => {
    this.mouseMovementActive = false;
  };

  private isPointerOnMenuButton(pointer: Phaser.Input.Pointer): boolean {
    return (
      pointer.x >= CONFIG.width - 90 &&
      pointer.x <= CONFIG.width - 8 &&
      pointer.y >= 8 &&
      pointer.y <= 36
    );
  }

  private getAnimationFacing(
    x: number,
    y: number,
    fallback: Facing
  ): PlayerAnimationFacing {
    if (Math.abs(x) < 0.35 || Math.abs(y) < 0.35) return fallback;
    if (y > 0 && x < 0) return "down-left";
    if (y > 0 && x > 0) return "down-right";
    if (y < 0 && x < 0) return "up-left";
    if (y < 0 && x > 0) return "up-right";
    return fallback;
  }
}
