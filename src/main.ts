import Phaser from "phaser";
import { CONFIG } from "./config";
import { syncShopCatalog } from "./data/shopCatalog";
import { BootScene } from "./scenes/BootScene";
import { CharacterSelectScene } from "./scenes/CharacterSelectScene";
import { TitleScene } from "./scenes/TitleScene";
import { WorldScene } from "./scenes/WorldScene";
import { UIOverlay } from "./ui/UIOverlay";
import "./styles.css";

const app = document.querySelector<HTMLElement>("#app");
if (!app) {
  throw new Error("App root not found.");
}

const forceMobilePreview =
  import.meta.env.DEV && new URLSearchParams(window.location.search).has("mobilePreview");
const useFullscreenTouchLayout =
  window.matchMedia("(pointer: coarse) and (hover: none)").matches || forceMobilePreview;

const syncFullscreenTouchLayout = (): void => {
  document.documentElement.classList.toggle("touch-layout", useFullscreenTouchLayout);
  if (!useFullscreenTouchLayout) return;

  const viewport = window.visualViewport;
  const viewportWidth = viewport?.width ?? window.innerWidth;
  const viewportHeight = viewport?.height ?? window.innerHeight;
  const portrait = viewportHeight > viewportWidth;
  const layoutWidth = portrait ? viewportHeight : viewportWidth;
  const layoutHeight = portrait ? viewportWidth : viewportHeight;
  const gameAspectRatio = CONFIG.width / CONFIG.height;
  const canvasWidth = Math.min(layoutWidth, layoutHeight * gameAspectRatio);
  const canvasHeight = canvasWidth / gameAspectRatio;

  document.documentElement.classList.toggle("portrait-touch-layout", portrait);
  app.style.width = `${layoutWidth}px`;
  app.style.height = `${layoutHeight}px`;
  app.style.setProperty("--touch-canvas-width", `${canvasWidth}px`);
  app.style.setProperty("--touch-canvas-height", `${canvasHeight}px`);
};

syncFullscreenTouchLayout();
window.visualViewport?.addEventListener("resize", syncFullscreenTouchLayout);
window.addEventListener("orientationchange", syncFullscreenTouchLayout);

const bootstrap = async (): Promise<void> => {
  app.dataset.shopCatalogSource = await syncShopCatalog();

  new UIOverlay(app);

  new Phaser.Game({
    type: Phaser.AUTO,
    parent: app,
    width: CONFIG.width,
    height: CONFIG.height,
    backgroundColor: "#101820",
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    physics: {
      default: "arcade",
      arcade: {
        debug: false
      }
    },
    scene: [BootScene, TitleScene, CharacterSelectScene, WorldScene],
    scale: {
      mode: useFullscreenTouchLayout ? Phaser.Scale.NONE : Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: CONFIG.width,
      height: CONFIG.height
    }
  });
};

void bootstrap();
