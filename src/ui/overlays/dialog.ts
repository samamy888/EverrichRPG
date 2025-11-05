import { CONFIG } from '../../config';
import { t } from '../../i18n';

export function renderDialog(scene: any) {
  const open = !!scene.registry.get('dialogOpen');
  scene.dialogOpen = open;
  scene.updateInputLock?.();
  const lines: string[] = (scene.registry.get('dialogLines') as string[]) || [];
  const step = (scene.registry.get('dialogStep') as number) ?? 0;
  const playerPos = (scene.registry.get('playerPos') as { x: number; y: number } | undefined);

  try { scene.dialogRows?.forEach((r: any) => { try { r.destroy(); } catch {} }); } catch {}
  scene.dialogRows = [];
  if (!open) { try { scene.dialogBox?.destroy(); } catch {}; scene.dialogBox = undefined; return; }

  const pad = 6;
  const FS = CONFIG.ui.fontSize;
  const { w: viewW, h: viewH } = scene.getViewSize();
  const HUD = CONFIG.ui.hudHeight;

  const fallbackFirst = (t('store.dialog.l1') as string) || '';
  const currentLine = (Array.isArray(lines) && lines.length > step) ? (lines[step] || '') : (Array.isArray(lines) && lines.length > 0 ? (lines[0] || '') : fallbackFirst);
  const txt = `${currentLine} ${t('store.dialog.cont') || ''}`.trim();

  let tempText = scene.add.text(0, 0, txt, { fontSize: `${FS}px`, color: '#e6f0ff', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' }).setDepth(2001).setScrollFactor(0);
  const textW = Math.ceil(tempText.width);
  const textH = Math.ceil(tempText.height);
  let panelW = Math.max(120, textW + pad * 2);
  let panelH = Math.max(CONFIG.ui.dialogHeight, textH + pad * 2);

  let x = 0, y = 0; let placedByPlayer = false;
  try {
    let cam: any = null;
    try { cam = (scene.game.scene.getScene('StoreScene') as any)?.cameras?.main || null; } catch {}
    if (!cam) {
      const scenes = scene.game.scene.getScenes(true).filter((s: any) => s.scene?.key !== 'UIOverlay');
      const guess = scenes.find((s: any) => s?.cameras?.main) || scenes[scenes.length - 1];
      cam = (guess as any)?.cameras?.main || null;
    }
    if (cam && playerPos) {
      const baseX = (typeof cam.worldView?.x === 'number') ? cam.worldView.x : (cam.scrollX || 0);
      const baseY = (typeof cam.worldView?.y === 'number') ? cam.worldView.y : (cam.scrollY || 0);
      const screenX = (playerPos.x - baseX) * (cam.zoom || 1);
      const screenY = (playerPos.y - baseY) * (cam.zoom || 1);
      const offset = 12;
      x = screenX + offset;
      y = Math.round(screenY - panelH / 2);
      const minY = HUD + pad; const maxY = viewH - HUD - panelH - pad;
      if (y < minY) y = minY; if (y > maxY) y = maxY;
      if (x + panelW + pad > viewW) x = Math.max(pad, viewW - panelW - pad);
      if (x < pad) x = pad;
      placedByPlayer = true;
    }
  } catch {}
  if (!placedByPlayer) { x = 0; y = viewH - HUD - panelH - 2; }

  if (!scene.dialogBox) { scene.dialogBox = scene.add.rectangle(x, y, panelW, panelH, 0x000000, 0.8).setOrigin(0).setDepth(2000).setScrollFactor(0); }
  else { scene.dialogBox.setPosition(x, y).setSize(panelW, panelH).setDepth(2000).setVisible(true).setScrollFactor(0); }

  tempText.setPosition(x + pad, y + pad);
  scene.dialogRows.push(tempText);
  try { scene.scene.bringToTop(); } catch {}
}

export function openDialog(scene: any, lines: string[], step = 0) {
  try {
    scene.registry.set('dialogLines', Array.isArray(lines) ? lines : []);
    scene.registry.set('dialogStep', Math.max(0, step|0));
    scene.registry.set('dialogOpen', true);
    scene.dialogOpen = true;
    renderDialog(scene);
    scene.scene.bringToTop();
    scene.dialogForceFrames = 3;
  } catch {}
}

export function advanceDialog(scene: any): boolean {
  const lines: string[] = (scene.registry.get('dialogLines') as string[]) || [];
  let step = (scene.registry.get('dialogStep') as number) ?? 0;
  step++;
  if (step < lines.length) {
    scene.registry.set('dialogStep', step);
    scene.registry.set('dialogOpen', true);
    renderDialog(scene);
    scene.dialogForceFrames = 2;
    return false;
  } else {
    closeDialog(scene);
    return true;
  }
}

export function closeDialog(scene: any) {
  try {
    scene.registry.set('dialogOpen', false);
    scene.dialogOpen = false;
    renderDialog(scene);
  } catch {}
  scene.updateInputLock?.();
}

