import {
  emitPrototypeDialogue,
  emitPrototypeDialogueClose
} from "../core/prototypeEvents";
import type {
  DialogueViewPort,
  DialogueViewState
} from "./DialoguePorts";

export class PrototypeDialogueView implements DialogueViewPort {
  show(state: DialogueViewState): void {
    emitPrototypeDialogue(state);
  }

  close(): void {
    emitPrototypeDialogueClose();
  }
}
