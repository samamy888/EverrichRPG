import * as Phaser from 'phaser';
import { CONFIG } from '../../config';

function isHudProbeMode() {
  try {
    const u = new URL(window.location.href);
    return u.searchParams.get('hudprobe') === '1' || u.searchParams.get('hudtest') === '1' || (navigator as any).webdriver === true;
  } catch {
    return false;
  }
}

function drawProbeBlueFrame(scene: any, w: number, h: number) {
  if (!isHudProbeMode()) return;
  const innerW = Math.max(1, w - 6);
  const innerH = Math.max(1, h - 6);
  scene.minimapGfx.lineStyle(2, 0x336699, 1).strokeRect(3, 3, innerW, innerH);
  scene.minimapGfx.fillStyle(0x336699, 0.35).fillRect(4, 4, Math.max(1, w - 8), 3);
}

// 將 UIOverlay 之迷你地圖相關行為拆出，避免主檔案過大

export function ensureMinimap(scene: any) {
  if (!scene.shouldShowMinimap()) {
    try { scene.minimapBox?.setVisible(false); scene.minimapGfx?.setVisible(false); scene.minimapGfx?.clear(); } catch {}
    return;
  }
  if (!scene.minimapBox) {
    const { w } = scene.getViewSize();
    const pad = Math.max(6, Number(CONFIG.ui.minimap.pad) || 0);
    // 初始建立時先用 1x1，實際尺寸在 renderMinimap 計算後設定，避免看到固定灰底
    scene.minimapBox = scene.add.rectangle(w - 1 - pad, scene.hintBox.height + pad, 1, 1, 0x000000, CONFIG.ui.minimap.backgroundAlpha)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(1200)
      .setStrokeStyle(1, 0x000000, 1);
    // 將繪圖層設為比影像更高的深度，讓外框可見
    scene.minimapGfx = scene.add.graphics().setScrollFactor(0).setDepth(1202);
    scene.minimapContentW = 1; scene.minimapContentH = 1;
  }
}

export function positionMinimap(scene: any) {
  if (!scene.minimapBox || !scene.minimapGfx) return;
  const show = scene.shouldShowMinimap();
  scene.minimapBox.setVisible(show); scene.minimapGfx.setVisible(show);
  if (!show) return;
  const { w } = scene.getViewSize();
  const pad = Math.max(6, Number(CONFIG.ui.minimap.pad) || 0);
  const cw = Math.max(1, Math.round(scene.minimapContentW || 1));
  const ch = Math.max(1, Math.round(scene.minimapContentH || 1));
  scene.minimapBox.setPosition(w - cw - pad, scene.hintBox.height + pad).setSize(cw, ch);
  scene.minimapGfx.setPosition(w - cw - pad, scene.hintBox.height + pad);
}

