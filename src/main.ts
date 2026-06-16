import Phaser from "phaser";
import { CONFIG } from "./config";
import { syncShopCatalog } from "./data/shopCatalog";
import { syncTravelerRoster } from "./data/travelerDirectory";
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

  const viewport = window.visualViewport;
  const viewportWidth = viewport?.width ?? window.innerWidth;
  const viewportHeight = viewport?.height ?? window.innerHeight;
  const portrait = useFullscreenTouchLayout && viewportHeight > viewportWidth;
  const layoutWidth = portrait ? viewportHeight : viewportWidth;
  const layoutHeight = portrait ? viewportWidth : viewportHeight;
  const integerScale = Math.max(
    1,
    Math.floor(Math.min(layoutWidth / CONFIG.width, layoutHeight / CONFIG.height))
  );
  const canvasWidth = CONFIG.width * integerScale;
  const canvasHeight = CONFIG.height * integerScale;

  document.documentElement.classList.toggle("portrait-touch-layout", portrait);
  if (useFullscreenTouchLayout) {
    app.style.width = `${layoutWidth}px`;
    app.style.height = `${layoutHeight}px`;
  } else {
    app.style.width = "100vw";
    app.style.height = "100vh";
  }
  app.style.setProperty("--touch-canvas-width", `${canvasWidth}px`);
  app.style.setProperty("--touch-canvas-height", `${canvasHeight}px`);
};

syncFullscreenTouchLayout();
window.visualViewport?.addEventListener("resize", syncFullscreenTouchLayout);
window.addEventListener("orientationchange", syncFullscreenTouchLayout);

const bootstrap = async (): Promise<void> => {
  await document.fonts.load('12px "Fusion Pixel 12"');
  await document.fonts.ready;
  const [shopCatalogSource, travelerRosterSource] = await Promise.all([
    syncShopCatalog(),
    syncTravelerRoster()
  ]);
  app.dataset.shopCatalogSource = shopCatalogSource;
  app.dataset.travelerRosterSource = travelerRosterSource;

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
      mode: Phaser.Scale.NONE,
      autoCenter: Phaser.Scale.NO_CENTER,
      width: CONFIG.width,
      height: CONFIG.height
    }
  });
};

void bootstrap();
