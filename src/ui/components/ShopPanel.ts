import {
  getProductSalePrice,
  getShop,
  getShopCatalogSource,
  getShopProducts,
  isProductPromotionActive,
  SHOP_PRODUCTS,
  type ShopId
} from "../../data/shopCatalog";
import { audioManager } from "../../systems/audioManager";
import { shopService } from "../../systems/shopService";
import {
  TRAVELER_QUEST,
  travelerQuestService
} from "../../systems/travelerQuestService";

interface ShopPanelOptions {
  root: HTMLElement;
  onClose: () => void;
}

export class ShopPanel {
  private readonly panel: HTMLElement;
  private readonly title: HTMLHeadingElement;
  private readonly welcome: HTMLParagraphElement;
  private readonly dataSource: HTMLParagraphElement;
  private readonly clerk: HTMLParagraphElement;
  private readonly quest: HTMLElement;
  private readonly products: HTMLDivElement;
  private readonly cart: HTMLDivElement;
  private readonly balance: HTMLSpanElement;
  private readonly total: HTMLSpanElement;
  private readonly purchased: HTMLDivElement;
  private readonly message: HTMLParagraphElement;
  private activeShopId: ShopId | null = null;
  private focusProductId: string | undefined;

  constructor(private readonly options: ShopPanelOptions) {
    this.panel = options.root.querySelector(".shop-panel")!;
    this.title = options.root.querySelector(".shop-title")!;
    this.dataSource = options.root.querySelector(".shop-data-source")!;
    this.welcome = options.root.querySelector(".shop-welcome")!;
    this.clerk = options.root.querySelector(".shop-clerk")!;
    this.quest = options.root.querySelector(".quest-panel")!;
    this.products = options.root.querySelector(".product-list")!;
    this.cart = options.root.querySelector(".cart-list")!;
    this.balance = options.root.querySelector(".shop-balance span")!;
    this.total = options.root.querySelector(".cart-total span")!;
    this.purchased = options.root.querySelector(".purchased-list")!;
    this.message = options.root.querySelector(".checkout-message")!;
    this.bind();
  }

  get isOpen(): boolean {
    return !this.panel.hidden;
  }

  open(shopId: ShopId, focusProductId?: string): void {
    this.activeShopId = shopId;
    this.focusProductId = focusProductId;
    this.message.textContent = "";
    this.render();
    this.panel.hidden = false;
  }

  close(): void {
    if (this.panel.hidden && !this.activeShopId) return;
    this.panel.hidden = true;
    this.activeShopId = null;
    this.focusProductId = undefined;
    this.options.onClose();
  }

  render(): void {
    if (!this.activeShopId) return;
    const shop = getShop(this.activeShopId);
    if (!shop) return;
    const state = shopService.getState();
    const products = getShopProducts(shop.id);
    this.title.textContent = shop.name;
    this.dataSource.textContent =
      getShopCatalogSource() === "api"
        ? "商品資料：後端 API"
        : "商品資料：本機備援";
    this.dataSource.classList.toggle(
      "is-fallback",
      getShopCatalogSource() === "local"
    );
    this.welcome.textContent = shop.welcome;
    this.clerk.textContent = `店員推薦：${shop.clerkMessage}`;
    this.balance.textContent = String(state.balance);
    this.total.textContent = String(shopService.getCartTotal());
    this.renderQuest();
    this.products.innerHTML = products
      .map((product) => {
        const cartQuantity = state.cart[product.id] ?? 0;
        const remainingStock = Math.max(
          0,
          product.stockQuantity - cartQuantity
        );
        const salePrice = getProductSalePrice(product);
        const hasPromotion = isProductPromotionActive(product);
        const promotionPeriod =
          product.promotionStartAt && product.promotionEndAt
            ? `${this.formatDate(product.promotionStartAt)}－${this.formatDate(
                product.promotionEndAt
              )}`
            : null;
        const promotionLabel = hasPromotion
          ? `特價期間：${promotionPeriod}`
          : product.promotionStartAt &&
              product.promotionEndAt &&
              Date.now() < Date.parse(product.promotionStartAt)
            ? `特價預告：${promotionPeriod}`
            : product.promotionEndAt &&
                Date.now() > Date.parse(product.promotionEndAt)
              ? "特價已結束"
              : "目前無促銷";
        return `
          <article class="product-card${product.id === this.focusProductId ? " is-focused" : ""}">
            <div class="product-icon">${this.getCategoryIcon(product.category)}</div>
            <div class="product-copy">
              <span class="product-sku">商品品號：${product.sku}</span>
              <strong class="product-name">${product.name}</strong>
              <p class="product-description">${product.description}</p>
              <div class="product-data-grid">
                <span>售價 <b class="${hasPromotion ? "original-price" : ""}">NT$ ${product.price}</b></span>
                <span>促銷價 <b class="${hasPromotion ? "promotion-price" : ""}">${
                  hasPromotion ? `NT$ ${salePrice}` : "—"
                }</b></span>
                <span>庫存數 <b class="${remainingStock === 0 ? "out-of-stock" : ""}">${remainingStock}</b></span>
              </div>
              <small class="promotion-period${hasPromotion ? " is-active" : ""}">${promotionLabel}</small>
            </div>
            <button type="button" data-add-product="${product.id}" ${
              remainingStock === 0 ? "disabled" : ""
            }>${remainingStock === 0 ? "售完" : "加入"}</button>
          </article>`;
      })
      .join("");
    const cartEntries = Object.entries(state.cart);
    this.cart.innerHTML =
      cartEntries.length === 0
        ? `<p class="cart-empty">購物車還是空的。</p>`
        : cartEntries
            .map(([productId, quantity]) => {
              const product = SHOP_PRODUCTS.find(
                (candidate) => candidate.id === productId
              );
              return product
                ? `<div class="cart-row"><span>${product.name} × ${quantity}</span><button type="button" data-remove-product="${product.id}" aria-label="移除一件">−</button></div>`
                : "";
            })
            .join("");
    this.purchased.innerHTML =
      state.purchasedItems.length === 0
        ? `<p class="cart-empty">結帳後，商品會收進旅行袋。</p>`
        : state.purchasedItems
            .map((item) => {
              const product = SHOP_PRODUCTS.find(
                (candidate) => candidate.id === item.productId
              );
              return product
                ? `<div class="purchased-row"><span>${product.name}</span><strong>× ${item.quantity}</strong></div>`
                : "";
            })
            .join("");
  }

