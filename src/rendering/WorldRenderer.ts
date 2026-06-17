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

const TOP_WALL_VISUAL_HEIGHT_MULTIPLIER = 3;
const SIDE_WALL_VISUAL_WIDTH_MULTIPLIER = 1.5;

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
      if (boundary.texture === "wall-ivory-panel") {
        if (this.isBottomWall(boundary)) {
          return new Phaser.Geom.Rectangle(
            boundary.x,
            boundary.y,
            boundary.width,
            boundary.height
          );
        }
        const wallBounds = this.getIvoryWallVisualBounds(boundary);
        this.drawIvoryWall(boundary, wallBounds);
        return this.getIvoryWallCollisionBounds(boundary, wallBounds);
      } else {
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
      }
      return new Phaser.Geom.Rectangle(
        boundary.x,
        boundary.y,
        boundary.width,
        boundary.height
      );
    });
  }

  private isBottomWall(boundary: RegionData["boundaries"][number]): boolean {
    return boundary.width >= boundary.height && boundary.y > 0;
  }

  private getIvoryWallCollisionBounds(
    boundary: RegionData["boundaries"][number],
    visualBounds: Phaser.Geom.Rectangle
  ): Phaser.Geom.Rectangle {
    const horizontal = boundary.width >= boundary.height;
    const isBottomWall = horizontal && boundary.y > 0;
    if (isBottomWall) {
      return new Phaser.Geom.Rectangle(
        boundary.x,
        boundary.y,
        boundary.width,
        boundary.height
      );
    }
    return visualBounds;
  }

  private getIvoryWallVisualBounds(
    boundary: RegionData["boundaries"][number]
  ): Phaser.Geom.Rectangle {
    const horizontal = boundary.width >= boundary.height;
    const visualWidth = horizontal
      ? boundary.width
      : Math.max(
          boundary.width * SIDE_WALL_VISUAL_WIDTH_MULTIPLIER,
          CONFIG.tileSize * 1.5
        );
    const visualHeight = horizontal
      ? Math.max(
          boundary.height * TOP_WALL_VISUAL_HEIGHT_MULTIPLIER,
          CONFIG.tileSize * 1.5
        )
      : boundary.height;
    const visualX =
      horizontal || boundary.x === 0
        ? boundary.x
        : boundary.x - (visualWidth - boundary.width);
    const visualY =
      !horizontal || boundary.y === 0
        ? boundary.y
        : boundary.y - (visualHeight - boundary.height);

    return new Phaser.Geom.Rectangle(
      visualX,
      visualY,
      visualWidth,
      visualHeight
    );
  }

  private drawIvoryWall(
    boundary: RegionData["boundaries"][number],
    visualBounds: Phaser.Geom.Rectangle
  ): void {
    const horizontal = boundary.width >= boundary.height;
    const visualX = visualBounds.x;
    const visualY = visualBounds.y;
    const visualWidth = visualBounds.width;
    const visualHeight = visualBounds.height;

    this.scene.add
      .tileSprite(
        visualX,
        visualY,
        visualWidth,
        visualHeight,
        boundary.texture
      )
      .setOrigin(0, 0)
      .setDepth(1);

    const wall = this.scene.add.graphics().setDepth(2);
    const x = visualX;
    const y = visualY;
    const width = visualWidth;
    const height = visualHeight;

    if (horizontal) {
      if (boundary.y === 0) {
        wall.fillStyle(0x050506, 0.72);
        wall.fillRect(x, y, width, Math.min(4, height));
      }
      this.drawHorizontalInteriorWall(wall, x, y, width, height);
    } else {
      wall.fillStyle(0x050506, 0.44);
      wall.fillRect(boundary.x === 0 ? x : x + width - 4, y, 4, height);
      this.drawVerticalInteriorWall(wall, x, y, width, height, boundary.x === 0);
    }
  }

  private drawHorizontalInteriorWall(
    wall: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const capHeight = Math.min(12, Math.max(8, height * 0.22));
    const baseHeight = Math.min(8, Math.max(5, height * 0.16));
    const faceY = y + capHeight;
    const faceHeight = Math.max(1, height - capHeight - baseHeight);
    const baseY = y + height - baseHeight;

    wall.fillStyle(0x5a3440, 0.9);
    wall.fillRect(x, y, width, capHeight);
    wall.fillStyle(0x2b1720, 0.35);
    wall.fillRect(x, y + capHeight - 3, width, 3);
    wall.fillStyle(0xfdfaf2, 0.66);
    wall.fillRect(x, faceY, width, faceHeight);
    wall.fillStyle(0xe8dfce, 0.34);
    wall.fillRect(x, faceY + Math.max(2, faceHeight * 0.48), width, 2);
    wall.fillStyle(0x9a6a55, 0.52);
    wall.fillRect(x, baseY, width, baseHeight);
    wall.fillStyle(0x3c2430, 0.26);
    wall.fillRect(x, baseY, width, 2);
    wall.fillStyle(0x27171e, 0.18);
    wall.fillRect(x, y + height - 2, width, 2);

    for (
      let seamX = x + CONFIG.tileSize;
      seamX < x + width;
      seamX += CONFIG.tileSize
    ) {
      wall.fillStyle(0xd5c9b8, 0.28);
      wall.fillRect(seamX, faceY + 2, 1, Math.max(1, faceHeight - 4));
      wall.fillStyle(0xffffff, 0.18);
      wall.fillRect(seamX + 1, faceY + 2, 1, Math.max(1, faceHeight - 4));
    }

    const pillarWidth = Math.min(10, Math.max(6, height * 0.2));
    for (const pillarX of [x, x + width - pillarWidth]) {
      if (width < CONFIG.tileSize * 2 && pillarX !== x) continue;
      wall.fillStyle(0x5d3440, 0.82);
      wall.fillRect(pillarX, y, pillarWidth, height);
      wall.fillStyle(0x2c1820, 0.24);
      wall.fillRect(pillarX + pillarWidth - 2, y, 2, height);
      wall.fillStyle(0xffffff, 0.13);
      wall.fillRect(pillarX + 2, y + 2, 1, Math.max(1, height - 4));
    }
  }

  private drawVerticalInteriorWall(
    wall: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    isLeftWall: boolean
  ): void {
    const capWidth = Math.min(12, Math.max(8, width * 0.24));
    const baseWidth = Math.min(8, Math.max(5, width * 0.16));
    const capX = isLeftWall ? x : x + width - capWidth;
    const baseX = isLeftWall ? x + width - baseWidth : x;
    const faceX = isLeftWall ? x + capWidth : x + baseWidth;
    const faceWidth = Math.max(1, width - capWidth - baseWidth);

    wall.fillStyle(0x5a3440, 0.88);
    wall.fillRect(capX, y, capWidth, height);
    wall.fillStyle(0x2b1720, 0.28);
    wall.fillRect(
      isLeftWall ? capX + capWidth - 3 : capX,
      y,
      3,
      height
    );
    wall.fillStyle(0xfdfaf2, 0.52);
    wall.fillRect(faceX, y, faceWidth, height);
    wall.fillStyle(0x9a6a55, 0.42);
    wall.fillRect(baseX, y, baseWidth, height);
    wall.fillStyle(0x3c2430, 0.22);
    wall.fillRect(isLeftWall ? baseX : baseX + baseWidth - 2, y, 2, height);

    for (
      let seamY = y + CONFIG.tileSize;
      seamY < y + height;
      seamY += CONFIG.tileSize
    ) {
      wall.fillStyle(0xd5c9b8, 0.24);
      wall.fillRect(faceX + 2, seamY, Math.max(1, faceWidth - 4), 1);
      wall.fillStyle(0xffffff, 0.13);
      wall.fillRect(faceX + 2, seamY + 1, Math.max(1, faceWidth - 4), 1);
    }

    const pillarHeight = Math.min(10, Math.max(6, width * 0.22));
    for (const pillarY of [y, y + height - pillarHeight]) {
      if (height < CONFIG.tileSize * 2 && pillarY !== y) continue;
      wall.fillStyle(0x5d3440, 0.7);
      wall.fillRect(x, pillarY, width, pillarHeight);
      wall.fillStyle(0x2c1820, 0.18);
      wall.fillRect(x, pillarY + pillarHeight - 2, width, 2);
    }
  }

  drawPortals(region: RegionData): void {
    const edgeThreshold = CONFIG.tileSize * 3;
    for (const portal of region.portals) {
      const { x, y, width, height } = portal.bounds;
      const isTop = y <= edgeThreshold;
      const isBottom = y + height >= region.height - edgeThreshold;
      const isLeft = x <= edgeThreshold;
      const isRight = x + width >= region.width - edgeThreshold;
      const glow = this.scene.add
        .graphics()
        .setDepth(3);

      this.drawPortalThreshold(glow, portal.bounds, {
        isTop,
        isBottom,
        isLeft,
        isRight
      });
    }
  }

  private drawPortalThreshold(
    graphics: Phaser.GameObjects.Graphics,
    bounds: PortalData["bounds"],
    orientation: {
      isTop: boolean;
      isBottom: boolean;
      isLeft: boolean;
      isRight: boolean;
    }
  ): void {
    const { x, y, width, height } = bounds;
    if (orientation.isTop) {
      graphics.fillStyle(0x050506, 0.95);
      graphics.fillRect(x, 0, width, y + height);
      return;
    }

    if (orientation.isLeft || orientation.isRight) {
      graphics.fillStyle(0x050506, 0.92);
      graphics.fillRect(
        orientation.isLeft ? 0 : x,
        y,
        orientation.isLeft ? x + width : width,
        height
      );
      return;
    }

    if (orientation.isBottom) return;
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

}
