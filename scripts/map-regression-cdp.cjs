const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright-core');

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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function urlReady(url, timeoutMs = 4000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: c.signal });
    return res.status >= 200 && res.status < 400;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

function resolveBrowserPath() {
  const candidates = [
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('No supported browser executable was found (Edge/Chrome).');
}

function buildCaptureUrl(base) {
  const u = (base || 'http://127.0.0.1:5173/').trim().replace(/#$/, '');
  const join = u.includes('?') ? '&' : '?';
  return `${u}${join}autostart=1&cleanhud=1&skipui=1&tilecap=1&tcx=0&tcy=0`;
}

function detectScene(pageEvalResult) {
  if (pageEvalResult?.activeKey) return pageEvalResult.activeKey;
  return 'TPE2LobbyScene';
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

function runCommand(exe, args, cwd) {
  return new Promise((resolve, reject) => {
    const p = spawn(exe, args, {
      cwd,
      stdio: 'inherit',
      windowsHide: true,
    });
    p.once('error', reject);
    p.once('close', (code) => resolve(code ?? 1));
  });
}

function npmExe() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function formatStamp() {
  const d = new Date();
  const p2 = (n) => String(n).padStart(2, '0');
  const y = d.getFullYear();
  const m = p2(d.getMonth() + 1);
  const day = p2(d.getDate());
  const hh = p2(d.getHours());
  const mm = p2(d.getMinutes());
  const ss = p2(d.getSeconds());
  return `${y}${m}${day}-${hh}${mm}${ss}`;
}

function pruneKeep1(debugDir, tag) {
  const items = fs.readdirSync(debugDir);
  const fullMatcher = new RegExp(`^${tag}-full-(\\d{8}-\\d{6})\\.(png|json)$`, 'i');
  const tileMatcher = new RegExp(`^${tag}-tiles-(\\d{8}-\\d{6})$`, 'i');
  const profileMatcher = new RegExp(`^${tag}-pw-profile-(\\d{8}-\\d{6})$`, 'i');
  const stamps = new Set();
  for (const n of items) {
    let m = n.match(fullMatcher);
    if (!m) m = n.match(tileMatcher);
    if (!m) m = n.match(profileMatcher);
    if (m) stamps.add(m[1]);
  }
  const sorted = Array.from(stamps).sort().reverse();
  const stale = sorted.slice(1);
  for (const st of stale) {
    for (const ext of ['png', 'json']) {
      const p = path.join(debugDir, `${tag}-full-${st}.${ext}`);
      if (fs.existsSync(p)) fs.rmSync(p, { force: true });
    }
    const d = path.join(debugDir, `${tag}-tiles-${st}`);
    if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
    const prof = path.join(debugDir, `${tag}-pw-profile-${st}`);
    if (fs.existsSync(prof)) fs.rmSync(prof, { recursive: true, force: true });
  }
}

async function ensureDevServer(projectRoot, healthUrl, noAutoStart) {
  if (await urlReady(healthUrl, 4000)) {
    console.log('[map-cdp] dev server ready');
    return;
  }
  if (noAutoStart) throw new Error(`Dev server is not reachable at ${healthUrl}`);

  console.log('[map-cdp] dev server not found, starting Vite on 127.0.0.1:5173');
  const vite = spawn('node', [
    'node_modules/vite/bin/vite.js',
    '--host', '127.0.0.1',
    '--port', '5173',
    '--strictPort',
    '--open=false',
  ], {
    cwd: projectRoot,
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  vite.unref();

  for (let i = 0; i < 30; i++) {
    await sleep(1000);
    if (await urlReady(healthUrl, 3000)) {
      await sleep(1500);
      console.log('[map-cdp] dev server started');
      return;
    }
  }
  throw new Error(`Vite did not become ready at ${healthUrl}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectRoot = process.cwd();
  const debugDir = path.join(projectRoot, 'debug');
  fs.mkdirSync(debugDir, { recursive: true });

  const urlBase = args.urlBase || 'http://127.0.0.1:5173/';
  const tag = args.tag || 'maprt';
  const mapWidthArg = Number(args.mapWidth || 6000);
  const mapHeightArg = Number(args.mapHeight || 3472);
  const tileWidth = Number(args.tileWidth || 1536);
  const tileHeight = Number(args.tileHeight || 864);
  const skipBuild = args.skipBuild === '1' || args.skipBuild === 'true';
  const noAutoStartDev = args.noAutoStartDev === '1' || args.noAutoStartDev === 'true';

  if (!skipBuild) {
    console.log('[map-cdp] build start');
    const code = await runCommand(npmExe(), ['run', 'build'], projectRoot);
    if (code !== 0) throw new Error('Build failed. Stop map verification run.');
    console.log('[map-cdp] build ok');
  }

  await ensureDevServer(projectRoot, 'http://127.0.0.1:5173/?hudtest=1', noAutoStartDev);

  const stamp = formatStamp();
  const tileDir = path.join(debugDir, `${tag}-tiles-${stamp}`);
  const outPng = path.join(debugDir, `${tag}-full-${stamp}.png`);
  const outJson = path.join(debugDir, `${tag}-full-${stamp}.json`);
  const profileDir = path.join(debugDir, `${tag}-pw-profile-${stamp}`);
  fs.mkdirSync(tileDir, { recursive: true });
  fs.mkdirSync(profileDir, { recursive: true });

  const browserExe = resolveBrowserPath();
  console.log('[map-cdp] browser:', browserExe);

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: browserExe,
      args: [
        '--disable-gpu',
        '--hide-scrollbars',
        '--no-first-run',
        '--no-default-browser-check',
      ],
    });

    const context = await browser.newContext({
      viewport: { width: tileWidth, height: tileHeight },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    const targetUrl = buildCaptureUrl(urlBase);
    console.log('[map-cdp] navigate:', targetUrl);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    await page.waitForFunction(() => {
      const g = window.__game;
      const keys = [
        'TPE2CentralHallV3Scene',
        'TPE2NorthDZoneV3Scene',
        'TPE2SouthCZoneV3Scene',
        'TPE2LobbyV2Scene',
        'TPE2LobbyScene'
      ];
      const s = keys.map(k => g?.scene?.getScene?.(k)).find(v => v && v.sys?.isActive?.());
      return !!(g && s && window.__tilecapSetCamera);
    }, { timeout: 60000 });

    // Wait until scene transition visuals settle; this avoids early-tile tone seams.
    await page.waitForFunction(() => {
      const g = window.__game;
      const keys = [
        'TPE2CentralHallV3Scene',
        'TPE2NorthDZoneV3Scene',
        'TPE2SouthCZoneV3Scene',
        'TPE2LobbyV2Scene',
        'TPE2LobbyScene'
      ];
      const s = keys.map(k => g?.scene?.getScene?.(k)).find(v => v && v.sys?.isActive?.());
      const cam = s?.cameras?.main;
      if (!s || !cam || !s.sys?.isActive?.()) return false;
      const overlay = document.getElementById('scene-loading-overlay');
      const overlayOpen = overlay?.getAttribute('data-open') === '1';
      const fadeRunning = !!cam.fadeEffect?.isRunning;
      const alpha = Number(cam.alpha ?? 1);
      const alphaReady = Math.abs(alpha - 1) < 0.0001;
      return !overlayOpen && !fadeRunning && alphaReady;
    }, { timeout: 60000 });
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))));
    await page.waitForTimeout(220);

    const ready = await page.evaluate(() => {
      const g = window.__game;
      const keys = [
        'TPE2CentralHallV3Scene',
        'TPE2NorthDZoneV3Scene',
        'TPE2SouthCZoneV3Scene',
        'TPE2LobbyV2Scene',
        'TPE2LobbyScene'
      ];
      const s = keys.map(k => g?.scene?.getScene?.(k)).find(v => v && v.sys?.isActive?.());
      const worldW = Number(s?.worldW || window.__tilecapInfo?.worldW || 0);
      const worldH = Number(s?.worldH || window.__tilecapInfo?.worldH || 0);
      const activeKey = s?.scene?.key || '';
      return { worldW, worldH, activeKey };
    });
    console.log('[map-cdp] active scene:', detectScene(ready));

    const ww = mapWidthArg || Number(ready.worldW || 6000);
    const wh = mapHeightArg || Number(ready.worldH || 3472);
    const xs = getCoverPositions(ww, tileWidth);
    const ys = getCoverPositions(wh, tileHeight);
    const total = xs.length * ys.length;
    console.log(`[map-cdp] tiles: ${xs.length}x${ys.length} = ${total}`);

    let idx = 0;
    for (const y of ys) {
      for (const x of xs) {
        idx++;
        const shotPath = path.join(tileDir, `map-tile-x${x}-y${y}.png`);
        console.log(`[map-cdp] capture ${idx}/${total} x=${x} y=${y}`);
        await page.evaluate(({ cx, cy }) => {
          const fn = window.__tilecapSetCamera;
          if (typeof fn !== 'function') return { ok: false, why: 'no-tilecap-fn' };
          return fn(cx, cy);
        }, { cx: x, cy: y });
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true)))));
        await page.waitForTimeout(90);
        await page.screenshot({ path: shotPath, fullPage: false });
      }
    }

    await context.close();
    await browser.close();
    browser = null;

    console.log('[map-cdp] stitch+verify start');
    const stitch = spawn('node', [path.join(projectRoot, 'scripts', 'stitch-mapshot.cjs'),
      '--inputDir', tileDir,
      '--out', outPng,
      '--report', outJson,
      '--mapWidth', String(ww),
      '--mapHeight', String(wh),
    ], { cwd: projectRoot, stdio: 'inherit', windowsHide: true });
    const stitchCode = await new Promise((r) => stitch.on('close', r));
    if (stitchCode !== 0) throw new Error('Map stitch/verify failed.');

    const latestPng = path.join(debugDir, `${tag}-full-latest.png`);
    const latestJson = path.join(debugDir, `${tag}-full-latest.json`);
    fs.copyFileSync(outPng, latestPng);
    fs.copyFileSync(outJson, latestJson);
    pruneKeep1(debugDir, tag);

    console.log('[map-cdp] PASS');
    console.log('[map-cdp] output:', latestPng);
    console.log('[map-cdp] report:', latestJson);
    console.log('[map-cdp] tiles:', tileDir);
  } finally {
    try { if (browser) await browser.close(); } catch {}
    if (fs.existsSync(profileDir)) {
      try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch {}
    }
  }
}

main().catch((err) => {
  console.error('[map-cdp] FAIL:', err?.message || err);
  process.exit(1);
});
