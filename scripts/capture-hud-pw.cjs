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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const browserPath = args.browser;
  const url = args.url;
  const outOff = args.outOff;
  const outOn = args.outOn;
  const width = Number(args.width || 1536);
  const height = Number(args.height || 864);
  const settleMs = Number(args.settleMs || 180);

  if (!browserPath || !url || !outOff || !outOn) {
    console.error('[hud-capture] missing required args: --browser --url --outOff --outOn');
    process.exit(2);
  }

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: browserPath,
      args: [
        '--disable-gpu',
        '--hide-scrollbars',
        '--no-first-run',
        '--no-default-browser-check',
      ],
    });

    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    await page.waitForFunction(() => {
      const g = window.__game;
      const sceneKeys = [
        'TPE2CentralHallV3Scene',
        'TPE2NorthDZoneV3Scene',
        'TPE2SouthCZoneV3Scene',
        'TPE2LobbyV2Scene',
        'TPE2LobbyScene'
      ];
      const scene = sceneKeys.map(k => g?.scene?.getScene?.(k)).find(s => s && s.sys?.isActive?.());
      const ui = g?.scene?.getScene?.('UIOverlay');
      if (!g || !scene || !scene.sys?.isActive?.()) return false;
      if (ui && !ui.sys?.isActive?.()) return false;
      const overlay = document.getElementById('scene-loading-overlay');
      const overlayOpen = overlay?.getAttribute('data-open') === '1';
      const cam = scene?.cameras?.main;
      const fadeRunning = !!cam?.fadeEffect?.isRunning;
      return !overlayOpen && !fadeRunning;
    }, { timeout: 60000 });

    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true)))));
    await page.waitForTimeout(settleMs);
    await page.screenshot({ path: outOff, fullPage: false });

    await page.mouse.click(Math.floor(width / 2), Math.floor(height / 2));
    await page.keyboard.press('c');
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))));
    await page.waitForTimeout(140);
    await page.screenshot({ path: outOn, fullPage: false });

    await context.close();
    await browser.close();
    browser = null;

    console.log(JSON.stringify({
      mode: 'hud-dual-capture',
      url,
      off: outOff,
      on: outOn,
      viewport: { width, height },
      passed: true,
    }, null, 2));
  } catch (err) {
    console.error('[hud-capture] FAIL:', err?.message || err);
    process.exit(1);
  } finally {
    try { if (browser) await browser.close(); } catch {}
  }
}

main();