  private renderQuest(): void {
    if (!this.activeShopId) return;
    const state = travelerQuestService.getState();
    const completedIds = travelerQuestService.getCompletedObjectiveIds();
    const isGiverShop = this.activeShopId === TRAVELER_QUEST.giverShopId;
    const objectives = TRAVELER_QUEST.objectives
      .map(
        (objective) => `<li class="${
          completedIds.includes(objective.productId) ? "is-complete" : ""
        }">${completedIds.includes(objective.productId) ? "✓" : "○"} ${
          objective.label
        }</li>`
      )
      .join("");
    let action = "";
    if (state.status === "available" && isGiverShop) {
      action = `<button type="button" data-quest-action="start">接受推薦</button>`;
    } else if (state.status === "ready" && isGiverShop) {
      action = `<button type="button" data-quest-action="complete">回報並領獎</button>`;
    }
    const statusCopy = {
      available: isGiverShop
        ? "店員有一個旅行推薦。"
        : "先到美妝香氛店找店員。",
      active: `進度 ${completedIds.length}/${TRAVELER_QUEST.objectives.length}`,
      ready: isGiverShop
        ? "商品都買齊了，可以回報。"
        : "回美妝香氛店找店員。",
      completed: `已完成，獲得 ${TRAVELER_QUEST.rewardCollectibleName}。`
    }[state.status];
    this.quest.innerHTML = `<div>
      <p class="quest-kicker">TRAVELER QUEST</p>
      <h3>${TRAVELER_QUEST.title}</h3><p>${statusCopy}</p>
      ${state.status === "available" ? "" : `<ul>${objectives}</ul>`}
      </div>${action}`;
  }

  private bind(): void {
    this.options.root
      .querySelector<HTMLButtonElement>(".shop-close")!
      .addEventListener("click", () => this.close());
    this.options.root
      .querySelector<HTMLButtonElement>(".checkout-button")!
      .addEventListener("click", () => {
        const result = shopService.checkout();
        this.message.textContent = result.message;
        this.message.classList.toggle("is-success", result.ok);
        if (result.ok) audioManager.playConfirm();
        this.render();
      });
    this.products.addEventListener("click", (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
        "[data-add-product]"
      );
      if (!button?.dataset.addProduct) return;
      shopService.addToCart(button.dataset.addProduct);
      audioManager.playConfirm();
      this.message.textContent = "已加入購物車。";
    });
    this.cart.addEventListener("click", (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
        "[data-remove-product]"
      );
      if (!button?.dataset.removeProduct) return;
      shopService.removeFromCart(button.dataset.removeProduct);
      this.message.textContent = "";
    });
    this.quest.addEventListener("click", (event) => {
      const action = (event.target as HTMLElement)
        .closest<HTMLButtonElement>("[data-quest-action]")
        ?.dataset.questAction;
      if (action === "start") {
        travelerQuestService.start();
        audioManager.playConfirm();
        this.message.textContent = "已接受店員推薦任務。";
      }
      if (action === "complete" && this.activeShopId) {
        const completed = travelerQuestService.complete(this.activeShopId);
        if (completed) {
          audioManager.playConfirm();
          this.message.textContent = `任務完成！獲得 NT$ ${TRAVELER_QUEST.rewardMoney} 與「${TRAVELER_QUEST.rewardCollectibleName}」。`;
          this.message.classList.add("is-success");
        }
      }
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.isOpen) this.close();
    });
  }

  private getCategoryIcon(category: string): string {
    if (category === "perfume") return "✦";
    if (category === "liquor") return "◒";
    if (category === "food") return "◆";
    if (category === "souvenir") return "★";
    if (category === "travel") return "▣";
    return "●";
  }

  private formatDate(value: string): string {
    return new Intl.DateTimeFormat("zh-TW", {
      timeZone: "Asia/Taipei",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date(value));
  }
}
