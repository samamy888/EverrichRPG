import type {
  PrototypeDialogueDetail,
  PrototypeInteractionHintDetail,
  PrototypeMovementModeDetail,
  PrototypeShopOpenDetail,
  PrototypeStatusDetail
} from "../core/prototypeEvents";
import { getShop, getShopProducts, SHOP_PRODUCTS } from "../data/shopCatalog";
import type { ShopId } from "../data/shopCatalog";
import { audioManager } from "../systems/audioManager";
import {
  explorationService,
  HIDDEN_COLLECTIBLES,
  REGION_LABELS,
  REGION_ORDER
} from "../systems/explorationService";
import { shopService } from "../systems/shopService";
import { TRAVELER_QUEST, travelerQuestService } from "../systems/travelerQuestService";

type Direction = "up" | "down" | "left" | "right";
type MenuView =
  | "home"
  | "map"
  | "passport"
  | "bag"
  | "quest"
  | "settings"
  | "controls";

export class UIOverlay {
  private readonly root: HTMLDivElement;
  private readonly regionLabel: HTMLParagraphElement;
  private readonly statusLabel: HTMLParagraphElement;
  private readonly questHud: HTMLParagraphElement;
  private readonly dialogue: HTMLElement;
  private readonly dialogueTitle: HTMLParagraphElement;
  private readonly dialogueText: HTMLParagraphElement;
  private readonly actionButton: HTMLButtonElement;
  private readonly runButton: HTMLButtonElement;
  private readonly shopPanel: HTMLElement;
  private readonly shopTitle: HTMLHeadingElement;
  private readonly shopWelcome: HTMLParagraphElement;
  private readonly shopClerk: HTMLParagraphElement;
  private readonly questPanel: HTMLElement;
  private readonly productList: HTMLDivElement;
  private readonly cartList: HTMLDivElement;
  private readonly shopBalance: HTMLSpanElement;
  private readonly cartTotal: HTMLSpanElement;
  private readonly purchasedList: HTMLDivElement;
  private readonly checkoutMessage: HTMLParagraphElement;
  private readonly menuPanel: HTMLElement;
  private readonly menuContent: HTMLElement;
  private activeShopId: ShopId | null = null;
  private focusProductId: string | undefined;
  private activeMenuView: MenuView = "home";

