const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jimp = require('jimp');
const { Jimp } = jimp;

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const k = a.slice(2);
    const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : '1';
    out[k] = v;
  }
  return out;
}

function getCoverPositions(total, tile) {
  if (tile <= 0) throw new Error('Tile size must be > 0');
  if (total <= tile) return [0];
  const maxStart = Math.max(0, total - tile);
  const vals = [0];
  let cur = 0;
  while (cur < maxStart) {
    let next = cur + tile;
    if (next > maxStart) next = maxStart;
    if (vals[vals.length - 1] === next) break;
    vals.push(next);
    cur = next;
  }
  return vals;
}

function parseTileName(name) {
  const m = /^map-tile-x(\d+)-y(\d+)\.png$/i.exec(name);
  if (!m) return null;
  return { x: Number(m[1]), y: Number(m[2]) };
}

async function writeTiles(base, tileDir, xs, ys, tileWidth, tileHeight) {
  for (const y of ys) {
    for (const x of xs) {
      const tile = new Jimp({ width: tileWidth, height: tileHeight, color: 0x000000ff });
      tile.composite(base, -x, -y);
      const out = path.join(tileDir, `map-tile-x${x}-y${y}.png`);
      await tile.write(out);
    }
  }
}

async function stitchTiles(tileDir, outPath, mapWidth, mapHeight) {
  const files = fs.readdirSync(tileDir)
    .map((name) => ({ name, meta: parseTileName(name) }))
    .filter((r) => !!r.meta)
    .map((r) => ({ name: r.name, x: r.meta.x, y: r.meta.y }))
    .sort((a, b) => (a.y - b.y) || (a.x - b.x));

  if (!files.length) throw new Error('no tile files found');

  const canvas = new Jimp({ width: mapWidth, height: mapHeight, color: 0x000000ff });
  for (const f of files) {
    const img = await Jimp.read(path.join(tileDir, f.name));
    canvas.composite(img, f.x, f.y);
  }
  await canvas.write(outPath);
  return files.length;
}

async function verifyStitch(base, stitched, sampleCount) {
  let mismatches = 0;
  let minLuma = 255;
  let maxLuma = 0;
  let nonBlack = 0;
  let seed = 24681357;

  for (let i = 0; i < sampleCount; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const x = seed % base.bitmap.width;
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const y = seed % base.bitmap.height;

    const a = base.getPixelColor(x, y);
    const b = stitched.getPixelColor(x, y);
    if (a !== b) mismatches++;

    const { r, g, b: bb, a: aa } = jimp.intToRGBA(a);
    const luma = Math.round(0.299 * r + 0.587 * g + 0.114 * bb);
    minLuma = Math.min(minLuma, luma);
    maxLuma = Math.max(maxLuma, luma);
    if (aa > 0 && (r > 8 || g > 8 || bb > 8)) nonBlack++;
  }

  return {
    sampleCount,
    mismatchCount: mismatches,
    mismatchRatio: Number((mismatches / sampleCount).toFixed(6)),
    contrastRange: maxLuma - minLuma,
    nonBlackRatio: Number((nonBlack / sampleCount).toFixed(4)),
  };
}

