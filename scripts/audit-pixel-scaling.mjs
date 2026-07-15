import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const tiledRoot = resolve(process.cwd(), "public/assets/maps/tiled");
const regionsDir = resolve(tiledRoot, "regions");
const uniformTolerance = 0.02;

function propertyValue(object, name) {
  return object.properties?.find((property) => property.name === name)?.value;
}

function loadTextureDimensions(map, mapPath) {
  const dimensions = new Map();
  for (const reference of map.tilesets) {
    const tilesetPath = resolve(dirname(mapPath), reference.source);
    const tileset = JSON.parse(readFileSync(tilesetPath, "utf8"));
    for (const tile of tileset.tiles ?? []) {
      const texture = propertyValue(tile, "texture");
      if (typeof texture !== "string") continue;
      if (typeof tile.imagewidth !== "number" || typeof tile.imageheight !== "number") continue;
      dimensions.set(texture, { width: tile.imagewidth, height: tile.imageheight });
    }
  }
  return dimensions;
}

const rows = [];
for (const fileName of readdirSync(regionsDir).filter((name) => name.endsWith(".tmj"))) {
  const mapPath = resolve(regionsDir, fileName);
  const map = JSON.parse(readFileSync(mapPath, "utf8"));
  const textureDimensions = loadTextureDimensions(map, mapPath);

  for (const layer of map.layers.filter((candidate) =>
    ["Props", "Merchandise", "NPCs"].includes(candidate.name)
  )) {
    for (const object of layer.objects ?? []) {
      const texture = propertyValue(object, "texture");
      const source = textureDimensions.get(texture);
      if (!source) continue;

      const displayHeight = propertyValue(object, "displayHeight") ?? object.height;
      const scaleX = object.width / source.width;
      const scaleY = displayHeight / source.height;
      rows.push({
        map: fileName.replace(/\.tmj$/, ""),
        layer: layer.name,
        object: object.name,
        texture,
        source: `${source.width}x${source.height}`,
        display: `${object.width}x${displayHeight}`,
        scaleX,
        scaleY,
        distortion: Math.abs(scaleX - scaleY)
      });
    }
  }
}

const scaled = rows.filter((row) =>
  Math.abs(row.scaleX - 1) > 0.001 || Math.abs(row.scaleY - 1) > 0.001
);
const nonUniform = rows
  .filter((row) => row.distortion > uniformTolerance)
  .sort((left, right) => right.distortion - left.distortion);

console.log(`[pixel:scaling-audit] objects: ${rows.length}`);
console.log(`[pixel:scaling-audit] non-1:1: ${scaled.length}`);
console.log(`[pixel:scaling-audit] non-uniform: ${nonUniform.length}`);

if (nonUniform.length > 0) {
  console.log("\nLargest non-uniform scaling:");
  console.table(
    nonUniform.slice(0, 20).map((row) => ({
      map: row.map,
      object: row.object,
      texture: row.texture,
      source: row.source,
      display: row.display,
      scale: `${row.scaleX.toFixed(3)}x${row.scaleY.toFixed(3)}`
    }))
  );
}

if (process.argv.includes("--strict") && nonUniform.length > 0) {
  process.exitCode = 1;
}
