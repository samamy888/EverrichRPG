import Phaser from 'phaser';
import { CONFIG } from '../../config';

// 將 UIOverlay 之迷你地圖相關行為拆出，避免主檔案過大

export function ensureMinimap(scene: any) {
  if (!scene.shouldShowMinimap()) {
    try { scene.minimapBox?.setVisible(false); scene.minimapGfx?.setVisible(false); scene.minimapGfx?.clear(); } catch {}
    return;
  }
  if (!scene.minimapBox) {
    const { w } = scene.getViewSize();
    const pad = CONFIG.ui.minimap.pad;
    const boxW = CONFIG.ui.minimap.maxWidth;
    const boxH = CONFIG.ui.minimap.maxHeight;
    scene.minimapBox = scene.add.rectangle(w - boxW - pad, scene.hintBox.height + pad, boxW, boxH, 0x000000, CONFIG.ui.minimap.backgroundAlpha)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(1200);
    scene.minimapGfx = scene.add.graphics().setScrollFactor(0).setDepth(1201);
  }
}

export function positionMinimap(scene: any) {
  if (!scene.minimapBox || !scene.minimapGfx) return;
  const show = scene.shouldShowMinimap();
  scene.minimapBox.setVisible(show); scene.minimapGfx.setVisible(show);
  if (!show) return;
  const { w } = scene.getViewSize();
  const pad = CONFIG.ui.minimap.pad;
  const boxW = CONFIG.ui.minimap.maxWidth;
  const boxH = CONFIG.ui.minimap.maxHeight;
  scene.minimapBox.setPosition(w - boxW - pad, scene.hintBox.height + pad).setSize(boxW, boxH);
  scene.minimapGfx.setPosition(w - boxW - pad, scene.hintBox.height + pad);
}

