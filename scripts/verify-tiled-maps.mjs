import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd(), "public/assets/maps/tiled");
const regionIds = [
  "duty-free-entrance",
  "duty-free-central",
  "shop-beauty-01",
  "shop-liquor-food-01",
  "shop-gift-01"
];
const requiredLayers = [
  "Ground",
  "Accent",
  "Walls",
  "Props",
  "NPCs",
  "Collision",
  "Portals",
  "Spawns"
];
const maps = new Map();
const directionalPropTextures = [
  "airport-planter-south",
  "airport-planter-west",
  "airport-planter-east",
  "airport-planter-north",
  "airport-water-dispenser-south",
  "airport-water-dispenser-west",
  "airport-water-dispenser-east",
  "airport-water-dispenser-north",
  "airport-restroom-entrance-south",
  "airport-restroom-entrance-west",
  "airport-restroom-entrance-east",
  "airport-restroom-entrance-north",
  "airport-escalator-south",
  "airport-escalator-west",
  "airport-escalator-east",
  "airport-escalator-north"
];
const legacyDirectionalPropTextures = [
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
];
const expectedOrientedObjects = {
  "traveler-info-sign": "airport-sign-pillar-east",
  "shopping-guide-sign": "airport-sign-pillar-west",
  "entrance-service-counter": "dutyfree-service-counter-north",
  "entrance-planter": "airport-planter-west",
  "liquor-food-doorway": "dutyfree-curved-storefront-east",
  "gift-doorway": "dutyfree-luxury-storefront-west",
  "left-display-shelf": "dutyfree-display-island-east",
  "right-display-shelf": "dutyfree-display-island-west",
  "central-digital-map": "airport-digital-map-kiosk-east",
  "right-planter": "airport-planter-west",
  "beauty-feature-store": "dutyfree-luxury-storefront-south",
  "beauty-left-island-top": "dutyfree-display-island-east",
  "beauty-right-island-top": "dutyfree-display-island-west",
  "beauty-left-island-bottom": "dutyfree-display-island-east",
  "beauty-right-island-bottom": "dutyfree-display-island-west",
  "beauty-directory": "airport-digital-map-kiosk-west",
  "liquor-feature-store": "dutyfree-curved-storefront-south",
  "liquor-left-island-top": "dutyfree-display-island-east",
  "liquor-right-island-top": "dutyfree-display-island-west",
  "liquor-left-island-bottom": "dutyfree-display-island-east",
  "liquor-right-island-bottom": "dutyfree-display-island-west",
  "liquor-clerk-counter": "dutyfree-service-counter-west",
  "gift-feature-store": "dutyfree-luxury-storefront-south",
  "gift-left-island-top": "dutyfree-display-island-east",
  "gift-right-island-top": "dutyfree-display-island-west",
  "gift-left-island-bottom": "dutyfree-display-island-east",
  "gift-right-island-bottom": "dutyfree-display-island-west",
  "gift-clerk-counter": "dutyfree-service-counter-west"
};

function fail(message) {
  console.error(`[tiled:verify] ${message}`);
  process.exit(1);
}

