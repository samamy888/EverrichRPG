export type Locale = 'zh-Hant' | 'en';

let currentLocale: Locale = 'zh-Hant';

const dict: Record<Locale, any> = {
  'zh-Hant': {
    ui: {
      time: '時間 {mm}:{ss}',
      money: '金額 ${money}',
      basket: '購物籃 ${total}',
    },
    concourse: {
      sign: '中庭・化妝品 →',
      hintMoveEnter: '使用 WASD/方向鍵移動，按 E 進入',
      hintEnter: '按 E 進入商店',
    },
    store: {
      title: {
        cosmetics: '化妝品',
        liquor: '酒類',
      },
      hint: '上下選擇，Space 加入購物籃，Esc 返回',
      status: '金額 ${money}｜購物籃 ${total}',
    },
  },
  en: {
    ui: {
      time: 'Time {mm}:{ss}',
      money: 'Money ${money}',
      basket: 'Basket ${total}',
    },
    concourse: {
      sign: 'Concourse · Cosmetics →',
      hintMoveEnter: 'WASD/Arrows to move, press E to enter',
      hintEnter: 'Press E to enter store',
    },
    store: {
      title: {
        cosmetics: 'Cosmetics',
        liquor: 'Liquor',
      },
      hint: 'Up/Down select, Space add, Esc back',
      status: 'Money ${money} | Basket ${total}',
    },
  },
};

export function setLocale(locale: Locale) {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

function getByPath(path: string) {
  const parts = path.split('.');
  let obj: any = dict[currentLocale];
  for (const p of parts) {
    obj = obj?.[p];
    if (obj == null) return path;
  }
  return obj;
}

export function t(path: string, params?: Record<string, string | number>): string {
  const raw = getByPath(path);
  if (typeof raw !== 'string') return String(raw);
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (_m, k) => params[k] !== undefined ? String(params[k]) : _m)
            .replace(/\$\{(\w+)\}/g, (_m, k) => params[k] !== undefined ? String(params[k]) : _m);
}

