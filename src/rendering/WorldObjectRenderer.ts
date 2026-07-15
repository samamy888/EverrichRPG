import Phaser from "phaser";
import {
  isAnimatedObjectTexture,
  resolveObjectAnimation
} from "../animation/animationCatalog";
import type { MapObjectData, RegionData } from "../data/prototypeRegions";
import {
  isTravelerVariant,
  type TravelerVariant
} from "../data/travelerDirectory";
import { getShopIdForRegion } from "../interaction/InteractionPolicy";
import type { HiddenCollectible } from "../systems/explorationService";
import { TravelerAI } from "../systems/TravelerAI";
import type { WorldRenderPort } from "./WorldRenderer";
import { resolveGroundingType, resolveGroundShadow } from "./GroundShadowPolicy";
import { resolveObjectDepth } from "./ObjectDepthPolicy";

export interface InteractiveObject {
  object: MapObjectData;
  bounds: Phaser.Geom.Rectangle;
  getHitBounds: () => Phaser.Geom.Rectangle;
}

export interface ProximityLabel {
  bounds: Phaser.Geom.Rectangle;
  label: Phaser.GameObjects.BitmapText;
}

export interface WorldObjectRenderResult {
  collisionRects: Phaser.Geom.Rectangle[];
  interactiveObjects: InteractiveObject[];
  proximityLabels: ProximityLabel[];
  travelerAIs: TravelerAI[];
}

interface WorldObjectRendererOptions {
  scene: Phaser.Scene;
  effects: WorldRenderPort;
  bitmapFont: string;
  collectibles: readonly HiddenCollectible[];
  canTravelerOccupy: (
    traveler: TravelerAI,
    bounds: Phaser.Geom.Rectangle
  ) => boolean;
}

export class WorldObjectRenderer {
  constructor(private readonly options: WorldObjectRendererOptions) {}

  render(region: RegionData): WorldObjectRenderResult {
    const collisionRects: Phaser.Geom.Rectangle[] = [];
    const interactiveObjects: InteractiveObject[] = [];
    const proximityLabels: ProximityLabel[] = [];
    const travelerAIs: TravelerAI[] = [];

    for (const object of region.objects) {
      const travelerVariant = this.getTravelerVariant(object);
      const isTraveler = travelerVariant !== null;
      const isClerk = object.texture.startsWith("clerk-");
      const objectAnimationKey = resolveObjectAnimation(object.texture);
      const hasIntegratedScreenAnimation =
        object.texture === "airport-long-kiosk" ||
        object.texture === "airport-self-order-kiosk" ||
        object.texture === "airport-vending-machine" ||
        object.texture === "airport-ad-column";
      const texture = isTraveler
        ? `traveler-${travelerVariant}-sheet`
        : isClerk
          ? "duty-free-clerks-animated-v2"
          : object.texture;
      const image =
        isTraveler || isAnimatedObjectTexture(object.texture)
          ? this.options.scene.add
              .sprite(object.x, object.baselineY, texture)
              .setOrigin(0.5, 1)
          : this.options.scene.add
              .image(object.x, object.baselineY, texture)
              .setOrigin(0.5, 1);
      const displayWidth = object.displayWidth;
      image.setDisplaySize(
        displayWidth,
        object.displayHeight ?? image.height * (displayWidth / image.width)
      );
      image.setDepth(resolveObjectDepth(object));
      this.drawObjectShadow(object, image);
      if (objectAnimationKey && image instanceof Phaser.GameObjects.Sprite) {
        image.play(objectAnimationKey);
      }
      if (
        object.visualEffect?.style === "kioskPulse" &&
        !hasIntegratedScreenAnimation
      ) {
        this.options.effects.createKioskVisualEffect(image, object);
      }

      const bounds = new Phaser.Geom.Rectangle(
        object.collision.x,
        object.collision.y,
        object.collision.width,
        object.collision.height
      );
      if (!isTraveler && !object.decorative) collisionRects.push(bounds);

      const label = object.label
        ? this.options.scene.add
            .bitmapText(
              object.x,
              object.baselineY - image.displayHeight - 5,
              this.options.bitmapFont,
              object.label,
              12
            )
            .setTint(0x17242b)
            .setDropShadow(1, 1, 0xfff8df, 1)
            .setOrigin(0.5, 1)
            .setDepth(image.depth + 1)
            .setVisible(false)
        : undefined;
      if (label) {
        proximityLabels.push({ bounds, label });
      }

      if (
        !object.decorative &&
        (object.interaction ||
          getShopIdForRegion(region.id) ||
          this.options.collectibles.some(
            (collectible) =>
              collectible.regionId === region.id &&
              collectible.objectId === object.id
          ))
      ) {
        interactiveObjects.push({
          object,
          bounds,
          getHitBounds: () => image.getBounds()
        });
      }

      if (isTraveler && image instanceof Phaser.GameObjects.Sprite) {
        travelerAIs.push(
          new TravelerAI({
            scene: this.options.scene,
            object,
            sprite: image,
            bounds,
            label,
            variant: travelerVariant,
            behavior: object.npcBehavior ?? {
              movementType: "wander",
              facing: "down",
              speed: 52,
              animationKey: `traveler-${travelerVariant}`
            },
            canOccupy: this.options.canTravelerOccupy
          })
        );
      }
    }

    return {
      collisionRects,
      interactiveObjects,
      proximityLabels,
      travelerAIs
    };
  }