function containsPoint(rect, point) {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

for (const file of [
  "EverrichRPG.tiled-project",
  "tilesets/airport-floors.tsj",
  "tilesets/airport-props.tsj",
  "tilesets/airport-npcs.tsj"
]) {
  if (!existsSync(resolve(root, file))) fail(`Missing ${file}`);
}

const propTileset = JSON.parse(readFileSync(resolve(root, "tilesets/airport-props.tsj"), "utf8"));
const propTilesetTextures = new Set(
  propTileset.tiles.map((tile) => tile.properties.find((property) => property.name === "texture")?.value)
);
for (const texture of directionalPropTextures) {
  if (!propTilesetTextures.has(texture)) fail(`airport-props.tsj is missing ${texture}`);
  const fileName = texture.replace("airport-", "");
  const assetPath = resolve(root, "../../props/airport-directional-v1", `${fileName}.png`);
  if (!existsSync(assetPath)) fail(`Missing directional prop asset ${fileName}.png`);
}
for (const texture of legacyDirectionalPropTextures) {
  if (!propTilesetTextures.has(texture)) fail(`airport-props.tsj is missing ${texture}`);
  const assetPath = resolve(root, "../../props/legacy-directional-v1", `${texture}.png`);
  if (!existsSync(assetPath)) fail(`Missing legacy directional prop asset ${texture}.png`);
}

for (const regionId of regionIds) {
  const path = resolve(root, "regions", `${regionId}.tmj`);
  if (!existsSync(path)) fail(`Missing map ${regionId}`);
  const map = JSON.parse(readFileSync(path, "utf8"));
  maps.set(regionId, map);
  if (map.tilewidth !== 16 || map.tileheight !== 16) fail(`${regionId} must use 16x16 tiles`);
  for (const layerName of requiredLayers) {
    if (!map.layers.some((layer) => layer.name === layerName)) {
      fail(`${regionId} is missing layer ${layerName}`);
    }
  }
  const layerByName = new Map(map.layers.map((layer) => [layer.name, layer]));
  for (const layerName of ["Ground", "Walls", "Props", "NPCs", "Portals", "Spawns"]) {
    const layer = layerByName.get(layerName);
    if (layer.opacity === 0) fail(`${regionId}/${layerName} opacity must not be 0`);
    if (layer.visible === false) fail(`${regionId}/${layerName} must be visible`);
  }
  const accent = layerByName.get("Accent");
  if (accent.opacity === 0) fail(`${regionId}/Accent opacity must not be 0`);
  const collisionLayer = layerByName.get("Collision");
  if (collisionLayer.opacity === 0) fail(`${regionId}/Collision opacity must not be 0`);
  if (collisionLayer.visible !== false) fail(`${regionId}/Collision must be hidden by default`);

  const objectNames = new Set();
  for (const layer of map.layers.filter((candidate) => candidate.type === "objectgroup")) {
    for (const object of layer.objects) {
      if (!object.name) fail(`${regionId}/${layer.name} contains an unnamed object`);
      if (objectNames.has(object.name)) fail(`${regionId} has duplicate object name ${object.name}`);
      objectNames.add(object.name);
    }
  }
  const ground = map.layers.find((layer) => layer.name === "Ground");
  if (ground.data.length !== map.width * map.height) fail(`${regionId} Ground size is invalid`);
  if (map.layers.find((layer) => layer.name === "Spawns").objects.length === 0) {
    fail(`${regionId} needs at least one spawn`);
  }
  const spawns = map.layers.find((layer) => layer.name === "Spawns").objects;
  const blockers = [
    ...map.layers.find((layer) => layer.name === "Walls").objects,
    ...map.layers.find((layer) => layer.name === "Collision").objects
  ];
  for (const spawn of spawns) {
    const blocker = blockers.find((candidate) => containsPoint(candidate, spawn));
    if (blocker) {
      fail(`${regionId}/${spawn.name} overlaps blocker ${blocker.name}`);
    }
  }
}

for (const [regionId, map] of maps) {
  const portals = map.layers.find((layer) => layer.name === "Portals").objects;
  for (const portal of portals) {
    const properties = Object.fromEntries(portal.properties.map((property) => [property.name, property.value]));
    const destination = maps.get(properties.destinationRegionId);
    if (!destination) fail(`${regionId}/${portal.name} has unknown destination`);
    const spawns = destination.layers.find((layer) => layer.name === "Spawns").objects;
    if (!spawns.some((spawn) => spawn.name === properties.destinationSpawnId)) {
      fail(`${regionId}/${portal.name} has unknown destination spawn`);
    }
  }
  const props = map.layers.find((layer) => layer.name === "Props").objects;
  for (const object of props) {
    const expectedTexture = expectedOrientedObjects[object.name];
    if (!expectedTexture) continue;
    const actualTexture = object.properties.find((property) => property.name === "texture")?.value;
    if (actualTexture !== expectedTexture) {
      fail(`${regionId}/${object.name} should face the aisle with ${expectedTexture}`);
    }
  }
  const npcs = map.layers.find((layer) => layer.name === "NPCs").objects;
  for (const npc of npcs) {
    const properties = Object.fromEntries(
      npc.properties.map((property) => [property.name, property.value])
    );
    if (!["idle", "wander", "patrol"].includes(properties.movementType)) {
      fail(`${regionId}/${npc.name} has invalid movementType`);
    }
    if (!["up", "down", "left", "right"].includes(properties.facing)) {
      fail(`${regionId}/${npc.name} has invalid facing`);
    }
    if (typeof properties.speed !== "number" || properties.speed < 0) {
      fail(`${regionId}/${npc.name} has invalid speed`);
    }
    if (typeof properties.animationKey !== "string" || properties.animationKey.length === 0) {
      fail(`${regionId}/${npc.name} is missing animationKey`);
    }
  }
}

const centralPortals = maps
  .get("duty-free-central")
  .layers.find((layer) => layer.name === "Portals")
  .objects.map((portal) => portal.name);
for (const portalId of ["to-beauty-corridor", "to-liquor-food", "to-gift"]) {
  if (!centralPortals.includes(portalId)) fail(`duty-free-central is missing ${portalId}`);
}

const centralPortalObjects = maps
  .get("duty-free-central")
  .layers.find((layer) => layer.name === "Portals")
  .objects;
const expectedSideEntrances = {
  "to-liquor-food": { x: 192, y: 208, width: 48, height: 80 },
  "to-gift": { x: 528, y: 208, width: 48, height: 80 }
};
for (const [portalId, expectedBounds] of Object.entries(expectedSideEntrances)) {
  const portal = centralPortalObjects.find((candidate) => candidate.name === portalId);
  if (
    !portal ||
    portal.x !== expectedBounds.x ||
    portal.y !== expectedBounds.y ||
    portal.width !== expectedBounds.width ||
    portal.height !== expectedBounds.height
  ) {
    fail(`duty-free-central/${portalId} is not aligned to its side-facing entrance`);
  }
}

const entranceStart = maps
  .get("duty-free-entrance")
  .layers.find((layer) => layer.name === "Spawns")
  .objects.find((spawn) => spawn.name === "start");
if (!entranceStart || entranceStart.x !== 320 || entranceStart.y !== 352) {
  fail("duty-free-entrance/start must remain at the safe centered starting position");
}

const expectedShopObjects = {
  "shop-beauty-01": [
    "beauty-left-island-top",
    "beauty-right-island-top",
    "beauty-left-island-bottom",
    "beauty-right-island-bottom"
  ],
  "shop-liquor-food-01": [
    "liquor-left-island-top",
    "liquor-right-island-top",
    "liquor-left-island-bottom",
    "liquor-right-island-bottom"
  ],
  "shop-gift-01": [
    "gift-left-island-top",
    "gift-right-island-top",
    "gift-left-island-bottom",
    "gift-right-island-bottom"
  ]
};

for (const [shopId, objectIds] of Object.entries(expectedShopObjects)) {
  const props = maps
    .get(shopId)
    .layers.find((layer) => layer.name === "Props")
    .objects.map((object) => object.name);
  for (const objectId of objectIds) {
    if (!props.includes(objectId)) fail(`${shopId} is missing product display ${objectId}`);
  }
}

for (const shopId of Object.keys(expectedShopObjects)) {
  const npcs = maps
    .get(shopId)
    .layers.find((layer) => layer.name === "NPCs")
    .objects;
  if (npcs.length !== 1) fail(`${shopId} must contain exactly one clerk NPC`);
}

console.log(`[tiled:verify] OK (${regionIds.length} maps)`);
