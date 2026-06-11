import Phaser from "phaser";
import { CONFIG } from "../config";
import { audioManager } from "../systems/audioManager";
import { loadPrototypeSave } from "../systems/prototypeSave";

export class TitleScene extends Phaser.Scene {
  private starting = false;
  private readonly actionHandler = (): void => this.startGame();

  constructor() {
    super("TitleScene");
  }

  create(): void {
    this.starting = false;
    document.documentElement.classList.add("title-screen");
    this.cameras.main.setBackgroundColor("#101a21");
    this.add.rectangle(CONFIG.width / 2, CONFIG.height / 2, CONFIG.width, CONFIG.height, 0x101a21);

    for (let x = 0; x < CONFIG.width; x += 16) {
      this.add.line(0, 0, x, 0, x, CONFIG.height, 0x27404a, 0.22).setOrigin(0);
    }
    for (let y = 0; y < CONFIG.height; y += 16) {
      this.add.line(0, 0, 0, y, CONFIG.width, y, 0x27404a, 0.22).setOrigin(0);
    }

    this.add.rectangle(CONFIG.width / 2, 48, CONFIG.width, 72, 0x17323b, 0.96);
    this.add.rectangle(CONFIG.width / 2, 84, CONFIG.width, 3, 0xd8b968);
    this.add
      .text(CONFIG.width / 2, 34, "EVER RICH RPG", {
        color: "#fff2c7",
        fontFamily: "monospace",
        fontSize: "28px",
        fontStyle: "bold",
        stroke: "#6d4b28",
        strokeThickness: 3
      })
      .setOrigin(0.5);
    this.add
      .text(CONFIG.width / 2, 64, "免稅店旅客物語", {
        color: "#f6cf63",
        fontFamily: "monospace",
        fontSize: "13px",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    this.add.rectangle(240, 158, 330, 100, 0x17242b, 0.9).setStrokeStyle(3, 0x57717a);
    this.add
      .text(CONFIG.width / 2, 133, "歡迎來到機場免稅商店街", {
        color: "#ffffff",
        fontFamily: "monospace",
        fontSize: "17px",
        fontStyle: "bold"
      })
      .setOrigin(0.5);
    this.add
      .text(CONFIG.width / 2, 163, "扮演旅客、探索店鋪，展開你的購物旅程。", {
        align: "center",
        color: "#bbd3d8",
        fontFamily: "monospace",
        fontSize: "11px"
      })
      .setOrigin(0.5);

    const startButton = this.add
      .text(CONFIG.width / 2, 226, "▶  開始旅程", {
        color: "#17242b",
        fontFamily: "monospace",
        fontSize: "16px",
        fontStyle: "bold",
        backgroundColor: "#f6cf63",
        padding: { x: 18, y: 9 }
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    startButton.on("pointerover", () => startButton.setScale(1.04));
    startButton.on("pointerout", () => startButton.setScale(1));
    startButton.on("pointerdown", () => this.startGame());
    this.tweens.add({
      targets: startButton,
      alpha: 0.72,
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut"
    });

    this.add
      .text(CONFIG.width / 2, 270, "Enter / Space / A", {
        color: "#91aab1",
        fontFamily: "monospace",
        fontSize: "10px"
      })
      .setOrigin(0.5);
    this.add
      .text(CONFIG.width / 2, 302, "PHASE 5 · TRAVELER QUEST", {
        color: "#547079",
        fontFamily: "monospace",
        fontSize: "9px"
      })
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
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start("CharacterSelectScene", {
        preferredVariant: saved?.playerVariant ?? "male"
      });
    });
  }
}
