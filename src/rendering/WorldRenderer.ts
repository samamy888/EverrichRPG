import Phaser from "phaser";
import { CONFIG } from "../config";
import type {
  MapObjectData,
  PortalData,
  RegionData
} from "../data/prototypeRegions";

export interface WorldRenderPort {
  drawFloor(region: RegionData): void;
  drawBoundaries(region: RegionData): Phaser.Geom.Rectangle[];
  drawPortals(region: RegionData): void;
  createKioskVisualEffect(
    image: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite,
    object: MapObjectData
  ): void;
}

export class PhaserWorldRenderer implements WorldRenderPort {
  constructor(private readonly scene: Phaser.Scene) {}

  drawFloor(region: RegionData): void {
    if (region.tileLayers?.length) {
      for (const [layerIndex, layer] of region.tileLayers.entries()) {
        layer.tiles.forEach((texture, index) => {
          if (!texture) return;
          const x = (index % layer.width) * CONFIG.tileSize;
          const y = Math.floor(index / layer.width) * CONFIG.tileSize;
          this.scene.add
            .image(x, y, texture)
            .setOrigin(0, 0)
            .setDisplaySize(CONFIG.tileSize, CONFIG.tileSize)
            .setAlpha(layer.opacity)
            .setDepth(-10 + layerIndex);
        });
      }
      return;
    }

    this.scene.add
      .tileSprite(0, 0, region.width, region.height, region.floorTexture)
      .setOrigin(0, 0)
      .setDepth(-10);
    if (region.accentFloorTexture) {
      this.scene.add
        .tileSprite(
          region.width / 2 - CONFIG.tileSize * 3,
          0,
          CONFIG.tileSize * 6,
          region.height,
          region.accentFloorTexture
        )
        .setOrigin(0, 0)
        .setAlpha(0.55)
        .setDepth(-9);
    }
  }

  drawBoundaries(region: RegionData): Phaser.Geom.Rectangle[] {
    return region.boundaries.map((boundary) => {
      this.scene.add
        .tileSprite(
          boundary.x,
          boundary.y,
          boundary.width,
          boundary.height,
          boundary.texture
        )
        .setOrigin(0, 0)
        .setDepth(1);
      return new Phaser.Geom.Rectangle(
        boundary.x,
        boundary.y,
        boundary.width,
        boundary.height
      );
    });
  }

  drawPortals(region: RegionData): void {
    const edgeThreshold = CONFIG.tileSize * 3;
    for (const portal of region.portals) {
      const { x, y, width, height } = portal.bounds;
      const isTop = y <= edgeThreshold;
      const isBottom = y + height >= region.height - edgeThreshold;
      const isLeft = x <= edgeThreshold;
      const horizontal = isTop || isBottom;
      const glow = this.scene.add
        .graphics()
        .setDepth(3)
        .setBlendMode(Phaser.BlendModes.ADD);

      glow.fillStyle(0xfffdf1, 0.16);
      if (horizontal) {
        glow.fillRoundedRect(x - 8, y - 5, width + 16, height + 10, 8);
        glow.fillStyle(0xffffff, 0.32);
        glow.fillRoundedRect(x + 3, y, Math.max(10, width - 6), height, 5);
        glow.fillStyle(0xfff2bc, 0.18);
        glow.fillEllipse(
          x + width / 2,
          isTop ? y + height - 3 : y - 13,
          width + 18,
          28
        );
        glow.fillStyle(0xffffff, 0.72);
        glow.fillRect(
          x + 5,
          isTop ? y + height - 3 : y + 1,
          Math.max(8, width - 10),
          3
        );
      } else {
        glow.fillRoundedRect(x - 5, y - 8, width + 10, height + 16, 8);
        glow.fillStyle(0xffffff, 0.32);
        glow.fillRoundedRect(x, y + 3, width, Math.max(10, height - 6), 5);
        glow.fillStyle(0xfff2bc, 0.18);
        glow.fillEllipse(
          isLeft ? x + width - 3 : x - 13,
          y + height / 2,
          28,
          height + 18
        );
        glow.fillStyle(0xffffff, 0.72);
        glow.fillRect(
          isLeft ? x + width - 3 : x + 1,
          y + 5,
          3,
          Math.max(8, height - 10)
        );
      }

      this.scene.tweens.add({
        targets: glow,
        alpha: { from: 0.48, to: 0.82 },
        duration: 1050,
        ease: "Sine.InOut",
        yoyo: true,
        repeat: -1
      });
      if (portal.visualEffect?.style === "portalFlow") {
        this.createPortalFlowEffect(portal, {
          isTop,
          isLeft,
          horizontal
        });
      }
    }
  }

