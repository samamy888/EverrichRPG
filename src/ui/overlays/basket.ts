// 將購物籃相關行為拆出
import { CONFIG } from '../../config';
import { t } from '../../i18n';

export function openBasket(scene: any) {
  scene.basketOpen = true;
  scene.basketSelected = 0;
  try { scene.lastHint = (scene.registry.get('hint') as string) ?? ''; } catch { scene.lastHint = null; }
  try {
    const bh = t('ui.basketHint') as string;
    scene.registry.set('hint', bh && bh !== 'ui.basketHint' ? bh : '購物籃：W/S 選擇，E 移除，ESC 關閉');
  } catch {}
  renderBasket(scene);
  scene.refresh?.();
  scene.updateInputLock?.();
}

export function closeBasket(scene: any) {
  scene.basketOpen = false;
  try { scene.basketRows?.forEach((r: any) => { try { r.destroy(); } catch {} }); } catch {}
  scene.basketRows = [];
  try { scene.basketBox?.destroy(); } catch {}
  scene.basketBox = undefined;
  if (scene.lastHint !== null) {
    scene.registry.set('hint', scene.lastHint);
    scene.lastHint = null;
  }
  scene.refresh?.();
  scene.updateInputLock?.();
}

export function renderBasket(scene: any) {
  const pad = 6;
  const FS = CONFIG.ui.fontSize;
  const { w: viewW, h: viewH } = scene.getViewSize();
  const lines = ((scene.registry.get('basket') as { name: string; price: number }[]) ?? []);
  const total = lines.reduce((s: number, b: any) => s + (b.price || 0), 0);
  const maxLines = Math.max(3, Math.min(7, lines.length + 2));
  const hBox = Math.max(CONFIG.ui.dialogHeight, pad * 2 + maxLines * (FS + 2));
  const HUD = CONFIG.ui.hudHeight;
  const y = viewH - HUD - hBox - 2;
  if (!scene.basketBox) {
    scene.basketBox = scene.add.rectangle(0, y, viewW, hBox, 0x000000, 0.8).setOrigin(0).setDepth(2000).setScrollFactor(0);
  } else {
    scene.basketBox.setPosition(0, y).setSize(viewW, hBox).setDepth(2000).setVisible(true).setScrollFactor(0);
  }
  try { scene.basketRows?.forEach((r: any) => { try { r.destroy(); } catch {} }); } catch {}
  scene.basketRows = [];
  const startY = y + pad;
  const startX = 6;
  const title = scene.add.text(startX, startY, t('store.listTitle') || '商品', { fontSize: `${FS}px`, color: '#e6f0ff', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' }).setDepth(2001).setScrollFactor(0);
  scene.basketRows.push(title);
  lines.forEach((it: any, idx: number) => {
    const prefix = idx === scene.basketSelected ? '>' : ' ';
    const line = `${prefix} ${it.name}  $${it.price}`;
    const ty = startY + (idx + 1) * (FS + 2);
    const txt = scene.add.text(startX, ty, line, { fontSize: `${FS}px`, color: idx === scene.basketSelected ? '#ffffff' : '#c0c8d0', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' }).setDepth(2001).setScrollFactor(0);
    scene.basketRows.push(txt);
  });
  const sum = scene.add.text(startX, startY + (lines.length + 1) * (FS + 2), `合計 $${total}`, { fontSize: `${FS}px`, color: '#ffd966', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' }).setDepth(2001).setScrollFactor(0);
  scene.basketRows.push(sum);
}

export function moveBasket(scene: any, dir: 1 | -1) {
  if (!scene.basketOpen) return;
  const lines = ((scene.registry.get('basket') as any[]) ?? []);
  if (!lines.length) return;
  const n = lines.length;
  scene.basketSelected = (scene.basketSelected + (dir === 1 ? 1 : -1) + n) % n;
  renderBasket(scene);
}

export function pickBasket(scene: any) {
  if (!scene.basketOpen) return;
  const list = ((scene.registry.get('basket') as any[]) ?? []).slice();
  if (!list.length) return;
  const idx = scene.basketSelected;
  list.splice(idx, 1);
  scene.registry.set('basket', list);
  if (idx >= list.length) scene.basketSelected = Math.max(0, list.length - 1);
  renderBasket(scene);
}
