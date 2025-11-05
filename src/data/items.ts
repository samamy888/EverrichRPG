export type Item = {
  id: string;
  name: string;
  price: number;
  store: 'cosmetics' | 'liquor' | 'snacks' | 'tobacco' | 'perfume' | 'electronics' | 'fashion' | 'books' | 'souvenirs' | 'food';
};

export const items: Item[] = [
  { id: 'cos-01', name: '護手霜 30ml', price: 120, store: 'cosmetics' },
  { id: 'cos-02', name: '化妝棉', price: 40, store: 'cosmetics' },
  { id: 'cos-03', name: '香氛 10ml', price: 90, store: 'cosmetics' },
  { id: 'liq-01', name: '威士忌 500ml', price: 300, store: 'liquor' },
  { id: 'liq-02', name: '紅酒一支', price: 220, store: 'liquor' },
  { id: 'liq-03', name: '啤酒六入', price: 180, store: 'liquor' },
  { id: 'snk-01', name: '巧克力禮盒', price: 150, store: 'snacks' },
  { id: 'snk-02', name: '餅乾家族包', price: 90, store: 'snacks' },
  { id: 'tob-01', name: '雪茄（小支）', price: 260, store: 'tobacco' },
  { id: 'tob-02', name: '紙菸一條', price: 1200, store: 'tobacco' },
  { id: 'per-01', name: '淡香水 50ml', price: 480, store: 'perfume' },
  { id: 'per-02', name: '香水 100ml', price: 980, store: 'perfume' },
  // New stores
  { id: 'ele-01', name: '行動電源 10000mAh', price: 890, store: 'electronics' },
  { id: 'ele-02', name: 'Type‑C 傳輸線', price: 250, store: 'electronics' },
  { id: 'fas-01', name: '棒球帽', price: 420, store: 'fashion' },
  { id: 'fas-02', name: '旅行頸枕', price: 380, store: 'fashion' },
  { id: 'bok-01', name: '旅遊指南', price: 560, store: 'books' },
  { id: 'bok-02', name: '暢銷小說', price: 420, store: 'books' },
  { id: 'sou-01', name: '台灣鑰匙圈', price: 150, store: 'souvenirs' },
  { id: 'sou-02', name: '明信片套組', price: 120, store: 'souvenirs' },
  { id: 'fod-01', name: '便當套餐', price: 220, store: 'food' },
  { id: 'fod-02', name: '咖啡（大）', price: 120, store: 'food' },
];
