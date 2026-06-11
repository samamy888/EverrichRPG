export interface PrototypeStatusDetail {
  regionName: string;
  message: string;
  playerVariant: "male" | "female";
}

export interface PrototypeDialogueDetail {
  title: string;
  lines: string[];
}

export interface PrototypeInteractionHintDetail {
  available: boolean;
  label?: string;
}

export interface PrototypeMovementModeDetail {
  running: boolean;
}

export interface PrototypeShopOpenDetail {
  shopId: import("../data/shopCatalog").ShopId;
  focusProductId?: string;
}

export function emitPrototypeStatus(detail: PrototypeStatusDetail): void {
  window.dispatchEvent(new CustomEvent<PrototypeStatusDetail>("prototype:status", { detail }));
}

export function emitPrototypeDialogue(detail: PrototypeDialogueDetail): void {
  window.dispatchEvent(new CustomEvent<PrototypeDialogueDetail>("prototype:dialogue", { detail }));
}

export function emitPrototypeDialogueClose(): void {
  window.dispatchEvent(new CustomEvent("prototype:dialogue-close"));
}

export function emitPrototypeInteractionHint(detail: PrototypeInteractionHintDetail): void {
  window.dispatchEvent(
    new CustomEvent<PrototypeInteractionHintDetail>("prototype:interaction-hint", { detail })
  );
}

export function emitPrototypeMovementMode(detail: PrototypeMovementModeDetail): void {
  window.dispatchEvent(
    new CustomEvent<PrototypeMovementModeDetail>("prototype:movement-mode", { detail })
  );
}

export function emitPrototypeShopOpen(detail: PrototypeShopOpenDetail): void {
  window.dispatchEvent(new CustomEvent<PrototypeShopOpenDetail>("prototype:shop-open", { detail }));
}