  createKioskVisualEffect(
    image: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite,
    object: MapObjectData
  ): void {
    const effect = object.visualEffect;
    if (!effect) return;
    const bounds = image.getBounds();
    const direction =
      object.texture === "airport-long-kiosk" ||
      object.texture === "airport-self-order-kiosk"
        ? "south"
        : object.texture.split("-").at(-1);
    const glow = this.scene.add
      .graphics()
      .setDepth(image.depth + 0.5)
      .setBlendMode(Phaser.BlendModes.ADD);
    const scanLine = this.scene.add
      .rectangle(0, 0, 2, 2, effect.color, 0.9)
      .setDepth(image.depth + 0.6)
      .setBlendMode(Phaser.BlendModes.ADD);

    if (direction === "south") {
      const screenX = bounds.x + bounds.width * 0.09;
      const screenY = bounds.y + bounds.height * 0.15;
      const screenWidth = bounds.width * 0.82;
      const screenHeight = bounds.height * 0.43;
      glow.fillStyle(effect.color, 0.18);
      glow.fillRoundedRect(screenX, screenY, screenWidth, screenHeight, 3);
      scanLine
        .setPosition(screenX + screenWidth / 2, screenY + 1)
        .setSize(screenWidth * 0.84, 1);
      this.scene.tweens.add({
        targets: scanLine,
        y: screenY + screenHeight - 2,
        alpha: { from: 0.25, to: 0.9 },
        duration: effect.durationMs,
        repeat: -1,
        yoyo: true,
        ease: "Sine.InOut"
      });
    } else if (direction === "north") {
      const lightY = bounds.y + bounds.height * 0.72;
      glow.fillStyle(effect.color, 0.2);
      glow.fillRoundedRect(
        bounds.x + bounds.width * 0.36,
        lightY,
        bounds.width * 0.28,
        Math.max(2, bounds.height * 0.035),
        2
      );
      scanLine
        .setPosition(bounds.x + bounds.width * 0.36, lightY + 1)
        .setSize(Math.max(2, bounds.width * 0.06), 2);
      this.scene.tweens.add({
        targets: scanLine,
        x: bounds.x + bounds.width * 0.64,
        duration: effect.durationMs,
        repeat: -1,
        yoyo: true,
        ease: "Sine.InOut"
      });
    } else {
      const rightFacing = direction === "east";
      const lightX = rightFacing
        ? bounds.x + bounds.width * 0.84
        : bounds.x + bounds.width * 0.16;
      const startY = bounds.y + bounds.height * 0.12;
      const endY = bounds.y + bounds.height * 0.78;
      glow.fillStyle(effect.color, 0.18);
      glow.fillRoundedRect(lightX - 1, startY, 3, endY - startY, 2);
      scanLine
        .setPosition(lightX, startY)
        .setSize(3, Math.max(3, bounds.height * 0.08));
      this.scene.tweens.add({
        targets: scanLine,
        y: endY,
        duration: effect.durationMs,
        repeat: -1,
        yoyo: true,
        ease: "Sine.InOut"
      });
    }

    this.scene.tweens.add({
      targets: glow,
      alpha: { from: 0.35, to: 0.9 },
      duration: effect.durationMs * 0.8,
      repeat: -1,
      yoyo: true,
      ease: "Sine.InOut"
    });
  }

  private createPortalFlowEffect(
    portal: PortalData,
    orientation: {
      isTop: boolean;
      isLeft: boolean;
      horizontal: boolean;
    }
  ): void {
    const effect = portal.visualEffect;
    if (!effect) return;
    const { x, y, width, height } = portal.bounds;
    const markerCount = 3;

    for (let index = 0; index < markerCount; index += 1) {
      const ratio = (index + 1) / (markerCount + 1);
      const marker = this.scene.add
        .rectangle(
          orientation.horizontal ? x + width * ratio : x + width / 2,
          orientation.horizontal ? y + height / 2 : y + height * ratio,
          orientation.horizontal ? Math.max(4, width * 0.12) : 2,
          orientation.horizontal ? 2 : Math.max(4, height * 0.12),
          effect.color,
          0.9
        )
        .setDepth(4)
        .setBlendMode(Phaser.BlendModes.ADD);
      const distance = 10;
      const deltaX = orientation.horizontal
        ? 0
        : orientation.isLeft
          ? -distance
          : distance;
      const deltaY = orientation.horizontal
        ? orientation.isTop
          ? -distance
          : distance
        : 0;

      this.scene.tweens.add({
        targets: marker,
        x: marker.x + deltaX,
        y: marker.y + deltaY,
        alpha: { from: 0.15, to: 0.95 },
        duration: effect.durationMs,
        delay: index * Math.round(effect.durationMs / markerCount),
        repeat: -1,
        yoyo: true,
        ease: "Sine.InOut"
      });
    }
  }
}
