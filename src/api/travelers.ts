import { travelers, clerksByStore, Traveler } from '../data/travelers';

// 模擬從伺服器取得旅客名單（可替換為實際 fetch）
export async function fetchTravelers(): Promise<Traveler[]> {
  // 模擬網路延遲
  await new Promise((r) => setTimeout(r, 60));
  // 回傳複本避免被外部修改
  return travelers.slice();
}

export type { Traveler } from '../data/travelers';

export async function fetchClerk(storeId: string): Promise<Traveler> {
  await new Promise((r) => setTimeout(r, 40));
  const c = clerksByStore[storeId];
  if (c) return { ...c };
  // 後備：若沒有預設，提供一個臨時店員
  return { id: `c_${storeId}`, name: '店員', gender: 'O', job: 'clerk', storeId };
}
