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
  // 顯示在頂部訊息列之下：y 取置頂 HUD 高度再加間距
  const HUD = CONFIG.ui.hudHeight;
const uiPad = (CONFIG.ui?.minimap?.pad ?? 4);
let boxX = Math.max(0, viewW - (CONFIG.ui.minimap.maxWidth || 140) - uiPad);
let boxY = HUD + uiPad;
let boxW = (CONFIG.ui.minimap.maxWidth || 140);
if (scene.minimapBox && scene.minimapBox.visible) {
  try {
    boxX = Number(scene.minimapBox.x) || boxX;
    boxY = (Number(scene.minimapBox.y) || boxY) + (Number(scene.minimapBox.height) || 0) + uiPad;
    boxW = Number(scene.minimapBox.width) || boxW;
  } catch {}
}
if (!scene.basketBox) {
  scene.basketBox = scene.add.rectangle(boxX, boxY, boxW, hBox, 0x000000, 0.8).setOrigin(0).setDepth(1500).setScrollFactor(0);
} else {
  scene.basketBox.setPosition(boxX, boxY).setSize(boxW, hBox).setDepth(1500).setVisible(true).setScrollFactor(0);
}
  try { scene.basketRows?.forEach((r: any) => { try { r.destroy(); } catch {} }); } catch {}
  scene.basketRows = [];
  const startY = boxY + pad;
  const startX = boxX + 6;
  const title = scene.add.text(startX, startY, t('store.listTitle') || '商品', { fontSize: `${FS}px`, color: '#e6f0ff', resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' }).setDepth(2001).setScrollFactor(0);
  scene.basketRows.push(title);
  // 文字測量小工具
  const measure = (text: string, color: string = '#e6f0ff') => {
    const m = scene.add.text(-9999, -9999, text, { fontSize: `${FS}px`, color, resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' }).setVisible(false);
    const w = m.width; try { m.destroy(); } catch {}
    return w;
  };
  const availWidth = Math.max(40, boxW - pad * 2 - 6);

  lines.forEach((it: any, idx: number) => {
    const selected = idx === scene.basketSelected;
    const prefix = selected ? '> ' : '  ';
    const priceStr = `$${it.price}`;
    const ty = startY + (idx + 1) * (FS + 2);
    const color = selected ? '#ffffff' : '#c0c8d0';
    // 計算右側價格寬度，並截斷名稱
    const priceW = measure(priceStr, color);
    const gap = 8;
    const maxNameW = Math.max(20, availWidth - priceW - gap);
    let name = String(it.name || '');
    // 逐步截斷直到寬度符合
    if (measure(prefix + name, color) > maxNameW) {
      const ell = '…';
      let lo = 0, hi = name.length; // 二分截斷以提升效能
      while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        const test = name.slice(0, mid) + ell;
        if (measure(prefix + test, color) <= maxNameW) lo = mid + 1; else hi = mid;
      }
      const cut = Math.max(0, lo - 1);
      name = (cut > 0 ? name.slice(0, cut) + ell : ell);
    }
    // 繪製名稱（左）、價格（右）
    const nameText = scene.add.text(startX, ty, prefix + name, { fontSize: `${FS}px`, color, resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' }).setDepth(2001).setScrollFactor(0);
    const priceX = boxX + boxW - pad - priceW;
    const priceText = scene.add.text(priceX, ty, priceStr, { fontSize: `${FS}px`, color, resolution: 2, fontFamily: 'HanPixel, system-ui, sans-serif' }).setDepth(2001).setScrollFactor(0);
    scene.basketRows.push(nameText, priceText);
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
  const removed = list.splice(idx, 1)[0];
  try {
    const curMoney = Number(scene.registry.get('money') || 0);
    const refund = Number((removed && removed.price) || 0);
    scene.registry.set('money', curMoney + (isFinite(refund) ? refund : 0));
  } catch {}
  scene.registry.set('basket', list);
  if (idx >= list.length) scene.basketSelected = Math.max(0, list.length - 1);
  renderBasket(scene);
}
