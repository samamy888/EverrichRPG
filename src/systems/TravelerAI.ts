import Phaser from "phaser";
import { CONFIG } from "../config";
import type {
  Facing,
  MapObjectData,
  NpcBehaviorData
} from "../data/prototypeRegions";

interface TravelerAIOptions {
  scene: Phaser.Scene;
  object: MapObjectData;
  sprite: Phaser.GameObjects.Sprite;
  bounds: Phaser.Geom.Rectangle;
  label: Phaser.GameObjects.Text | undefined;
  variant: "male" | "female";
  behavior: NpcBehaviorData;
  canOccupy: (traveler: TravelerAI, bounds: Phaser.Geom.Rectangle) => boolean;
}

const DIRECTION_VECTOR: Record<Facing, Phaser.Math.Vector2> = {
  up: new Phaser.Math.Vector2(0, -1),
  down: new Phaser.Math.Vector2(0, 1),
  left: new Phaser.Math.Vector2(-1, 0),
  right: new Phaser.Math.Vector2(1, 0)
};

const OPPOSITE_DIRECTION: Record<Facing, Facing> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left"
};

export class TravelerAI {
  readonly bounds: Phaser.Geom.Rectangle;
  readonly objectId: string;

  private readonly scene: Phaser.Scene;
  private readonly object: MapObjectData;
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly label: Phaser.GameObjects.Text | undefined;
  private readonly variant: "male" | "female";
  private readonly canOccupy: TravelerAIOptions["canOccupy"];
  private readonly behavior: NpcBehaviorData;
  private readonly origin: Phaser.Math.Vector2;
  private readonly collisionOffset: Phaser.Math.Vector2;
  private facing: Facing;
  private patrolDirection: Facing;
  private moveTween: Phaser.Tweens.Tween | undefined;
  private nextDecisionAt: number;
  private remainingSteps = 0;
  private paused = false;
  private dialogueFacing: Facing | null = null;

  constructor(options: TravelerAIOptions) {
    this.scene = options.scene;
    this.object = options.object;
    this.objectId = options.object.id;
    this.sprite = options.sprite;
    this.bounds = options.bounds;
    this.label = options.label;
    this.variant = options.variant;
    this.behavior = options.behavior;
    this.canOccupy = options.canOccupy;
    this.facing = options.behavior.facing;
    this.patrolDirection = options.behavior.facing;
    this.origin = new Phaser.Math.Vector2(options.sprite.x, options.sprite.y);
    this.collisionOffset = new Phaser.Math.Vector2(
      options.bounds.x - options.sprite.x,
      options.bounds.y - options.sprite.y
    );
    this.nextDecisionAt = this.scene.time.now + Phaser.Math.Between(500, 1800);
    this.setIdleFrame();
  }

  update(time: number, paused: boolean): void {
    if (paused !== this.paused) {
      this.paused = paused;
      if (paused) {
        this.moveTween?.pause();
        this.sprite.anims.pause();
      } else {
        this.moveTween?.resume();
        this.sprite.anims.resume();
      }
    }
    if (
      paused ||
      this.behavior.movementType === "idle" ||
      this.moveTween?.isPlaying() ||
      time < this.nextDecisionAt
    ) return;

    if (this.behavior.movementType === "patrol") {
      if (!this.tryStep(this.patrolDirection)) {
        this.patrolDirection = OPPOSITE_DIRECTION[this.patrolDirection];
        this.facing = this.patrolDirection;
        this.wait(350, 700);
      }
      return;
    }

    if (this.remainingSteps <= 0) this.chooseDirection();
    if (this.remainingSteps > 0 && !this.tryStep(this.facing)) {
      this.remainingSteps = 0;
      this.wait();
    }
  }

  getBounds(): Phaser.Geom.Rectangle {
    return this.bounds;
  }

  faceToward(x: number, y: number): void {
    if (this.dialogueFacing === null) this.dialogueFacing = this.facing;
    const deltaX = x - this.sprite.x;
    const deltaY = y - this.sprite.y;
    this.facing =
      Math.abs(deltaX) > Math.abs(deltaY)
        ? deltaX < 0
          ? "left"
          : "right"
        : deltaY < 0
          ? "up"
          : "down";
    this.setIdleFrame();
  }

