import { SHOP_PRODUCTS } from "../../data/shopCatalog";
import { audioManager } from "../../systems/audioManager";
import {
  explorationService,
  HIDDEN_COLLECTIBLES,
  REGION_LABELS,
  REGION_ORDER
} from "../../systems/explorationService";
import { shopService } from "../../systems/shopService";
import {
  TRAVELER_QUEST,
  travelerQuestService
} from "../../systems/travelerQuestService";

type MenuView =
  | "home"
  | "map"
  | "passport"
  | "bag"
  | "quest"
  | "settings"
  | "controls";

interface MenuPanelOptions {
  root: HTMLElement;
  onStateChange: (open: boolean) => void;
  onReturnTitle: () => void;
  onBeforeOpen: () => void;
}

export class MenuPanel {
  private readonly panel: HTMLElement;
  private readonly content: HTMLElement;
  private activeView: MenuView = "home";

  constructor(private readonly options: MenuPanelOptions) {
    this.panel = options.root.querySelector(".game-menu")!;
    this.content = options.root.querySelector(".game-menu-content")!;
    this.bind();
  }

  get isOpen(): boolean {
    return !this.panel.hidden;
  }

  open(): void {
    this.options.onBeforeOpen();
    this.activeView = "home";
    this.render();
    this.panel.hidden = false;
    this.options.root.classList.add("menu-is-open");
    this.options.onStateChange(true);
  }

  close(): void {
    if (this.panel.hidden) return;
    this.panel.hidden = true;
    this.options.root.classList.remove("menu-is-open");
    this.options.onStateChange(false);
  }

  toggle(): void {
    this.isOpen ? this.close() : this.open();
  }

