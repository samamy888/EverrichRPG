import type { SpriteSheetFrameConfig } from "./AssetLoadPort";

export interface ImageAssetDefinition {
  key: string;
  url: string;
}

export interface SpriteSheetAssetDefinition extends ImageAssetDefinition {
  frameConfig: SpriteSheetFrameConfig;
}

const image = (key: string, url: string): ImageAssetDefinition => ({ key, url });
const sheet = (
  key: string,
  url: string,
  frameWidth: number,
  frameHeight: number
): SpriteSheetAssetDefinition => ({
  key,
  url,
  frameConfig: { frameWidth, frameHeight }
});

export const WORLD_IMAGE_ASSETS: readonly ImageAssetDefinition[] = [
  ...["cream", "blue", "gold", "dark"].map((name) =>
    image(
      `floor-${name}`,
      `/assets/tilesets/duty-free-terminal-v1/floor-${name}.png`
    )
  ),
  ...["terrazzo", "ivory", "carpet-blue", "navy-panel"].map((name) =>
    image(
      `floor-${name}`,
      `/assets/tilesets/airport-reference-v2/floor-${name}.png`
    )
  ),
  image(
    "wall-ivory-panel",
    "/assets/tilesets/airport-reference-v2/wall-ivory-panel.png"
  ),
  ...["service-counter", "display-shelf", "planter", "sign-pillar", "shop-doorway"].map(
    (name) =>
      image(name, `/assets/props/duty-free-terminal-v1/${name}.png`)
  ),
  ...[
    "digital-map-kiosk-v2",
    "curved-duty-free-storefront-v2",
    "luxury-storefront-v2",
    "beauty-display-island-v2"
  ].map((name) =>
    image(name, `/assets/props/airport-reference-v2/${name}.png`)
  ),
  ...[
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
  ].map((name) =>
    image(name, `/assets/props/airport-reference-v3/${name}.png`)
  ),
  ...[
    "airport-overhead-wayfinding",
    "airport-waiting-seats",
    "airport-queue-barriers",
    "airport-ceiling-skylight"
  ].map((name) =>
    image(
      name,
      `/assets/props/airport-atrium-v1/${name.replace("airport-", "")}.png`
    )
  ),
  image(
    "airport-floor-wayfinding",
    "/assets/props/airport-floor-wayfinding-v1/floor-duty-free.png"
  ),
  image(
    "airport-restroom-entrance-south",
    "/assets/props/airport-directional-v2/restroom-wall-south.png"
  ),
  ...[
    "airport-waiting-bench-v2",
    "airport-charging-pedestal",
    "airport-luggage-carts",
    "airport-cleaning-trolley",
    "airport-queue-barrier-v2",
    "airport-recycling-station",
    "airport-emergency-cabinet",
    "airport-gate-pedestal",
    "airport-lamp-column"
  ].map((name) =>
    image(
      name,
      `/assets/props/airport-terminal-details-v1/${name}/prop.png`
    )
  ),
  ...[
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
  ].map((name) =>
    image(
      name,
      `/assets/props/airport-directional-v1/${name.replace("airport-", "")}.png`
    )
  ),
  ...[
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
  ].map((name) =>
    image(name, `/assets/props/legacy-directional-v1/${name}.png`)
  ),
  image(
    "traveler-male-npc",
    "/assets/sprites/player-traveler-male-v1/traveler-male-1.png"
  ),
  image(
    "traveler-female-npc",
    "/assets/sprites/player-traveler-female-v1/traveler-female-1.png"
  )
];

export const WORLD_SPRITESHEET_ASSETS: readonly SpriteSheetAssetDefinition[] = [
  sheet(
    "duty-free-clerks-animated-v2",
    "/assets/sprites/duty-free-clerks-animated-v2/sheet-transparent.png",
    128,
    128
  ),
  sheet(
    "airport-long-kiosk",
    "/assets/props/airport-long-kiosk-v1/sheet-transparent.png",
    128,
    128
  ),
  sheet(
    "airport-self-order-kiosk",
    "/assets/props/airport-self-order-kiosk-v1/sheet-transparent.png",
    128,
    128
  ),
  sheet(
    "airport-restroom-animated",
    "/assets/props/airport-restroom-animated-v1/sheet-game.png",
    256,
    128
  ),
  ...(["south", "west", "east", "north"] as const).map((direction) =>
    sheet(
      `airport-planter-animated-${direction}`,
      `/assets/props/airport-planter-animated-v2/${direction}/sheet-transparent.png`,
      128,
      128
    )
  ),
  sheet(
    "airport-water-dispenser-animated",
    "/assets/props/airport-water-dispenser-animated-v1/sheet-transparent.png",
    128,
    128
  ),
  sheet(
    "airport-vending-machine",
    "/assets/props/airport-vending-machine-v1/sheet-transparent.png",
    128,
    128
  ),
  sheet(
    "airport-ad-column",
    "/assets/props/airport-ad-column-v1/sheet-transparent.png",
    128,
    128
  ),
  sheet(
    "airport-atrium-lamp",
    "/assets/props/airport-atrium-lamp-v1/sheet-transparent.png",
    128,
    128
  ),
  sheet(
    "airport-moving-walkway",
    "/assets/props/airport-moving-walkway-v1/sheet-transparent.png",
    128,
    128
  ),
  sheet(
    "airport-escalator-animated-south",
    "/assets/props/airport-escalator-animated-south-v1/sheet-transparent.png",
    128,
    128
  ),
  ...(["male", "female"] as const).flatMap((variant) => [
    sheet(
      `traveler-${variant}-sheet`,
      `/assets/sprites/player-traveler-${variant}-v1/sheet-transparent.png`,
      96,
      96
    ),
    sheet(
      `traveler-${variant}-idle-sheet`,
      `/assets/sprites/player-traveler-${variant}-idle-v1/sheet-transparent.png`,
      96,
      96
    )
  ])
];
