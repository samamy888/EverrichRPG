const fs = require('fs');
const path = require('path');
const jimp = require('jimp');
const { Jimp } = jimp;

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : '1';
    out[key] = val;
  }
  return out;
}

function parseTileName(name) {
  const m = /^map-tile-x(\d+)-y(\d+)\.png$/i.exec(name);
  if (!m) return null;
  return { x: Number(m[1]), y: Number(m[2]) };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputDir = args.inputDir;
  const outPath = args.out;
  const reportPath = args.report;
  const mapWidth = Number(args.mapWidth || 6000);
  const mapHeight = Number(args.mapHeight || 3472);

  if (!inputDir || !outPath) {
    console.error('[map] missing required args --inputDir/--out');
    process.exit(2);
  }

  const files = fs.readdirSync(inputDir)
    .map((name) => ({ name, meta: parseTileName(name) }))
    .filter((r) => !!r.meta)
    .map((r) => ({ name: r.name, x: r.meta.x, y: r.meta.y }))
    .sort((a, b) => (a.y - b.y) || (a.x - b.x));

  if (!files.length) {
    console.error('[map] no tile files found');
    process.exit(2);
  }

  const canvas = new Jimp({ width: mapWidth, height: mapHeight, color: 0x000000ff });

  for (const f of files) {
    const tilePath = path.join(inputDir, f.name);
    const img = await Jimp.read(tilePath);
    canvas.composite(img, f.x, f.y);
  }

  await canvas.write(outPath);

  // Lightweight verification for map artifact sanity.
  const sampleCount = 700;
  let minLuma = 255;
  let maxLuma = 0;
  let nonBlack = 0;
  let seed = 1234567;
  for (let i = 0; i < sampleCount; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const x = seed % mapWidth;
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const y = seed % mapHeight;
    const px = canvas.getPixelColor(x, y);
    const { r, g, b, a } = jimp.intToRGBA(px);
    const luma = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    minLuma = Math.min(minLuma, luma);
    maxLuma = Math.max(maxLuma, luma);
    if (a > 0 && (r > 8 || g > 8 || b > 8)) nonBlack++;
  }

  const report = {
    mode: 'mapshot-stitch',
    output: path.resolve(outPath),
    map: { width: mapWidth, height: mapHeight },
    tiles: { count: files.length },
    checks: {
      dimensions: canvas.bitmap.width === mapWidth && canvas.bitmap.height === mapHeight,
      contrastRange: maxLuma - minLuma,
      nonBlackRatio: Number((nonBlack / sampleCount).toFixed(4)),
    },
  };

  report.passed = report.checks.dimensions && report.checks.contrastRange >= 12 && report.checks.nonBlackRatio >= 0.85;

  if (reportPath) {
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  }
  console.log(JSON.stringify(report, null, 2));

  if (!report.passed) process.exit(1);
}

main().catch((err) => {
  console.error('[map] stitch/verify failed:', err?.message || err);
  process.exit(2);
});
