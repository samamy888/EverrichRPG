import Phaser from "phaser";
import { AnimationRegistry } from "../animation/AnimationRegistry";
import { PhaserAnimationGateway } from "../animation/PhaserAnimationGateway";
import {
  getPlayerIdleFrame,
  WORLD_ANIMATION_DEFINITIONS
} from "../animation/animationCatalog";
import { PhaserAssetLoadAdapter } from "../assets/PhaserAssetLoadAdapter";
import { WorldAssetLoader } from "../assets/WorldAssetLoader";
import { CONFIG } from "../config";
import {
  emitPrototypeInteractionHint,
  emitPrototypeMovementMode,
  emitPrototypeShopOpen,
  emitPrototypeStatus
} from "../core/prototypeEvents";
import {
  type Facing,
  type MapObjectData,
  type PortalData,
  type RegionData,
  type RegionId
} from "../data/prototypeRegions";
import { loadTiledRegion, preloadTiledRegions } from "../data/tiledRegionLoader";
import { DialogueController } from "../dialogue/DialogueController";
import { PhaserDialogueTimer } from "../dialogue/PhaserDialogueTimer";
import { PrototypeDialogueView } from "../dialogue/PrototypeDialogueView";
import type { DialogueDefinition } from "../dialogue/DialoguePorts";
import {
  getInteractionLabel,
  getShopIdForRegion,
  getShopProductId
} from "../interaction/InteractionPolicy";
import {
  PlayerMovementController,
  type MovementState
} from "../player/PlayerMovementController";
import {
  PhaserWorldRenderer,
  type WorldRenderPort
} from "../rendering/WorldRenderer";
import {
  type InteractiveObject,
  type ProximityLabel,
  WorldObjectRenderer
} from "../rendering/WorldObjectRenderer";
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
import { createRandomTravelerPopulation } from "../systems/TravelerPopulation";

const DIRECTION_VECTOR: Record<Facing, Phaser.Math.Vector2> = {
  up: new Phaser.Math.Vector2(0, -1),
  down: new Phaser.Math.Vector2(0, 1),
  left: new Phaser.Math.Vector2(-1, 0),
  right: new Phaser.Math.Vector2(1, 0)
};
const BITMAP_FONT = "fusion-pixel-12-bitmap";
const LABEL_REVEAL_DISTANCE = CONFIG.tileSize * 3;

export class WorldScene extends Phaser.Scene {
  private regionId: RegionId = "duty-free-entrance";
  private spawnId = "start";
  private facing: Facing = "up";
  private playerVariant: PlayerVariant = "male";
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerMovement!: PlayerMovementController;
  private dialogue!: DialogueController;
  private worldRenderer!: WorldRenderPort;
  private objectRenderer!: WorldObjectRenderer;
  private resetKey!: Phaser.Input.Keyboard.Key;
  private testPortalKey!: Phaser.Input.Keyboard.Key;
  private debugKey!: Phaser.Input.Keyboard.Key;
  private collisionRects: Phaser.Geom.Rectangle[] = [];
  private portals: PortalData[] = [];
  private interactiveObjects: InteractiveObject[] = [];
  private proximityLabels: ProximityLabel[] = [];
  private debugGraphics!: Phaser.GameObjects.Graphics;
  private interactionHint!: Phaser.GameObjects.Container;
  private interactionHintLabel!: Phaser.GameObjects.BitmapText;
  private hintedObjectId: string | null = null;
  private transitioning = false;
  private debugVisible = false;
  private portalReadyAt = 0;
  private running = false;
  private currentRegion!: RegionData;
  private shopOpen = false;
  private menuOpen = false;
  private travelerAIs: TravelerAI[] = [];
  private dialogueTraveler: TravelerAI | null = null;
  private dialogueJoystickDirection: "up" | "down" | null = null;

