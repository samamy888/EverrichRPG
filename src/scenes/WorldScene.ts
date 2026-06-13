import Phaser from "phaser";
import { CONFIG } from "../config";
import {
  emitPrototypeDialogue,
  emitPrototypeDialogueClose,
  emitPrototypeInteractionHint,
  emitPrototypeMovementMode,
  emitPrototypeShopOpen,
  emitPrototypeStatus
} from "../core/prototypeEvents";
import {
  type DialogueChoiceData,
  type Facing,
  type MapObjectData,
  type PortalData,
  type RegionData,
  type RegionId
} from "../data/prototypeRegions";
import { loadTiledRegion, preloadTiledRegions } from "../data/tiledRegionLoader";
import type { ShopId } from "../data/shopCatalog";
import { audioManager } from "../systems/audioManager";
import {
  explorationService,
  HIDDEN_COLLECTIBLES
} from "../systems/explorationService";
import {
  clearPrototypeSave,
  savePrototype,
  type PlayerVariant,
  type PrototypeSave
} from "../systems/prototypeSave";
import { travelerQuestService } from "../systems/travelerQuestService";
import { TravelerAI } from "../systems/TravelerAI";

interface MovementState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

interface MovementInput {
  x: number;
  y: number;
  strength: number;
  facing: Facing;
  key: string;
}

interface InteractiveObject {
  object: MapObjectData;
  bounds: Phaser.Geom.Rectangle;
}

interface ActiveDialogue {
  title: string;
  pages: string[];
  pageIndex: number;
  visibleCharacters: number;
  choices?: DialogueChoiceData[];
  selectedChoice: number;
  typingEvent?: Phaser.Time.TimerEvent;
}

const DIRECTION_VECTOR: Record<Facing, Phaser.Math.Vector2> = {
  up: new Phaser.Math.Vector2(0, -1),
  down: new Phaser.Math.Vector2(0, 1),
  left: new Phaser.Math.Vector2(-1, 0),
  right: new Phaser.Math.Vector2(1, 0)
};

export class WorldScene extends Phaser.Scene {
  private regionId: RegionId = "duty-free-entrance";
  private spawnId = "start";
  private facing: Facing = "up";
  private playerVariant: PlayerVariant = "male";
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key>;
  private resetKey!: Phaser.Input.Keyboard.Key;
  private testPortalKey!: Phaser.Input.Keyboard.Key;
  private debugKey!: Phaser.Input.Keyboard.Key;
  private runKey!: Phaser.Input.Keyboard.Key;
  private collisionRects: Phaser.Geom.Rectangle[] = [];
  private portals: PortalData[] = [];
  private interactiveObjects: InteractiveObject[] = [];
  private debugGraphics!: Phaser.GameObjects.Graphics;
  private interactionHint!: Phaser.GameObjects.Container;
  private interactionHintLabel!: Phaser.GameObjects.Text;
  private hintedObjectId: string | null = null;
  private touchState: MovementState = { up: false, down: false, left: false, right: false };
  private joystickVector = { x: 0, y: 0, strength: 0 };
  private mouseMovementActive = false;
  private moving = false;
  private transitioning = false;
  private dialogueOpen = false;
  private debugVisible = false;
  private portalReadyAt = 0;
  private heldDirection: string | null = null;
  private repeatMoveAt = 0;
  private running = false;
  private currentRegion!: RegionData;
  private shopOpen = false;
  private menuOpen = false;
  private travelerAIs: TravelerAI[] = [];
  private activeDialogue: ActiveDialogue | null = null;
  private dialogueTraveler: TravelerAI | null = null;
  private dialogueJoystickDirection: "up" | "down" | null = null;

  private readonly touchHandler = (event: Event): void => {
    const detail = (event as CustomEvent<{ direction: keyof MovementState; pressed: boolean }>).detail;
    this.touchState[detail.direction] = detail.pressed;
  };
  private readonly joystickHandler = (event: Event): void => {
    const vector = (
      event as CustomEvent<{ x: number; y: number; strength: number }>
    ).detail;
    if (this.hasVisibleDialogueChoices()) {
      this.joystickVector = { x: 0, y: 0, strength: 0 };
      if (vector.strength < 0.45 || Math.abs(vector.y) <= Math.abs(vector.x)) {
        this.dialogueJoystickDirection = null;
        return;
      }
      const direction = vector.y < 0 ? "up" : "down";
      if (direction !== this.dialogueJoystickDirection) {
        this.dialogueJoystickDirection = direction;
        this.moveDialogueChoice(direction === "up" ? -1 : 1);
      }
      return;
    }
    this.dialogueJoystickDirection = null;
    this.joystickVector = vector;
  };
  private readonly dialogueChoiceHandler = (event: Event): void => {
    const index = (event as CustomEvent<{ index: number }>).detail.index;
    this.chooseDialogueOption(index);
  };

  private readonly actionHandler = (): void => this.interact();
  private readonly shopCloseHandler = (): void => {
    this.shopOpen = false;
    this.updateInteractionHint();
  };
  private readonly backHandler = (): void => {
    if (this.shopOpen) {
      window.dispatchEvent(new CustomEvent("prototype:shop-dismiss"));
      return;
    }
    if (this.dialogueOpen) {
      this.closeDialogue();
      return;
    }
    this.toggleMovementMode();
  };
  private readonly menuHandler = (): void => {
    window.dispatchEvent(new CustomEvent("prototype:menu-open-request"));
  };
  private readonly menuStateHandler = (event: Event): void => {
    this.menuOpen = (event as CustomEvent<{ open: boolean }>).detail.open;
    this.touchState = { up: false, down: false, left: false, right: false };
    this.joystickVector = { x: 0, y: 0, strength: 0 };
    this.mouseMovementActive = false;
    this.heldDirection = null;
    this.updateInteractionHint();
  };
  private readonly returnTitleHandler = (): void => {
    this.menuOpen = false;
    this.scene.start("TitleScene");
  };

  constructor() {
    super("WorldScene");
  }

  init(data: Partial<PrototypeSave>): void {
    this.resetRuntimeState();
    this.playerVariant = data.playerVariant ?? "male";
    this.regionId = data.regionId ?? "duty-free-entrance";
    this.spawnId = data.spawnId ?? "start";
    this.facing = data.facing ?? "up";
    this.running = data.movementMode === "run";
  }

