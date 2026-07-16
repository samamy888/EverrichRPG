export type AssetScope = "runtime" | "source";

export interface AssetInventoryItem {
  id: string;
  name: string;
  path: string;
  relativePath: string;
  scope: AssetScope;
  category: string;
  type: string;
  role: string;
  extension: string;
  bytes: number;
  sha256: string;
  url: string | null;
  duplicateCount: number;
}

export interface AssetInventory {
  schemaVersion: number;
  roots: string[];
  summary: {
    totalFiles: number;
    totalBytes: number;
    runtimeFiles: number;
    sourceFiles: number;
    duplicateGroups: number;
    duplicateFiles: number;
  };
  assets: AssetInventoryItem[];
}

const inventoryUrl = new URL("./generated/assetInventory.json", import.meta.url);

export async function loadAssetInventory(): Promise<AssetInventory> {
  const response = await fetch(inventoryUrl);
  if (!response.ok) throw new Error(`資產清冊載入失敗（${response.status}）`);
  return await response.json() as AssetInventory;
}
