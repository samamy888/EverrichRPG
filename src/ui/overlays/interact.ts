import { CONFIG } from '../../config';

export function renderInteract(scene: any) {
  // Do not show when dialog/listing/basket is open
  if (scene.dialogOpen || scene.listingOpen || scene.basketOpen) {
    try { scene.interactBox?.clear(); scene.interactBox?.setVisible(false); } catch {}
    try { scene.interactRows?.forEach((r: any) => { try { r.destroy(); } catch {} }); } catch {}
    scene.interactRows = [];
    return;
  }
  const open = !!scene.registry.get('interactOpen');
  const opts: string[] = (scene.registry.get('interactOptions') as any[]) || [];
  const playerPos = (scene.registry.get('playerPos') as { x: number; y: number } | undefined);
  if (!open || !opts.length || !playerPos) {
    try { scene.interactBox?.clear(); scene.interactBox?.setVisible(false); } catch {}
    try { scene.interactRows?.forEach((r: any) => { try { r.destroy(); } catch {} }); } catch {}
    scene.interactRows = [];
    return;
  }
  const FS = CONFIG.ui.small;
  if (!scene.interactMeasure) { scene.interactMeasure = scene.add.text(-9999, -9999, '', { fontSize: `${FS}px`, color: '#e6f0ff', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' }).setVisible(false).setScrollFactor(0); }
  else { const cur = scene.interactMeasure.style.fontSize as any; if (cur !== `${FS}px`) scene.interactMeasure.setFontSize(FS); }
  let maxW = 0; const pad = 6; const gap = 2;
  for (const s of opts) { scene.interactMeasure!.setText(s); maxW = Math.max(maxW, Math.ceil(scene.interactMeasure!.width)); }
  const panelW = maxW + pad * 2; const panelH = pad * 2 + opts.length * (FS + gap);
  const active = scene.game.scene.getScenes(true).filter((s: any) => s.scene?.key !== 'UIOverlay');
  const top: any = active[active.length - 1] as any;
  const cam: any = top?.cameras?.main;
  let x = 8, y = 8;
  if (cam) {
    const baseX = (typeof cam.worldView?.x === 'number') ? cam.worldView.x : (cam.scrollX || 0);
    const baseY = (typeof cam.worldView?.y === 'number') ? cam.worldView.y : (cam.scrollY || 0);
    const z = cam.zoom || 1;
    const screenX = (playerPos.x - baseX) * z; const screenY = (playerPos.y - baseY) * z;
    x = Math.round(screenX + 10); y = Math.round(screenY - panelH + 4);
  }
  if (!scene.interactBox) scene.interactBox = scene.add.graphics().setDepth(1600).setScrollFactor(0);
  const g = scene.interactBox; g.clear().fillStyle(0x0b111a, 0.85).fillRect(x, y, panelW, panelH).lineStyle(1, 0x4a5668, 1).strokeRect(x + 0.5, y + 0.5, panelW - 1, panelH - 1).setVisible(true);
  try { scene.interactRows?.forEach((r: any) => { try { r.destroy(); } catch {} }); } catch {}
  scene.interactRows = [];
  for (let i = 0; i < opts.length; i++) {
    const row = scene.add.text(x + pad, y + pad + i * (FS + gap), opts[i], { fontSize: `${FS}px`, color: '#e6f0ff', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' }).setScrollFactor(0).setDepth(1601);
    scene.interactRows.push(row);
  }
}

