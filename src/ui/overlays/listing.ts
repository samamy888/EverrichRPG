import { CONFIG } from '../../config';
import { t } from '../../i18n';

export function renderListing(scene: any) {
  const open = !!scene.registry.get('listingOpen');
  scene.listingOpen = open;
  scene.updateInputLock?.();
  const items: { name: string; price: number; id: string }[] = (scene.registry.get('listingItems') as any[]) || [];
  const selected: number = (scene.registry.get('listingSelected') as number) ?? 0;
  const playerPos = (scene.registry.get('playerPos') as { x: number; y: number } | undefined);

  try { scene.listingRows?.forEach((r: any) => { try { r.destroy(); } catch {} }); } catch {}
  scene.listingRows = [];
  if (!open) { try { scene.listingBox?.destroy(); } catch {}; scene.listingBox = undefined; return; }

  const FS = CONFIG.ui.fontSize; const HUD = CONFIG.ui.hudHeight; const { w: viewW, h: viewH } = scene.getViewSize();
  const pad = 6;
  if (!scene.listingMeasure) {
    scene.listingMeasure = scene.add.text(-9999, -9999, '', { fontSize: `${FS}px`, color: '#e6f0ff', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' }).setVisible(false).setScrollFactor(0);
  } else {
    const cur = scene.listingMeasure.style.fontSize as any; const want = `${FS}px`; if (cur !== want) scene.listingMeasure.setFontSize(FS);
  }
  let maxTextW = 0;
  const toMeasure: string[] = [String(t('store.listTitle') || '商品')];
  items.forEach((it, idx) => { const prefix = idx === selected ? '>' : ' '; const line = (it as any).id === '__exit' ? `${prefix} ${t('store.listExit') || '結束對話'}` : `${prefix} ${it.name}  $${it.price}`; toMeasure.push(line); });
  toMeasure.forEach(txt => { scene.listingMeasure!.setText(txt); maxTextW = Math.max(maxTextW, Math.ceil(scene.listingMeasure!.width)); });
  const minPanelW = Math.max(200, FS * 10);
  let panelW = Math.max(minPanelW, maxTextW + pad * 2);
  const h = Math.max(60, viewH - (HUD * 2) - pad * 2);

  let cam: any = null; try { cam = (scene.game.scene.getScene('StoreScene') as any)?.cameras?.main || null; } catch {}
  if (!cam) { const scenes = scene.game.scene.getScenes(true).filter((s: any) => s.scene?.key !== 'UIOverlay'); const guess = scenes.find((s: any) => s?.cameras?.main) || scenes[scenes.length - 1]; cam = (guess as any)?.cameras?.main || null; }
  let sx = viewW - panelW - pad; let sy = HUD + pad;
  if (cam && playerPos) {
    const baseX = (typeof cam.worldView?.x === 'number') ? cam.worldView.x : (cam.scrollX || 0);
    const baseY = (typeof cam.worldView?.y === 'number') ? cam.worldView.y : (cam.scrollY || 0);
    const screenX = (playerPos.x - baseX) * (cam.zoom || 1);
    const screenY = (playerPos.y - baseY) * (cam.zoom || 1);
    const offset = 12; sx = screenX + offset; sy = screenY - Math.floor(h / 2);
    if (sx + panelW + pad > viewW) sx = Math.max(pad, viewW - panelW - pad); if (sx < pad) sx = pad;
    const minY = HUD + pad; const maxY = viewH - HUD - h - pad; if (sy < minY) sy = minY; if (sy > maxY) sy = maxY;
  }

  if (!scene.listingBox) {
    const g = scene.add.graphics(); g.fillStyle(0x0b111a, 0.85); g.fillRect(sx, sy, panelW, h); g.lineStyle(1, 0x4a5668, 1); g.strokeRect(sx + 0.5, sy + 0.5, panelW - 1, h - 1); g.setDepth(1500).setScrollFactor(0); scene.listingBox = g;
  } else { scene.listingBox.clear().fillStyle(0x0b111a, 0.85).fillRect(sx, sy, panelW, h).lineStyle(1, 0x4a5668, 1).strokeRect(sx + 0.5, sy + 0.5, panelW - 1, h - 1).setScrollFactor(0).setDepth(1500); }

  const startX = sx + pad; let curY = sy + pad;
  const title = scene.add.text(startX, curY, t('store.listTitle') || '商品', { fontSize: `${FS}px`, color: '#e6f0ff', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' }).setDepth(1501).setScrollFactor(0);
  scene.listingRows.push(title); curY += (FS + 4);
  items.forEach((it, idx) => {
    const prefix = idx === selected ? '>' : ' ';
    const line = (it as any).id === '__exit' ? `${prefix} ${t('store.listExit') || '結束對話'}` : `${prefix} ${it.name}  $${it.price}`;
    const row = scene.add.text(startX, curY, line, { fontSize: `${FS}px`, color: idx === selected ? '#ffffff' : '#c0c8d0', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' }).setDepth(1501).setScrollFactor(0);
    scene.listingRows.push(row); curY += (scene.CONFIG?.ui?.lineStep ?? 14);
  });
  try { scene.scene.bringToTop(); } catch {}
}

