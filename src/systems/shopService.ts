import { CONFIG } from "../config";
import { SHOP_PRODUCTS, type ShopProduct } from "../data/shopCatalog";

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
  private state = this.load();

  getState(): ShopSave {
    return structuredClone(this.state);
  }

  getCartTotal(): number {
    return Object.entries(this.state.cart).reduce((total, [productId, quantity]) => {
      const product = SHOP_PRODUCTS.find((candidate) => candidate.id === productId);
      return total + (product?.price ?? 0) * quantity;
    }, 0);
  }

  hasPurchased(productId: string): boolean {
    return this.state.purchasedItems.some(
      (item) => item.productId === productId && item.quantity > 0
    );
  }

  addToCart(productId: string): void {
    if (!this.getProduct(productId)) return;
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
    if (total <= 0) return { ok: false, message: "購物車目前是空的。" };
    if (total > this.state.balance) return { ok: false, message: "旅費不足，請調整購物車內容。" };

    for (const [productId, quantity] of Object.entries(this.state.cart)) {
      const existing = this.state.purchasedItems.find((item) => item.productId === productId);
      if (existing) existing.quantity += quantity;
      else this.state.purchasedItems.push({ productId, quantity });
    }

    this.state.balance -= total;
    this.state.cart = {};
    this.state.completedCheckouts += 1;
    this.persist();
    return { ok: true, message: `結帳完成，共支付 NT$ ${total}。商品已放入旅行袋。` };
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
    const raw = localStorage.getItem(saveKey);
    if (!raw) return createInitialState();
    try {
      const parsed = JSON.parse(raw) as ShopSave;
      return parsed.version === 1 ? parsed : createInitialState();
    } catch {
      return createInitialState();
    }
  }

  private persist(): void {
    localStorage.setItem(saveKey, JSON.stringify(this.state));
    window.dispatchEvent(new CustomEvent("prototype:shop-state"));
  }
}

export const shopService = new ShopService();