  preload(): void {
    preloadTiledRegions(this);
    const tilesetBase = "/assets/tilesets/duty-free-terminal-v1";
    const propBase = "/assets/props/duty-free-terminal-v1";
    this.load.image("floor-cream", `${tilesetBase}/floor-cream.png`);
    this.load.image("floor-blue", `${tilesetBase}/floor-blue.png`);
    this.load.image("floor-gold", `${tilesetBase}/floor-gold.png`);
    this.load.image("floor-dark", `${tilesetBase}/floor-dark.png`);
    const airportV2Tiles = "/assets/tilesets/airport-reference-v2";
    const airportV2Props = "/assets/props/airport-reference-v2";
    this.load.image("floor-terrazzo", `${airportV2Tiles}/floor-terrazzo.png`);
    this.load.image("floor-ivory", `${airportV2Tiles}/floor-ivory.png`);
    this.load.image("floor-carpet-blue", `${airportV2Tiles}/floor-carpet-blue.png`);
    this.load.image("floor-navy-panel", `${airportV2Tiles}/floor-navy-panel.png`);
    this.load.image("wall-ivory-panel", `${airportV2Tiles}/wall-ivory-panel.png`);
    this.load.image("service-counter", `${propBase}/service-counter.png`);
    this.load.image("display-shelf", `${propBase}/display-shelf.png`);
    this.load.image("planter", `${propBase}/planter.png`);
    this.load.image("sign-pillar", `${propBase}/sign-pillar.png`);
    this.load.image("shop-doorway", `${propBase}/shop-doorway.png`);
    this.load.image("digital-map-kiosk-v2", `${airportV2Props}/digital-map-kiosk-v2.png`);
    this.load.image(
      "curved-duty-free-storefront-v2",
      `${airportV2Props}/curved-duty-free-storefront-v2.png`
    );
    this.load.image("luxury-storefront-v2", `${airportV2Props}/luxury-storefront-v2.png`);
    this.load.image(
      "beauty-display-island-v2",
      `${airportV2Props}/beauty-display-island-v2.png`
    );
    for (const texture of [
      "checkout-counter-base",
      "checkout-equipment-pos",
      "checkout-items-beauty",
      "checkout-items-liquor-food",
      "checkout-items-gift",
      "beauty-display-base",
      "beauty-products-perfume",
      "beauty-products-skincare",
      "beauty-products-cosmetics",
      "beauty-products-gift-set",
      "liquor-products-whisky",
      "liquor-products-chocolate",
      "food-products-pineapple-cake",
      "liquor-products-mini-tasting",
      "gift-products-keychains",
      "gift-products-neck-pillows",
      "gift-products-postcards",
      "gift-products-organizers"
    ]) {
      this.load.image(texture, `/assets/props/airport-reference-v3/${texture}.png`);
    }
    for (const texture of [
      "airport-overhead-wayfinding",
      "airport-waiting-seats",
      "airport-queue-barriers",
      "airport-ceiling-skylight"
    ]) {
      this.load.image(
        texture,
        `/assets/props/airport-atrium-v1/${texture.replace("airport-", "")}.png`
      );
    }
    this.load.image(
      "airport-floor-wayfinding",
      "/assets/props/airport-floor-wayfinding-v1/floor-duty-free.png"
    );
    const directionalPropBase = "/assets/props/airport-directional-v1";
    this.load.image(
      "airport-restroom-entrance-south",
      "/assets/props/airport-directional-v2/restroom-wall-south.png"
    );
    for (const texture of [
      "airport-planter-south",
      "airport-planter-west",
      "airport-planter-east",
      "airport-planter-north",
      "airport-water-dispenser-south",
      "airport-water-dispenser-west",
      "airport-water-dispenser-east",
      "airport-water-dispenser-north",
      "airport-restroom-entrance-west",
      "airport-restroom-entrance-east",
      "airport-restroom-entrance-north",
      "airport-escalator-south",
      "airport-escalator-west",
      "airport-escalator-east",
      "airport-escalator-north"
    ]) {
      this.load.image(texture, `${directionalPropBase}/${texture.replace("airport-", "")}.png`);
    }
    const legacyDirectionalPropBase = "/assets/props/legacy-directional-v1";
    for (const texture of [
      "dutyfree-curved-storefront-south",
      "dutyfree-curved-storefront-west",
      "dutyfree-curved-storefront-east",
      "dutyfree-curved-storefront-north",
      "dutyfree-luxury-storefront-south",
      "dutyfree-luxury-storefront-west",
      "dutyfree-luxury-storefront-east",
      "dutyfree-luxury-storefront-north",
      "dutyfree-display-island-south",
      "dutyfree-display-island-west",
      "dutyfree-display-island-east",
      "dutyfree-display-island-north",
      "dutyfree-display-shelf-south",
      "dutyfree-display-shelf-west",
      "dutyfree-display-shelf-east",
      "dutyfree-display-shelf-north",
      "dutyfree-service-counter-south",
      "dutyfree-service-counter-west",
      "dutyfree-service-counter-east",
      "dutyfree-service-counter-north",
      "dutyfree-shop-doorway-south",
      "dutyfree-shop-doorway-west",
      "dutyfree-shop-doorway-east",
      "dutyfree-shop-doorway-north",
      "airport-digital-map-kiosk-south",
      "airport-digital-map-kiosk-west",
      "airport-digital-map-kiosk-east",
      "airport-digital-map-kiosk-north",
      "airport-sign-pillar-south",
      "airport-sign-pillar-west",
      "airport-sign-pillar-east",
      "airport-sign-pillar-north"
    ]) {
      this.load.image(texture, `${legacyDirectionalPropBase}/${texture}.png`);
    }
    const clerkBase = "/assets/sprites/duty-free-clerks-v1";
    this.load.image("clerk-beauty-01", `${clerkBase}/clerk-1.png`);
    this.load.image("clerk-liquor-food-01", `${clerkBase}/clerk-2.png`);
    this.load.image("clerk-gift-01", `${clerkBase}/clerk-3.png`);
    this.load.image(
      "traveler-male-npc",
      "/assets/sprites/player-traveler-male-v1/traveler-male-1.png"
    );
    this.load.image(
      "traveler-female-npc",
      "/assets/sprites/player-traveler-female-v1/traveler-female-1.png"
    );
    this.load.spritesheet(
      "traveler-male-sheet",
      "/assets/sprites/player-traveler-male-v1/sheet-transparent.png",
      { frameWidth: 96, frameHeight: 96 }
    );
    this.load.spritesheet(
      "traveler-female-sheet",
      "/assets/sprites/player-traveler-female-v1/sheet-transparent.png",
      { frameWidth: 96, frameHeight: 96 }
    );
    this.load.spritesheet(
      "traveler-male-idle-sheet",
      "/assets/sprites/player-traveler-male-idle-v1/sheet-transparent.png",
      { frameWidth: 96, frameHeight: 96 }
    );
    this.load.spritesheet(
      "traveler-female-idle-sheet",
      "/assets/sprites/player-traveler-female-idle-v1/sheet-transparent.png",
      { frameWidth: 96, frameHeight: 96 }
    );
  }

