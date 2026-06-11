import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function fail(message) {
  console.error(`[verify-world-data] ${message}`);
  process.exit(1);
}

const root = process.cwd();
const chunkMetaPath = resolve(root, "public/assets/map/terminal/chunks-meta.json");
const runtimeConfigPath = resolve(root, "public/assets/map/terminal/runtime-config.json");

if (!existsSync(chunkMetaPath)) fail("chunks-meta.json 不存在。先執行 npm run map:slice");
if (!existsSync(runtimeConfigPath)) fail("runtime-config.json 不存在。");

const chunkMeta = JSON.parse(readFileSync(chunkMetaPath, "utf-8"));
const runtime = JSON.parse(readFileSync(runtimeConfigPath, "utf-8"));

const expectedTiles = chunkMeta.rows * chunkMeta.cols;
if (chunkMeta.tiles.length !== expectedTiles) {
  fail(`切塊數量不一致：expected=${expectedTiles}, actual=${chunkMeta.tiles.length}`);
}

if (!Array.isArray(runtime.collisionRects) || runtime.collisionRects.length === 0) {
  fail("collisionRects 必須至少有一筆。");
}

for (const rect of runtime.collisionRects) {
  if (rect.x < 0 || rect.y < 0) fail("collision rect 不可為負值。");
  if (rect.width <= 0 || rect.height <= 0) fail("collision rect 寬高需大於 0。");
  if (rect.x + rect.width > chunkMeta.width) fail("collision rect 超出地圖寬度。");
  if (rect.y + rect.height > chunkMeta.height) fail("collision rect 超出地圖高度。");
}

const { spawn, serviceZone } = runtime;
if (!spawn || typeof spawn.x !== "number" || typeof spawn.y !== "number") {
  fail("spawn 座標格式錯誤。");
}
if (spawn.x < 0 || spawn.x > chunkMeta.width || spawn.y < 0 || spawn.y > chunkMeta.height) {
  fail("spawn 座標超出地圖邊界。");
}

if (!serviceZone) fail("serviceZone 缺失。");
if (serviceZone.width <= 0 || serviceZone.height <= 0) fail("serviceZone 寬高需大於 0。");
if (serviceZone.x < 0 || serviceZone.x > chunkMeta.width || serviceZone.y < 0 || serviceZone.y > chunkMeta.height) {
  fail("serviceZone 中心座標超出地圖邊界。");
}

console.log("[verify-world-data] OK");
console.log(
  `[verify-world-data] map=${chunkMeta.width}x${chunkMeta.height}, tiles=${chunkMeta.tiles.length}, collisionRects=${runtime.collisionRects.length}`
);

