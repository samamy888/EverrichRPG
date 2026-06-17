import { CONFIG } from "../config";
import {
  getProductSalePrice,
  SHOP_PRODUCTS,
  type ShopProduct
} from "../data/shopCatalog";
import { gameStorage, type GameStorage } from "../storage/GameStorage";

export interface PurchasedItem {
  productId: string;
  quantity: number;
}

export interface ShopSave {
  version: 1;
  balance: number;
  cart: Record<string, number>;
  purchasedItems: PurchasedItem[];
  completedCheckouts: number;
}

export interface CheckoutResult {
  ok: boolean;
  message: string;
}

const INITIAL_BALANCE = 1200;
const saveKey = `${CONFIG.saveKey}-shop`;

function createInitialState(): ShopSave {
  return {
    version: 1,
    balance: INITIAL_BALANCE,
    cart: {},
    purchasedItems: [],
    completedCheckouts: 0
  };
}

export class ShopService {
  private state: ShopSave;

  constructor(private readonly storage: GameStorage = gameStorage) {
    this.state = this.load();
  }

  getState(): ShopSave {
    return structuredClone(this.state);
  }

  getCartTotal(): number {
    return Object.entries(this.state.cart).reduce(
      (total, [productId, quantity]) => {
        const product = SHOP_PRODUCTS.find(
          (candidate) => candidate.id === productId
        );
        return total + (product ? getProductSalePrice(product) : 0) * quantity;
      },
      0
    );
  }

  hasPurchased(productId: string): boolean {
    return this.state.purchasedItems.some(
      (item) => item.productId === productId && item.quantity > 0
    );
  }

  addToCart(productId: string): void {
    const product = this.getProduct(productId);
    if (!product) return;
    if ((this.state.cart[productId] ?? 0) >= product.stockQuantity) return;
    this.state.cart[productId] = (this.state.cart[productId] ?? 0) + 1;
    this.persist();
  }

  removeFromCart(productId: string): void {
    const quantity = this.state.cart[productId] ?? 0;
    if (quantity <= 1) {
      delete this.state.cart[productId];
    } else {
      this.state.cart[productId] = quantity - 1;
    }
    this.persist();
  }

  checkout(): CheckoutResult {
    const total = this.getCartTotal();
    if (total <= 0) {
      return { ok: false, message: "購物籃還是空的，先挑幾樣商品吧。" };
    }
    if (total > this.state.balance) {
      return {
        ok: false,
        message: "旅費不足，先移除部分商品或之後再回來購買。"
      };
    }

    for (const [productId, quantity] of Object.entries(this.state.cart)) {
      const existing = this.state.purchasedItems.find(
        (item) => item.productId === productId
      );
      if (existing) existing.quantity += quantity;
      else this.state.purchasedItems.push({ productId, quantity });
    }

    this.state.balance -= total;
    this.state.cart = {};
    this.state.completedCheckouts += 1;
    this.persist();
    return {
      ok: true,
      message: `結帳完成，已扣除 NT$ ${total}，商品已放入旅行袋。`
    };
  }

  credit(amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) return;
    this.state.balance += Math.floor(amount);
    this.persist();
  }

  reset(): void {
    this.state = createInitialState();
    this.persist();
  }

  private getProduct(productId: string): ShopProduct | undefined {
    return SHOP_PRODUCTS.find((product) => product.id === productId);
  }

  private load(): ShopSave {
    return this.storage.readJson(
      saveKey,
      createInitialState,
      (value): value is ShopSave =>
        typeof value === "object" &&
        value !== null &&
        "version" in value &&
        value.version === 1
    );
  }

  private persist(): void {
    this.storage.writeJson(saveKey, this.state);
    window.dispatchEvent(new CustomEvent("prototype:shop-state"));
  }
}

export const shopService = new ShopService();