  create(): void {
    this.createPlayerAnimations();
    this.setupInput();
    this.bindUiEvents();
    this.buildRegion(this.regionId, this.spawnId);
    this.cameras.main.fadeIn(180, 0, 0, 0);
  }

  update(time: number): void {
    const worldPaused =
      !this.player || this.transitioning || this.dialogueOpen || this.shopOpen || this.menuOpen;
    for (const travelerAI of this.travelerAIs) {
      travelerAI.update(time, worldPaused);
    }
    if (this.debugVisible) this.drawDebug();

    if (Phaser.Input.Keyboard.JustDown(this.resetKey)) {
      clearPrototypeSave();
      this.scene.start("CharacterSelectScene");
    }
    if (Phaser.Input.Keyboard.JustDown(this.debugKey)) {
      this.debugVisible = !this.debugVisible;
      this.drawDebug();
    }

    if (worldPaused) return;

    const movement = this.readHeldMovement();
    if (!movement) {
      this.heldDirection = null;
      this.repeatMoveAt = 0;
      if (!this.moving && this.player.anims.isPlaying) {
        this.updatePlayerFacing();
      }
    } else if (movement.key !== this.heldDirection) {
      this.heldDirection = movement.key;
      this.tryMove(movement);
      this.repeatMoveAt = time + this.getInputRepeatDuration(movement);
    } else if (!this.moving && time >= this.repeatMoveAt) {
      this.tryMove(movement);
      this.repeatMoveAt = time + this.getInputRepeatDuration(movement);
    }

    if (Phaser.Input.Keyboard.JustDown(this.testPortalKey)) {
      const portal = this.currentRegion.portals[0];
      if (portal) this.tryPortal(portal);
    }
    if (Phaser.Input.Keyboard.JustDown(this.runKey)) {
      this.toggleMovementMode();
    }
  }

  private buildRegion(regionId: RegionId, spawnId: string): void {
    const region = loadTiledRegion(this, regionId);
    if (!region) throw new Error(`Region ${regionId} could not be loaded.`);
    this.currentRegion = region;
    audioManager.setBgm(this.getBgmForRegion(regionId));
    explorationService.visitRegion(regionId);
    this.regionId = regionId;
    this.spawnId = spawnId;
    this.collisionRects = [];
    this.travelerAIs = [];
    this.portals = region.portals;
    this.interactiveObjects = [];
    this.physics.world.setBounds(0, 0, region.width, region.height);
    this.cameras.main.setBounds(0, 0, region.width, region.height);
    this.cameras.main.setBackgroundColor(
      region.floorTexture === "floor-terrazzo" ? 0xa8aaad : 0xefe4cf
    );

    this.drawFloor(region);
    this.drawBoundaries(region);
    this.drawObjects(region);
    this.drawPortals(region);
    this.createPlayer(region, spawnId);
    this.createRegionLabels(region);
    this.createInteractionHint();
    this.debugGraphics = this.add.graphics().setDepth(100).setVisible(false);

    this.cameras.main.startFollow(this.player, true, 0.2, 0.2);
    this.portalReadyAt = this.time.now + CONFIG.portalCooldownMs;
    this.updateInteractionHint();
    this.persist();
    this.emitStatus();
    emitPrototypeMovementMode({ running: this.running });
  }

  private getBgmForRegion(regionId: RegionId): "concourse" | "shop" {
    return this.getShopIdForRegion(regionId) ? "shop" : "concourse";
  }

