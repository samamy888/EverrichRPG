import { CONFIG } from "../config";
import type { ShopId } from "../data/shopCatalog";
import { shopService } from "./shopService";

export type TravelerQuestStatus = "available" | "active" | "ready" | "completed";

export interface TravelerQuestObjective {
  productId: string;
  label: string;
  shopId: ShopId;
}

export interface TravelerQuestDefinition {
  id: "duty-free-gift-tour";
  title: string;
  giverShopId: ShopId;
  description: string;
  objectives: TravelerQuestObjective[];
  rewardMoney: number;
  rewardCollectibleId: string;
  rewardCollectibleName: string;
}

export interface TravelerQuestSave {
  version: 1;
  status: TravelerQuestStatus;
  collectibles: string[];
}

export const TRAVELER_QUEST: TravelerQuestDefinition = {
  id: "duty-free-gift-tour",
  title: "三店伴手禮巡禮",
  giverShopId: "shop-beauty-01",
  description: "依照美妝店員的推薦，到三間免稅店各挑一件指定商品，再回來分享成果。",
  objectives: [
    {
      productId: "perfume-travel-10ml",
      label: "旅行香水 10ml",
      shopId: "shop-beauty-01"
    },
    {
      productId: "food-pineapple-cake-box",
      label: "台灣鳳梨酥",
      shopId: "shop-liquor-food-01"
    },
    {
      productId: "souvenir-postcard-set",
      label: "台灣風景明信片組",
      shopId: "shop-gift-01"
    }
  ],
  rewardMoney: 300,
  rewardCollectibleId: "airport-shopping-pass",
  rewardCollectibleName: "機場購物達人徽章"
};

const saveKey = `${CONFIG.saveKey}-quest`;

function createInitialState(): TravelerQuestSave {
  return { version: 1, status: "available", collectibles: [] };
}

export class TravelerQuestService {
  private state = this.load();

  constructor() {
    window.addEventListener("prototype:shop-state", () => this.syncProgress());
  }

  getState(): TravelerQuestSave {
    this.syncProgress(false);
    return structuredClone(this.state);
  }

  getCompletedObjectiveIds(): string[] {
    return TRAVELER_QUEST.objectives
      .filter((objective) => shopService.hasPurchased(objective.productId))
      .map((objective) => objective.productId);
  }

  start(): void {
    if (this.state.status !== "available") return;
    this.state.status = "active";
    this.persist();
    this.syncProgress();
  }

  complete(currentShopId: ShopId): boolean {
    this.syncProgress(false);
    if (
      currentShopId !== TRAVELER_QUEST.giverShopId ||
      this.state.status !== "ready"
    ) {
      return false;
    }

    this.state.status = "completed";
    if (!this.state.collectibles.includes(TRAVELER_QUEST.rewardCollectibleId)) {
      this.state.collectibles.push(TRAVELER_QUEST.rewardCollectibleId);
    }
    shopService.credit(TRAVELER_QUEST.rewardMoney);
    this.persist();
    return true;
  }

  reset(): void {
    this.state = createInitialState();
    this.persist();
  }

  private syncProgress(emit = true): void {
    if (this.state.status !== "active") return;
    const ready = TRAVELER_QUEST.objectives.every((objective) =>
      shopService.hasPurchased(objective.productId)
    );
    if (!ready) return;
    this.state.status = "ready";
    this.persist(emit);
  }

  private load(): TravelerQuestSave {
    const raw = localStorage.getItem(saveKey);
    if (!raw) return createInitialState();
    try {
      const parsed = JSON.parse(raw) as TravelerQuestSave;
      return parsed.version === 1 ? parsed : createInitialState();
    } catch {
      return createInitialState();
    }
  }

  private persist(emit = true): void {
    localStorage.setItem(saveKey, JSON.stringify(this.state));
    if (emit) window.dispatchEvent(new CustomEvent("prototype:quest-state"));
  }
}

export const travelerQuestService = new TravelerQuestService();
