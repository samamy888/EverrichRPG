import Phaser from "phaser";
import { AnimationRegistry } from "../animation/AnimationRegistry";
import { PhaserAnimationGateway } from "../animation/PhaserAnimationGateway";
import { CHARACTER_SELECT_ANIMATION_DEFINITIONS } from "../animation/animationCatalog";
import { CONFIG } from "../config";
import { audioManager } from "../systems/audioManager";
import type { PlayerVariant } from "../systems/prototypeSave";
import {
  isPortraitTouchLayout,
  mapPointerToGamePoint
} from "../ui/touchCoordinateMapper";

const BITMAP_FONT = "fusion-pixel-12-bitmap";

export class CharacterSelectScene extends Phaser.Scene {
  private selected: PlayerVariant = "male";
  private maleCard!: Phaser.GameObjects.Rectangle;
  private femaleCard!: Phaser.GameObjects.Rectangle;
  private malePortrait!: Phaser.GameObjects.Sprite;
  private femalePortrait!: Phaser.GameObjects.Sprite;
  private hint!: Phaser.GameObjects.BitmapText;
  private confirming = false;
  private readonly selectMaleHandler = (): void => this.setSelected("male");
  private readonly selectFemaleHandler = (): void => this.setSelected("female");
  private readonly confirmHandler = (): void => this.confirm();
  private readonly portraitPointerHandler = (event: PointerEvent): void => {
    if (!isPortraitTouchLayout()) return;

    const point = this.getPortraitGamePoint(event);
    if (!point) return;

    const variant = this.getVariantAtPoint(point.x, point.y);
    if (!variant) return;

    event.preventDefault();
    event.stopPropagation();
    this.chooseVariant(variant);
  };
  private readonly joystickHandler = (event: Event): void => {
    const detail = (
      event as CustomEvent<{
        x: number;
        y: number;
        strength: number;
      }>
    ).detail;
    if (detail.strength < 0.35) return;
    if (detail.x < -0.35) this.setSelected("male");
    if (detail.x > 0.35) this.setSelected("female");
  };
  private readonly actionHandler = (): void => this.confirm();

  constructor() {
    super("CharacterSelectScene");
  }

  init(data: { preferredVariant?: PlayerVariant }): void {
    this.selected = data.preferredVariant ?? "male";
  }

  preload(): void {
    this.load.spritesheet(
      "character-select-male",
      "/assets/sprites/player-traveler-male-v1/sheet-transparent.png",
      { frameWidth: 96, frameHeight: 96 }
    );
    this.load.spritesheet(
      "character-select-female",
      "/assets/sprites/player-traveler-female-v1/sheet-transparent.png",
      { frameWidth: 96, frameHeight: 96 }
    );
  }