  private readonly touchHandler = (event: Event): void => {
    const detail = (event as CustomEvent<{ direction: keyof MovementState; pressed: boolean }>).detail;
    this.playerMovement.setTouch(detail.direction, detail.pressed);
  };
  private readonly joystickHandler = (event: Event): void => {
    const vector = (
      event as CustomEvent<{ x: number; y: number; strength: number }>
    ).detail;
    if (this.hasVisibleDialogueChoices()) {
      this.playerMovement.setJoystick({ x: 0, y: 0, strength: 0 });
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
    this.playerMovement.setJoystick(vector);
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
    if (this.dialogue.isOpen) {
      this.closeDialogue();
      return;
    }
    this.playerMovement.toggleMovementMode();
  };
  private readonly menuHandler = (): void => {
    window.dispatchEvent(new CustomEvent("prototype:menu-open-request"));
  };
  private readonly menuStateHandler = (event: Event): void => {
    this.menuOpen = (event as CustomEvent<{ open: boolean }>).detail.open;
    this.playerMovement.resetInput();
    this.updateInteractionHint();
  };
  private readonly returnTitleHandler = (): void => {
    this.menuOpen = false;
    this.scene.start("TitleScene");
  };
  private readonly fastTravelHandler = (event: Event): void => {
    const { regionId } = (event as CustomEvent<{ regionId: RegionId }>).detail;
    this.tryFastTravel(regionId);
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
    new WorldAssetLoader(new PhaserAssetLoadAdapter(this.load)).preload();
  }

  create(): void {
    document.documentElement.classList.remove("title-screen", "character-select-screen");
    new AnimationRegistry(new PhaserAnimationGateway(this.anims)).register(
      WORLD_ANIMATION_DEFINITIONS
    );
    this.dialogue = new DialogueController({
      view: new PrototypeDialogueView(),
      timer: new PhaserDialogueTimer(this),
      playConfirm: () => audioManager.playConfirm(),
      onClosed: () => {
        this.dialogueTraveler?.restoreFacing();
        this.dialogueTraveler = null;
        this.dialogueJoystickDirection = null;
        this.updateInteractionHint();
      }
    });
    this.worldRenderer = new PhaserWorldRenderer(this);
    this.objectRenderer = new WorldObjectRenderer({
      scene: this,
      effects: this.worldRenderer,
      bitmapFont: BITMAP_FONT,
      collectibles: HIDDEN_COLLECTIBLES,
      canTravelerOccupy: (traveler, bounds) =>
        this.canTravelerOccupy(traveler, bounds)
    });
    this.buildRegion(this.regionId, this.spawnId);
    this.setupInput();
    this.playerMovement = new PlayerMovementController({
      scene: this,
      player: this.player,
      playerVariant: this.playerVariant,
      getRegion: () => this.currentRegion,
      getCollisionRects: () => this.collisionRects,
      getTravelerBounds: () =>
        this.travelerAIs.map((traveler) => traveler.getBounds()),
      getFacing: () => this.facing,
      setFacing: (facing) => {
        this.facing = facing;
      },
      isRunning: () => this.running,
      isPaused: () =>
        this.transitioning || this.dialogue.isOpen || this.shopOpen || this.menuOpen,
      onToggleRunning: () => this.toggleMovementMode(),
      onBeforeMove: () => this.updateInteractionHint(),
      onAfterMove: () => {
        this.checkPortal();
        this.updateInteractionHint();
      },
      playFootstep: (running) => audioManager.playFootstep(running),
      onPointerClick: (worldX, worldY) =>
        this.handleWorldPointerClick(worldX, worldY)
    });
    this.playerMovement.bind();
    this.bindUiEvents();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.playerMovement.destroy();
    });
    this.cameras.main.fadeIn(180, 0, 0, 0);
  }

  update(time: number): void {
    const worldPaused =
      !this.player || this.transitioning || this.dialogue.isOpen || this.shopOpen || this.menuOpen;
    for (const travelerAI of this.travelerAIs) {
      travelerAI.update(time, worldPaused);
    }
    this.updateProximityLabels();
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
    this.playerMovement.update(time);

    if (Phaser.Input.Keyboard.JustDown(this.testPortalKey)) {
      const portal = this.currentRegion.portals[0];
      if (portal) this.tryPortal(portal);
    }
  }

  private buildRegion(regionId: RegionId, spawnId: string): void {
    const region = loadTiledRegion(this, regionId);
    if (!region) throw new Error(`Region ${regionId} could not be loaded.`);
    region.objects = createRandomTravelerPopulation(region);
    this.currentRegion = region;
    audioManager.setBgm(this.getBgmForRegion(regionId));
    explorationService.visitRegion(regionId);
    this.regionId = regionId;
    this.spawnId = spawnId;
    this.collisionRects = [];
    this.travelerAIs = [];
    this.portals = region.portals;
    this.interactiveObjects = [];
    this.proximityLabels = [];
    this.physics.world.setBounds(0, 0, region.width, region.height);
    this.cameras.main.setBounds(0, 0, region.width, region.height);
    this.cameras.main.setBackgroundColor(
      region.floorTexture === "floor-terrazzo" ? 0xa8aaad : 0xefe4cf
    );

    this.worldRenderer.drawFloor(region);
    this.collisionRects.push(...this.worldRenderer.drawBoundaries(region));
    const renderedObjects = this.objectRenderer.render(region);
    this.collisionRects.push(...renderedObjects.collisionRects);
    this.interactiveObjects = renderedObjects.interactiveObjects;
    this.proximityLabels = renderedObjects.proximityLabels;
    this.travelerAIs = renderedObjects.travelerAIs;
    this.worldRenderer.drawPortals(region);
    this.createPlayer(region, spawnId);
    this.createRegionLabels(region);
    this.createInteractionHint();
    this.debugGraphics = this.add.graphics().setDepth(100).setVisible(false);

    this.cameras.main.startFollow(this.player, true, 1, 1);
    this.portalReadyAt = this.time.now + CONFIG.portalCooldownMs;
    this.updateProximityLabels();
    this.updateInteractionHint();
    this.persist();
    this.emitStatus();
    emitPrototypeMovementMode({ running: this.running });
  }

  private getBgmForRegion(regionId: RegionId): "concourse" | "shop" {
    return getShopIdForRegion(regionId) ? "shop" : "concourse";
  }

  private createPlayer(region: RegionData, spawnId: string): void {
    const spawn = region.spawns.find((candidate) => candidate.id === spawnId) ?? region.spawns[0];
    if (!spawn) throw new Error(`Region ${region.id} has no spawn points.`);

    this.facing = spawn.facing;
    const texture =
      this.playerVariant === "male" ? "traveler-male-sheet" : "traveler-female-sheet";
    this.player = this.physics.add.sprite(spawn.x, spawn.y, texture).setDepth(20);
    this.player.setOrigin(0.5, 1);
    this.player.setDisplaySize(
      CONFIG.characterDisplaySize,
      CONFIG.characterDisplaySize
    );
    this.player.setDepth(spawn.y);
    this.player.setTexture(`traveler-${this.playerVariant}-idle-sheet`);
    this.player.setFrame(getPlayerIdleFrame(this.facing));
  }

  private createRegionLabels(region: RegionData): void {
    const regionLabel = this.add
      .bitmapText(15, 13, BITMAP_FONT, region.name, 12)
      .setTint(0x13252b)
      .setScrollFactor(0)
      .setDepth(51);
    this.add
      .rectangle(
        10,
        8,
        regionLabel.width + 10,
        regionLabel.height + 10,
        0xffffff,
        0.75
      )
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(50);

    const menuButtonWidth = 82;
    const menuButtonHeight = 28;
    const menuButtonX = CONFIG.width - menuButtonWidth - 8;
    const menuButtonY = 8;
    const menuButtonBackground = this.add
      .rectangle(0, 0, menuButtonWidth, menuButtonHeight, 0x17323b, 0.9)
      .setOrigin(0);
    const menuButtonLabel = this.add
      .bitmapText(menuButtonWidth / 2, menuButtonHeight / 2, BITMAP_FONT, "☰ MENU", 12)
      .setTint(0xfff2c7)
      .setOrigin(0.5);
    const menuButton = this.add
      .container(menuButtonX, menuButtonY, [menuButtonBackground, menuButtonLabel])
      .setSize(menuButtonWidth, menuButtonHeight)
      .setInteractive(
        new Phaser.Geom.Rectangle(0, 0, menuButtonWidth, menuButtonHeight),
        Phaser.Geom.Rectangle.Contains
      )
      .setScrollFactor(0)
      .setDepth(51);

    const setMenuButtonActive = () => {
      menuButtonBackground.setFillStyle(0xf6cf63, 1);
      menuButtonLabel.setTint(0x17242b);
    };
    const setMenuButtonIdle = () => {
      menuButtonBackground.setFillStyle(0x17323b, 0.9);
      menuButtonLabel.setTint(0xfff2c7);
    };
    const openMenu = () => {
      this.playerMovement?.suppressNextClick();
      window.dispatchEvent(new CustomEvent("prototype:menu-open-request"));
    };

    menuButton.on("pointerover", setMenuButtonActive);
    menuButton.on("pointerout", setMenuButtonIdle);
    menuButton.on("pointerdown", openMenu);
  }

  private createInteractionHint(): void {
    const diamond = this.add
      .bitmapText(0, 0, BITMAP_FONT, "◆", 12)
      .setTint(0xf6cf63)
      .setDropShadow(1, 1, 0x5f4216, 1)
      .setOrigin(0.5);
    const hintBackground = this.add
      .rectangle(0, 22, 58, 20, 0x1a272b, 0.9)
      .setStrokeStyle(1, 0x6d5422);
    this.interactionHintLabel = this.add
      .bitmapText(0, 22, BITMAP_FONT, "A 互動", 12)
      .setTint(0xfff5c7)
      .setOrigin(0.5);
    this.interactionHint = this.add
      .container(0, 0, [diamond, hintBackground, this.interactionHintLabel])
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
    this.resetKey = this.input.keyboard!.addKey("R");
    this.testPortalKey = this.input.keyboard!.addKey("T");
    this.debugKey = this.input.keyboard!.addKey("E");
    this.input.keyboard!.on("keydown-ENTER", () => this.interact());
    this.input.keyboard!.on("keydown-SPACE", () => this.interact());
    this.input.keyboard!.on("keydown-W", () => this.moveDialogueChoice(-1));
    this.input.keyboard!.on("keydown-UP", () => this.moveDialogueChoice(-1));
    this.input.keyboard!.on("keydown-S", () => this.moveDialogueChoice(1));
    this.input.keyboard!.on("keydown-DOWN", () => this.moveDialogueChoice(1));
    this.input.keyboard!.on("keydown-ESC", () => this.closeDialogue());
  }

  private bindUiEvents(): void {
    window.addEventListener("prototype:touch", this.touchHandler);
    window.addEventListener("prototype:joystick", this.joystickHandler);
    window.addEventListener("prototype:action", this.actionHandler);
    window.addEventListener("prototype:back", this.backHandler);
    window.addEventListener("prototype:menu", this.menuHandler);
    window.addEventListener("prototype:menu-state", this.menuStateHandler);
    window.addEventListener("prototype:return-title", this.returnTitleHandler);
    window.addEventListener("prototype:fast-travel", this.fastTravelHandler);
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
      window.removeEventListener("prototype:fast-travel", this.fastTravelHandler);
      window.removeEventListener("prototype:dialogue-choice", this.dialogueChoiceHandler);
      window.removeEventListener("prototype:shop-close", this.shopCloseHandler);
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

  private interact(targetOverride?: InteractiveObject): void {
    if (this.transitioning || this.shopOpen) return;
    if (this.dialogue.isOpen) {
      this.advanceDialogue();
      return;
    }

    const target = targetOverride ?? this.getInteractionTarget();
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

    const shopId = getShopIdForRegion(this.regionId);
    const shopProductId = target ? getShopProductId(target.object.id) : undefined;
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

  private handleWorldPointerClick(worldX: number, worldY: number): void {
    if (
      this.transitioning ||
      this.dialogue.isOpen ||
      this.shopOpen ||
      this.menuOpen
    ) {
      return;
    }

    const clickedTarget = this.interactiveObjects
      .filter(({ getHitBounds }) => getHitBounds().contains(worldX, worldY))
      .sort((left, right) => {
        const leftDistance = Phaser.Math.Distance.Between(
          worldX,
          worldY,
          left.bounds.centerX,
          left.bounds.centerY
        );
        const rightDistance = Phaser.Math.Distance.Between(
          worldX,
          worldY,
          right.bounds.centerX,
          right.bounds.centerY
        );
        return leftDistance - rightDistance;
      })[0];

    if (!clickedTarget) {
      this.playerMovement.moveTo({ x: worldX, y: worldY });
      return;
    }

    const approachPoints = this.getInteractionApproachPoints(clickedTarget);
    const clickedTraveler =
      this.travelerAIs.find(
        (traveler) => traveler.objectId === clickedTarget.object.id
      ) ?? null;
    clickedTraveler?.faceToward(this.player.x, this.player.y);
    for (const point of approachPoints) {
      if (
        this.playerMovement.moveTo(
          point,
          () => {
            this.faceObject(clickedTarget);
            this.interact(clickedTarget);
          },
          () => clickedTraveler?.restoreFacing()
        )
      ) {
        return;
      }
    }
    clickedTraveler?.restoreFacing();
  }

  private getInteractionApproachPoints(
    target: InteractiveObject
  ): Array<{ x: number; y: number }> {
    const distance = CONFIG.tileSize;
    const points = [
      {
        x: target.bounds.centerX,
        y: target.bounds.bottom + distance
      },
      {
        x: target.bounds.centerX,
        y: target.bounds.top - distance / 2
      },
      {
        x: target.bounds.left - distance / 2,
        y: target.bounds.centerY + 5
      },
      {
        x: target.bounds.right + distance / 2,
        y: target.bounds.centerY + 5
      }
    ];

    return points.sort(
      (left, right) =>
        Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          left.x,
          left.y
        ) -
        Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          right.x,
          right.y
        )
    );
  }

  private faceObject(target: InteractiveObject): void {
    const deltaX = target.bounds.centerX - this.player.x;
    const deltaY = target.bounds.centerY - this.player.y;
    this.facing =
      Math.abs(deltaY) >= Math.abs(deltaX)
        ? deltaY < 0
          ? "up"
          : "down"
        : deltaX < 0
          ? "left"
          : "right";
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
    definition: DialogueDefinition,
    objectId?: string
  ): void {
    this.dialogue.close(false);
    this.dialogueTraveler =
      this.travelerAIs.find((traveler) => traveler.objectId === objectId) ?? null;
    this.dialogueTraveler?.faceToward(this.player.x, this.player.y);
    this.dialogue.start(definition);
    this.updateInteractionHint();
  }

  private advanceDialogue(): void {
    this.dialogue.advance();
  }

  private hasVisibleDialogueChoices(): boolean {
    return this.dialogue.hasVisibleChoices();
  }

  private moveDialogueChoice(offset: number): void {
    this.dialogue.moveChoice(offset);
  }

  private chooseDialogueOption(index: number): void {
    this.dialogueJoystickDirection = null;
    this.dialogue.choose(index);
  }

  private closeDialogue(): void {
    this.dialogue.close();
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

  private updateInteractionHint(): void {
    if (!this.interactionHint || !this.player) return;
    const target =
      this.transitioning || this.dialogue.isOpen || this.menuOpen ? null : this.getInteractionTarget();
    const nextObjectId = target?.object.id ?? null;

    if (!target) {
      this.interactionHint.setVisible(false);
      if (this.hintedObjectId !== null) {
        this.hintedObjectId = null;
        emitPrototypeInteractionHint({ available: false });
      }
      return;
    }

    const label = getInteractionLabel(target.object, this.regionId);
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

  private updateProximityLabels(): void {
    if (!this.player) return;
    const labelsVisible = !this.transitioning && !this.menuOpen;

    for (const { bounds, label } of this.proximityLabels) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        bounds.centerX,
        bounds.centerY
      );
      label.setVisible(labelsVisible && distance <= LABEL_REVEAL_DISTANCE);
    }
  }

  private resetRuntimeState(): void {
    this.transitioning = false;
    this.dialogueTraveler = null;
    this.dialogueJoystickDirection = null;
    this.shopOpen = false;
    this.menuOpen = false;
    this.hintedObjectId = null;
    this.travelerAIs = [];
    this.proximityLabels = [];
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

  private toggleMovementMode(): void {
    if (this.transitioning) return;
    this.running = !this.running;
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

  private tryFastTravel(regionId: RegionId): void {
    if (this.transitioning || regionId === this.regionId) return;
    this.menuOpen = false;
    this.shopOpen = false;
    this.closeDialogue();
    this.playerMovement.resetInput();
    this.transitioning = true;
    audioManager.playDoor();
    this.updateInteractionHint();
    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.restart({
        version: 1,
        playerVariant: this.playerVariant,
        regionId,
        spawnId: "fast-travel",
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
