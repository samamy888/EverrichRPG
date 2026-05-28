/**
 * 桃園機場 T2 設施配置數據庫
 * 採用數據驅動架構，方便未來輕鬆增減店面或櫃檯
 */

export interface Facility {
    id: string;
    name: string;
    type: 'shop' | 'counter' | 'info' | 'gate';
    x: number;
    y: number;
    texture: string;
    scale?: number;
    radius?: number;
    shortName?: string;
    renderProp?: boolean;
    collide?: boolean;
    storeId?: string;
    targetScene?: string; // 點擊後要切換到的場景 (例如 StoreScene)
    hint?: string;
}

export const T2_FACILITIES: Facility[] = [
    // --- 管制區外：報到大廳 (Landside) ---
    {
        id: 'checkin-row-01',
        name: '1-3 號報到櫃檯',
        type: 'counter',
        x: 2580, y: 900,
        texture: 'prop-checkin-counter-module',
        scale: 0.18,
        radius: 62,
        shortName: '報到 1-3',
        hint: '請準備好護照進行報到。'
    },
    {
        id: 'checkin-row-06',
        name: '6-7 號報到櫃檯',
        type: 'counter',
        x: 2580, y: 1240,
        texture: 'prop-checkin-counter-module',
        scale: 0.18,
        radius: 62,
        shortName: '報到 6-7',
        hint: '請確認行李託運與登機證資訊。'
    },
    {
        id: 'checkin-row-10',
        name: '10-13 號報到櫃檯',
        type: 'counter',
        x: 2580, y: 1660,
        texture: 'prop-checkin-counter-module',
        scale: 0.18,
        radius: 62,
        shortName: '報到 10-13',
        hint: '此區提供一般旅客報到與行李託運。'
    },
    {
        id: 'checkin-row-16',
        name: '16-19 號報到櫃檯',
        type: 'counter',
        x: 2580, y: 2140,
        texture: 'prop-checkin-counter-module',
        scale: 0.18,
        radius: 62,
        shortName: '報到 16-19',
        hint: '請排隊等候地勤人員協助。'
    },
    {
        id: 'checkin-row-22',
        name: '22-26 號報到櫃檯',
        type: 'counter',
        x: 2720, y: 2820,
        texture: 'prop-checkin-counter-module',
        scale: 0.18,
        radius: 62,
        shortName: '報到 22-26',
        hint: '南側報到櫃檯，適合從底部入口進入的旅客。'
    },

    // --- 中段：安檢與海關 (Security) ---
    {
        id: 'customs-main',
        name: '證照查驗櫃檯',
        type: 'info',
        x: 3350, y: 1750,
        texture: 'prop-info-counter',
        scale: 0.24,
        radius: 70,
        shortName: '證照查驗',
        hint: '請取下帽子與眼鏡。'
    },
    {
        id: 'security-lane',
        name: '安檢排隊入口',
        type: 'info',
        x: 3160, y: 1160,
        texture: 'prop-security-scanner',
        scale: 0.18,
        radius: 70,
        shortName: '安檢',
        hint: '請將筆電與液體取出，準備通過安檢。'
    },

    // --- 管制區內：免稅商店街 (Airside) ---
    {
        id: 'everrich-cosmetics',
        name: '采盟免稅商店 - 化妝品香水',
        type: 'shop',
        x: 3540, y: 1360,
        texture: 'prop-dutyfree-shop-kiosk',
        scale: 0.2,
        radius: 72,
        shortName: '化妝品香水',
        storeId: 'cosmetics',
        targetScene: 'StoreScene',
        hint: '精品彩妝 8 折起，按 E 進入購物。'
    },
    {
        id: 'everrich-perfume',
        name: '采盟免稅商店 - 香水',
        type: 'shop',
        x: 3540, y: 1640,
        texture: 'prop-dutyfree-shop-kiosk',
        scale: 0.2,
        radius: 72,
        shortName: '香水',
        storeId: 'perfume',
        targetScene: 'StoreScene',
        hint: '人氣香水與旅行組合，按 E 進入購物。'
    },
    {
        id: 'everrich-liquor',
        name: '采盟免稅商店 - 菸酒巧克力',
        type: 'shop',
        x: 3540, y: 1920,
        texture: 'prop-dutyfree-shop-kiosk',
        scale: 0.2,
        radius: 72,
        shortName: '菸酒',
        storeId: 'liquor',
        targetScene: 'StoreScene',
        hint: '頂級威士忌免稅優惠中。'
    },
    {
        id: 'everrich-snacks',
        name: '采盟免稅商店 - 糖果伴手禮',
        type: 'shop',
        x: 3540, y: 2200,
        texture: 'prop-dutyfree-shop-kiosk',
        scale: 0.2,
        radius: 72,
        shortName: '零食',
        storeId: 'snacks',
        targetScene: 'StoreScene',
        hint: '巧克力、餅乾與台灣伴手禮，按 E 進入購物。'
    },
    {
        id: 'everrich-electronics',
        name: 'Powerport - 旅行電子',
        type: 'shop',
        x: 3540, y: 2480,
        texture: 'prop-dutyfree-shop-kiosk',
        scale: 0.2,
        radius: 72,
        shortName: 'Powerport',
        storeId: 'electronics',
        targetScene: 'StoreScene',
        hint: '充電線、行動電源與旅行配件，按 E 進入購物。'
    },
    {
        id: 'everrich-fashion',
        name: 'iTravel - 旅行配件',
        type: 'shop',
        x: 3100, y: 3010,
        texture: 'prop-dutyfree-shop-kiosk',
        scale: 0.2,
        radius: 72,
        shortName: 'iTravel',
        storeId: 'fashion',
        targetScene: 'StoreScene',
        hint: '帽子、頸枕與旅行配件，按 E 進入購物。'
    },
    {
        id: 'everrich-books',
        name: 'THE NORTH FACE - 旅行服飾',
        type: 'shop',
        x: 3380, y: 3010,
        texture: 'prop-dutyfree-shop-kiosk',
        scale: 0.2,
        radius: 72,
        shortName: 'THE NORTH FACE',
        storeId: 'books',
        targetScene: 'StoreScene',
        hint: '旅遊指南與機上閱讀，按 E 進入購物。'
    },
    {
        id: 'everrich-souvenirs',
        name: '三麗鷗商店 / 台灣紀念品',
        type: 'shop',
        x: 3660, y: 3010,
        texture: 'prop-dutyfree-shop-kiosk',
        scale: 0.2,
        radius: 72,
        shortName: '三麗鷗',
        storeId: 'souvenirs',
        targetScene: 'StoreScene',
        hint: '台灣特色小物與明信片，按 E 進入購物。'
    },
    {
        id: 'food-court',
        name: 'VWI COFFEE BAR',
        type: 'shop',
        x: 3920, y: 3010,
        texture: 'prop-dutyfree-shop-kiosk',
        scale: 0.2,
        radius: 72,
        shortName: 'VWI COFFEE',
        storeId: 'food',
        targetScene: 'StoreScene',
        hint: '餐點、咖啡與登機前補給，按 E 進入購物。'
    },
    {
        id: 'flight-info-center',
        name: '中央航班資訊大螢幕',
        type: 'info',
        x: 2980, y: 980,
        texture: 'prop-flight-board',
        scale: 0.22,
        radius: 75,
        shortName: '航班資訊',
        hint: '查看最新起降動態。'
    },
    {
        id: 'atm-service-1',
        name: 'ATM / 外幣提領',
        type: 'info',
        x: 3290, y: 2920,
        texture: 'prop-airport-atm',
        scale: 0.18,
        radius: 55,
        shortName: 'ATM',
        hint: '可查詢餘額與提領外幣現鈔。'
    },

    // --- 原圖導覽標示：登機門與航廈區域 ---
    {
        id: 'gate-d10',
        name: 'D10 登機門',
        type: 'gate',
        x: 90, y: 130,
        texture: 'prop-signage-pillar',
        radius: 80,
        shortName: 'D10',
        renderProp: false,
        collide: false,
        hint: 'D10 登機門方向。'
    },
    {
        id: 'gate-d9',
        name: 'D9 登機門',
        type: 'gate',
        x: 725, y: 130,
        texture: 'prop-signage-pillar',
        radius: 80,
        shortName: 'D9',
        renderProp: false,
        collide: false,
        hint: 'D9 登機門方向。'
    },
    {
        id: 'gate-d8',
        name: 'D8 登機門 / NIKE ADIDAS PUMA',
        type: 'gate',
        x: 1340, y: 130,
        texture: 'prop-signage-pillar',
        radius: 80,
        shortName: 'D8',
        renderProp: false,
        collide: false,
        hint: 'D8 附近可前往 NIKE、ADIDAS、PUMA 專賣區。'
    },
    {
        id: 'gate-d7',
        name: 'D7 登機門 / iTravel',
        type: 'gate',
        x: 1960, y: 130,
        texture: 'prop-signage-pillar',
        radius: 80,
        shortName: 'D7',
        renderProp: false,
        collide: false,
        hint: 'D7 附近有 iTravel 與餐飲區。'
    },
    {
        id: 'gate-d6',
        name: 'D6 登機門',
        type: 'gate',
        x: 2610, y: 130,
        texture: 'prop-signage-pillar',
        radius: 80,
        shortName: 'D6',
        renderProp: false,
        collide: false,
        hint: 'D6 登機門方向。'
    },
    {
        id: 'gate-d5',
        name: 'D5 登機門 / 國際精品',
        type: 'gate',
        x: 3195, y: 130,
        texture: 'prop-signage-pillar',
        radius: 80,
        shortName: 'D5',
        renderProp: false,
        collide: false,
        hint: 'D5 附近有國際精品與候機區。'
    },
    {
        id: 'gate-d4',
        name: 'D4 登機門',
        type: 'gate',
        x: 3885, y: 130,
        texture: 'prop-signage-pillar',
        radius: 80,
        shortName: 'D4',
        renderProp: false,
        collide: false,
        hint: 'D4 登機門方向。'
    },
    {
        id: 'gate-d3',
        name: 'D3 登機門 / Bar',
        type: 'gate',
        x: 4540, y: 130,
        texture: 'prop-signage-pillar',
        radius: 80,
        shortName: 'D3',
        renderProp: false,
        collide: false,
        hint: 'D3 附近有 Bar 與餐飲區。'
    },
    {
        id: 'gate-d2',
        name: 'D2 登機門',
        type: 'gate',
        x: 5155, y: 130,
        texture: 'prop-signage-pillar',
        radius: 80,
        shortName: 'D2',
        renderProp: false,
        collide: false,
        hint: 'D2 登機門方向。'
    },
    {
        id: 'gate-d1',
        name: 'D1 登機門 / THE NORTH FACE',
        type: 'gate',
        x: 5735, y: 130,
        texture: 'prop-signage-pillar',
        radius: 80,
        shortName: 'D1',
        renderProp: false,
        collide: false,
        hint: 'D1 附近可前往 THE NORTH FACE。'
    },
    {
        id: 'gate-c10',
        name: 'C10 登機門',
        type: 'gate',
        x: 910, y: 3395,
        texture: 'prop-signage-pillar',
        radius: 80,
        shortName: 'C10',
        renderProp: false,
        collide: false,
        hint: 'C10 登機門方向。'
    },
    {
        id: 'gate-c9',
        name: 'C9 登機門',
        type: 'gate',
        x: 1510, y: 3395,
        texture: 'prop-signage-pillar',
        radius: 80,
        shortName: 'C9',
        renderProp: false,
        collide: false,
        hint: 'C9 登機門方向。'
    },
    {
        id: 'gate-c8',
        name: 'C8 登機門 / Powerport',
        type: 'gate',
        x: 2120, y: 3395,
        texture: 'prop-signage-pillar',
        radius: 80,
        shortName: 'C8',
        renderProp: false,
        collide: false,
        hint: 'C8 附近有 Powerport 旅行電子。'
    },
    {
        id: 'gate-c7',
        name: 'C7 登機門',
        type: 'gate',
        x: 2880, y: 3395,
        texture: 'prop-signage-pillar',
        radius: 80,
        shortName: 'C7',
        renderProp: false,
        collide: false,
        hint: 'C7 登機門方向。'
    },
    {
        id: 'gate-c6',
        name: 'C6 登機門 / ATM',
        type: 'gate',
        x: 3630, y: 3395,
        texture: 'prop-signage-pillar',
        radius: 80,
        shortName: 'C6',
        renderProp: false,
        collide: false,
        hint: 'C6 附近有 ATM 與旅客服務。'
    },
    {
        id: 'gate-c5',
        name: 'C5 登機門 / VWI COFFEE BAR',
        type: 'gate',
        x: 4310, y: 3395,
        texture: 'prop-signage-pillar',
        radius: 80,
        shortName: 'C5',
        renderProp: false,
        collide: false,
        hint: 'C5 附近有 VWI COFFEE BAR 與餐飲區。'
    },
    {
        id: 'gate-c4',
        name: 'C4 登機門',
        type: 'gate',
        x: 4930, y: 3395,
        texture: 'prop-signage-pillar',
        radius: 80,
        shortName: 'C4',
        renderProp: false,
        collide: false,
        hint: 'C4 登機門方向。'
    },
    {
        id: 'gate-c3',
        name: 'C3 登機門 / EVER RICH JEWELRY',
        type: 'gate',
        x: 5480, y: 3395,
        texture: 'prop-signage-pillar',
        radius: 80,
        shortName: 'C3',
        renderProp: false,
        collide: false,
        hint: 'C3 附近有 EVER RICH JEWELRY 與餐飲區。'
    },
    {
        id: 'gate-c2',
        name: 'C2 登機門 / 三麗鷗商店',
        type: 'gate',
        x: 5900, y: 3395,
        texture: 'prop-signage-pillar',
        radius: 80,
        shortName: 'C2',
        renderProp: false,
        collide: false,
        hint: 'C2 附近有三麗鷗商店與候機區。'
    },
    {
        id: 'gate-c1',
        name: 'C1 登機門 / 桃禧記',
        type: 'gate',
        x: 5840, y: 3260,
        texture: 'prop-signage-pillar',
        radius: 80,
        shortName: 'C1',
        renderProp: false,
        collide: false,
        hint: 'C1 附近有桃禧記與候機區。'
    }
];