  private drawObjectShadow(
    object: MapObjectData,
    image: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite
  ): void {
    const grounding = resolveGroundingType(object);
    if (grounding === "none") return;
    if (grounding === "ground") {
      this.drawGroundContactShadow(object, image);
      return;
    }
    if (grounding === "suspended") {
      this.drawSuspendedShadow(object, image);
      return;
    }

    const bounds = image.getBounds();
    const shadow = this.options.scene.add
      .graphics()
      .setDepth(image.depth - 0.35);

    if (object.wallAttachment === "north") {
      const wallFootY = object.collision.y;
      shadow.fillStyle(0x3d342b, 0.16);
      shadow.fillRoundedRect(
        bounds.x + bounds.width * 0.08,
        wallFootY - 3,
        bounds.width * 0.84,
        8,
        4
      );
      shadow.fillStyle(0x2a211b, 0.12);
      shadow.fillRoundedRect(
        bounds.x + bounds.width * 0.12,
        wallFootY + 1,
        bounds.width * 0.76,
        5,
        3
      );
      shadow.fillStyle(0x1f1712, 0.14);
      shadow.fillEllipse(
        object.x,
        object.baselineY - Math.max(3, object.collision.height * 0.15),
        Math.max(18, object.collision.width * 1.35),
        8
      );
      return;
    }

    const isWest = object.wallAttachment === "west";
    const sideX = isWest ? bounds.x + bounds.width - 5 : bounds.x + 1;
    shadow.fillStyle(0x3d342b, 0.14);
    shadow.fillRoundedRect(
      sideX,
      bounds.y + bounds.height * 0.14,
      7,
      bounds.height * 0.72,
      4
    );
    shadow.fillStyle(0x1f1712, 0.12);
    shadow.fillEllipse(
      object.x,
      object.baselineY - Math.max(3, object.collision.height * 0.12),
      Math.max(16, object.collision.width * 1.25),
      7
    );
  }

  private drawSuspendedShadow(
    object: MapObjectData,
    image: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite
  ): void {
    this.options.scene.add
      .graphics()
      .setDepth(image.depth - 0.4)
      .fillStyle(0x1f2933, 0.07)
      .fillEllipse(
        object.x + 3,
        object.baselineY - 2,
        Math.max(16, object.collision.width * 1.15),
        7
      );
  }

  private drawGroundContactShadow(
    object: MapObjectData,
    image: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite
  ): void {
    const metrics = resolveGroundShadow(object);
    if (!metrics) return;

    const shadow = this.options.scene.add
      .graphics()
      .setDepth(image.depth - 0.4);
    shadow.fillStyle(0x1f2933, 0.14);
    shadow.fillEllipse(
      metrics.x,
      metrics.y,
      metrics.width,
      metrics.height
    );
    shadow.fillStyle(0x111820, 0.08);
    shadow.fillEllipse(
      metrics.x,
      metrics.y + 1,
      metrics.width * 0.72,
      Math.max(2, metrics.height * 0.52)
    );
  }

  private getTravelerVariant(object: MapObjectData): TravelerVariant | null {
    const animationKey = object.npcBehavior?.animationKey;
    const animationVariant =
      animationKey?.startsWith("traveler-") ? animationKey.slice(9) : undefined;
    if (animationVariant && isTravelerVariant(animationVariant)) return animationVariant;

    const textureVariant =
      object.texture.startsWith("traveler-") && object.texture.endsWith("-npc")
        ? object.texture.slice(9, -4)
        : undefined;
    if (textureVariant && isTravelerVariant(textureVariant)) return textureVariant;

    return null;
  }
}
