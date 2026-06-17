import type { PrototypeDialogueDetail } from "../../core/prototypeEvents";

function getActionPromptKey(): "A" | "Enter" {
  return window.matchMedia("(pointer: coarse) and (hover: none)").matches
    ? "A"
    : "Enter";
}

interface DialoguePanelOptions {
  root: HTMLElement;
  onChoice: (index: number) => void;
  onAdvance: () => void;
  onUnlockAudio: () => void;
}

export class DialoguePanel {
  private readonly panel: HTMLElement;
  private readonly title: HTMLParagraphElement;
  private readonly text: HTMLParagraphElement;
  private readonly choices: HTMLDivElement;
  private readonly next: HTMLSpanElement;
  private choosing = false;
  private readonly globalPointerHandler = (event: PointerEvent): void => {
    if (this.panel.hidden || this.choosing) return;
    if (
      event.target instanceof Element &&
      event.target.closest("[data-dialogue-choice]")
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.options.onUnlockAudio();
    this.options.onAdvance();
  };

  constructor(private readonly options: DialoguePanelOptions) {
    this.panel = options.root.querySelector(".dialogue-box")!;
    this.title = options.root.querySelector(".dialogue-title")!;
    this.text = options.root.querySelector(".dialogue-text")!;
    this.choices = options.root.querySelector(".dialogue-choices")!;
    this.next = options.root.querySelector(".dialogue-next")!;
    window.addEventListener("pointerdown", this.globalPointerHandler, true);
  }

  show(detail: PrototypeDialogueDetail): void {
    this.title.textContent = detail.title;
    this.text.textContent = detail.text;
    this.choices.innerHTML = (detail.choices ?? [])
      .map(
        (choice, index) =>
          `<button type="button" data-dialogue-choice="${index}" class="${
            index === detail.selectedChoice ? "is-selected" : ""
          }"><span>${index === detail.selectedChoice ? "▶" : ""}</span>${choice}</button>`
      )
      .join("");
    this.choices
      .querySelectorAll<HTMLButtonElement>("[data-dialogue-choice]")
      .forEach((button) => {
        button.addEventListener("pointerdown", (event) => {
          event.preventDefault();
          event.stopPropagation();
          this.options.onUnlockAudio();
          this.options.onChoice(Number(button.dataset.dialogueChoice));
        });
      });
    this.choosing = (detail.choices?.length ?? 0) > 0;
    this.panel.classList.toggle("has-choices", this.choosing);
    this.options.root.classList.toggle("dialogue-has-choices", this.choosing);
    this.next.textContent = this.choosing
      ? `W / S 選擇 · ${getActionPromptKey()} 確認`
      : detail.complete
        ? detail.page < detail.pageCount
          ? `${getActionPromptKey()} / 點擊：下一句`
          : `${getActionPromptKey()} / 點擊：結束`
        : `${getActionPromptKey()}：快速顯示`;
    this.next.classList.toggle("is-complete", detail.complete);
    this.panel.hidden = false;
  }

  close(): void {
    this.panel.hidden = true;
    this.choosing = false;
    this.panel.classList.remove("has-choices");
    this.options.root.classList.remove("dialogue-has-choices");
    this.choices.innerHTML = "";
  }

  hide(): void {
    this.panel.hidden = true;
  }
}
