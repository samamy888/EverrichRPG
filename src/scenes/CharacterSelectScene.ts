import Phaser from "phaser";
import { CONFIG } from "../config";
import { audioManager } from "../systems/audioManager";
import type { PlayerVariant } from "../systems/prototypeSave";

export class CharacterSelectScene extends Phaser.Scene {
  private selected: PlayerVariant = "male";
  private maleCard!: Phaser.GameObjects.Rectangle;
  private femaleCard!: Phaser.GameObjects.Rectangle;
  private malePortrait!: Phaser.GameObjects.Sprite;
  private femalePortrait!: Phaser.GameObjects.Sprite;
  private hint!: Phaser.GameObjects.Text;
  private readonly selectMaleHandler = (): void => this.setSelected("male");
  private readonly selectFemaleHandler = (): void => this.setSelected("female");
  private readonly confirmHandler = (): void => this.confirm();
  private readonly touchHandler = (event: Event): void => {
    const detail = (
      event as CustomEvent<{
        direction: "up" | "down" | "left" | "right";
        pressed: boolean;
      }>
    ).detail;
    if (!detail.pressed) return;
    if (detail.direction === "left") this.setSelected("male");
    if (detail.direction === "right") this.setSelected("female");
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
    this.createSelectionAnimations();
    this.cameras.main.setBackgroundColor("#17242b");
    this.add
      .text(CONFIG.width / 2, 38, "選擇旅客", {
        color: "#fff2c7",
        fontFamily: "monospace",
        fontSize: "22px",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    this.maleCard = this.createCard(150, "男旅客", "character-select-male", "male");
    this.femaleCard = this.createCard(
      330,
      "女旅客",
      "character-select-female",
      "female"
    );
    this.hint = this.add
      .text(CONFIG.width / 2, 278, "左右選擇 · A / Enter 確認", {
        color: "#d9e3e8",
        fontFamily: "monospace",
        fontSize: "13px"
      })
      .setOrigin(0.5);

    this.input.keyboard?.on("keydown-LEFT", this.selectMaleHandler);
    this.input.keyboard?.on("keydown-RIGHT", this.selectFemaleHandler);
    this.input.keyboard?.on("keydown-A", this.selectMaleHandler);
    this.input.keyboard?.on("keydown-D", this.selectFemaleHandler);
    this.input.keyboard?.on("keydown-ENTER", this.confirmHandler);
    this.input.keyboard?.on("keydown-SPACE", this.confirmHandler);
    window.addEventListener("prototype:touch", this.touchHandler);
    window.addEventListener("prototype:action", this.actionHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown-LEFT", this.selectMaleHandler);
      this.input.keyboard?.off("keydown-RIGHT", this.selectFemaleHandler);
      this.input.keyboard?.off("keydown-A", this.selectMaleHandler);
      this.input.keyboard?.off("keydown-D", this.selectFemaleHandler);
      this.input.keyboard?.off("keydown-ENTER", this.confirmHandler);
      this.input.keyboard?.off("keydown-SPACE", this.confirmHandler);
      window.removeEventListener("prototype:touch", this.touchHandler);
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
      .play(`${variant}-character-select-walk`);
    if (variant === "male") {
      this.malePortrait = portrait;
    } else {
      this.femalePortrait = portrait;
    }
    this.add
      .text(x, 222, label, {
        color: "#ffffff",
        fontFamily: "monospace",
        fontSize: "16px"
      })
      .setOrigin(0.5);

    card.on("pointerdown", () => {
      audioManager.unlock();
      if (this.selected === variant) {
        this.confirm();
      } else {
        this.setSelected(variant);
      }
    });
    return card;
  }

  private setSelected(variant: PlayerVariant): void {
    this.selected = variant;
    this.renderSelection();
  }

  private renderSelection(): void {
    this.maleCard.setStrokeStyle(4, this.selected === "male" ? 0xffd166 : 0x59727d);
    this.femaleCard.setStrokeStyle(4, this.selected === "female" ? 0xffd166 : 0x59727d);
    this.malePortrait
      .setDisplaySize(this.selected === "male" ? 88 : 80, this.selected === "male" ? 88 : 80)
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
    this.femalePortrait.anims.timeScale = this.selected === "female" ? 1.15 : 0.72;
    this.hint.setText(
      `${this.selected === "male" ? "男旅客" : "女旅客"} · A / Enter 開始`
    );
  }

  private createSelectionAnimations(): void {
    for (const variant of ["male", "female"] as const) {
      const key = `${variant}-character-select-walk`;
      if (this.anims.exists(key)) continue;
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(`character-select-${variant}`, {
          start: 0,
          end: 3
        }),
        frameRate: 8,
        repeat: -1
      });
    }
  }

  private confirm(): void {
    audioManager.playConfirm();
    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start("WorldScene", {
        version: 1,
        playerVariant: this.selected,
        regionId: "duty-free-entrance",
        spawnId: "start",
        facing: "up"
      });
    });
  }
}