  constructor(parent: HTMLElement) {
    this.root = document.createElement("div");
    this.root.id = "ui-overlay";
    this.root.innerHTML = `
      <section class="prototype-hud">
        <p class="prototype-title">EVER RICH RPG · PHASE 5</p>
        <p class="prototype-region">準備進入免稅店</p>
        <p class="prototype-status">讀取旅客資料中</p>
        <p class="prototype-quest">任務：尚未接受</p>
      </section>
      <section class="dialogue-box" aria-live="polite" hidden>
        <p class="dialogue-title"></p>
        <p class="dialogue-text"></p>
        <span class="dialogue-next">A / Enter 繼續</span>
      </section>
      <section class="game-menu" aria-label="遊戲選單" hidden>
        <aside class="game-menu-nav">
          <div>
            <p class="menu-kicker">TRAVELER MENU</p>
            <h2>旅客選單</h2>
          </div>
          <nav>
            <button type="button" data-menu-view="home">總覽</button>
            <button type="button" data-menu-view="map">機場導覽</button>
            <button type="button" data-menu-view="passport">旅客護照</button>
            <button type="button" data-menu-view="bag">旅行袋</button>
            <button type="button" data-menu-view="quest">任務</button>
            <button type="button" data-menu-view="settings">設定</button>
            <button type="button" data-menu-view="controls">操作說明</button>
          </nav>
          <button class="menu-return-title" type="button" data-menu-action="return-title">回到角色選擇</button>
        </aside>
        <main class="game-menu-main">
          <button class="menu-close" type="button" data-menu-action="close" aria-label="關閉選單">×</button>
          <div class="game-menu-content"></div>
        </main>
      </section>
      <section class="shop-panel" aria-label="免稅店購物介面" hidden>
        <header class="shop-header">
          <div>
            <p class="shop-kicker">DUTY FREE SHOP</p>
            <h2 class="shop-title"></h2>
            <p class="shop-welcome"></p>
            <p class="shop-clerk"></p>
          </div>
          <button class="shop-close" type="button" aria-label="關閉商店">×</button>
        </header>
        <div class="shop-content">
          <div class="shop-products">
            <section class="quest-panel"></section>
            <h3>商品</h3>
            <div class="product-list"></div>
          </div>
          <aside class="shop-cart">
            <div class="shop-balance">旅費 <strong>NT$ <span></span></strong></div>
            <h3>購物車</h3>
            <div class="cart-list"></div>
            <div class="cart-total">合計 <strong>NT$ <span>0</span></strong></div>
            <button class="checkout-button" type="button">結帳</button>
            <p class="checkout-message" aria-live="polite"></p>
            <h3>旅行袋</h3>
            <div class="purchased-list"></div>
          </aside>
        </div>
      </section>
      <section class="touch-controls" aria-label="行動裝置操作">
        <div class="dpad">
          <button data-directions="up,left" aria-label="左上">↖</button>
          <button data-direction="up" aria-label="向上">↑</button>
          <button data-directions="up,right" aria-label="右上">↗</button>
          <button data-direction="left" aria-label="向左">←</button>
          <button data-direction="down" aria-label="向下">↓</button>
          <button data-direction="right" aria-label="向右">→</button>
          <button data-directions="down,left" aria-label="左下">↙</button>
          <button data-directions="down,right" aria-label="右下">↘</button>
        </div>
        <div class="mobile-actions">
          <button class="small-action menu-button" data-action="menu" aria-label="開啟選單">MENU</button>
          <button class="small-action back-button" data-action="back" aria-label="切換跑步">B</button>
          <button class="action-button" data-action="action" aria-label="互動">A</button>
        </div>
      </section>
    `;
    parent.appendChild(this.root);

    this.regionLabel = this.root.querySelector(".prototype-region")!;
    this.statusLabel = this.root.querySelector(".prototype-status")!;
    this.questHud = this.root.querySelector(".prototype-quest")!;
    this.dialogue = this.root.querySelector(".dialogue-box")!;
    this.dialogueTitle = this.root.querySelector(".dialogue-title")!;
    this.dialogueText = this.root.querySelector(".dialogue-text")!;
    this.actionButton = this.root.querySelector(".action-button")!;
    this.runButton = this.root.querySelector(".back-button")!;
    this.shopPanel = this.root.querySelector(".shop-panel")!;
    this.shopTitle = this.root.querySelector(".shop-title")!;
    this.shopWelcome = this.root.querySelector(".shop-welcome")!;
    this.shopClerk = this.root.querySelector(".shop-clerk")!;
    this.questPanel = this.root.querySelector(".quest-panel")!;
    this.productList = this.root.querySelector(".product-list")!;
    this.cartList = this.root.querySelector(".cart-list")!;
    this.shopBalance = this.root.querySelector(".shop-balance span")!;
    this.cartTotal = this.root.querySelector(".cart-total span")!;
    this.purchasedList = this.root.querySelector(".purchased-list")!;
    this.checkoutMessage = this.root.querySelector(".checkout-message")!;
    this.menuPanel = this.root.querySelector(".game-menu")!;
    this.menuContent = this.root.querySelector(".game-menu-content")!;

    this.bindTouchControls();
    this.bindShopControls();
    this.bindMenuControls();
    this.bindGameEvents();
    this.bindAudioUnlock();
    this.renderQuestHud();
  }

