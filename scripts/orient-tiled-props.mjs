import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd(), "public/assets/maps/tiled");
const regionsDir = resolve(root, "regions");
const propsDir = resolve(process.cwd(), "public/assets/props");
const tilesetPath = resolve(root, "tilesets/airport-props.tsj");
const tileSize = 16;

const overrides = {
  "traveler-info-sign": ["airport-sign-pillar-east", [1, 1]],
  "shopping-guide-sign": ["airport-sign-pillar-west", [1, 1]],
  "entrance-service-counter": ["dutyfree-service-counter-north", [6, 2]],
  "entrance-planter": ["airport-planter-west", [1, 1]],
  "liquor-food-doorway": ["dutyfree-curved-storefront-east", [11, 9]],
  "gift-doorway": ["dutyfree-luxury-storefront-west", [11, 9]],
  "left-display-shelf": ["dutyfree-display-island-east", [2, 6]],
  "right-display-shelf": ["dutyfree-display-island-west", [2, 6]],
  "central-digital-map": ["airport-digital-map-kiosk-east", [2, 5]],
  "right-planter": ["airport-planter-west", [1, 1]],
  "beauty-directory": ["airport-digital-map-kiosk-west", [2, 5]],
};

const tileset = JSON.parse(readFileSync(tilesetPath, "utf8"));
const tileByTexture = new Map(
  tileset.tiles.map((tile) => [
    tile.properties.find((property) => property.name === "texture")?.value,
    tile
  ])
);

for (const file of readdirSync(regionsDir).filter((name) => name.endsWith(".tmj"))) {
  const path = resolve(regionsDir, file);
  const map = JSON.parse(readFileSync(path, "utf8"));
  const props = map.layers.find((layer) => layer.name === "Props")?.objects ?? [];
  const collisions = map.layers.find((layer) => layer.name === "Collision")?.objects ?? [];
  const collisionByOwner = new Map(
    collisions.map((collision) => [
      collision.properties?.find((property) => property.name === "ownerId")?.value,
      collision
    ])
  );

  for (const object of props) {
    const override = overrides[object.name];
    if (!override) continue;
    const [texture, collisionTiles] = override;
    const tile = tileByTexture.get(texture);
    if (!tile) throw new Error(`Unknown texture ${texture}`);

    const textureProperty = object.properties.find((property) => property.name === "texture");
    if (!textureProperty) throw new Error(`${object.name} is missing texture property`);
    const centerX = object.x + object.width / 2;
    textureProperty.value = texture;
    object.gid = 100 + tile.id;
    object.width = tile.imagewidth;
    object.height = tile.imageheight;
    object.x = centerX - object.width / 2;

    const collision = collisionByOwner.get(object.name);
    if (!collision) throw new Error(`${object.name} is missing collision`);
    collision.width = collisionTiles[0] * tileSize;
    collision.height = collisionTiles[1] * tileSize;
    collision.x = centerX - collision.width / 2;
    collision.y = object.y - collision.height;
  }

  if (file === "duty-free-central.tmj") {
    const propByName = new Map(props.map((object) => [object.name, object]));
    propByName.get("liquor-food-doorway").y = 400;
    propByName.get("gift-doorway").y = 400;

    const collisionByOwnerId = new Map(
      collisions.map((collision) => [
        collision.properties?.find((property) => property.name === "ownerId")?.value,
        collision
      ])
    );
    Object.assign(collisionByOwnerId.get("liquor-food-doorway"), {
      x: 112,
      y: 96,
      width: 64,
      height: 288
    });
    Object.assign(collisionByOwnerId.get("gift-doorway"), {
      x: 592,
      y: 96,
      width: 64,
      height: 288
    });

    const portals = map.layers.find((layer) => layer.name === "Portals")?.objects ?? [];
    const portalByName = new Map(portals.map((portal) => [portal.name, portal]));
    Object.assign(portalByName.get("to-liquor-food"), {
      x: 192,
      y: 208,
      width: 48,
      height: 80
    });
    Object.assign(portalByName.get("to-gift"), {
      x: 528,
      y: 208,
      width: 48,
      height: 80
    });
  }

  writeFileSync(path, `${JSON.stringify(map, null, 2)}\n`, "utf8");
  console.log(`[props:orient] ${file}`);
}
