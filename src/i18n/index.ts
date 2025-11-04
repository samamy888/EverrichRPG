export type Locale = 'zh-Hant' | 'en';

let currentLocale: Locale = 'zh-Hant';

const dict: Record<Locale, any> = {
  'zh-Hant': {
    ui: {
      status: '金額 ${money}｜購物籃 ${items} 件 $${total}',
    },
    concourse: {
      sign: '大廳',
      hintMoveEnter: '使用 WASD/方向鍵移動，按 E 進入',
      hintEnter: '按 E 進入商店',
    },
    store: {
      title: { cosmetics: '化妝品', liquor: '酒類' },
      listTitle: '商品',
      hint: '上下選擇，按 E 選擇（購買/結束對話）',
      hintApproach: '靠近店員按 E 對話，或前往出口',
      hintTalk: '按 E 對話',
      hintExitDoor: '按 E 離開商店',
      dialog: { l1: '歡迎光臨！', l2: '本店有試用品喔。', l3: '需要什麼可以問我。', cont: '（按 E 繼續）' },
      listExit: '結束對話',
    },
  },
  en: {
    ui: {
      status: 'Money ${money} | Basket ${items} items $${total}',
    },
    concourse: {
      sign: 'Concourse',
      hintMoveEnter: 'WASD/Arrows to move, press E to enter',
      hintEnter: 'Press E to enter store',
    },
    store: {
      title: { cosmetics: 'Cosmetics', liquor: 'Liquor' },
      listTitle: 'Items',
      hint: 'Up/Down select, press E (buy/exit dialog)',
      hintApproach: 'Approach clerk and press E; door to exit',
      hintTalk: 'Press E to talk',
      hintExitDoor: 'Press E to exit store',
      dialog: { l1: 'Welcome!', l2: 'We have testers available.', l3: 'Ask me if you need anything.', cont: '(Press E to continue)' },
      listExit: 'Exit dialog',
    },
  },
};

export function setLocale(locale: Locale) { currentLocale = locale; }
export function getLocale(): Locale { return currentLocale; }

function getByPath(path: string) {
  const parts = path.split('.');
  let obj: any = dict[currentLocale];
  for (const p of parts) { obj = obj?.[p]; if (obj == null) return path; }
  return obj;
}

export function t(path: string, params?: Record<string, string | number>): string {
  const raw = getByPath(path);
  if (typeof raw !== 'string') return String(raw);
  if (!params) return raw;
  return raw
    .replace(/\{(\w+)\}/g, (_m, k) => params[k] !== undefined ? String(params[k]) : _m)
    .replace(/\$\{(\w+)\}/g, (_m, k) => params[k] !== undefined ? String(params[k]) : _m);
}

