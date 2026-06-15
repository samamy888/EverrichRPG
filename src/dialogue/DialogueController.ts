import type { DialogueChoiceData } from "../data/prototypeRegions";
import type {
  CancelableTimer,
  DialogueDefinition,
  DialogueTimerPort,
  DialogueViewPort
} from "./DialoguePorts";

interface DialogueControllerOptions {
  view: DialogueViewPort;
  timer: DialogueTimerPort;
  playConfirm: () => void;
  onClosed?: () => void;
}

interface ActiveDialogue {
  title: string;
  pages: string[];
  pageIndex: number;
  visibleCharacters: number;
  choices?: DialogueChoiceData[];
  selectedChoice: number;
  timer?: CancelableTimer;
}

export class DialogueController {
  private active: ActiveDialogue | null = null;

  constructor(private readonly options: DialogueControllerOptions) {}

  get isOpen(): boolean {
    return this.active !== null;
  }

  start(definition: DialogueDefinition): void {
    this.close(false);
    this.active = {
      title: definition.title,
      pages: definition.lines.length > 0 ? definition.lines : [""],
      pageIndex: 0,
      visibleCharacters: 0,
      ...(definition.choices?.length ? { choices: definition.choices } : {}),
      selectedChoice: 0
    };
    this.beginPage();
  }

  advance(): void {
    const dialogue = this.active;
    if (!dialogue) return;
    const pageText = this.currentPageText(dialogue);
    if (dialogue.visibleCharacters < pageText.length) {
      this.cancelTimer(dialogue);
      dialogue.visibleCharacters = pageText.length;
      this.emit();
      this.options.playConfirm();
      return;
    }
    if (this.hasVisibleChoices()) {
      this.choose(dialogue.selectedChoice);
      return;
    }
    if (dialogue.pageIndex < dialogue.pages.length - 1) {
      dialogue.pageIndex += 1;
      this.options.playConfirm();
      this.beginPage();
      return;
    }
    this.close();
  }

  hasVisibleChoices(): boolean {
    const dialogue = this.active;
    if (!dialogue?.choices?.length) return false;
    return (
      dialogue.pageIndex === dialogue.pages.length - 1 &&
      dialogue.visibleCharacters >= this.currentPageText(dialogue).length
    );
  }

  moveChoice(offset: number): void {
    const dialogue = this.active;
    if (!dialogue?.choices?.length || !this.hasVisibleChoices()) return;
    dialogue.selectedChoice =
      (dialogue.selectedChoice + offset + dialogue.choices.length) %
      dialogue.choices.length;
    this.options.playConfirm();
    this.emit();
  }

  choose(index: number): void {
    const dialogue = this.active;
    const choice = dialogue?.choices?.[index];
    if (!dialogue || !choice || !this.hasVisibleChoices()) return;
    this.cancelTimer(dialogue);
    dialogue.pages = choice.responseLines.length > 0 ? choice.responseLines : [""];
    dialogue.pageIndex = 0;
    dialogue.visibleCharacters = 0;
    dialogue.selectedChoice = 0;
    delete dialogue.choices;
    this.options.playConfirm();
    this.beginPage();
  }

  close(notify = true): void {
    if (!this.active) return;
    this.cancelTimer(this.active);
    this.active = null;
    this.options.view.close();
    if (notify) this.options.onClosed?.();
  }

  private beginPage(): void {
    const dialogue = this.active;
    if (!dialogue) return;
    this.cancelTimer(dialogue);
    dialogue.visibleCharacters = 0;
    this.emit();
    const pageText = this.currentPageText(dialogue);
    if (pageText.length === 0) return;
    dialogue.timer = this.options.timer.start(pageText.length, () => {
      const current = this.active;
      if (!current) return;
      current.visibleCharacters = Math.min(
        pageText.length,
        current.visibleCharacters + 1
      );
      this.emit();
    });
  }

  private emit(): void {
    const dialogue = this.active;
    if (!dialogue) return;
    const pageText = this.currentPageText(dialogue);
    this.options.view.show({
      title: dialogue.title,
      text: pageText.slice(0, dialogue.visibleCharacters),
      page: dialogue.pageIndex + 1,
      pageCount: dialogue.pages.length,
      complete: dialogue.visibleCharacters >= pageText.length,
      ...(this.hasVisibleChoices()
        ? {
            choices: dialogue.choices?.map((choice) => choice.label) ?? [],
            selectedChoice: dialogue.selectedChoice
          }
        : {})
    });
  }

  private currentPageText(dialogue: ActiveDialogue): string {
    return dialogue.pages[dialogue.pageIndex] ?? "";
  }

  private cancelTimer(dialogue: ActiveDialogue): void {
    dialogue.timer?.cancel();
    delete dialogue.timer;
  }
}