  private drawFloor(region: RegionData): void {
    if (region.tileLayers && region.tileLayers.length > 0) {
      for (const [layerIndex, layer] of region.tileLayers.entries()) {
        layer.tiles.forEach((texture, index) => {
          if (!texture) return;
          const x = (index % layer.width) * CONFIG.tileSize;
          const y = Math.floor(index / layer.width) * CONFIG.tileSize;
          this.add
            .image(x, y, texture)
            .setOrigin(0, 0)
            .setDisplaySize(CONFIG.tileSize, CONFIG.tileSize)
            .setAlpha(layer.opacity)
            .setDepth(-10 + layerIndex);
        });
      }
      return;
    }

    this.add
      .tileSprite(0, 0, region.width, region.height, region.floorTexture)
      .setOrigin(0, 0)
      .setDepth(-10);
    if (region.accentFloorTexture) {
      this.add
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

  private drawBoundaries(region: RegionData): void {
    for (const boundary of region.boundaries) {
      this.add
        .tileSprite(boundary.x, boundary.y, boundary.width, boundary.height, boundary.texture)
        .setOrigin(0, 0)
        .setDepth(1);
      this.collisionRects.push(
        new Phaser.Geom.Rectangle(boundary.x, boundary.y, boundary.width, boundary.height)
      );
    }
  }

  private drawObjects(region: RegionData): void {
    for (const object of region.objects) {
      const animationKey = object.npcBehavior?.animationKey;
      const travelerVariant =
        animationKey === "traveler-male" || object.texture === "traveler-male-npc"
          ? "male"
          : animationKey === "traveler-female" || object.texture === "traveler-female-npc"
            ? "female"
            : null;
      const isTraveler = travelerVariant !== null;
      const texture = isTraveler
        ? travelerVariant === "male"
          ? "traveler-male-sheet"
          : "traveler-female-sheet"
        : object.texture;
      const image = isTraveler
        ? this.add.sprite(object.x, object.baselineY, texture).setOrigin(0.5, 1)
        : this.add.image(object.x, object.baselineY, texture).setOrigin(0.5, 1);
      image.setDisplaySize(object.displayWidth, image.height * (object.displayWidth / image.width));
      image.setDepth(
        (object.foreground ? object.baselineY + 10 : object.baselineY) +
          (object.depthOffset ?? 0)
      );
      if (object.texture.startsWith("clerk-")) {
        this.tweens.add({
          targets: image,
          y: object.baselineY - 1.5,
          duration: 850 + Phaser.Math.Between(0, 260),
          yoyo: true,
          repeat: -1,
          ease: "Sine.InOut"
        });
      }

      const bounds = new Phaser.Geom.Rectangle(
        object.collision.x,
        object.collision.y,
        object.collision.width,
        object.collision.height
      );
      if (!isTraveler && !object.decorative) this.collisionRects.push(bounds);
      if (
        !object.decorative &&
        (object.interaction ||
          this.getShopIdForRegion(region.id) ||
          HIDDEN_COLLECTIBLES.some(
            (collectible) =>
              collectible.regionId === region.id && collectible.objectId === object.id
          ))
      ) {
        this.interactiveObjects.push({ object, bounds });
      }

      const label = object.label
        ? this.add
          .text(object.x, object.baselineY - image.displayHeight - 5, object.label, {
            color: "#17242b",
            fontFamily: "monospace",
            fontSize: "9px",
            backgroundColor: "rgba(255,248,223,0.86)",
            padding: { x: 3, y: 2 }
          })
          .setOrigin(0.5, 1)
          .setDepth(image.depth + 1)
        : undefined;

      if (isTraveler && image instanceof Phaser.GameObjects.Sprite) {
        const behavior = object.npcBehavior ?? {
          movementType: "wander",
          facing: "down",
          speed: 52,
          animationKey: `traveler-${travelerVariant}`
        };
        this.travelerAIs.push(
          new TravelerAI({
            scene: this,
            object,
            sprite: image,
            bounds,
            label,
            variant: travelerVariant,
            behavior,
            canOccupy: (traveler, targetBounds) =>
              this.canTravelerOccupy(traveler, targetBounds)
          })
        );
      }
    }
  }

  private drawPortals(region: RegionData): void {
    const edgeThreshold = CONFIG.tileSize * 3;

    for (const portal of region.portals) {
      const { x, y, width, height } = portal.bounds;
      const isTop = y <= edgeThreshold;
      const isBottom = y + height >= region.height - edgeThreshold;
      const isLeft = x <= edgeThreshold;
      const horizontal = isTop || isBottom;
      const glow = this.add.graphics().setDepth(3).setBlendMode(Phaser.BlendModes.ADD);

      glow.fillStyle(0xfffdf1, 0.16);
      if (horizontal) {
        glow.fillRoundedRect(x - 8, y - 5, width + 16, height + 10, 8);
        glow.fillStyle(0xffffff, 0.32);
        glow.fillRoundedRect(x + 3, y, Math.max(10, width - 6), height, 5);
        glow.fillStyle(0xfff2bc, 0.18);
        const poolY = isTop ? y + height - 3 : y - 13;
        glow.fillEllipse(x + width / 2, poolY, width + 18, 28);
        glow.fillStyle(0xffffff, 0.72);
        const lineY = isTop ? y + height - 3 : y + 1;
        glow.fillRect(x + 5, lineY, Math.max(8, width - 10), 3);
      } else {
        glow.fillRoundedRect(x - 5, y - 8, width + 10, height + 16, 8);
        glow.fillStyle(0xffffff, 0.32);
        glow.fillRoundedRect(x, y + 3, width, Math.max(10, height - 6), 5);
        glow.fillStyle(0xfff2bc, 0.18);
        const poolX = isLeft ? x + width - 3 : x - 13;
        glow.fillEllipse(poolX, y + height / 2, 28, height + 18);
        glow.fillStyle(0xffffff, 0.72);
        const lineX = isLeft ? x + width - 3 : x + 1;
        glow.fillRect(lineX, y + 5, 3, Math.max(8, height - 10));
      }

      this.tweens.add({
        targets: glow,
        alpha: { from: 0.48, to: 0.82 },
        duration: 1050,
        ease: "Sine.InOut",
        yoyo: true,
        repeat: -1
      });
    }
  }

  private createPlayer(region: RegionData, spawnId: string): void {
    const spawn = region.spawns.find((candidate) => candidate.id === spawnId) ?? region.spawns[0];
    if (!spawn) throw new Error(`Region ${region.id} has no spawn points.`);

    this.facing = spawn.facing;
    const texture =
      this.playerVariant === "male" ? "traveler-male-sheet" : "traveler-female-sheet";
    this.player = this.physics.add.sprite(spawn.x, spawn.y, texture).setDepth(20);
    this.player.setOrigin(0.5, 1);
    this.player.setScale(0.42);
    this.player.setDepth(spawn.y);
    this.updatePlayerFacing();
  }

  private createRegionLabels(region: RegionData): void {
    this.add
      .text(10, 8, region.name, {
        color: "#13252b",
        fontFamily: "monospace",
        fontSize: "13px",
        fontStyle: "bold",
        backgroundColor: "rgba(255,255,255,0.75)",
        padding: { x: 5, y: 3 }
      })
      .setScrollFactor(0)
      .setDepth(50);

    const menuButton = this.add
      .text(CONFIG.width - 8, 8, "☰ MENU", {
        color: "#fff2c7",
        fontFamily: "monospace",
        fontSize: "11px",
        fontStyle: "bold",
        backgroundColor: "rgba(23,50,59,0.9)",
        padding: { x: 10, y: 6 }
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(51)
      .setInteractive({ useHandCursor: true });

    menuButton.on("pointerover", () => {
      menuButton.setColor("#17242b").setBackgroundColor("#f6cf63");
    });
    menuButton.on("pointerout", () => {
      menuButton.setColor("#fff2c7").setBackgroundColor("rgba(23,50,59,0.9)");
    });
    menuButton.on("pointerdown", () => {
      window.dispatchEvent(new CustomEvent("prototype:menu-open-request"));
    });
  }

  private createInteractionHint(): void {
    const diamond = this.add
      .text(0, 0, "◆", {
        color: "#f6cf63",
        fontFamily: "monospace",
        fontSize: "13px",
        stroke: "#5f4216",
        strokeThickness: 2
      })
      .setOrigin(0.5);
    diamond.setText("◆");
    this.interactionHintLabel = this.add
      .text(0, 13, "A 互動", {
        color: "#fff5c7",
        fontFamily: "monospace",
        fontSize: "9px",
        backgroundColor: "rgba(26,39,43,0.9)",
        padding: { x: 4, y: 2 },
        stroke: "#6d5422",
        strokeThickness: 1
      })
      .setOrigin(0.5, 0);
    this.interactionHintLabel.setText("A 互動");
    this.interactionHint = this.add
      .container(0, 0, [diamond, this.interactionHintLabel])
      .setDepth(2000)
      .setVisible(false);
    this.tweens.add({
      targets: diamond,
      y: -3,
      duration: 420,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut"
    });
  }

  private setupInput(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys("W,A,S,D") as Record<
      "W" | "A" | "S" | "D",
      Phaser.Input.Keyboard.Key
    >;
    this.resetKey = this.input.keyboard!.addKey("R");
    this.testPortalKey = this.input.keyboard!.addKey("T");
    this.debugKey = this.input.keyboard!.addKey("E");
    this.runKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.input.keyboard!.on("keydown-ENTER", () => this.interact());
    this.input.keyboard!.on("keydown-SPACE", () => this.interact());
    this.input.keyboard!.on("keydown-W", () => this.moveDialogueChoice(-1));
    this.input.keyboard!.on("keydown-UP", () => this.moveDialogueChoice(-1));
    this.input.keyboard!.on("keydown-S", () => this.moveDialogueChoice(1));
    this.input.keyboard!.on("keydown-DOWN", () => this.moveDialogueChoice(1));
    this.input.keyboard!.on("keydown-ESC", () => this.closeDialogue());
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      const pointerType =
        "pointerType" in pointer.event ? String(pointer.event.pointerType) : "mouse";
      if (pointer.leftButtonDown() && pointerType === "mouse") {
        this.mouseMovementActive = true;
      }
    });
    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (!pointer.leftButtonDown()) this.mouseMovementActive = false;
    });
    this.input.on("gameout", () => {
      this.mouseMovementActive = false;
    });
  }

