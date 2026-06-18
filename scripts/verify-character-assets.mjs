import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function fail(message) {
  console.error(`[character:verify] ${message}`);
  process.exit(1);
}

function readPngSize(path) {
  const buffer = readFileSync(path);
  const pngSignature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== pngSignature) {
    fail(`${path} is not a PNG file`);
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function assertPngSize(path, expectedWidth, expectedHeight, label) {
  const size = readPngSize(path);
  if (size.width !== expectedWidth || size.height !== expectedHeight) {
    fail(`${label} must be ${expectedWidth}x${expectedHeight}, got ${size.width}x${size.height}`);
  }
}

function assertArrayEquals(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(`${label} must be ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

const root = process.cwd();
const manifestPath = resolve(root, "game/assets/characters/duty-free-clerks-v1.manifest.json");
const pipelinePath = resolve(
  root,
  "public/assets/sprites/duty-free-clerks-v1/pipeline-meta.json"
);
const playerManifestPath = resolve(
  root,
  "game/assets/characters/player-travelers-v1.manifest.json"
);
const animatedClerkPipelinePath = resolve(
  root,
  "public/assets/sprites/duty-free-clerks-animated-v2/pipeline-meta.json"
);
const longKioskPipelinePath = resolve(
  root,
  "public/assets/props/airport-long-kiosk-v1/pipeline-meta.json"
);
const selfOrderKioskPipelinePath = resolve(
  root,
  "public/assets/props/airport-self-order-kiosk-v1/pipeline-meta.json"
);

if (!existsSync(manifestPath)) fail("Missing clerk manifest");
if (!existsSync(pipelinePath)) fail("Missing clerk pipeline metadata");
if (!existsSync(playerManifestPath)) fail("Missing player traveler manifest");
if (!existsSync(animatedClerkPipelinePath)) fail("Missing animated clerk metadata");
if (!existsSync(longKioskPipelinePath)) fail("Missing long Kiosk metadata");
if (!existsSync(selfOrderKioskPipelinePath)) fail("Missing self-order Kiosk metadata");

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const pipeline = JSON.parse(readFileSync(pipelinePath, "utf8"));
const playerManifest = JSON.parse(readFileSync(playerManifestPath, "utf8"));
const animatedClerkPipeline = JSON.parse(
  readFileSync(animatedClerkPipelinePath, "utf8")
);
const longKioskPipeline = JSON.parse(readFileSync(longKioskPipelinePath, "utf8"));
const selfOrderKioskPipeline = JSON.parse(
  readFileSync(selfOrderKioskPipelinePath, "utf8")
);
const npcTileset = JSON.parse(
  readFileSync(resolve(root, "public/assets/maps/tiled/tilesets/airport-npcs.tsj"), "utf8")
);
const propTileset = JSON.parse(
  readFileSync(resolve(root, "public/assets/maps/tiled/tilesets/airport-props.tsj"), "utf8")
);
const paperdollRecipeSource = readFileSync(
  resolve(root, "src/data/paperdollRecipes.ts"),
  "utf8"
);

if (manifest.sprites.length !== 3) fail("Expected three clerk sprites");
for (const sprite of manifest.sprites) {
  if (!existsSync(resolve(root, sprite.file))) fail(`Missing ${sprite.id}`);
}
if (!pipeline.shared_scale) fail("Clerk sprites must use shared scale");
if (pipeline.edge_touch_frames.length > 0) fail("Clerk sprite touches a cell edge");
if (animatedClerkPipeline.frames.length !== 12) fail("Animated clerks must have 12 frames");
if (!animatedClerkPipeline.shared_scale) fail("Animated clerks must use shared scale");
if (animatedClerkPipeline.edge_touch_frames.length > 0) {
  fail("Animated clerk frame touches a cell edge");
}
if (longKioskPipeline.frames.length !== 4) fail("Long Kiosk must have 4 frames");
if (!longKioskPipeline.shared_scale) fail("Long Kiosk must use shared scale");
if (longKioskPipeline.edge_touch_frames.length > 0) {
  fail("Long Kiosk frame touches a cell edge");
}
if (selfOrderKioskPipeline.frames.length !== 4) fail("Self-order Kiosk must have 4 frames");
if (!selfOrderKioskPipeline.shared_scale) fail("Self-order Kiosk must use shared scale");
if (selfOrderKioskPipeline.edge_touch_frames.length > 0) {
  fail("Self-order Kiosk frame touches a cell edge");
}

for (const [tileId, expectedFrames] of [
  [0, [0, 11, 12, 13]],
  [1, [1, 14, 15, 16]],
  [2, [2, 17, 18, 19]]
]) {
  const tile = npcTileset.tiles.find((candidate) => candidate.id === tileId);
  const actualFrames = tile?.animation?.map((frame) => frame.tileid);
  if (JSON.stringify(actualFrames) !== JSON.stringify(expectedFrames)) {
    fail(`Tiled clerk tile ${tileId} animation is out of sync`);
  }
}

for (const variant of [
  "child-male",
  "child-female",
  "elder-male",
  "elder-female",
  "paperdoll-blue-male",
  "paperdoll-green-male",
  "paperdoll-beige-male",
  "paperdoll-yellow-male",
  "paperdoll-coral-female",
  "paperdoll-yellow-female",
  "paperdoll-lavender-female"
]) {
  const directory = resolve(root, `public/assets/sprites/traveler-${variant}-v1`);
  const sheet = resolve(directory, "sheet-transparent.png");
  const metadataPath = resolve(directory, "pipeline-meta.json");
  if (!existsSync(sheet)) fail(`Missing ${variant} traveler sheet`);
  if (!existsSync(metadataPath)) fail(`Missing ${variant} traveler metadata`);
  const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
  if (metadata.frames.length !== 16) fail(`${variant} traveler sheet must have 16 frames`);

  const tile = npcTileset.tiles.find((candidate) =>
    candidate.properties?.some(
      (property) =>
        property.name === "texture" && property.value === `traveler-${variant}-npc`
    )
  );
  if (!tile) fail(`Missing ${variant} traveler in Tiled NPC tileset`);
}

for (const bodyType of ["adult-male", "adult-female"]) {
  const paperdollRoot = `public/assets/sprites/paperdoll/${bodyType}-v1`;
  const paperdollManifestPath = resolve(root, paperdollRoot, "paperdoll-manifest.json");
  if (!existsSync(paperdollManifestPath)) fail(`Missing ${bodyType} paperdoll manifest`);
  const paperdollManifest = JSON.parse(readFileSync(paperdollManifestPath, "utf8"));
  if (paperdollManifest.schemaVersion !== 3) {
    fail(`${bodyType} paperdoll manifest must use schemaVersion 3`);
  }
  if (paperdollManifest.spec !== "docs/CHARACTER_ASSET_SPEC.md") {
    fail(`${bodyType} paperdoll manifest must reference CHARACTER_ASSET_SPEC.md`);
  }
  if (paperdollManifest.bodyType !== bodyType) {
    fail(`${bodyType} paperdoll manifest bodyType is out of sync`);
  }
  assertArrayEquals(paperdollManifest.cellSize, [96, 96], `${bodyType} paperdoll cell size`);
  assertArrayEquals(paperdollManifest.rows, ["down", "left", "right", "up"], `${bodyType} paperdoll rows`);
  assertArrayEquals(
    paperdollManifest.columns,
    ["stand", "step-a", "stand", "step-b"],
    `${bodyType} paperdoll columns`
  );
  assertArrayEquals(
    paperdollManifest.layerOrder,
    [
      "accessory-back",
      "base-body",
      "pants",
      "shoes",
      "top",
      "hair",
      "accessory-front"
    ],
    `${bodyType} paperdoll layer order`
  );
  if (paperdollManifest.layers.length < 4) {
    fail(`${bodyType} paperdoll manifest must include base, hair, top, and pants layers`);
  }
  for (const layer of paperdollManifest.layers) {
    if (!["base-body", "hair", "top", "pants", "shoes", "accessory-back", "accessory-front"].includes(layer.slot)) {
      fail(`Paperdoll layer ${layer.id} has unsupported slot ${layer.slot}`);
    }
    const layerSheet = resolve(root, paperdollRoot, layer.path);
    if (!existsSync(layerSheet)) fail(`Missing paperdoll layer sheet ${layer.id}`);
    assertPngSize(layerSheet, 384, 384, `${layer.id} layer sheet`);
  }
  if (paperdollManifest.recipes.length < 1) {
    fail(`${bodyType} paperdoll manifest must include at least one recipe`);
  }
  for (const recipe of paperdollManifest.recipes) {
    for (const slot of ["base-body", "hair", "top", "pants"]) {
      if (!recipe.slots?.[slot]) fail(`${recipe.id} must define ${slot} slot`);
    }
    if (
      !recipe.appearance ||
      !["male", "female"].includes(recipe.appearance.gender) ||
      !["adult", "child", "elder"].includes(recipe.appearance.ageGroup) ||
      typeof recipe.appearance.hairStyle !== "string" ||
      typeof recipe.appearance.top !== "string" ||
      typeof recipe.appearance.pants !== "string"
    ) {
      fail(`${recipe.id} must define a valid appearance object`);
    }
    if (recipe.status !== "manifest-built-v1") {
      fail(`${recipe.id} must use manifest-built-v1 status`);
    }
    const output = resolve(root, recipe.output);
    if (!existsSync(output)) fail(`Missing ${recipe.id} output sheet`);
    assertPngSize(output, 384, 384, `${recipe.id} output sheet`);
    const recipeDirectory = resolve(root, `public/assets/sprites/traveler-${recipe.id}-v1`);
    const metadataPath = resolve(recipeDirectory, "pipeline-meta.json");
    if (!existsSync(metadataPath)) fail(`Missing ${recipe.id} metadata`);
    const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
    if (metadata.spec !== "docs/CHARACTER_ASSET_SPEC.md") {
      fail(`${recipe.id} metadata must reference CHARACTER_ASSET_SPEC.md`);
    }
    assertArrayEquals(metadata.cellSize, [96, 96], `${recipe.id} cell size`);
    assertArrayEquals(metadata.rows, ["down", "left", "right", "up"], `${recipe.id} rows`);
    assertArrayEquals(
      metadata.columns,
      ["stand", "step-a", "stand", "step-b"],
      `${recipe.id} columns`
    );
    if (metadata.frames.length !== 16) fail(`${recipe.id} must have 16 frames`);
    if (!metadata.shared_scale) fail(`${recipe.id} must use shared scale`);
    if (metadata.edge_touch_frames.length > 0) fail(`${recipe.id} touches a cell edge`);
    if (JSON.stringify(metadata.appearance) !== JSON.stringify(recipe.appearance)) {
      fail(`${recipe.id} metadata appearance is out of sync with manifest`);
    }
    for (const value of [
      recipe.id,
      recipe.bodyType,
      recipe.appearance.gender,
      recipe.appearance.ageGroup,
      recipe.appearance.hairStyle,
      recipe.appearance.top,
      recipe.appearance.pants
    ]) {
      if (!paperdollRecipeSource.includes(`"${value}"`)) {
        fail(`${recipe.id} is missing ${value} in src/data/paperdollRecipes.ts`);
      }
    }
  }
}
const kioskTile = propTileset.tiles.find((tile) => tile.id === 80);
if (
  JSON.stringify(kioskTile?.animation?.map((frame) => frame.tileid)) !==
  JSON.stringify([80, 81, 82, 83])
) {
  fail("Tiled long Kiosk animation is out of sync");
}
const selfOrderKioskTile = propTileset.tiles.find((tile) => tile.id === 84);
if (
  JSON.stringify(selfOrderKioskTile?.animation?.map((frame) => frame.tileid)) !==
  JSON.stringify([84, 85, 86, 87])
) {
  fail("Tiled self-order Kiosk animation is out of sync");
}

for (const variant of playerManifest.variants) {
  const sheet = resolve(root, variant.sheet);
  const metadataPath = resolve(root, variant.pipeline);
  if (!existsSync(sheet)) fail(`Missing ${variant.id} sheet`);
  if (!existsSync(metadataPath)) fail(`Missing ${variant.id} metadata`);
  const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
  if (metadata.frames.length !== 16) fail(`${variant.id} must have 16 frames`);
  if (!metadata.shared_scale) fail(`${variant.id} must use shared scale`);
  if (metadata.edge_touch_frames.length > 0) fail(`${variant.id} touches a cell edge`);
}

for (const variant of ["male", "female"]) {
  const directory = resolve(root, `public/assets/sprites/player-traveler-${variant}-idle-v1`);
  const sheet = resolve(directory, "sheet-transparent.png");
  const metadataPath = resolve(directory, "pipeline-meta.json");
  if (!existsSync(sheet)) fail(`Missing ${variant} idle sheet`);
  if (!existsSync(metadataPath)) fail(`Missing ${variant} idle metadata`);
  const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
  if (metadata.frames.length !== 4) fail(`${variant} idle sheet must have 4 frames`);
  if (!metadata.shared_scale) fail(`${variant} idle sheet must use shared scale`);
  if (metadata.edge_touch_frames.length > 0) fail(`${variant} idle frame touches a cell edge`);
}

for (const variant of ["male", "female"]) {
  const directory = resolve(root, `public/assets/sprites/player-traveler-${variant}-up-v2`);
  const sheet = resolve(directory, "sheet-transparent.png");
  const metadataPath = resolve(directory, "pipeline-meta.json");
  if (!existsSync(sheet)) fail(`Missing ${variant} up-walk sheet`);
  if (!existsSync(metadataPath)) fail(`Missing ${variant} up-walk metadata`);
  const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
  if (metadata.frames.length !== 4) fail(`${variant} up-walk sheet must have 4 frames`);
  if (!metadata.shared_scale) fail(`${variant} up-walk sheet must use shared scale`);
  if (metadata.edge_touch_frames.length > 0) fail(`${variant} up-walk frame touches a cell edge`);
}

console.log(
  "[character:verify] OK (animated clerks, Kiosks, and player animation sheets)"
);
