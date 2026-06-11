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

if (!existsSync(manifestPath)) fail("Missing clerk manifest");
if (!existsSync(pipelinePath)) fail("Missing clerk pipeline metadata");
if (!existsSync(playerManifestPath)) fail("Missing player traveler manifest");

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const pipeline = JSON.parse(readFileSync(pipelinePath, "utf8"));
const playerManifest = JSON.parse(readFileSync(playerManifestPath, "utf8"));

if (manifest.sprites.length !== 3) fail("Expected three clerk sprites");
for (const sprite of manifest.sprites) {
  if (!existsSync(resolve(root, sprite.file))) fail(`Missing ${sprite.id}`);
}
if (!pipeline.shared_scale) fail("Clerk sprites must use shared scale");
if (pipeline.edge_touch_frames.length > 0) fail("Clerk sprite touches a cell edge");

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
  "[character:verify] OK (3 clerks + 2 walk sheets + 2 idle sheets + 2 up-walk sheets)"
);
