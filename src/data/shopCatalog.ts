import catalog from "../../game/content/shops/shop-catalog.json";

export type ProductCategory =
  | "beauty"
  | "perfume"
  | "liquor"
  | "food"
  | "souvenir"
  | "travel";

export type ShopId = "shop-beauty-01" | "shop-liquor-food-01" | "shop-gift-01";

export interface ShopProduct {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  price: number;
  storeId: ShopId;
}

export interface ShopDefinition {
  id: ShopId;
  name: string;
  welcome: string;
  clerkMessage: string;
  productIds: string[];
}

interface ShopCatalog {
  schemaVersion: 1;
  shops: ShopDefinition[];
  products: ShopProduct[];
}

const runtimeCatalog = catalog as ShopCatalog;

export const SHOPS = runtimeCatalog.shops;
export const SHOP_PRODUCTS = runtimeCatalog.products;

export function getShop(shopId: string): ShopDefinition | undefined {
  return SHOPS.find((shop) => shop.id === shopId);
}

export function getShopProducts(shopId: string): ShopProduct[] {
  return SHOP_PRODUCTS.filter((product) => product.storeId === shopId);
}