  private bindGameEvents(): void {
    window.addEventListener("prototype:status", (event) => {
      const detail = (event as CustomEvent<PrototypeStatusDetail>).detail;
      this.regionLabel.textContent = detail.regionName;
      this.statusLabel.textContent = `${detail.message} · ${
        detail.playerVariant === "male" ? "男旅客" : "女旅客"
      }`;
    });
    window.addEventListener("prototype:dialogue", (event) => {
      const detail = (event as CustomEvent<PrototypeDialogueDetail>).detail;
      this.dialogueTitle.textContent = detail.title;
      this.dialogueText.textContent = detail.lines.join("\n");
      this.dialogue.hidden = false;
    });
    window.addEventListener("prototype:dialogue-close", () => {
      this.dialogue.hidden = true;
    });
    window.addEventListener("prototype:interaction-hint", (event) => {
      const detail = (event as CustomEvent<PrototypeInteractionHintDetail>).detail;
      this.actionButton.classList.toggle("is-ready", detail.available);
      this.actionButton.setAttribute(
        "aria-label",
        detail.available && detail.label ? detail.label : "互動"
      );
    });
    window.addEventListener("prototype:movement-mode", (event) => {
      const detail = (event as CustomEvent<PrototypeMovementModeDetail>).detail;
      this.runButton.classList.toggle("is-running", detail.running);
      this.runButton.textContent = detail.running ? "RUN" : "B";
      this.runButton.setAttribute("aria-label", detail.running ? "目前為跑步" : "切換跑步");
    });
    window.addEventListener("prototype:shop-open", (event) => {
      const detail = (event as CustomEvent<PrototypeShopOpenDetail>).detail;
      this.activeShopId = detail.shopId;
      this.focusProductId = detail.focusProductId;
      this.checkoutMessage.textContent = "";
      this.renderShop();
      this.shopPanel.hidden = false;
    });
    window.addEventListener("prototype:shop-state", () => {
      this.renderShop();
      this.renderQuestHud();
      this.renderMenu();
    });
    window.addEventListener("prototype:quest-state", () => {
      this.renderShop();
      this.renderQuestHud();
      this.renderMenu();
    });
    window.addEventListener("prototype:exploration-state", () => this.renderMenu());
    window.addEventListener("prototype:shop-dismiss", () => this.closeShop());
    window.addEventListener("prototype:menu-open-request", () => this.openMenu());
  }

  private bindMenuControls(): void {
    this.menuPanel.addEventListener("click", (event) => {
      const target = (event.target as HTMLElement).closest<HTMLButtonElement>("button");
      const view = target?.dataset.menuView as MenuView | undefined;
      const action = target?.dataset.menuAction;
      if (view) {
        this.activeMenuView = view;
        audioManager.playConfirm();
        this.renderMenu();
      }
      if (action === "close") this.closeMenu();
      if (action === "return-title") {
        this.closeMenu();
        window.dispatchEvent(new CustomEvent("prototype:return-title"));
      }
      if (action === "toggle-audio") {
        audioManager.toggleMuted();
        this.renderMenu();
      }
    });
    this.menuPanel.addEventListener("input", (event) => {
      const slider = (event.target as HTMLElement).closest<HTMLInputElement>(
        "[data-music-volume]"
      );
      if (!slider) return;
      audioManager.setMusicVolume(Number(slider.value) / 100);
      const valueLabel = this.menuPanel.querySelector<HTMLElement>("[data-music-volume-label]");
      if (valueLabel) valueLabel.textContent = `${slider.value}%`;
    });

    window.addEventListener("keydown", (event) => {
      if (event.key.toLowerCase() === "m") {
        event.preventDefault();
        this.menuPanel.hidden ? this.openMenu() : this.closeMenu();
      }
      if (event.key === "Escape" && !this.menuPanel.hidden) {
        event.preventDefault();
        this.closeMenu();
      }
    });
  }

  private openMenu(): void {
    if (!this.shopPanel.hidden) this.closeShop();
    this.dialogue.hidden = true;
    this.activeMenuView = "home";
    this.renderMenu();
    this.menuPanel.hidden = false;
    window.dispatchEvent(new CustomEvent("prototype:menu-state", { detail: { open: true } }));
  }

