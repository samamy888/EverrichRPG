export type Gender = 'M' | 'F' | 'O';
export interface Traveler {
  id: string;
  name: string;
  gender: Gender;
  job?: 'traveler' | 'clerk' | string;
  storeId?: string; // 若為店員，標記所屬商店
}

// 簡單名單（可日後擴充來源）
export const travelers: Traveler[] = [
  { id: 't001', name: '王小明', gender: 'M', job: 'traveler' },
  { id: 't002', name: '李小美', gender: 'F', job: 'traveler' },
  { id: 't003', name: '陳志豪', gender: 'M', job: 'traveler' },
  { id: 't004', name: '林佳怡', gender: 'F', job: 'traveler' },
  { id: 't005', name: '張家豪', gender: 'M', job: 'traveler' },
  { id: 't006', name: '黃心怡', gender: 'F', job: 'traveler' },
  { id: 't007', name: '吳宗翰', gender: 'M', job: 'traveler' },
  { id: 't008', name: '周怡君', gender: 'F', job: 'traveler' },
  { id: 't009', name: '柯建宇', gender: 'M', job: 'traveler' },
  { id: 't010', name: '趙雅婷', gender: 'F', job: 'traveler' },
  { id: 't011', name: '劉承翰', gender: 'M', job: 'traveler' },
  { id: 't012', name: '邱詩涵', gender: 'F', job: 'traveler' },
  { id: 't013', name: '謝文彬', gender: 'M', job: 'traveler' },
  { id: 't014', name: '高郁婷', gender: 'F', job: 'traveler' },
  { id: 't015', name: '何俊傑', gender: 'M', job: 'traveler' },
  { id: 't016', name: '曾雅雯', gender: 'F', job: 'traveler' },
  { id: 't017', name: '郭柏翰', gender: 'M', job: 'traveler' },
  { id: 't018', name: '簡舒婷', gender: 'F', job: 'traveler' },
  { id: 't019', name: '蕭智強', gender: 'M', job: 'traveler' },
  { id: 't020', name: '賴怡萱', gender: 'F', job: 'traveler' },
  { id: 't021', name: '許敬恩', gender: 'O', job: 'traveler' },
  { id: 't022', name: '朱庭瑜', gender: 'F', job: 'traveler' },
  { id: 't023', name: '宋柏宇', gender: 'M', job: 'traveler' },
  { id: 't024', name: '彭采縈', gender: 'F', job: 'traveler' },
  { id: 't025', name: '童嘉文', gender: 'O', job: 'traveler' },
  { id: 't026', name: '江詠翔', gender: 'M', job: 'traveler' },
  { id: 't027', name: '范鈺婷', gender: 'F', job: 'traveler' },
  { id: 't028', name: '邵子翔', gender: 'M', job: 'traveler' },
  { id: 't029', name: '葉馨文', gender: 'F', job: 'traveler' },
  { id: 't030', name: '鍾予安', gender: 'O', job: 'traveler' },
];

// 各商店店員名單
export const clerksByStore: Record<string, Traveler> = {
  cosmetics: { id: 'c_cos', name: '小芳', gender: 'F', job: 'clerk', storeId: 'cosmetics' },
  liquor:    { id: 'c_liq', name: '阿華', gender: 'M', job: 'clerk', storeId: 'liquor' },
  snacks:    { id: 'c_sna', name: '米米', gender: 'F', job: 'clerk', storeId: 'snacks' },
  tobacco:   { id: 'c_tob', name: '老周', gender: 'M', job: 'clerk', storeId: 'tobacco' },
  perfume:   { id: 'c_per', name: '香奈', gender: 'F', job: 'clerk', storeId: 'perfume' },
  electronics:{ id: 'c_ele', name: '小田', gender: 'M', job: 'clerk', storeId: 'electronics' },
  fashion:   { id: 'c_fas', name: '小晴', gender: 'F', job: 'clerk', storeId: 'fashion' },
  books:     { id: 'c_bok', name: '阿章', gender: 'M', job: 'clerk', storeId: 'books' },
  souvenirs: { id: 'c_sou', name: '艾琳', gender: 'F', job: 'clerk', storeId: 'souvenirs' },
  food:      { id: 'c_fod', name: '阿豪', gender: 'M', job: 'clerk', storeId: 'food' },
};
