const fs = require('fs');
const path = require('path');
const jimp = require('jimp');
const { Jimp } = jimp;

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : '1';
      out[key] = val;
    }
  }
  return out;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function countMatches(img, rect, matcher, step = 3) {
  const x0 = clamp(rect.x, 0, img.bitmap.width - 1);
  const y0 = clamp(rect.y, 0, img.bitmap.height - 1);
  const x1 = clamp(rect.x + rect.w, 1, img.bitmap.width);
  const y1 = clamp(rect.y + rect.h, 1, img.bitmap.height);
  let total = 0;
  let hit = 0;
  for (let y = y0; y < y1; y += step) {
    for (let x = x0; x < x1; x += step) {
      const { r, g, b, a } = jimp.intToRGBA(img.getPixelColor(x, y));
      total++;
      if (matcher(r, g, b, a)) hit++;
    }
  }
  return { total, hit, ratio: total > 0 ? hit / total : 0 };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = args.input || args.inputCOff;
  const inputCOnPath = args.inputCOn;
  const reportPath = args.report;

  if (!inputPath) {
    console.error('[hud] missing --input (or --inputCOff)');
    process.exit(2);
  }

  function evaluateHud(img) {
    const w = img.bitmap.width;
    const h = img.bitmap.height;

    const topRect = { x: 0, y: 0, w, h: Math.max(24, Math.round(h * 0.08)) };
    const bottomRect = { x: 0, y: h - Math.max(38, Math.round(h * 0.11)), w, h: Math.max(38, Math.round(h * 0.11)) };
    const moneyRect = {
      x: 0,
      y: h - Math.max(90, Math.round(h * 0.14)),
      w: Math.min(w, Math.max(220, Math.round(w * 0.22))),
      h: Math.max(80, Math.round(h * 0.12))
    };
    const minimapRect = {
      x: w - Math.max(260, Math.round(w * 0.33)),
      y: Math.max(20, Math.round(h * 0.04)),
      w: Math.max(220, Math.round(w * 0.28)),
      h: Math.max(140, Math.round(h * 0.25))
    };

    const topGreen = countMatches(
      img,
      topRect,
      (r, g, b, a) => a > 0 && g >= r + 25 && g >= b + 25 && g >= 70
    );
    const bottomRed = countMatches(
      img,
      bottomRect,
      (r, g, b, a) => a > 0 && r >= g + 25 && r >= b + 25 && r >= 70
    );
    const moneyMagenta = countMatches(
      img,
      moneyRect,
      (r, g, b, a) => a > 0 && r >= 125 && b >= 115 && g <= 190 && Math.abs(r - b) <= 110
    );
    const minimapGold = countMatches(
      img,
      minimapRect,
      (r, g, b, a) => a > 0 && r >= 150 && g >= 110 && b <= 130
    );
    const minimapBlue = countMatches(
      img,
      minimapRect,
      (r, g, b, a) => a > 0 && r >= 30 && r <= 110 && g >= 45 && g <= 130 && b >= 70 && b <= 160
    );

    const checks = [
      {
        key: 'topHudGreen',
        pass: topGreen.ratio >= 0.05,
        ratio: Number(topGreen.ratio.toFixed(4)),
        min: 0.05
      },
      {
        key: 'bottomHudRed',
        pass: bottomRed.ratio >= 0.3,
        ratio: Number(bottomRed.ratio.toFixed(4)),
        min: 0.3
      },
      {
        key: 'moneyPanelMagenta',
        pass: moneyMagenta.ratio >= 0.008,
        ratio: Number(moneyMagenta.ratio.toFixed(4)),
        min: 0.008
      },
      {
        key: 'minimapGoldBorder',
        pass: minimapGold.ratio >= 0.004,
        ratio: Number(minimapGold.ratio.toFixed(4)),
        min: 0.004
      },
      {
        key: 'minimapBlueFrame',
        pass: minimapBlue.ratio >= 0.004,
        ratio: Number(minimapBlue.ratio.toFixed(4)),
        min: 0.004
      }
    ];
    return { checks, w, h };
  }

  const imgOff = await Jimp.read(inputPath);
  const off = evaluateHud(imgOff);
  const checks = [...off.checks];
  let mode = 'auto-visual';
  let dualInputs = null;

  if (inputCOnPath) {
    const imgOn = await Jimp.read(inputCOnPath);
    if (imgOn.bitmap.width !== off.w || imgOn.bitmap.height !== off.h) {
      checks.push({
        key: 'debugToggleSizeMatch',
        pass: false,
        ratio: 0,
        min: 1
      });
    } else {
      mode = 'auto-visual-dual';
      const w = off.w;
      const h = off.h;
      let total = 0;
      let changed = 0;
      let changedTeal = 0;
      let changedOrange = 0;
      const step = 3;
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const a = jimp.intToRGBA(imgOff.getPixelColor(x, y));
          const b = jimp.intToRGBA(imgOn.getPixelColor(x, y));
          const dr = Math.abs(a.r - b.r);
          const dg = Math.abs(a.g - b.g);
          const db = Math.abs(a.b - b.b);
          total++;
          if ((dr + dg + db) >= 24) changed++;
          if ((dr + dg + db) >= 24) {
            if (b.g >= b.r + 18 && b.b >= b.r + 18 && b.g >= 70 && b.b >= 70) changedTeal++;
            if (b.r >= b.g + 18 && b.r >= b.b + 18 && b.r >= 90) changedOrange++;
          }
        }
      }
      const changedRatio = total > 0 ? (changed / total) : 0;
      const tealRatio = changed > 0 ? (changedTeal / changed) : 0;
      const orangeRatio = changed > 0 ? (changedOrange / changed) : 0;
      checks.push({
        key: 'debugToggleDiff',
        pass: changedRatio >= 0.006,
        ratio: Number(changedRatio.toFixed(4)),
        min: 0.006
      });
      checks.push({
        key: 'debugCollisionTeal',
        pass: tealRatio >= 0.002,
        ratio: Number(tealRatio.toFixed(4)),
        min: 0.002
      });
      checks.push({
        key: 'debugCollisionOrange',
        pass: orangeRatio >= 0.002,
        ratio: Number(orangeRatio.toFixed(4)),
        min: 0.002
      });
    }
    dualInputs = {
      off: path.resolve(inputPath),
      on: path.resolve(inputCOnPath),
    };
  }

  const passed = checks.every((c) => c.pass);
  const result = {
    mode,
    input: path.resolve(inputPath),
    ...(dualInputs ? { dualInputs } : {}),
    viewport: { width: off.w, height: off.h },
    checks,
    passed
  };

  if (reportPath) {
    fs.writeFileSync(reportPath, JSON.stringify(result, null, 2), 'utf8');
  }

  console.log(JSON.stringify(result, null, 2));

  if (!passed) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[hud] verify failed:', err?.message || err);
  process.exit(2);
});