  private closeMenu(): void {
    if (this.menuPanel.hidden) return;
    this.menuPanel.hidden = true;
    window.dispatchEvent(new CustomEvent("prototype:menu-state", { detail: { open: false } }));
  }

  private renderMenu(): void {
    if (this.menuPanel.hidden && this.activeMenuView !== "home") return;
    this.root.querySelectorAll<HTMLButtonElement>("[data-menu-view]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.menuView === this.activeMenuView);
    });

    const shopState = shopService.getState();
    const questState = travelerQuestService.getState();
    const completedObjectiveIds = travelerQuestService.getCompletedObjectiveIds();
    const explorationState = explorationService.getState();

    if (this.activeMenuView === "home") {
      this.menuContent.innerHTML = `
        <p class="menu-kicker">JOURNEY OVERVIEW</p>
        <h2>旅程總覽</h2>
        <div class="menu-stat-grid">
          <article><span>旅費</span><strong>NT$ ${shopState.balance}</strong></article>
          <article><span>購買種類</span><strong>${shopState.purchasedItems.length}</strong></article>
          <article><span>結帳次數</span><strong>${shopState.completedCheckouts}</strong></article>
          <article><span>任務狀態</span><strong>${this.getQuestStatusLabel(questState.status)}</strong></article>
        </div>
        <p class="menu-note">遊戲會在移動、切換區域與購物後自動儲存。</p>
      `;
      return;
    }

    if (this.activeMenuView === "map") {
      const node = (regionId: keyof typeof REGION_LABELS): string => {
        const visited = explorationState.visitedRegionIds.includes(regionId);
        const current = explorationState.currentRegionId === regionId;
        const stamp = HIDDEN_COLLECTIBLES.find(
          (collectible) => collectible.regionId === regionId
        );
        const stampFound = stamp
          ? explorationState.collectibleIds.includes(stamp.id)
          : false;
        return `
          <article class="airport-map-node${visited ? " is-visited" : ""}${
            current ? " is-current" : ""
          }">
            <span>${current ? "目前位置" : visited ? "已到訪" : "未探索"}</span>
            <strong>${visited || current ? REGION_LABELS[regionId] : "？？？？？"}</strong>
            <small>${stampFound ? "★ 紀念章已發現" : "☆ 紀念章未發現"}</small>
          </article>
        `;
      };
      this.menuContent.innerHTML = `
        <p class="menu-kicker">AIRPORT NAVIGATOR</p>
        <h2>機場導覽</h2>
        <p>實際走進區域後，導覽內容才會登錄。</p>
        <div class="airport-map">
          <div class="map-top">${node("shop-beauty-01")}</div>
          <div class="map-middle">
            ${node("shop-liquor-food-01")}
            ${node("duty-free-central")}
            ${node("shop-gift-01")}
          </div>
          <div class="map-bottom">${node("duty-free-entrance")}</div>
        </div>
      `;
      return;
    }

    if (this.activeMenuView === "passport") {
      const stamps = HIDDEN_COLLECTIBLES.map((collectible) => {
        const found = explorationState.collectibleIds.includes(collectible.id);
        return `
          <li class="${found ? "is-complete" : ""}">
            <span>${found ? "★" : "？"} ${found ? collectible.name : "尚未發現"}</span>
            <small>${REGION_LABELS[collectible.regionId]}</small>
          </li>
        `;
      }).join("");
      this.menuContent.innerHTML = `
        <p class="menu-kicker">TRAVELER PASSPORT</p>
        <h2>旅客護照</h2>
        <div class="passport-summary">
          <article><span>探索完成率</span><strong>${explorationService.getExplorationPercent()}%</strong></article>
          <article><span>到訪區域</span><strong>${explorationState.visitedRegionIds.length}/${REGION_ORDER.length}</strong></article>
          <article><span>遇見人物</span><strong>${explorationState.metNpcIds.length}/6</strong></article>
          <article><span>購買商品</span><strong>${shopState.purchasedItems.length}/${SHOP_PRODUCTS.length}</strong></article>
        </div>
        <h3>機場紀念章</h3>
        <ul class="passport-stamps">${stamps}</ul>
      `;
      return;
    }

