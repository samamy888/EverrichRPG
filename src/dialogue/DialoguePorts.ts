import type { DialogueChoiceData } from "../data/prototypeRegions";

export interface DialogueDefinition {
  title: string;
  lines: string[];
  choices?: DialogueChoiceData[];
}

export interface DialogueViewState {
  title: string;
  text: string;
  page: number;
  pageCount: number;
  complete: boolean;
  choices?: string[];
  selectedChoice?: number;
}

export interface DialogueViewPort {
  show(state: DialogueViewState): void;
  close(): void;
}

export interface CancelableTimer {
  cancel(): void;
}

export interface DialogueTimerPort {
  start(characterCount: number, onCharacter: () => void): CancelableTimer;
}
