import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    this.load.bitmapFont(
      "fusion-pixel-12-bitmap",
      "/assets/fonts/fusion-pixel-12/bitmap/fusion-pixel-12-bitmap.png",
      "/assets/fonts/fusion-pixel-12/bitmap/fusion-pixel-12-bitmap.xml"
    );
  }

  create(): void {
    this.scene.start("TitleScene");
  }
}