    if (this.activeMenuView === "bag") {
      const items = shopState.purchasedItems
        .map((item) => {
          const product = SHOP_PRODUCTS.find((candidate) => candidate.id === item.productId);
          return product
            ? `<li><span>${product.name}</span><strong>× ${item.quantity}</strong></li>`
            : "";
        })
        .join("");
      this.menuContent.innerHTML = `
        <p class="menu-kicker">TRAVEL BAG</p>
        <h2>旅行袋</h2>
        <p>目前旅費：<strong>NT$ ${shopState.balance}</strong></p>
        <ul class="menu-item-list">${items || "<li>旅行袋目前是空的。</li>"}</ul>
        ${
          questState.collectibles.length > 0
            ? `<h3>收藏品</h3><p class="menu-badge">★ ${TRAVELER_QUEST.rewardCollectibleName}</p>`
            : ""
        }
      `;
      return;
    }

    if (this.activeMenuView === "quest") {
      const objectives = TRAVELER_QUEST.objectives
        .map(
          (objective) => `
            <li class="${completedObjectiveIds.includes(objective.productId) ? "is-complete" : ""}">
              ${completedObjectiveIds.includes(objective.productId) ? "✓" : "○"}
              <span>${objective.label}</span>
            </li>
          `
        )
        .join("");
      this.menuContent.innerHTML = `
        <p class="menu-kicker">QUEST LOG</p>
        <h2>${TRAVELER_QUEST.title}</h2>
        <p>${TRAVELER_QUEST.description}</p>
        <p class="menu-quest-status">狀態：${this.getQuestStatusLabel(questState.status)}</p>
        <ul class="menu-objectives">${objectives}</ul>
        <p>獎勵：NT$ ${TRAVELER_QUEST.rewardMoney}＋${TRAVELER_QUEST.rewardCollectibleName}</p>
      `;
      return;
    }

    if (this.activeMenuView === "settings") {
      this.menuContent.innerHTML = `
        <p class="menu-kicker">SETTINGS</p>
        <h2>設定</h2>
        <div class="menu-setting-row">
          <div><strong>遊戲音效</strong><p>背景氛圍、腳步與介面音效。</p></div>
          <button type="button" data-menu-action="toggle-audio">${
            audioManager.isMuted() ? "開啟" : "關閉"
          }</button>
        </div>
        <div class="menu-setting-row">
          <div>
            <strong>BGM 音量</strong>
            <p>調整背景音樂，不影響互動音效。</p>
          </div>
          <label>
            <span data-music-volume-label>${Math.round(
              audioManager.getMusicVolume() * 100
            )}%</span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value="${Math.round(audioManager.getMusicVolume() * 100)}"
              data-music-volume
              aria-label="BGM 音量"
            />
          </label>
        </div>
        <div class="menu-setting-row is-static">
          <div><strong>自動存檔</strong><p>移動、購物及切換區域時自動儲存。</p></div>
          <span>已開啟</span>
        </div>
        <p class="menu-note">時間流逝系統目前尚未啟用。</p>
      `;
      return;
    }

