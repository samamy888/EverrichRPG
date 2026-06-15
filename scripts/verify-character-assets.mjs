import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function fail(message) {
  console.error(`[character:verify] ${message}`);
  process.exit(1);
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
  [0, [0, 5, 6, 7]],
  [1, [1, 8, 9, 10]],
  [2, [2, 11, 12, 13]]
]) {
  const tile = npcTileset.tiles.find((candidate) => candidate.id === tileId);
  const actualFrames = tile?.animation?.map((frame) => frame.tileid);
  if (JSON.stringify(actualFrames) !== JSON.stringify(expectedFrames)) {
    fail(`Tiled clerk tile ${tileId} animation is out of sync`);
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