  render(): void {
    if (this.panel.hidden && this.activeView !== "home") return;
    this.options.root
      .querySelectorAll<HTMLButtonElement>("[data-menu-view]")
      .forEach((button) => {
        button.classList.toggle(
          "is-active",
          button.dataset.menuView === this.activeView
        );
      });
    const shopState = shopService.getState();
    const questState = travelerQuestService.getState();
    const completedObjectiveIds =
      travelerQuestService.getCompletedObjectiveIds();
    const explorationState = explorationService.getState();

    if (this.activeView === "home") {
      this.content.innerHTML = `
        <p class="menu-kicker">JOURNEY OVERVIEW</p>
        <h2>旅程總覽</h2>
        <div class="menu-stat-grid">
          <article><span>旅費</span><strong>NT$ ${shopState.balance}</strong></article>
          <article><span>購買種類</span><strong>${shopState.purchasedItems.length}</strong></article>
          <article><span>結帳次數</span><strong>${shopState.completedCheckouts}</strong></article>
          <article><span>任務狀態</span><strong>${this.getQuestStatusLabel(questState.status)}</strong></article>
        </div>
        <p class="menu-note">遊戲會在移動、切換區域與購物後自動儲存。</p>`;
      return;
    }
    if (this.activeView === "map") {
      const node = (regionId: keyof typeof REGION_LABELS): string => {
        const visited = explorationState.visitedRegionIds.includes(regionId);
        const current = explorationState.currentRegionId === regionId;
        const stamp = HIDDEN_COLLECTIBLES.find(
          (collectible) => collectible.regionId === regionId
        );
        const stampFound = stamp
          ? explorationState.collectibleIds.includes(stamp.id)
          : false;
        return `<article class="airport-map-node${visited ? " is-visited" : ""}${
          current ? " is-current" : ""
        }"><span>${current ? "目前位置" : visited ? "已到訪" : "未探索"}</span>
          <strong>${visited || current ? REGION_LABELS[regionId] : "？？？？？"}</strong>
          <small>${stampFound ? "★ 紀念章已發現" : "☆ 紀念章未發現"}</small></article>`;
      };
      this.content.innerHTML = `
        <p class="menu-kicker">AIRPORT NAVIGATOR</p><h2>機場導覽</h2>
        <p>實際走進區域後，導覽內容才會登錄。</p>
        <div class="airport-map">
          <div class="map-top">${node("shop-beauty-01")}</div>
          <div class="map-middle">${node("shop-liquor-food-01")}${node("duty-free-central")}${node("shop-gift-01")}</div>
          <div class="map-middle">${node("information-core")}${node("departure-hall")}${node("airport-facilities")}</div>
          <div class="map-bottom">${node("security-check")}</div>
          <div class="map-bottom">${node("duty-free-entrance")}</div>
        </div>`;
      return;
    }
    if (this.activeView === "passport") {
      const stamps = HIDDEN_COLLECTIBLES.map((collectible) => {
        const found = explorationState.collectibleIds.includes(collectible.id);
        return `<li class="${found ? "is-complete" : ""}">
          <span>${found ? "★" : "？"} ${found ? collectible.name : "尚未發現"}</span>
          <small>${REGION_LABELS[collectible.regionId]}</small></li>`;
      }).join("");
      this.content.innerHTML = `
        <p class="menu-kicker">TRAVELER PASSPORT</p><h2>旅客護照</h2>
        <div class="passport-summary">
          <article><span>探索完成率</span><strong>${explorationService.getExplorationPercent()}%</strong></article>
          <article><span>到訪區域</span><strong>${explorationState.visitedRegionIds.length}/${REGION_ORDER.length}</strong></article>
          <article><span>遇見人物</span><strong>${explorationState.metNpcIds.length}/11</strong></article>
          <article><span>購買商品</span><strong>${shopState.purchasedItems.length}/${SHOP_PRODUCTS.length}</strong></article>
        </div><h3>機場紀念章</h3><ul class="passport-stamps">${stamps}</ul>`;
      return;
    }
    if (this.activeView === "bag") {
      const items = shopState.purchasedItems
        .map((item) => {
          const product = SHOP_PRODUCTS.find(
            (candidate) => candidate.id === item.productId
          );
          return product
            ? `<li><span>${product.name}</span><strong>× ${item.quantity}</strong></li>`
            : "";
        })
        .join("");
      this.content.innerHTML = `
        <p class="menu-kicker">TRAVEL BAG</p><h2>旅行袋</h2>
        <p>目前旅費：<strong>NT$ ${shopState.balance}</strong></p>
        <ul class="menu-item-list">${items || "<li>旅行袋目前是空的。</li>"}</ul>
        ${
          questState.collectibles.length > 0
            ? `<h3>收藏品</h3><p class="menu-badge">★ ${TRAVELER_QUEST.rewardCollectibleName}</p>`
            : ""
        }`;
      return;
    }
    if (this.activeView === "quest") {
      const objectives = TRAVELER_QUEST.objectives
        .map(
          (objective) =>
            `<li class="${completedObjectiveIds.includes(objective.productId) ? "is-complete" : ""}">
              ${completedObjectiveIds.includes(objective.productId) ? "✓" : "○"}
              <span>${objective.label}</span></li>`
        )
        .join("");
      this.content.innerHTML = `
        <p class="menu-kicker">QUEST LOG</p><h2>${TRAVELER_QUEST.title}</h2>
        <p>${TRAVELER_QUEST.description}</p>
        <p class="menu-quest-status">狀態：${this.getQuestStatusLabel(questState.status)}</p>
        <ul class="menu-objectives">${objectives}</ul>
        <p>獎勵：NT$ ${TRAVELER_QUEST.rewardMoney}＋${TRAVELER_QUEST.rewardCollectibleName}</p>`;
      return;
    }
    if (this.activeView === "settings") {
      this.content.innerHTML = `
        <p class="menu-kicker">SETTINGS</p><h2>設定</h2>
        <div class="menu-setting-row">
          <div><strong>遊戲音效</strong><p>背景氛圍、腳步與介面音效。</p></div>
          <button type="button" data-menu-action="toggle-audio">${audioManager.isMuted() ? "開啟" : "關閉"}</button>
        </div>
        <div class="menu-setting-row">
          <div><strong>BGM 音量</strong><p>調整背景音樂，不影響互動音效。</p></div>
          <label><span data-music-volume-label>${Math.round(audioManager.getMusicVolume() * 100)}%</span>
          <input type="range" min="0" max="100" step="5"
            value="${Math.round(audioManager.getMusicVolume() * 100)}"
            data-music-volume aria-label="BGM 音量" /></label>
        </div>
        <div class="menu-setting-row is-static">
          <div><strong>自動存檔</strong><p>移動、購物及切換區域時自動儲存。</p></div><span>已開啟</span>
        </div><p class="menu-note">時間流逝系統目前尚未啟用。</p>`;
      return;
    }
    this.content.innerHTML = `
      <p class="menu-kicker">CONTROLS</p><h2>操作說明</h2>
      <dl class="menu-controls-list">
        <div><dt>移動</dt><dd>方向鍵 / WASD / 滑鼠按住 / 手機蘑菇頭</dd></div>
        <div><dt>互動</dt><dd>A / Enter / Space</dd></div>
        <div><dt>走路／跑步</dt><dd>Shift / B</dd></div>
        <div><dt>開啟選單</dt><dd>M / MENU</dd></div>
        <div><dt>關閉視窗</dt><dd>Escape</dd></div>
        <div><dt>碰撞除錯</dt><dd>E</dd></div>
      </dl>`;
  }

  private bind(): void {
    this.panel.addEventListener("click", (event) => {
      const target = (event.target as HTMLElement).closest<HTMLButtonElement>(
        "button"
      );
      const view = target?.dataset.menuView as MenuView | undefined;
      const action = target?.dataset.menuAction;
      if (view) {
        this.activeView = view;
        audioManager.playConfirm();
        this.render();
      }
      if (action === "close") this.close();
      if (action === "return-title") {
        this.close();
        this.options.onReturnTitle();
      }
      if (action === "toggle-audio") {
        audioManager.toggleMuted();
        this.render();
      }
    });
    this.panel.addEventListener("input", (event) => {
      const slider = (event.target as HTMLElement).closest<HTMLInputElement>(
        "[data-music-volume]"
      );
      if (!slider) return;
      audioManager.setMusicVolume(Number(slider.value) / 100);
      const label = this.panel.querySelector<HTMLElement>(
        "[data-music-volume-label]"
      );
      if (label) label.textContent = `${slider.value}%`;
    });
    window.addEventListener("keydown", (event) => {
      if (event.key.toLowerCase() === "m") {
        event.preventDefault();
        this.toggle();
      }
      if (event.key === "Escape" && this.isOpen) {
        event.preventDefault();
        this.close();
      }
    });
  }

  private getQuestStatusLabel(status: string): string {
    return {
      available: "尚未接受",
      active: "進行中",
      ready: "可以回報",
      completed: "已完成"
    }[status] ?? status;
  }
}