    this.menuContent.innerHTML = `
      <p class="menu-kicker">CONTROLS</p>
      <h2>操作說明</h2>
      <dl class="menu-controls-list">
        <div><dt>移動</dt><dd>方向鍵 / WASD / 手機方向鍵</dd></div>
        <div><dt>互動</dt><dd>A / Enter / Space</dd></div>
        <div><dt>走路／跑步</dt><dd>Shift / B</dd></div>
        <div><dt>開啟選單</dt><dd>M / MENU</dd></div>
        <div><dt>關閉視窗</dt><dd>Escape</dd></div>
        <div><dt>碰撞除錯</dt><dd>E</dd></div>
      </dl>
    `;
  }

  private getQuestStatusLabel(status: string): string {
    return {
      available: "尚未接受",
      active: "進行中",
      ready: "可以回報",
      completed: "已完成"
    }[status] ?? status;
  }

  private bindShopControls(): void {
    this.root.querySelector<HTMLButtonElement>(".shop-close")!.addEventListener("click", () => {
      this.closeShop();
    });
    this.root.querySelector<HTMLButtonElement>(".checkout-button")!.addEventListener("click", () => {
      const result = shopService.checkout();
      this.checkoutMessage.textContent = result.message;
      this.checkoutMessage.classList.toggle("is-success", result.ok);
      if (result.ok) audioManager.playConfirm();
      this.renderShop();
    });
    this.productList.addEventListener("click", (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-add-product]");
      if (!button?.dataset.addProduct) return;
      shopService.addToCart(button.dataset.addProduct);
      audioManager.playConfirm();
      this.checkoutMessage.textContent = "已加入購物車。";
    });
    this.cartList.addEventListener("click", (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-remove-product]");
      if (!button?.dataset.removeProduct) return;
      shopService.removeFromCart(button.dataset.removeProduct);
      this.checkoutMessage.textContent = "";
    });
    this.questPanel.addEventListener("click", (event) => {
      const action = (event.target as HTMLElement)
        .closest<HTMLButtonElement>("[data-quest-action]")
        ?.dataset.questAction;
      if (action === "start") {
        travelerQuestService.start();
        audioManager.playConfirm();
        this.checkoutMessage.textContent = "已接受店員推薦任務。";
      }
      if (action === "complete" && this.activeShopId) {
        const completed = travelerQuestService.complete(this.activeShopId);
        if (completed) {
          audioManager.playConfirm();
          this.checkoutMessage.textContent = `任務完成！獲得 NT$ ${TRAVELER_QUEST.rewardMoney} 與「${TRAVELER_QUEST.rewardCollectibleName}」。`;
          this.checkoutMessage.classList.add("is-success");
        }
      }
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !this.shopPanel.hidden) this.closeShop();
    });
  }

  private renderShop(): void {
    if (!this.activeShopId) return;
    const shop = getShop(this.activeShopId);
    if (!shop) return;
    const state = shopService.getState();
    const products = getShopProducts(shop.id);
    this.shopTitle.textContent = shop.name;
    this.shopWelcome.textContent = shop.welcome;
    this.shopClerk.textContent = `店員推薦：${shop.clerkMessage}`;
    this.shopBalance.textContent = String(state.balance);
    this.cartTotal.textContent = String(shopService.getCartTotal());
    this.renderQuestPanel();
    this.productList.innerHTML = products
      .map(
        (product) => `
          <article class="product-card${product.id === this.focusProductId ? " is-focused" : ""}">
            <div class="product-icon">${this.getCategoryIcon(product.category)}</div>
            <div class="product-copy">
              <strong>${product.name}</strong>
              <p>${product.description}</p>
              <span>NT$ ${product.price}</span>
            </div>
            <button type="button" data-add-product="${product.id}">加入</button>
          </article>
        `
      )
      .join("");

    const cartEntries = Object.entries(state.cart);
    this.cartList.innerHTML =
      cartEntries.length === 0
        ? `<p class="cart-empty">購物車還是空的。</p>`
        : cartEntries
            .map(([productId, quantity]) => {
              const product = SHOP_PRODUCTS.find((candidate) => candidate.id === productId);
              return product
                ? `<div class="cart-row"><span>${product.name} × ${quantity}</span><button type="button" data-remove-product="${product.id}" aria-label="移除一件">−</button></div>`
                : "";
            })
            .join("");

    this.purchasedList.innerHTML =
      state.purchasedItems.length === 0
        ? `<p class="cart-empty">結帳後，商品會收進旅行袋。</p>`
        : state.purchasedItems
            .map((item) => {
              const product = SHOP_PRODUCTS.find((candidate) => candidate.id === item.productId);
              return product
                ? `<div class="purchased-row"><span>${product.name}</span><strong>× ${item.quantity}</strong></div>`
                : "";
            })
            .join("");
  }

  private renderQuestPanel(): void {
    if (!this.activeShopId) return;
    const state = travelerQuestService.getState();
    const completedIds = travelerQuestService.getCompletedObjectiveIds();
    const isGiverShop = this.activeShopId === TRAVELER_QUEST.giverShopId;
    const objectives = TRAVELER_QUEST.objectives
      .map(
        (objective) => `
          <li class="${completedIds.includes(objective.productId) ? "is-complete" : ""}">
            ${completedIds.includes(objective.productId) ? "✓" : "○"} ${objective.label}
          </li>
        `
      )
      .join("");

    let action = "";
    if (state.status === "available" && isGiverShop) {
      action = `<button type="button" data-quest-action="start">接受推薦</button>`;
    } else if (state.status === "ready" && isGiverShop) {
      action = `<button type="button" data-quest-action="complete">回報並領獎</button>`;
    }

    const statusCopy = {
      available: isGiverShop ? "店員有一個旅行推薦。" : "先到美妝香氛店找店員。",
      active: `進度 ${completedIds.length}/${TRAVELER_QUEST.objectives.length}`,
      ready: isGiverShop ? "商品都買齊了，可以回報。" : "回美妝香氛店找店員。",
      completed: `已完成，獲得 ${TRAVELER_QUEST.rewardCollectibleName}。`
    }[state.status];

    this.questPanel.innerHTML = `
      <div>
        <p class="quest-kicker">TRAVELER QUEST</p>
        <h3>${TRAVELER_QUEST.title}</h3>
        <p>${statusCopy}</p>
        ${state.status === "available" ? "" : `<ul>${objectives}</ul>`}
      </div>
      ${action}
    `;
  }

  private renderQuestHud(): void {
    const state = travelerQuestService.getState();
    const completed = travelerQuestService.getCompletedObjectiveIds().length;
    this.questHud.textContent = {
      available: "任務：到美妝香氛店接受推薦",
      active: `任務：三店伴手禮巡禮 ${completed}/3`,
      ready: "任務：回美妝香氛店領取獎勵",
      completed: `任務完成：${TRAVELER_QUEST.rewardCollectibleName}`
    }[state.status];
  }

  private closeShop(): void {
    this.shopPanel.hidden = true;
    this.activeShopId = null;
    this.focusProductId = undefined;
    window.dispatchEvent(new CustomEvent("prototype:shop-close"));
  }

  private getCategoryIcon(category: string): string {
    if (category === "perfume") return "✦";
    if (category === "liquor") return "◒";
    if (category === "food") return "◆";
    if (category === "souvenir") return "★";
    if (category === "travel") return "▣";
    return "●";
  }

  private bindTouchControls(): void {
    const buttons =
      this.root.querySelectorAll<HTMLButtonElement>("[data-direction], [data-directions]");
    buttons.forEach((button) => {
      const directions = (button.dataset.directions ?? button.dataset.direction ?? "")
        .split(",")
        .filter(Boolean) as Direction[];
      const emit = (pressed: boolean): void => {
        directions.forEach((direction) => {
          window.dispatchEvent(
            new CustomEvent("prototype:touch", { detail: { direction, pressed } })
          );
        });
      };
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        emit(true);
      });
      button.addEventListener("pointerup", () => emit(false));
      button.addEventListener("pointercancel", () => emit(false));
      button.addEventListener("lostpointercapture", () => emit(false));
    });

    this.root.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((button) => {
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        audioManager.unlock();
        window.dispatchEvent(new CustomEvent(`prototype:${button.dataset.action}`));
      });
    });
  }

  private bindAudioUnlock(): void {
    const unlock = (): void => audioManager.unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
  }
}
