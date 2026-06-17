import { audioManager } from "../systems/audioManager";
import {
  type PrototypeDialogueDetail,
  type PrototypeInteractionHintDetail,
  type PrototypeMovementModeDetail,
  type PrototypeShopOpenDetail,
  type PrototypeStatusDetail
} from "../core/prototypeEvents";
import {
  TRAVELER_QUEST,
  travelerQuestService
} from "../systems/travelerQuestService";
import { DialoguePanel } from "./components/DialoguePanel";
import { MenuPanel } from "./components/MenuPanel";
import { ShopPanel } from "./components/ShopPanel";
import { TouchControls } from "./components/TouchControls";
import { OVERLAY_TEMPLATE } from "./overlayTemplate";

export class UIOverlay {
  private readonly root: HTMLDivElement;
  private readonly regionLabel: HTMLParagraphElement;
  private readonly statusLabel: HTMLParagraphElement;
  private readonly questHud: HTMLDivElement;
  private readonly dialoguePanel: DialoguePanel;
  private readonly touchControls: TouchControls;
  private readonly menuPanel: MenuPanel;
  private readonly shopPanel: ShopPanel;

  constructor(parent: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "prototype-ui";
    this.root.innerHTML = OVERLAY_TEMPLATE;
    parent.appendChild(this.root);

    this.regionLabel =
      this.getElement<HTMLParagraphElement>(".prototype-region");
    this.statusLabel =
      this.getElement<HTMLParagraphElement>(".prototype-status");
    this.questHud = this.getElement<HTMLDivElement>(".prototype-quest");

    this.dialoguePanel = new DialoguePanel({
      root: this.root,
      onChoice: (index) => this.dispatch("prototype:dialogue-choice", { index }),
      onAdvance: () => this.dispatch("prototype:action"),
      onUnlockAudio: () => void audioManager.unlock()
    });

    this.touchControls = new TouchControls({
      root: this.root,
      onJoystick: (vector) => this.dispatch("prototype:joystick", vector),
      onAction: (action) => this.dispatch(`prototype:${action}`),
      onUnlockAudio: () => void audioManager.unlock()
    });

    this.shopPanel = new ShopPanel({
      root: this.root,
      onClose: () => this.dispatch("prototype:shop-close")
    });

    this.menuPanel = new MenuPanel({
      root: this.root,
      onStateChange: (open) => this.dispatch("prototype:menu-state", { open }),
      onReturnTitle: () => this.dispatch("prototype:return-title"),
      onFastTravel: (regionId) =>
        this.dispatch("prototype:fast-travel", { regionId }),
      onBeforeOpen: () => {
        this.shopPanel.close();
        this.dialoguePanel.hide();
      }
    });

    this.bindGameEvents();
    this.bindAudioUnlock();
    this.renderQuestHud();
  }

  private getElement<ElementType extends Element>(selector: string): ElementType {
    const element = this.root.querySelector<ElementType>(selector);
    if (!element) {
      throw new Error(`UI element not found: ${selector}`);
    }

    return element;
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
      this.dialoguePanel.show(
        (event as CustomEvent<PrototypeDialogueDetail>).detail
      );
    });
    window.addEventListener("prototype:dialogue-close", () =>
      this.dialoguePanel.close()
    );
    window.addEventListener("prototype:interaction-hint", (event) => {
      this.touchControls.setInteractionHint(
        (event as CustomEvent<PrototypeInteractionHintDetail>).detail
      );
    });
    window.addEventListener("prototype:movement-mode", (event) => {
      this.touchControls.setMovementMode(
        (event as CustomEvent<PrototypeMovementModeDetail>).detail
      );
    });
    window.addEventListener("prototype:shop-open", (event) => {
      const detail = (event as CustomEvent<PrototypeShopOpenDetail>).detail;
      this.shopPanel.open(detail.shopId, detail.focusProductId);
    });
    window.addEventListener("prototype:shop-state", () => this.renderState());
    window.addEventListener("prototype:quest-state", () => this.renderState());
    window.addEventListener("prototype:exploration-state", () =>
      this.menuPanel.render()
    );
    window.addEventListener("prototype:shop-dismiss", () =>
      this.shopPanel.close()
    );
    window.addEventListener("prototype:menu-open-request", () =>
      this.menuPanel.open()
    );
  }

  private bindAudioUnlock(): void {
    const unlock = () => {
      void audioManager.unlock();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };

    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
  }

  private renderState(): void {
    this.shopPanel.render();
    this.menuPanel.render();
    this.renderQuestHud();
  }

  private renderQuestHud(): void {
    const state = travelerQuestService.getState();
    const completed = travelerQuestService.getCompletedObjectiveIds().length;
    this.questHud.textContent = {
      available: "任務：到美妝香氛免稅店看看有沒有小委託。",
      active: `任務：免稅店小巡禮 ${completed}/3`,
      ready: "任務：商品已買齊，回美妝香氛免稅店回報。",
      completed: `任務完成：${TRAVELER_QUEST.rewardCollectibleName}`
    }[state.status];
  }

  private dispatch<Detail>(type: string, detail?: Detail): void {
    window.dispatchEvent(new CustomEvent(type, { detail }));
  }
}