function sha256File(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function updateLatestFiles(debugDir, stitchedPath, reportPath) {
  const latestPng = path.join(debugDir, 'mapasset-full-latest.png');
  const latestJson = path.join(debugDir, 'mapasset-full-latest.json');
  fs.copyFileSync(stitchedPath, latestPng);
  fs.copyFileSync(reportPath, latestJson);
  return { latestPng, latestJson };
}

function pruneOldRuns(debugDir, keepCount) {
  if (!Number.isFinite(keepCount) || keepCount < 1) return;
  const all = fs.readdirSync(debugDir);
  const reports = all
    .filter((n) => /^mapasset-full-\d{14}\.json$/i.test(n))
    .sort()
    .reverse();

  const stale = reports.slice(keepCount);
  for (const reportName of stale) {
    const stamp = reportName.match(/\d{14}/)?.[0];
    if (!stamp) continue;
    const png = path.join(debugDir, `mapasset-full-${stamp}.png`);
    const json = path.join(debugDir, `mapasset-full-${stamp}.json`);
    const tiles = path.join(debugDir, `mapasset-tiles-${stamp}`);
    if (fs.existsSync(png)) fs.rmSync(png, { force: true });
    if (fs.existsSync(json)) fs.rmSync(json, { force: true });
    if (fs.existsSync(tiles)) fs.rmSync(tiles, { recursive: true, force: true });
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const mapWidth = Number(args.mapWidth || 6000);
  const mapHeight = Number(args.mapHeight || 3472);
  const tileWidth = Number(args.tileWidth || 1536);
  const tileHeight = Number(args.tileHeight || 864);
  const sampleCount = Number(args.sampleCount || 1200);
  const keepCount = Number(args.keep || 1);

  const root = process.cwd();
  const debugDir = path.join(root, 'debug');
  fs.mkdirSync(debugDir, { recursive: true });

  const source = path.join(root, 'public', 'map', 'TPE2', 'tpe2_floorplan_base.png');
  if (!fs.existsSync(source)) throw new Error(`source not found: ${source}`);

  const stamp = new Date().toISOString().replace(/[^\d]/g, '').slice(0, 14);
  const tileDir = path.join(debugDir, `mapasset-tiles-${stamp}`);
  const stitchedPath = path.join(debugDir, `mapasset-full-${stamp}.png`);
  const reportPath = path.join(debugDir, `mapasset-full-${stamp}.json`);
  fs.mkdirSync(tileDir, { recursive: true });

  const base = await Jimp.read(source);
  const dimsOk = (base.bitmap.width === mapWidth && base.bitmap.height === mapHeight);
  if (!dimsOk) throw new Error(`base dimension mismatch: got ${base.bitmap.width}x${base.bitmap.height}, expected ${mapWidth}x${mapHeight}`);

  const xs = getCoverPositions(mapWidth, tileWidth);
  const ys = getCoverPositions(mapHeight, tileHeight);

  await writeTiles(base, tileDir, xs, ys, tileWidth, tileHeight);
  const tileCount = await stitchTiles(tileDir, stitchedPath, mapWidth, mapHeight);

  const stitched = await Jimp.read(stitchedPath);
  const checks = await verifyStitch(base, stitched, sampleCount);

  const report = {
    mode: 'asset-tile-stitch',
    source: path.resolve(source),
    output: path.resolve(stitchedPath),
    tilesDir: path.resolve(tileDir),
    map: { width: mapWidth, height: mapHeight },
    tiles: { xCount: xs.length, yCount: ys.length, count: tileCount, tileWidth, tileHeight },
    checks: {
      dimensions: dimsOk,
      mismatchRatio: checks.mismatchRatio,
      mismatchCount: checks.mismatchCount,
      sampleCount: checks.sampleCount,
      contrastRange: checks.contrastRange,
      nonBlackRatio: checks.nonBlackRatio,
    },
  };

  report.passed = report.checks.dimensions
    && report.checks.mismatchRatio <= 0.01
    && report.checks.contrastRange >= 12
    && report.checks.nonBlackRatio >= 0.85;

  report.hashes = {
    sourceSha256: sha256File(source),
    outputSha256: sha256File(stitchedPath),
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  const latest = updateLatestFiles(debugDir, stitchedPath, reportPath);
  pruneOldRuns(debugDir, keepCount);

  report.latest = {
    output: path.resolve(latest.latestPng),
    report: path.resolve(latest.latestJson),
    keepRuns: keepCount,
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  fs.writeFileSync(latest.latestJson, JSON.stringify(report, null, 2), 'utf8');

  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exit(1);
}

main().catch((err) => {
  console.error('[mapasset] failed:', err?.message || err);
  process.exit(2);
});