  create(): void {
    document.documentElement.classList.add("character-select-screen");
    audioManager.setBgm("title");
    new AnimationRegistry(new PhaserAnimationGateway(this.anims)).register(
      CHARACTER_SELECT_ANIMATION_DEFINITIONS
    );
    this.cameras.main.setBackgroundColor("#17242b");
    this.add
      .bitmapText(CONFIG.width / 2, 38, BITMAP_FONT, "選擇旅客", 24)
      .setTint(0xfff2c7)
      .setOrigin(0.5);

    this.maleCard = this.createCard(
      150,
      "男旅客",
      "character-select-male",
      "male"
    );
    this.femaleCard = this.createCard(
      330,
      "女旅客",
      "character-select-female",
      "female"
    );
    this.hint = this.add
      .bitmapText(CONFIG.width / 2, 278, BITMAP_FONT, "左右選擇 · Enter / 點擊確認", 12)
      .setTint(0xd9e3e8)
      .setOrigin(0.5);

    this.input.keyboard?.on("keydown-LEFT", this.selectMaleHandler);
    this.input.keyboard?.on("keydown-RIGHT", this.selectFemaleHandler);
    this.input.keyboard?.on("keydown-A", this.selectMaleHandler);
    this.input.keyboard?.on("keydown-D", this.selectFemaleHandler);
    this.input.keyboard?.on("keydown-ENTER", this.confirmHandler);
    this.input.keyboard?.on("keydown-SPACE", this.confirmHandler);
    window.addEventListener("pointerdown", this.portraitPointerHandler, true);
    window.addEventListener("prototype:joystick", this.joystickHandler);
    window.addEventListener("prototype:action", this.actionHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.documentElement.classList.remove("character-select-screen");
      this.input.keyboard?.off("keydown-LEFT", this.selectMaleHandler);
      this.input.keyboard?.off("keydown-RIGHT", this.selectFemaleHandler);
      this.input.keyboard?.off("keydown-A", this.selectMaleHandler);
      this.input.keyboard?.off("keydown-D", this.selectFemaleHandler);
      this.input.keyboard?.off("keydown-ENTER", this.confirmHandler);
      this.input.keyboard?.off("keydown-SPACE", this.confirmHandler);
      window.removeEventListener("pointerdown", this.portraitPointerHandler, true);
      window.removeEventListener("prototype:joystick", this.joystickHandler);
      window.removeEventListener("prototype:action", this.actionHandler);
    });
    this.renderSelection();
  }

  private createCard(
    x: number,
    label: string,
    texture: string,
    variant: PlayerVariant
  ): Phaser.GameObjects.Rectangle {
    const card = this.add
      .rectangle(x, 160, 132, 164, 0x263a43)
      .setStrokeStyle(3, 0x59727d)
      .setInteractive({ useHandCursor: true });

    this.add.ellipse(x, 194, 62, 18, 0x111b20, 0.55);
    const portrait = this.add
      .sprite(x, 150, texture)
      .setDisplaySize(88, 88)
      .setInteractive({ useHandCursor: true })
      .play(`${variant}-character-select-walk`);
    if (variant === "male") {
      this.malePortrait = portrait;
    } else {
      this.femalePortrait = portrait;
    }
    this.add
      .bitmapText(x, 222, BITMAP_FONT, label, 12)
      .setTint(0xffffff)
      .setOrigin(0.5);

    const choose = () => this.chooseVariant(variant);
    card.on("pointerdown", choose);
    portrait.on("pointerdown", choose);
    return card;
  }

  private chooseVariant(variant: PlayerVariant): void {
    audioManager.unlock();
    if (this.selected === variant) {
      this.confirm();
    } else {
      this.setSelected(variant);
    }
  }

  private getPortraitGamePoint(event: PointerEvent): { x: number; y: number } | null {
    const canvas = document.querySelector<HTMLCanvasElement>("#app canvas");
    return mapPointerToGamePoint(event, canvas, CONFIG);
  }

  private getVariantAtPoint(x: number, y: number): PlayerVariant | null {
    if (y < 78 || y > 242) return null;
    if (x >= 84 && x <= 216) return "male";
    if (x >= 264 && x <= 396) return "female";
    return null;
  }

  private setSelected(variant: PlayerVariant): void {
    this.selected = variant;
    this.renderSelection();
  }

  private renderSelection(): void {
    this.maleCard.setStrokeStyle(
      4,
      this.selected === "male" ? 0xffd166 : 0x59727d
    );
    this.femaleCard.setStrokeStyle(
      4,
      this.selected === "female" ? 0xffd166 : 0x59727d
    );
    this.malePortrait
      .setDisplaySize(
        this.selected === "male" ? 88 : 80,
        this.selected === "male" ? 88 : 80
      )
      .setAlpha(this.selected === "male" ? 1 : 0.72)
      .setY(this.selected === "male" ? 148 : 152);
    this.malePortrait.anims.timeScale = this.selected === "male" ? 1.15 : 0.72;
    this.femalePortrait
      .setDisplaySize(
        this.selected === "female" ? 88 : 80,
        this.selected === "female" ? 88 : 80
      )
      .setAlpha(this.selected === "female" ? 1 : 0.72)
      .setY(this.selected === "female" ? 148 : 152);
    this.femalePortrait.anims.timeScale =
      this.selected === "female" ? 1.15 : 0.72;
    this.hint.setText(
      `${this.selected === "male" ? "男旅客" : "女旅客"} · Enter / 點擊開始`
    );
  }

  private confirm(): void {
    if (this.confirming) return;
    this.confirming = true;
    audioManager.playConfirm();
    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => {
        this.scene.start("WorldScene", {
          version: 1,
          playerVariant: this.selected,
          regionId: "duty-free-entrance",
          spawnId: "start",
          facing: "up"
        });
      }
    );
  }
}