export function renderMinimap(scene: any) {
  const dbgOn = (() => { try { const u = new URL(window.location.href); return u.searchParams.get('debugMinimap') === '1' || (window as any).__debugMinimap === true; } catch { return false; } })();
  const log = (...args: any[]) => { try { if (dbgOn) console.log('[minimap]', ...args); } catch {} };
  ensureMinimap(scene);
  if (!scene.shouldShowMinimap() || !scene.minimapGfx || !scene.minimapBox) return;
  const activeScenes = scene.game.scene.getScenes(true).filter((s: any) => s.scene?.key !== 'UIOverlay');
  let top = activeScenes.length ? (activeScenes[activeScenes.length - 1] as any) : null;
  // 若 UIOverlay 先記錄了目標場景 key，優先以此尋找場景參考
  try {
    const savedKey = (scene as any).currentTopKey || (window as any).__minimapTopKey;
    if ((!top || !top.scene?.key) && savedKey) {
      const ref = scene.game.scene.getScene(savedKey);
      if (ref) top = ref as any;
    }
  } catch {}
  let layer = top?.layer as Phaser.Tilemaps.TilemapLayer;
  let imgKey: string | undefined = (top as any)?.__minimapTex;
  let imgW: number | undefined = (top as any)?.__minimapW;
  let imgH: number | undefined = (top as any)?.__minimapH;
  if (!top) {
    // Fallback to last known minimap data from window when no active content scene
    try {
      const last = (window as any).__minimapLast as { key: string; w: number; h: number } | undefined;
      if (last) { imgKey = last.key; imgW = last.w; imgH = last.h; }
    } catch {}
    if (!imgKey || !imgW || !imgH) {
      log('no active top scene and no fallback; retry later');
      setTimeout(() => { try { (window as any).__rerenderMinimap?.(); } catch {} }, 32);
      return;
    }
    log('using fallback minimapLast');
    // 在使用備援時再安排數次重繪嘗試，等待新場景就緒
    try {
      setTimeout(() => { try { (window as any).__rerenderMinimap?.(); } catch {} }, 0);
      setTimeout(() => { try { (window as any).__rerenderMinimap?.(); } catch {} }, 64);
      setTimeout(() => { try { (window as any).__rerenderMinimap?.(); } catch {} }, 120);
    } catch {}
  }
  // 若有 active top 但其縮圖資訊尚未就緒，嘗試使用備援
  if ((!imgKey || !imgW || !imgH) && (window as any).__minimapLast) {
    try {
      const last = (window as any).__minimapLast as { key: string; w: number; h: number };
      imgKey = imgKey || last.key; imgW = imgW || last.w; imgH = imgH || last.h;
      if (dbgOn) try { console.debug('[minimap] using last fallback with active top'); } catch {}
    } catch {}
  }
  // If scene provides an image-based map, render true thumbnail
  const texMgr: any = (scene as any).textures;
  const worldW = Math.max(1, Number((top as any)?.__minimapW) || 1);
  const worldH = Math.max(1, Number((top as any)?.__minimapH) || 1);
  const natW = Math.max(1, Number((top as any)?.__minimapNatW) || Number(imgW) || worldW);
  const natH = Math.max(1, Number((top as any)?.__minimapNatH) || Number(imgH) || worldH);
  const imgReady = !!(imgKey && natW && natH && texMgr?.exists?.(imgKey));
  log('render', { topKey: top?.scene?.key, hasLayer: !!layer, imgKey, imgW, imgH, imgReady, worldW, worldH });
  // If we have image info but texture not yet in cache, keep previous image visible and prep for swap
  if (!imgReady && imgKey && natW && natH) {
    const maxW = CONFIG.ui.minimap.maxWidth;
    const maxH = CONFIG.ui.minimap.maxHeight;
    const s = Math.min(maxW / natW, maxH / natH);
    const contentW = Math.max(1, Math.round(natW * s));
    const contentH = Math.max(1, Math.round(natH * s));
    const { w } = scene.getViewSize();
    const pad = Math.max(6, Number(CONFIG.ui.minimap.pad) || 0);
    const posX = w - contentW - pad;
    const posY = scene.hintBox.height + pad;
    try { scene.minimapBox.setPosition(posX, posY).setSize(contentW, contentH).setVisible(true); } catch {}
    try { scene.minimapGfx.setPosition(posX, posY).setVisible(true).clear(); } catch {}
    if (scene.minimapImg) {
      try { scene.minimapImg.setPosition(posX, posY).setDisplaySize(contentW, contentH).setVisible(true); } catch {}
    }
    // 在影像尚未 ready 時也先繪製視野框與玩家點（以世界比例對應縮圖尺寸）
    try {
      const cam: any = top?.cameras?.main;
      const cw = (typeof cam.worldView?.width === 'number' ? cam.worldView.width : cam.width || 0);
      const ch = (typeof cam.worldView?.height === 'number' ? cam.worldView.height : cam.height || 0);
      const cx = (typeof cam.worldView?.x === 'number' ? cam.worldView.x : cam.scrollX || 0);
      const cy = (typeof cam.worldView?.y === 'number' ? cam.worldView.y : cam.scrollY || 0);
      const vw = Math.max(1, (cw / worldW) * contentW);
      const vh = Math.max(1, (ch / worldH) * contentH);
      const vx = Math.max(0, (cx / worldW) * contentW);
      const vy = Math.max(0, (cy / worldH) * contentH);
      scene.minimapGfx.lineStyle(1, 0xffcc00, 1);
      scene.minimapGfx.strokeRect(vx, vy, Math.max(1, vw), Math.max(1, vh));
      log('camRect(pendingTex)', { vx, vy, vw, vh, worldW, worldH, contentW, contentH });
    } catch {}
    try {
      const player: any = (top as any)?.player;
      let worldX = Number(player?.x), worldY = Number(player?.y);
      if (!isFinite(worldX) || !isFinite(worldY)) {
        const last: any = (window as any).__playerLast;
        if (last && isFinite(last.x) && isFinite(last.y)) { worldX = last.x; worldY = last.y; } else { worldX = 0; worldY = 0; }
      }
      let px = Math.max(0, Math.min(worldW, worldX)) / worldW * contentW;
      let py = Math.max(0, Math.min(worldH, worldY)) / worldH * contentH;
      scene.minimapGfx.fillStyle(0x000000, 1).fillRect(Math.round(px) - 1, Math.round(py) - 1, 2, 2);
      log('dot(pendingTex)', { worldX, worldY, px, py, worldW, worldH, contentW, contentH });
    } catch {}
    try {
      const ev = (texMgr && (texMgr.events || texMgr));
      ev?.once?.('addtexture', (key: string) => {
        if (key === imgKey) {
          try { scene.minimapImg?.setTexture(imgKey).setPosition(posX, posY).setDisplaySize(contentW, contentH).setVisible(true); } catch {}
          try { (window as any).__rerenderMinimap?.(); } catch {}
        }
      });
    } catch {}
    // Try again shortly
    try { setTimeout(() => { try { (window as any).__rerenderMinimap?.(); } catch {} }, 32); } catch {}
    return;
  }
  if (imgReady) {
    const maxW = CONFIG.ui.minimap.maxWidth;
    const maxH = CONFIG.ui.minimap.maxHeight;
    const s = Math.min(maxW / natW, maxH / natH);
    const contentW = Math.max(1, Math.round(natW * s));
    const contentH = Math.max(1, Math.round(natH * s));
    const { w } = scene.getViewSize();
    const pad = Math.max(6, Number(CONFIG.ui.minimap.pad) || 0);
    const posX = w - contentW - pad;
    const posY = scene.hintBox.height + pad;
    scene.minimapBox.setPosition(posX, posY).setSize(contentW, contentH).setVisible(true);
    scene.minimapGfx.setPosition(posX, posY).setVisible(true).clear();
    scene.minimapContentW = contentW; scene.minimapContentH = contentH;
    // 外框（黑邊）
    try {
      scene.minimapGfx.fillStyle(0x0b1019, 0.18).fillRect(0, 0, contentW, contentH);
      scene.minimapGfx.lineStyle(1, 0xc59b53, 0.95).strokeRect(0.5, 0.5, contentW - 1, contentH - 1);
      scene.minimapGfx.lineStyle(1, 0x3e4a63, 0.95).strokeRect(1.5, 1.5, contentW - 3, contentH - 3);
      drawProbeBlueFrame(scene, contentW, contentH);
    } catch {}
    // Prepare or update minimap image sprite
    if (!scene.minimapImg) {
      try { scene.minimapImg = scene.add.image(posX, posY, imgKey).setOrigin(0, 0).setScrollFactor(0).setDepth(1201); } catch {}
    }
    try {
      if (scene.minimapImg.texture?.key !== imgKey) scene.minimapImg.setTexture(imgKey);
      scene.minimapImg.setPosition(posX, posY).setDisplaySize(contentW, contentH).setVisible(true).setDepth(1201);
    log('image mode', { posX, posY, contentW, contentH, s });
    } catch {}
    // Overlays: player dot and camera viewport
    try {
      const cam: any = top?.cameras?.main;
      const cw = (typeof cam.worldView?.width === 'number' ? cam.worldView.width : cam.width || 0);
      const ch = (typeof cam.worldView?.height === 'number' ? cam.worldView.height : cam.height || 0);
      const cx = (typeof cam.worldView?.x === 'number' ? cam.worldView.x : cam.scrollX || 0);
      const cy = (typeof cam.worldView?.y === 'number' ? cam.worldView.y : cam.scrollY || 0);
      const vw = Math.max(1, (cw / worldW) * contentW);
      const vh = Math.max(1, (ch / worldH) * contentH);
      const vx = Math.max(0, (cx / worldW) * contentW);
      const vy = Math.max(0, (cy / worldH) * contentH);
      scene.minimapGfx.lineStyle(1, 0xffcc00, 1);
      scene.minimapGfx.strokeRect(vx, vy, Math.max(1, vw), Math.max(1, vh));
      log('camRect', { vx, vy, vw, vh, worldW, worldH, contentW, contentH });
    } catch {}
    try {
      let worldX = Number((top as any)?.player?.x);
      let worldY = Number((top as any)?.player?.y);
      if (!isFinite(worldX) || !isFinite(worldY)) {
        const last: any = (window as any).__playerLast;
        if (last && isFinite(last.x) && isFinite(last.y) && isFinite(last.w) && isFinite(last.h)) {
          const mapScale = (CONFIG as any)?.maps?.tpeScale || 1;
          const ls = Number(last.scale) || mapScale;
          worldX = last.x; worldY = last.y;
        } else { worldX = 0; worldY = 0; }
      }
      let px = Math.max(0, Math.min(worldW, worldX)) / worldW * contentW;
      let py = Math.max(0, Math.min(worldH, worldY)) / worldH * contentH;
      if (!isFinite(px) || !isFinite(py)) { px = 0; py = 0; }
      scene.minimapGfx.fillStyle(0x000000, 1);
      scene.minimapGfx.fillRect(Math.round(px) - 1, Math.round(py) - 1, 2, 2);
      log('dot', { worldX, worldY, px, py, worldW, worldH, contentW, contentH });
    } catch {}
    return;
  }
  // If neither image nor layer is ready, keep last content and retry later
  if (!layer) {
    if (dbgOn) try { console.debug('[minimap] neither image nor layer ready; keep previous and retry'); } catch {}
    try { (window as any).__rerenderMinimap?.(); } catch {}
    return;
  }
  // Tile-based fallback: hide image and draw tiles（使用等比縮放，避免背景灰底外溢）
  try { scene.minimapImg?.setVisible(false); } catch {}
  log('tile mode');
  if (!layer) { scene.minimapGfx.clear(); return; }
  const map: any = layer.tilemap;
  const tw = map.tileWidth || 16;
  const th = map.tileHeight || 16;
  const mw = map.width || (layer.layer?.width ?? 0);
  const mh = map.height || (layer.layer?.height ?? 0);
  if (!mw || !mh) { scene.minimapGfx.clear(); return; }
  const maxW = CONFIG.ui.minimap.maxWidth;
  const maxH = CONFIG.ui.minimap.maxHeight;
  const s = Math.min(maxW / mw, maxH / mh); // 等比縮放
  const sX = s, sY = s;
  scene.minimapScaleX = sX; scene.minimapScaleY = sY;
  try {
    const contentW = Math.max(1, Math.round(mw * sX));
    const contentH = Math.max(1, Math.round(mh * sY));
    const { w } = scene.getViewSize();
    const pad = Math.max(6, Number(CONFIG.ui.minimap.pad) || 0);
    const posX = w - contentW - pad;
    const posY = scene.hintBox.height + pad;
    scene.minimapBox.setPosition(posX, posY).setSize(contentW, contentH);
    scene.minimapGfx.setPosition(posX, posY);
    scene.minimapContentW = contentW; scene.minimapContentH = contentH;
  } catch {}
  scene.minimapGfx.clear();
  // 背景：以 collides 畫出可走/不可走
  for (let y = 0; y < mh; y++) {
    for (let x = 0; x < mw; x++) {
      const tile = layer.getTileAt(x, y);
      const collides = !!tile && (tile.collides === true);
      scene.minimapGfx.fillStyle(collides ? 0x2a4a6a : 0xcfe8ff, collides ? 0.95 : 0.95);
      scene.minimapGfx.fillRect(x * sX, y * sY, Math.max(1, sX), Math.max(1, sY));
    }
  }
  // 外框（黑邊）
  try {
    const bw = Math.round(mw * sX);
    const bh = Math.round(mh * sY);
    scene.minimapGfx.fillStyle(0x0b1019, 0.18).fillRect(0, 0, bw, bh);
    scene.minimapGfx.lineStyle(1, 0xc59b53, 0.95).strokeRect(0.5, 0.5, bw - 1, bh - 1);
    scene.minimapGfx.lineStyle(1, 0x3e4a63, 0.95).strokeRect(1.5, 1.5, bw - 3, bh - 3);
    drawProbeBlueFrame(scene, bw, bh);
  } catch {}
  // 商店門（藍）
  try {
    const doors: any[] = (top as any)?.doors || [];
    if (doors && doors.length) {
      scene.minimapGfx.fillStyle(0x3399ff, 1);
      for (const d of doors) {
        const dx = ((d?.world?.x ?? 0) / tw) * sX;
        const dy = ((d?.world?.y ?? 0) / th) * sY;
        scene.minimapGfx.fillRect(Math.round(dx) - 1, Math.round(dy) - 1, Math.max(2, sX), Math.max(2, sY));
      }
    }
  } catch {}
  // 旅客（黑）可切換
  const crowdToggle = (window as any).__minimapCrowd !== false;
  if (crowdToggle) {
    try {
      const drawGroup = (grp: any) => {
        if (!grp) return;
        let list: any[] | undefined;
        try { list = grp.getChildren?.(); } catch {}
        if (!list || !list.length) {
          try { const acc: any[] = []; grp.children?.each?.((o: any) => acc.push(o)); list = acc; } catch {}
        }
        if (!list) return;
        scene.minimapGfx.fillStyle(0x000000, 1);
        for (const o of list) {
          const ox = (Number(o?.x) / tw) * sX;
          const oy = (Number(o?.y) / th) * sY;
          scene.minimapGfx.fillRect(Math.round(ox) - 1, Math.round(oy) - 1, Math.max(2, sX), Math.max(2, sY));
        }
      };
      const crowds: any[] = (top as any)?.crowds || [];
      if (crowds && crowds.length) crowds.forEach(drawGroup);
      const hallGrp: any = (top as any)?.crowd; if (hallGrp) drawGroup(hallGrp);
    } catch {}
  }
  // 玩家（黑點）＋ 視野框（黃）
  try {
    let wx = Number((top as any)?.player?.x);
    let wy = Number((top as any)?.player?.y);
    if (!isFinite(wx) || !isFinite(wy)) {
      const last: any = (window as any).__playerLast;
      if (last && isFinite(last.x) && isFinite(last.y)) { wx = last.x; wy = last.y; } else { wx = 0; wy = 0; }
    }
    const px = wx / tw;
    const py = wy / th;
    scene.minimapGfx.fillStyle(0x000000, 1);
    scene.minimapGfx.fillRect(px * sX - 1, py * sY - 1, Math.max(2, sX), Math.max(2, sY));
  } catch {}
  try {
    const cam: any = top?.cameras?.main;
    if (cam) {
      const vx = (typeof cam.worldView?.x === 'number' ? cam.worldView.x : cam.scrollX || 0) / tw;
      const vy = (typeof cam.worldView?.y === 'number' ? cam.worldView.y : cam.scrollY || 0) / th;
      const vw = (typeof cam.worldView?.width === 'number' ? cam.worldView.width : cam.width || 0) / tw;
      const vh = (typeof cam.worldView?.height === 'number' ? cam.worldView.height : cam.height || 0) / th;
      scene.minimapGfx.lineStyle(1, 0xffcc00, 1);
      scene.minimapGfx.strokeRect(vx * sX, vy * sY, Math.max(1, vw * sX), Math.max(1, vh * sY));
    }
  } catch {}
}