  restoreFacing(): void {
    if (this.dialogueFacing === null) return;
    this.facing = this.dialogueFacing;
    this.dialogueFacing = null;
    this.setIdleFrame();
  }

  private chooseDirection(): void {
    const directions = Phaser.Utils.Array.Shuffle([
      "up",
      "down",
      "left",
      "right"
    ] as Facing[]);
    directions.sort((left, right) => {
      const leftScore = left === OPPOSITE_DIRECTION[this.facing] ? 1 : 0;
      const rightScore = right === OPPOSITE_DIRECTION[this.facing] ? 1 : 0;
      return leftScore - rightScore;
    });

    for (const direction of directions) {
      const targetBounds = this.getTargetBounds(direction);
      if (!this.isInsideRoamArea(targetBounds) || !this.canOccupy(this, targetBounds)) continue;
      this.facing = direction;
      this.remainingSteps = Phaser.Math.Between(1, 4);
      return;
    }

    this.remainingSteps = 0;
    this.wait(500, 1100);
  }

  private tryStep(direction: Facing): boolean {
    const targetBounds = this.getTargetBounds(direction);
    if (!this.isInsideRoamArea(targetBounds) || !this.canOccupy(this, targetBounds)) return false;

    const vector = DIRECTION_VECTOR[direction];
    const targetX = this.sprite.x + vector.x * CONFIG.tileSize;
    const targetY = this.sprite.y + vector.y * CONFIG.tileSize;
    this.facing = direction;
    this.remainingSteps -= 1;
    this.sprite.play(`${this.variant}-${direction}-walk`, true);
    this.moveTween = this.scene.tweens.add({
      targets: this.sprite,
      x: targetX,
      y: targetY,
      duration: Math.max(120, (CONFIG.tileSize / this.behavior.speed) * 1000),
      ease: "Linear",
      onUpdate: () => this.syncPosition(),
      onComplete: () => {
        this.moveTween = undefined;
        this.syncPosition();
        if (this.behavior.movementType === "patrol") {
          this.setIdleFrame();
          this.nextDecisionAt = this.scene.time.now + Phaser.Math.Between(120, 260);
          return;
        }
        if (this.remainingSteps > 0) {
          this.nextDecisionAt = this.scene.time.now + Phaser.Math.Between(80, 180);
        } else {
          this.setIdleFrame();
          this.wait();
        }
      }
    });
    return true;
  }

  private getTargetBounds(direction: Facing): Phaser.Geom.Rectangle {
    const vector = DIRECTION_VECTOR[direction];
    return new Phaser.Geom.Rectangle(
      this.bounds.x + vector.x * CONFIG.tileSize,
      this.bounds.y + vector.y * CONFIG.tileSize,
      this.bounds.width,
      this.bounds.height
    );
  }

  private isInsideRoamArea(bounds: Phaser.Geom.Rectangle): boolean {
    const roamDistance = CONFIG.tileSize * 7;
    return (
      Math.abs(bounds.centerX - this.origin.x) <= roamDistance &&
      Math.abs(bounds.bottom - this.origin.y) <= roamDistance
    );
  }

  private syncPosition(): void {
    this.bounds.setPosition(
      this.sprite.x + this.collisionOffset.x,
      this.sprite.y + this.collisionOffset.y
    );
    this.object.x = this.sprite.x;
    this.object.baselineY = this.sprite.y;
    this.sprite.setDepth(this.sprite.y + 10);
    this.label?.setPosition(
      this.sprite.x,
      this.sprite.y - this.sprite.displayHeight - 5
    ).setDepth(this.sprite.depth + 1);
  }

  private wait(minimum = 700, maximum = 2400): void {
    this.setIdleFrame();
    this.nextDecisionAt = this.scene.time.now + Phaser.Math.Between(minimum, maximum);
  }

  private setIdleFrame(): void {
    this.sprite.anims.stop();
    const rowByFacing: Record<Facing, number> = {
      down: 0,
      left: 1,
      right: 2,
      up: 3
    };
    this.sprite.setFrame(rowByFacing[this.facing] * 4 + 1);
  }
}