  private bindUiEvents(): void {
    window.addEventListener("prototype:touch", this.touchHandler);
    window.addEventListener("prototype:joystick", this.joystickHandler);
    window.addEventListener("prototype:action", this.actionHandler);
    window.addEventListener("prototype:back", this.backHandler);
    window.addEventListener("prototype:menu", this.menuHandler);
    window.addEventListener("prototype:menu-state", this.menuStateHandler);
    window.addEventListener("prototype:return-title", this.returnTitleHandler);
    window.addEventListener("prototype:dialogue-choice", this.dialogueChoiceHandler);
    window.addEventListener("prototype:shop-close", this.shopCloseHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener("prototype:touch", this.touchHandler);
      window.removeEventListener("prototype:joystick", this.joystickHandler);
      window.removeEventListener("prototype:action", this.actionHandler);
      window.removeEventListener("prototype:back", this.backHandler);
      window.removeEventListener("prototype:menu", this.menuHandler);
      window.removeEventListener("prototype:menu-state", this.menuStateHandler);
      window.removeEventListener("prototype:return-title", this.returnTitleHandler);
      window.removeEventListener("prototype:dialogue-choice", this.dialogueChoiceHandler);
      window.removeEventListener("prototype:shop-close", this.shopCloseHandler);
    });
  }

  private readHeldMovement(): MovementInput | null {
    let inputX = 0;
    let inputY = 0;
    let strength = 1;
    const left = this.cursors.left.isDown || this.wasd.A.isDown || this.touchState.left;
    const right = this.cursors.right.isDown || this.wasd.D.isDown || this.touchState.right;
    const up = this.cursors.up.isDown || this.wasd.W.isDown || this.touchState.up;
    const down = this.cursors.down.isDown || this.wasd.S.isDown || this.touchState.down;
    inputX = Number(right) - Number(left);
    inputY = Number(down) - Number(up);

    if (inputX === 0 && inputY === 0 && this.joystickVector.strength > 0) {
      inputX = this.joystickVector.x;
      inputY = this.joystickVector.y;
      strength = this.joystickVector.strength;
    }
    if (
      inputX === 0 &&
      inputY === 0 &&
      this.mouseMovementActive &&
      this.input.activePointer
    ) {
      const pointer = this.input.activePointer;
      inputX = pointer.worldX - this.player.x;
      inputY = pointer.worldY - this.player.y;
      strength = 1;
      if (Math.hypot(inputX, inputY) < CONFIG.tileSize * 0.7) return null;
    }
    if (inputX === 0 && inputY === 0) return null;

    const magnitude = Math.hypot(inputX, inputY);
    const x = inputX / magnitude;
    const y = inputY / magnitude;

    let facing = this.facing;
    if (Math.abs(y) >= Math.abs(x)) facing = y < 0 ? "up" : "down";
    else facing = x < 0 ? "left" : "right";

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
    this.facing = movement.facing;
    this.updateInteractionHint();
    if (this.moving || this.transitioning || this.dialogueOpen || this.menuOpen) return;

    const stepDistance = CONFIG.tileSize * Phaser.Math.Clamp(movement.strength, 0.35, 1);
    const targetX = this.player.x + movement.x * stepDistance;
    const targetY = this.player.y + movement.y * stepDistance;
    const region = this.currentRegion;
    const blocked = (x: number, y: number): boolean => {
      const footBox = new Phaser.Geom.Rectangle(x - 5, y - 10, 10, 10);
      return (
        x < CONFIG.tileSize ||
        y < CONFIG.tileSize ||
        x > region.width - CONFIG.tileSize ||
        y > region.height - CONFIG.tileSize ||
        this.collisionRects.some((rect) =>
          Phaser.Geom.Intersects.RectangleToRectangle(rect, footBox)
        ) ||
        this.travelerAIs.some((traveler) =>
          Phaser.Geom.Intersects.RectangleToRectangle(traveler.getBounds(), footBox)
        )
      );
    };

    const isDiagonal = Math.abs(movement.x) > 0.2 && Math.abs(movement.y) > 0.2;
    if (
      blocked(targetX, targetY) ||
      (isDiagonal &&
        (blocked(targetX, this.player.y) || blocked(this.player.x, targetY)))
    ) {
      this.updatePlayerFacing();
      return;
    }

    this.moving = true;
    audioManager.playFootstep(this.running);
    this.playPlayerMovementAnimation();
    this.tweens.add({
      targets: this.player,
      x: targetX,
      y: targetY,
      duration: this.getInputRepeatDuration(movement),
      ease: "Linear",
      onUpdate: () => {
        this.player.setDepth(this.player.y);
      },
      onComplete: () => {
        this.moving = false;
        if (!this.readHeldMovement()) {
          this.updatePlayerFacing();
        }
        this.checkPortal();
        this.updateInteractionHint();
      }
    });
  }

  private checkPortal(): void {
    if (this.time.now < this.portalReadyAt) return;
    const feet = new Phaser.Geom.Rectangle(this.player.x - 4, this.player.y - 8, 8, 8);
    const portal = this.portals.find((candidate) =>
      Phaser.Geom.Intersects.RectangleToRectangle(
        new Phaser.Geom.Rectangle(
          candidate.bounds.x,
          candidate.bounds.y,
          candidate.bounds.width,
          candidate.bounds.height
        ),
        feet
      )
    );
    if (portal) this.tryPortal(portal);
  }

  private interact(): void {
    if (this.transitioning || this.shopOpen) return;
    if (this.dialogueOpen) {
      this.advanceDialogue();
      return;
    }

    const target = this.getInteractionTarget();
    if (target) {
      explorationService.meetNpc(target.object);
      const collectible = explorationService.discoverCollectible(
        this.regionId,
        target.object.id
      );
      if (collectible) {
        audioManager.playConfirm();
        this.startDialogue({
          title: `發現「${collectible.name}」`,
          lines: [collectible.description, "紀念章已登錄到旅客護照。"]
        });
        return;
      }
    }

    const shopId = this.getShopIdForRegion(this.regionId);
    const shopProductId = target ? this.getShopProductId(target.object.id) : undefined;
    if (target?.object.texture.startsWith("clerk-") && target.object.interaction) {
      this.startDialogue(this.resolveInteractionDialogue(target.object), target.object.id);
      return;
    }
    if (target && shopId) {
      this.shopOpen = true;
      emitPrototypeShopOpen({
        shopId,
        ...(shopProductId ? { focusProductId: shopProductId } : {})
      });
      this.updateInteractionHint();
      return;
    }

    if (!target?.object.interaction) {
      this.startDialogue({
        title: "目前沒有可互動的內容",
        lines: ["靠近櫃台、商品或指示牌時，畫面會出現 A 互動提示。"]
      });
      return;
    }

    this.startDialogue(this.resolveInteractionDialogue(target.object), target.object.id);
  }

  private resolveInteractionDialogue(
    object: MapObjectData
  ): NonNullable<MapObjectData["interaction"]> {
    const interaction = object.interaction;
    if (!interaction) {
      return { title: object.label ?? "互動", lines: [] };
    }
    const questLines = interaction.questLines?.[travelerQuestService.getState().status];
    return {
      ...interaction,
      lines: questLines?.length ? questLines : interaction.lines
    };
  }

  private startDialogue(
    dialogue: { title: string; lines: string[]; choices?: DialogueChoiceData[] },
    objectId?: string
  ): void {
    this.closeDialogue();
    this.dialogueOpen = true;
    this.activeDialogue = {
      title: dialogue.title,
      pages: dialogue.lines.length > 0 ? dialogue.lines : [""],
      pageIndex: 0,
      visibleCharacters: 0,
      ...(dialogue.choices?.length ? { choices: dialogue.choices } : {}),
      selectedChoice: 0
    };
    this.dialogueTraveler =
      this.travelerAIs.find((traveler) => traveler.objectId === objectId) ?? null;
    this.dialogueTraveler?.faceToward(this.player.x, this.player.y);
    this.beginDialoguePage();
    this.updateInteractionHint();
  }

  private beginDialoguePage(): void {
    const dialogue = this.activeDialogue;
    if (!dialogue) return;
    dialogue.typingEvent?.remove(false);
    dialogue.visibleCharacters = 0;
    this.emitDialoguePage();
    const pageText = dialogue.pages[dialogue.pageIndex] ?? "";
    if (pageText.length === 0) {
      dialogue.visibleCharacters = pageText.length;
      this.emitDialoguePage();
      return;
    }
    dialogue.typingEvent = this.time.addEvent({
      delay: 28,
      repeat: pageText.length - 1,
      callback: () => {
        if (!this.activeDialogue) return;
        this.activeDialogue.visibleCharacters = Math.min(
          pageText.length,
          this.activeDialogue.visibleCharacters + 1
        );
        this.emitDialoguePage();
      }
    });
  }

  private emitDialoguePage(): void {
    const dialogue = this.activeDialogue;
    if (!dialogue) return;
    const pageText = dialogue.pages[dialogue.pageIndex] ?? "";
    emitPrototypeDialogue({
      title: dialogue.title,
      text: pageText.slice(0, dialogue.visibleCharacters),
      page: dialogue.pageIndex + 1,
      pageCount: dialogue.pages.length,
      complete: dialogue.visibleCharacters >= pageText.length,
      ...(this.hasVisibleDialogueChoices()
        ? {
            choices: dialogue.choices?.map((choice) => choice.label) ?? [],
            selectedChoice: dialogue.selectedChoice
          }
        : {})
    });
  }

  private advanceDialogue(): void {
    const dialogue = this.activeDialogue;
    if (!dialogue) {
      this.closeDialogue();
      return;
    }
    const pageText = dialogue.pages[dialogue.pageIndex] ?? "";
    if (dialogue.visibleCharacters < pageText.length) {
      dialogue.typingEvent?.remove(false);
      delete dialogue.typingEvent;
      dialogue.visibleCharacters = pageText.length;
      this.emitDialoguePage();
      audioManager.playConfirm();
      return;
    }
    if (this.hasVisibleDialogueChoices()) {
      this.chooseDialogueOption(dialogue.selectedChoice);
      return;
    }
    if (dialogue.pageIndex < dialogue.pages.length - 1) {
      dialogue.pageIndex += 1;
      audioManager.playConfirm();
      this.beginDialoguePage();
      return;
    }
    this.closeDialogue();
  }

  private hasVisibleDialogueChoices(): boolean {
    const dialogue = this.activeDialogue;
    if (!dialogue?.choices?.length) return false;
    const pageText = dialogue.pages[dialogue.pageIndex] ?? "";
    return (
      dialogue.pageIndex === dialogue.pages.length - 1 &&
      dialogue.visibleCharacters >= pageText.length
    );
  }

  private moveDialogueChoice(offset: number): void {
    const dialogue = this.activeDialogue;
    if (!dialogue || !this.hasVisibleDialogueChoices() || !dialogue.choices?.length) return;
    dialogue.selectedChoice =
      (dialogue.selectedChoice + offset + dialogue.choices.length) %
      dialogue.choices.length;
    audioManager.playConfirm();
    this.emitDialoguePage();
  }

  private chooseDialogueOption(index: number): void {
    const dialogue = this.activeDialogue;
    const choice = dialogue?.choices?.[index];
    if (!dialogue || !choice || !this.hasVisibleDialogueChoices()) return;
    dialogue.typingEvent?.remove(false);
    dialogue.pages = choice.responseLines.length > 0 ? choice.responseLines : [""];
    dialogue.pageIndex = 0;
    dialogue.visibleCharacters = 0;
    dialogue.selectedChoice = 0;
    delete dialogue.choices;
    this.dialogueJoystickDirection = null;
    audioManager.playConfirm();
    this.beginDialoguePage();
  }

  private closeDialogue(): void {
    this.activeDialogue?.typingEvent?.remove(false);
    this.activeDialogue = null;
    this.dialogueTraveler?.restoreFacing();
    this.dialogueTraveler = null;
    this.dialogueJoystickDirection = null;
    if (!this.dialogueOpen) return;
    this.dialogueOpen = false;
    emitPrototypeDialogueClose();
    this.updateInteractionHint();
  }

  private getInteractionTarget(): InteractiveObject | null {
    const vector = DIRECTION_VECTOR[this.facing];
    const sensor = new Phaser.Geom.Rectangle(
      this.player.x + vector.x * CONFIG.tileSize - 6,
      this.player.y + vector.y * CONFIG.tileSize - 12,
      12,
      12
    );
    const candidates = this.interactiveObjects.filter(({ bounds }) =>
      Phaser.Geom.Intersects.RectangleToRectangle(bounds, sensor)
    );
    if (candidates.length === 0) return null;

    return candidates.sort((left, right) => {
      const leftDistance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        left.bounds.centerX,
        left.bounds.centerY
      );
      const rightDistance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        right.bounds.centerX,
        right.bounds.centerY
      );
      return leftDistance - rightDistance;
    })[0] ?? null;
  }

  private getInteractionLabel(object: MapObjectData): string {
    if (
      object.texture === "checkout-counter-base"
    ) {
      return "結帳";
    }
    if (this.getShopIdForRegion(this.regionId)) return "購物";
    if (
      object.texture === "shop-doorway" ||
      object.texture === "curved-duty-free-storefront-v2" ||
      object.texture === "luxury-storefront-v2"
    ) {
      return "進入";
    }
    if (object.texture === "service-counter") return "詢問";
    return "查看";
    if (this.getShopIdForRegion(this.regionId)) return "選購";
    if (this.regionId === "shop-beauty-01") return "選購";
    if (
      object.texture === "shop-doorway" ||
      object.texture === "curved-duty-free-storefront-v2" ||
      object.texture === "luxury-storefront-v2"
    ) {
      return "進入";
    }
    if (object.texture === "service-counter") return "交談";
    return "查看";
  }

  private getShopProductId(objectId: string): string | undefined {
    const productByObjectId: Record<string, string> = {
      "beauty-left-island-top": "perfume-travel-10ml",
      "beauty-right-island-top": "beauty-hand-cream-30ml",
      "beauty-left-island-bottom": "beauty-mask-travel-set",
      "beauty-right-island-bottom": "perfume-gift-duo",
      "liquor-left-island-top": "liquor-whisky-500ml",
      "liquor-right-island-top": "food-chocolate-gift-box",
      "liquor-left-island-bottom": "food-pineapple-cake-box",
      "liquor-right-island-bottom": "liquor-mini-tasting-set",
      "gift-left-island-top": "souvenir-taiwan-keychain",
      "gift-right-island-top": "travel-neck-pillow",
      "gift-left-island-bottom": "souvenir-postcard-set",
      "gift-right-island-bottom": "travel-organizer-pouch"
    };
    return productByObjectId[objectId];
  }

  private getShopIdForRegion(regionId: RegionId): ShopId | undefined {
    if (
      regionId === "shop-beauty-01" ||
      regionId === "shop-liquor-food-01" ||
      regionId === "shop-gift-01"
    ) {
      return regionId;
    }
    return undefined;
  }

  private updateInteractionHint(): void {
    if (!this.interactionHint || !this.player) return;
    const target =
      this.transitioning || this.dialogueOpen || this.menuOpen ? null : this.getInteractionTarget();
    const nextObjectId = target?.object.id ?? null;

    if (!target) {
      this.interactionHint.setVisible(false);
      if (this.hintedObjectId !== null) {
        this.hintedObjectId = null;
        emitPrototypeInteractionHint({ available: false });
      }
      return;
    }

    const label = this.getInteractionLabel(target.object);
    const promptX = Phaser.Math.Clamp(
      this.player.x,
      target.bounds.left + 8,
      target.bounds.right - 8
    );
    this.interactionHintLabel.setText(`A ${label}`);
    this.interactionHint.setPosition(promptX, target.bounds.top - 18).setVisible(true);

    if (this.hintedObjectId !== nextObjectId) {
      this.hintedObjectId = nextObjectId;
      emitPrototypeInteractionHint({ available: true, label });
    }
  }

  private resetRuntimeState(): void {
    this.touchState = { up: false, down: false, left: false, right: false };
    this.joystickVector = { x: 0, y: 0, strength: 0 };
    this.mouseMovementActive = false;
    this.moving = false;
    this.transitioning = false;
    this.dialogueOpen = false;
    this.activeDialogue?.typingEvent?.remove(false);
    this.activeDialogue = null;
    this.dialogueTraveler = null;
    this.dialogueJoystickDirection = null;
    this.shopOpen = false;
    this.menuOpen = false;
    this.heldDirection = null;
    this.repeatMoveAt = 0;
    this.hintedObjectId = null;
    this.travelerAIs = [];
    emitPrototypeInteractionHint({ available: false });
  }

  private canTravelerOccupy(
    traveler: TravelerAI,
    targetBounds: Phaser.Geom.Rectangle
  ): boolean {
    const margin = CONFIG.tileSize;
    if (
      targetBounds.left < margin ||
      targetBounds.top < margin ||
      targetBounds.right > this.currentRegion.width - margin ||
      targetBounds.bottom > this.currentRegion.height - margin
    ) {
      return false;
    }
    if (
      this.collisionRects.some((rect) =>
        Phaser.Geom.Intersects.RectangleToRectangle(rect, targetBounds)
      )
    ) {
      return false;
    }
    if (
      this.portals.some((portal) =>
        Phaser.Geom.Intersects.RectangleToRectangle(
          new Phaser.Geom.Rectangle(
            portal.bounds.x,
            portal.bounds.y,
            portal.bounds.width,
            portal.bounds.height
          ),
          targetBounds
        )
      )
    ) {
      return false;
    }
    if (
      this.player &&
      Phaser.Geom.Intersects.RectangleToRectangle(
        new Phaser.Geom.Rectangle(this.player.x - 6, this.player.y - 12, 12, 12),
        targetBounds
      )
    ) {
      return false;
    }
    return !this.travelerAIs.some(
      (candidate) =>
        candidate !== traveler &&
        Phaser.Geom.Intersects.RectangleToRectangle(candidate.getBounds(), targetBounds)
    );
  }

  private getInputRepeatDuration(movement: MovementInput): number {
    const fullStepDuration = this.running ? 90 : 150;
    return Math.max(55, Math.round(fullStepDuration * movement.strength));
  }

  private toggleMovementMode(): void {
    if (this.transitioning) return;
    this.running = !this.running;
    this.repeatMoveAt = 0;
    this.emitStatus();
    emitPrototypeMovementMode({ running: this.running });
    this.persist();
  }

  private emitStatus(): void {
    emitPrototypeStatus({
      regionName: this.currentRegion.name,
      message: `${this.running ? "跑步" : "走路"}模式 · WASD / 滑鼠按住移動 · A 互動`,
      playerVariant: this.playerVariant
    });
    return;
    emitPrototypeStatus({
      regionName: this.currentRegion.name,
      message: `${this.running ? "跑步" : "走路"}模式 · Shift / B 切換 · A 互動 · E 碰撞`,
      playerVariant: this.playerVariant
    });
  }

  private updatePlayerFacing(): void {
    if (!this.player) return;
    this.player.anims.stop();
    const idleTexture = `traveler-${this.playerVariant}-idle-sheet`;
    if (this.player.texture.key !== idleTexture) {
      this.player.setTexture(idleTexture);
    }
    this.player.setFrame(this.getIdleFrame(this.facing));
  }

  private playPlayerMovementAnimation(): void {
    const speed = this.running ? "run" : "walk";
    const movementTexture = `traveler-${this.playerVariant}-sheet`;
    const animationKey = `${this.playerVariant}-${this.facing}-${speed}`;
    if (this.player.texture.key !== movementTexture) {
      this.player.setTexture(movementTexture);
    }
    if (
      !this.player.anims.isPlaying ||
      this.player.anims.currentAnim?.key !== animationKey
    ) {
      this.player.play(animationKey);
    }
  }

  private getIdleFrame(facing: Facing): number {
    const idleFrameByFacing: Record<Facing, number> = {
      down: 0,
      left: 1,
      right: 2,
      up: 3
    };
    return idleFrameByFacing[facing];
  }

  private createPlayerAnimations(): void {
    const rowByFacing: Record<Facing, number> = {
      down: 0,
      left: 1,
      right: 2,
      up: 3
    };
    for (const variant of ["male", "female"] as const) {
      const texture = `traveler-${variant}-sheet`;
      for (const facing of Object.keys(rowByFacing) as Facing[]) {
        const start = rowByFacing[facing] * 4;
        for (const [speed, frameRate] of [
          ["walk", 13],
          ["run", 22]
          ] as const) {
          const key = `${variant}-${facing}-${speed}`;
          if (this.anims.exists(key)) continue;
          this.anims.create({
            key,
            frames: this.anims.generateFrameNumbers(texture, {
              start,
              end: start + 3
            }),
            frameRate,
            repeat: -1
          });
        }
      }
    }
  }

  private tryPortal(portal: PortalData): void {
    if (this.transitioning || this.time.now < this.portalReadyAt) return;
    this.transitioning = true;
    audioManager.playDoor();
    this.updateInteractionHint();
    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.restart({
        version: 1,
        playerVariant: this.playerVariant,
        regionId: portal.destinationRegionId,
        spawnId: portal.destinationSpawnId,
        facing: this.facing,
        movementMode: this.running ? "run" : "walk"
      });
    });
  }

  private drawDebug(): void {
    this.debugGraphics.clear();
    this.debugGraphics.setVisible(this.debugVisible);
    if (!this.debugVisible) return;

    this.debugGraphics.lineStyle(1, 0xff3344, 1);
    this.debugGraphics.fillStyle(0xff3344, 0.14);
    for (const rect of this.collisionRects) {
      this.debugGraphics.strokeRect(rect.x, rect.y, rect.width, rect.height);
      this.debugGraphics.fillRect(rect.x, rect.y, rect.width, rect.height);
    }
    this.debugGraphics.lineStyle(1, 0xff9f43, 1);
    this.debugGraphics.fillStyle(0xff9f43, 0.18);
    for (const traveler of this.travelerAIs) {
      const bounds = traveler.getBounds();
      this.debugGraphics.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
      this.debugGraphics.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
    }
    this.debugGraphics.lineStyle(1, 0x44ff88, 1);
    this.debugGraphics.fillStyle(0x44ff88, 0.18);
    for (const portal of this.portals) {
      this.debugGraphics.strokeRect(
        portal.bounds.x,
        portal.bounds.y,
        portal.bounds.width,
        portal.bounds.height
      );
      this.debugGraphics.fillRect(
        portal.bounds.x,
        portal.bounds.y,
        portal.bounds.width,
        portal.bounds.height
      );
    }
  }

  private persist(): void {
    savePrototype({
      version: 1,
      playerVariant: this.playerVariant,
      regionId: this.regionId,
      spawnId: this.spawnId,
      facing: this.facing,
      movementMode: this.running ? "run" : "walk"
    });
  }

}
