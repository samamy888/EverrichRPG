import Phaser from "phaser";
import {
  isAnimatedObjectTexture,
  resolveObjectAnimation
} from "../animation/animationCatalog";
import type { MapObjectData, RegionData } from "../data/prototypeRegions";
import { getShopIdForRegion } from "../interaction/InteractionPolicy";
import type { HiddenCollectible } from "../systems/explorationService";
import { TravelerAI } from "../systems/TravelerAI";
import type { WorldRenderPort } from "./WorldRenderer";

export interface InteractiveObject {
  object: MapObjectData;
  bounds: Phaser.Geom.Rectangle;
}

export interface WorldObjectRenderResult {
  collisionRects: Phaser.Geom.Rectangle[];
  interactiveObjects: InteractiveObject[];
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
    const travelerAIs: TravelerAI[] = [];

    for (const object of region.objects) {
      const travelerVariant = this.getTravelerVariant(object);
      const isTraveler = travelerVariant !== null;
      const isClerk = object.texture.startsWith("clerk-");
      const objectAnimationKey = resolveObjectAnimation(object.texture);
      const hasIntegratedScreenAnimation =
        object.texture === "airport-long-kiosk" ||
        object.texture === "airport-self-order-kiosk" ||
        object.texture === "airport-vending-machine";
      const texture = isTraveler
        ? travelerVariant === "male"
          ? "traveler-male-sheet"
          : "traveler-female-sheet"
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
      const displayWidth = isClerk
        ? object.displayWidth * 1.2
        : object.displayWidth;
      image.setDisplaySize(
        displayWidth,
        object.displayHeight ?? image.height * (displayWidth / image.width)
      );
      image.setDepth(
        (object.foreground ? object.baselineY + 10 : object.baselineY) +
          (object.depthOffset ?? 0)
      );
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
        interactiveObjects.push({ object, bounds });
      }

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
        : undefined;

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

    return { collisionRects, interactiveObjects, travelerAIs };
  }

  private getTravelerVariant(
    object: MapObjectData
  ): "male" | "female" | null {
    const animationKey = object.npcBehavior?.animationKey;
    if (
      animationKey === "traveler-male" ||
      object.texture === "traveler-male-npc"
    ) {
      return "male";
    }
    if (
      animationKey === "traveler-female" ||
      object.texture === "traveler-female-npc"
    ) {
      return "female";
    }
    return null;
  }
}
