export type Locale = 'zh-Hant' | 'en';

let currentLocale: Locale = 'zh-Hant';

const dict: Record<Locale, any> = {
  'zh-Hant': {
    ui: {
      status: '錢包 ${money}｜購物籃 ${items} 件｜合計 $${total}',
      basketHint: '購物籃：W/S 選擇，E 移除，ESC 關閉',
      loadingSceneTitle: '載入場景中',
      loadingSceneMessage: '正在準備場景...',
      menuTitle: '選單',
      menuSceneTitle: '場景',
      menuBasket: '購物籃',
      menuLogout: '登出',
      menuTip: 'W/S 選擇｜Enter 確認｜ESC 關閉',
      domHudProbe: 'DOM HUD 偵測',
      domHudLabel: 'DOM HUD',
    },
    lobby: {
      zone: {
        t2Lobby: 'T2 大廳',
        northGates: 'T2 北側登機門',
        westConcourse: 'T2 西側走廊',
        checkinHall: 'T2 報到大廳',
        securityCustoms: '安檢與海關',
        dutyFreeBoulevard: '免稅大道',
        eastConcourse: 'T2 東側走廊',
        southGates: 'T2 南側登機門',
      },
      loading: {
        buildingScene: '正在建立 T2 場景...',
      },
      hint: {
        enteringShop: '正在進入商店...',
        interactMenu: '[{zone}] {target}｜E 互動｜ESC 選單',
        moveMenuDebug: '[{zone}] WASD 移動｜ESC 選單｜C 切換偵錯',
        propDebugOn: '道具偵錯已開啟（F2 切換）',
        propDebugOff: '道具偵錯已關閉（F2 切換）',
      },
      action: {
        enterShop: '進入商店',
        viewGate: '查看登機門',
        checkCounter: '查看櫃台',
        inspect: '檢視',
      },
    },
    concourse: {
      sign: '航廈走廊',
      hintMoveEnter: '使用 WASD/方向鍵移動，按 E 進入',
      hintEnter: '按 E 進入商店',
      dutyfree: '免稅商店走廊',
      bankFx: '外幣兌換',
      bank: '銀行服務',
    },
    store: {
      title: {
        cosmetics: '化妝品',
        liquor: '酒類',
        snacks: '零食',
        tobacco: '菸草',
        perfume: '香水',
        electronics: '電子產品',
        fashion: '時尚配件',
        books: '書籍',
        souvenirs: '紀念品',
        food: '美食',
      },
      listTitle: '商品',
      hint: '上下選擇，按 E 選擇（購買/結束對話）',
      hintApproach: '靠近店員按 E 對話，或前往出口',
      hintTalk: '按 E 對話',
      hintExitDoor: '按 E 離開商店',
      dialog: {
        l1: '歡迎光臨！',
        l2: '本店有試用品喔。',
        l3: '需要什麼可以問我。',
        cont: '（按 E 繼續）',
      },
      listExit: '結束對話',
    },
  },
  en: {
    ui: {
      status: 'Money ${money} | Basket ${items} items | Total $${total}',
      basketHint: 'Basket: W/S to select, E to remove, ESC to close',
      loadingSceneTitle: 'Loading Scene',
      loadingSceneMessage: 'Preparing world...',
      menuTitle: 'Menu',
      menuSceneTitle: 'Scene',
      menuBasket: 'Basket',
      menuLogout: 'Logout',
      menuTip: 'W/S select | Enter confirm | ESC close',
      domHudProbe: 'DOM HUD PROBE',
      domHudLabel: 'DOM HUD',
    },
    lobby: {
      zone: {
        t2Lobby: 'T2 Lobby',
        northGates: 'T2 North Gates',
        westConcourse: 'T2 West Concourse',
        checkinHall: 'T2 Check-in Hall',
        securityCustoms: 'Security & Customs',
        dutyFreeBoulevard: 'Duty Free Boulevard',
        eastConcourse: 'T2 East Concourse',
        southGates: 'T2 South Gates',
      },
      loading: {
        buildingScene: 'Building T2 scene...',
      },
      hint: {
        enteringShop: 'Entering shop...',
        interactMenu: '[{zone}] {target} | E interact | ESC menu',
        moveMenuDebug: '[{zone}] WASD move | ESC menu | C debug toggle',
        propDebugOn: 'Prop Debug ON (F2 to toggle)',
        propDebugOff: 'Prop Debug OFF (F2 to toggle)',
      },
      action: {
        enterShop: 'Enter shop',
        viewGate: 'View gate',
        checkCounter: 'Check counter',
        inspect: 'Inspect',
      },
    },
    concourse: {
      sign: 'Concourse',
      hintMoveEnter: 'WASD/Arrows to move, press E to enter',
      hintEnter: 'Press E to enter store',
    },
    store: {
      title: {
        cosmetics: 'Cosmetics',
        liquor: 'Liquor',
        snacks: 'Snacks',
        tobacco: 'Tobacco',
        perfume: 'Perfume',
        electronics: 'Electronics',
        fashion: 'Fashion',
        books: 'Books',
        souvenirs: 'Souvenirs',
        food: 'Food',
      },
      listTitle: 'Items',
      hint: 'Up/Down select, press E (buy/exit dialog)',
      hintApproach: 'Approach clerk and press E; door to exit',
      hintTalk: 'Press E to talk',
      hintExitDoor: 'Press E to exit store',
      dialog: {
        l1: 'Welcome!',
        l2: 'We have testers available.',
        l3: 'Ask me if you need anything.',
        cont: '(Press E to continue)',
      },
      listExit: 'Exit dialog',
    },
  },
};

export function setLocale(locale: Locale) { currentLocale = locale; }
export function getLocale(): Locale { return currentLocale; }

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
  return raw
    .replace(/\{(\w+)\}/g, (_m, k) => (params[k] !== undefined ? String(params[k]) : _m))
    .replace(/\$\{(\w+)\}/g, (_m, k) => (params[k] !== undefined ? String(params[k]) : _m));
}