export function renderMinimap(scene: any) {
  const dbgOn = (() => { try { const u = new URL(window.location.href); return u.searchParams.get('debugMinimap') === '1' || (window as any).__debugMinimap === true; } catch { return false; } })();
  ensureMinimap(scene);
  if (!scene.shouldShowMinimap() || !scene.minimapGfx || !scene.minimapBox) return;
  const activeScenes = scene.game.scene.getScenes(true).filter((s: any) => s.scene?.key !== 'UIOverlay');
  const top = activeScenes.length ? (activeScenes[activeScenes.length - 1] as any) : null;
  const dbgOn = (() => { try { const u = new URL(window.location.href); return u.searchParams.get('debugMinimap') === '1' || (window as any).__debugMinimap === true; } catch { return false; } })();
  if (!top) {
    if (dbgOn) try { console.debug('[minimap] no active top scene; retry later'); } catch {}
    try { (window as any).__rerenderMinimap?.(); } catch {}
    return; // keep previous minimap content visible
  }
  const layer = top?.layer as Phaser.Tilemaps.TilemapLayer;
  const imgKey: string | undefined = (top as any)?.__minimapTex;
  const imgW: number | undefined = (top as any)?.__minimapW;
  const imgH: number | undefined = (top as any)?.__minimapH;
  // If scene provides an image-based map, render true thumbnail
  const texMgr: any = (scene as any).textures;
  const imgReady = !!(imgKey && imgW && imgH && texMgr?.exists?.(imgKey));
  if (dbgOn) {
    try { console.debug('[minimap] render', { topKey: top?.scene?.key, hasLayer: !!layer, imgKey, imgW, imgH, imgReady }); } catch {}
  }
  if (imgReady) {
    const maxW = CONFIG.ui.minimap.maxWidth;
    const maxH = CONFIG.ui.minimap.maxHeight;
    const s = Math.min(maxW / imgW, maxH / imgH);
    const contentW = Math.max(1, Math.round(imgW * s));
    const contentH = Math.max(1, Math.round(imgH * s));
    const { w } = scene.getViewSize();
    const pad = CONFIG.ui.minimap.pad;
    const posX = w - contentW - pad;
    const posY = scene.hintBox.height + pad;
    scene.minimapBox.setPosition(posX, posY).setSize(contentW, contentH).setVisible(true);
    scene.minimapGfx.setPosition(posX, posY).setVisible(true).clear();
    // Prepare or update minimap image sprite
    if (!scene.minimapImg) {
      try { scene.minimapImg = scene.add.image(posX, posY, imgKey).setOrigin(0, 0).setScrollFactor(0).setDepth(1201); } catch {}
    }
    try {
      if (scene.minimapImg.texture?.key !== imgKey) scene.minimapImg.setTexture(imgKey);
      scene.minimapImg.setPosition(posX, posY).setDisplaySize(contentW, contentH).setVisible(true);
      if (dbgOn) try { console.debug('[minimap] image mode', { posX, posY, contentW, contentH, s }); } catch {}
    } catch {}
    // Overlays: player dot and camera viewport
    try {
      const cam: any = top?.cameras?.main;
      const vw = (typeof cam.worldView?.width === 'number' ? cam.worldView.width : cam.width || 0) * s;
      const vh = (typeof cam.worldView?.height === 'number' ? cam.worldView.height : cam.height || 0) * s;
      const vx = (typeof cam.worldView?.x === 'number' ? cam.worldView.x : cam.scrollX || 0) * s;
      const vy = (typeof cam.worldView?.y === 'number' ? cam.worldView.y : cam.scrollY || 0) * s;
      scene.minimapGfx.lineStyle(1, 0xffcc00, 1);
      scene.minimapGfx.strokeRect(vx, vy, Math.max(1, vw), Math.max(1, vh));
    } catch {}
    try {
      const px = Math.max(0, Math.min(imgW, Number(top?.player?.x || 0))) * s;
      const py = Math.max(0, Math.min(imgH, Number(top?.player?.y || 0))) * s;
      scene.minimapGfx.fillStyle(0x000000, 1);
      scene.minimapGfx.fillRect(Math.round(px) - 1, Math.round(py) - 1, 2, 2);
    } catch {}
    return;
  }
  // If neither image nor layer is ready, keep last content and retry later
  if (!layer) {
    if (dbgOn) try { console.debug('[minimap] neither image nor layer ready; keep previous and retry'); } catch {}
    try { (window as any).__rerenderMinimap?.(); } catch {}
    return;
  }
  // Tile-based fallback: hide image and draw tiles
  try { scene.minimapImg?.setVisible(false); } catch {}
  if (dbgOn) try { console.debug('[minimap] tile mode'); } catch {}
  if (!layer) { scene.minimapGfx.clear(); return; }
  const map: any = layer.tilemap;
  const tw = map.tileWidth || 16;
  const th = map.tileHeight || 16;
  const mw = map.width || (layer.layer?.width ?? 0);
  const mh = map.height || (layer.layer?.height ?? 0);
  if (!mw || !mh) { scene.minimapGfx.clear(); return; }
  const desiredSX = Math.max(1, CONFIG.ui.minimap.tileScaleX || 1);
  const desiredSY = Math.max(1, CONFIG.ui.minimap.tileScaleY || 1);
  const sX = Math.min(desiredSX, CONFIG.ui.minimap.maxWidth / mw);
  const sY = Math.min(desiredSY, CONFIG.ui.minimap.maxHeight / mh);
  scene.minimapScaleX = sX;
  scene.minimapScaleY = sY;
  try {
    const contentW = Math.max(1, Math.round(mw * sX));
    const contentH = Math.max(1, Math.round(mh * sY));
    const { w } = scene.getViewSize();
    const pad = CONFIG.ui.minimap.pad;
    const posX = w - contentW - pad;
    const posY = scene.hintBox.height + pad;
    scene.minimapBox.setPosition(posX, posY).setSize(contentW, contentH);
    scene.minimapGfx.setPosition(posX, posY);
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
    const px = (top.player?.x ?? 0) / tw;
    const py = (top.player?.y ?? 0) / th;
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
