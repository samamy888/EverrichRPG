import Phaser from "phaser";
import { CONFIG } from "../config";
import { audioManager } from "../systems/audioManager";
import { loadPrototypeSave } from "../systems/prototypeSave";

const BITMAP_FONT = "fusion-pixel-12-bitmap";

export class TitleScene extends Phaser.Scene {
  private starting = false;
  private readonly actionHandler = (): void => this.startGame();

  constructor() {
    super("TitleScene");
  }

  create(): void {
    this.starting = false;
    audioManager.setBgm("title");
    document.documentElement.classList.add("title-screen");
    this.cameras.main.setBackgroundColor("#101a21");
    this.add.rectangle(
      CONFIG.width / 2,
      CONFIG.height / 2,
      CONFIG.width,
      CONFIG.height,
      0x101a21
    );

    for (let x = 0; x < CONFIG.width; x += 16) {
      this.add.line(0, 0, x, 0, x, CONFIG.height, 0x27404a, 0.22).setOrigin(0);
    }
    for (let y = 0; y < CONFIG.height; y += 16) {
      this.add.line(0, 0, 0, y, CONFIG.width, y, 0x27404a, 0.22).setOrigin(0);
    }

    this.add.rectangle(CONFIG.width / 2, 48, CONFIG.width, 72, 0x17323b, 0.96);
    this.add.rectangle(CONFIG.width / 2, 84, CONFIG.width, 3, 0xd8b968);
    this.add
      .bitmapText(CONFIG.width / 2, 34, BITMAP_FONT, "EVERRICH RPG", 24)
      .setTint(0xfff2c7)
      .setDropShadow(2, 2, 0x6d4b28, 1)
      .setOrigin(0.5);
    this.add
      .bitmapText(CONFIG.width / 2, 64, BITMAP_FONT, "機場免稅店探索遊戲", 12)
      .setTint(0xf6cf63)
      .setOrigin(0.5);

    this.add
      .rectangle(240, 158, 330, 100, 0x17242b, 0.9)
      .setStrokeStyle(3, 0x57717a);
    this.add
      .bitmapText(CONFIG.width / 2, 133, BITMAP_FONT, "歡迎來到出境航廈", 24)
      .setTint(0xffffff)
      .setOrigin(0.5);
    this.add
      .bitmapText(
        CONFIG.width / 2,
        163,
        BITMAP_FONT,
        "扮演旅客，逛免稅店、收集紀念章，\n在起飛前完成你的機場小冒險。",
        12,
        Phaser.GameObjects.BitmapText.ALIGN_CENTER
      )
      .setTint(0xbbd3d8)
      .setOrigin(0.5);

    const startButtonBackground = this.add
      .rectangle(0, 0, 132, 34, 0xf6cf63)
      .setInteractive({ useHandCursor: true });
    const startButtonLabel = this.add
      .bitmapText(0, 0, BITMAP_FONT, "開始旅程", 12)
      .setTint(0x17242b)
      .setOrigin(0.5);
    const startButton = this.add.container(CONFIG.width / 2, 226, [
      startButtonBackground,
      startButtonLabel
    ]);

    startButtonBackground.on("pointerover", () => startButton.setScale(1.04));
    startButtonBackground.on("pointerout", () => startButton.setScale(1));
    startButtonBackground.on("pointerdown", () => this.startGame());
    this.tweens.add({
      targets: startButton,
      alpha: 0.72,
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut"
    });

    this.add
      .bitmapText(CONFIG.width / 2, 270, BITMAP_FONT, "Enter / Space / A", 12)
      .setTint(0x91aab1)
      .setOrigin(0.5);
    this.add
      .bitmapText(CONFIG.width / 2, 302, BITMAP_FONT, "AIRPORT QUEST PROTOTYPE", 12)
      .setTint(0x547079)
      .setOrigin(0.5);

    this.input.keyboard?.on("keydown-ENTER", this.actionHandler);
    this.input.keyboard?.on("keydown-SPACE", this.actionHandler);
    window.addEventListener("prototype:action", this.actionHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.documentElement.classList.remove("title-screen");
      this.input.keyboard?.off("keydown-ENTER", this.actionHandler);
      this.input.keyboard?.off("keydown-SPACE", this.actionHandler);
      window.removeEventListener("prototype:action", this.actionHandler);
    });
    this.cameras.main.fadeIn(220, 0, 0, 0);
  }

  private startGame(): void {
    if (this.starting) return;
    this.starting = true;
    audioManager.unlock();
    audioManager.playConfirm();
    const saved = loadPrototypeSave();
    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => {
        this.scene.start("CharacterSelectScene", {
          preferredVariant: saved?.playerVariant ?? "male"
        });
      }
    );
  }
}
