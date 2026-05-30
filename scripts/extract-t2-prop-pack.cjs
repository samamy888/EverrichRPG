#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

function usage() {
  console.error('Usage: node scripts/extract-t2-prop-pack.cjs <input-pack.png> <layout.json>');
  process.exit(1);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function rgbToHsv(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return { h, s, v };
}

function isMagentaBg(r, g, b) {
  const { h, s, v } = rgbToHsv(r, g, b);
  return h >= 275 && h <= 335 && s >= 0.45 && v >= 0.42;
}

function clearBgInCell(srcPng, x0, y0, w, h) {
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = ((y0 + y) * srcPng.width + (x0 + x)) << 2;
      const di = (y * w + x) << 2;
      const r = srcPng.data[si];
      const g = srcPng.data[si + 1];
      const b = srcPng.data[si + 2];
      const a = srcPng.data[si + 3];
      out.data[di] = r;
      out.data[di + 1] = g;
      out.data[di + 2] = b;
      out.data[di + 3] = isMagentaBg(r, g, b) ? 0 : a;
    }
  }
  return out;
}

function alphaBBox(png, alphaThreshold = 8) {
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) << 2;
      if (png.data[i + 3] > alphaThreshold) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) return null;
  return { minX, minY, maxX, maxY };
}

function largestComponentBBox(png, alphaThreshold = 8) {
  const w = png.width;
  const h = png.height;
  const visited = new Uint8Array(w * h);
  let bestArea = 0;
  let best = null;

  const inBounds = (x, y) => x >= 0 && y >= 0 && x < w && y < h;
  const idx = (x, y) => y * w + x;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const id = idx(x, y);
      if (visited[id]) continue;
      visited[id] = 1;
      const a = png.data[(id << 2) + 3];
      if (a <= alphaThreshold) continue;

      const q = [[x, y]];
      let qi = 0;
      let area = 0;
      let minX = x, minY = y, maxX = x, maxY = y;
      while (qi < q.length) {
        const [cx, cy] = q[qi++];
        area++;
        if (cx < minX) minX = cx;
        if (cy < minY) minY = cy;
        if (cx > maxX) maxX = cx;
        if (cy > maxY) maxY = cy;

        const nbs = [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]];
        for (const [nx, ny] of nbs) {
          if (!inBounds(nx, ny)) continue;
          const nid = idx(nx, ny);
          if (visited[nid]) continue;
          visited[nid] = 1;
          const na = png.data[(nid << 2) + 3];
          if (na > alphaThreshold) q.push([nx, ny]);
        }
      }

      if (area > bestArea) {
        bestArea = area;
        best = { minX, minY, maxX, maxY, area };
      }
    }
  }

  return best;
}

function cropPng(png, x, y, w, h) {
  const out = new PNG({ width: w, height: h });
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      const si = ((y + yy) * png.width + (x + xx)) << 2;
      const di = (yy * w + xx) << 2;
      out.data[di] = png.data[si];
      out.data[di + 1] = png.data[si + 1];
      out.data[di + 2] = png.data[si + 2];
      out.data[di + 3] = png.data[si + 3];
    }
  }
  return out;
}

function main() {
  const input = process.argv[2];
  const layoutPath = process.argv[3];
  if (!input || !layoutPath) usage();

  const projectRoot = process.cwd();
  const raw = PNG.sync.read(fs.readFileSync(input));
  const layout = JSON.parse(fs.readFileSync(layoutPath, 'utf8'));
  const rows = Number(layout.rows);
  const cols = Number(layout.cols);
  const labels = layout.labels;
  const pad = Number(layout.pad ?? 8);
  const outBase = layout.outputBaseDir
    ? path.resolve(projectRoot, layout.outputBaseDir)
    : path.join(projectRoot, 'public', 'map', 'TPE2', 'props');

  if (!rows || !cols || !Array.isArray(labels)) {
    throw new Error('Invalid layout config: require rows, cols, labels[]');
  }
  if (labels.length !== rows * cols) {
    throw new Error(`labels length (${labels.length}) must equal rows*cols (${rows * cols})`);
  }

  const cellW = Math.floor(raw.width / cols);
  const cellH = Math.floor(raw.height / rows);
  const report = {
    input: path.resolve(input),
    layout: path.resolve(layoutPath),
    width: raw.width,
    height: raw.height,
    rows,
    cols,
    cellW,
    cellH,
    pad,
    exported: [],
    skipped: [],
  };

  for (let idx = 0; idx < labels.length; idx++) {
    const label = labels[idx];
    const cx = idx % cols;
    const cy = Math.floor(idx / cols);
    const x0 = cx * cellW;
    const y0 = cy * cellH;
    const cell = clearBgInCell(raw, x0, y0, cellW, cellH);
    const box = largestComponentBBox(cell, 8) || alphaBBox(cell, 8);

    if (!label) {
      report.skipped.push({ idx, reason: 'placeholder', cell: [x0, y0, cellW, cellH] });
      continue;
    }
    if (!box) {
      report.skipped.push({ idx, label, reason: 'empty-after-bg-clear', cell: [x0, y0, cellW, cellH] });
      continue;
    }

    const bx = Math.max(0, box.minX - pad);
    const by = Math.max(0, box.minY - pad);
    const bw = Math.min(cellW - bx, box.maxX - box.minX + 1 + pad * 2);
    const bh = Math.min(cellH - by, box.maxY - box.minY + 1 + pad * 2);
    const cropped = cropPng(cell, bx, by, bw, bh);

    const outDir = path.join(outBase, label);
    ensureDir(outDir);
    const outPath = path.join(outDir, 'prop.png');
    fs.writeFileSync(outPath, PNG.sync.write(cropped));

    report.exported.push({
      idx,
      label,
      outPath,
      outputSize: [cropped.width, cropped.height],
      cell: [x0, y0, cellW, cellH],
      bbox: [box.minX, box.minY, box.maxX, box.maxY],
      cropped: [bx, by, bw, bh],
    });
  }

  const reportPath = path.join(projectRoot, 'public', 'map', 'TPE2', 'props', 'raw', `${path.basename(layoutPath, path.extname(layoutPath))}-extract-report.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Exported: ${report.exported.length}, skipped: ${report.skipped.length}`);
  console.log(`Report: ${reportPath}`);
}

main();
