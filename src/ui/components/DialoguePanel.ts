import type { PrototypeDialogueDetail } from "../../core/prototypeEvents";

interface DialoguePanelOptions {
  root: HTMLElement;
  onChoice: (index: number) => void;
  onUnlockAudio: () => void;
}

export class DialoguePanel {
  private readonly panel: HTMLElement;
  private readonly title: HTMLParagraphElement;
  private readonly text: HTMLParagraphElement;
  private readonly choices: HTMLDivElement;
  private readonly next: HTMLSpanElement;

  constructor(private readonly options: DialoguePanelOptions) {
    this.panel = options.root.querySelector(".dialogue-box")!;
    this.title = options.root.querySelector(".dialogue-title")!;
    this.text = options.root.querySelector(".dialogue-text")!;
    this.choices = options.root.querySelector(".dialogue-choices")!;
    this.next = options.root.querySelector(".dialogue-next")!;
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
    const choosing = (detail.choices?.length ?? 0) > 0;
    this.panel.classList.toggle("has-choices", choosing);
    this.options.root.classList.toggle("dialogue-has-choices", choosing);
    this.next.textContent = choosing
      ? "W / S 選擇 · A / Enter 確認"
      : detail.complete
        ? detail.page < detail.pageCount
          ? "▼  A / Enter 下一頁"
          : "▼  A / Enter 結束"
        : "A / Enter 快速顯示";
    this.next.classList.toggle("is-complete", detail.complete);
    this.panel.hidden = false;
  }

  close(): void {
    this.panel.hidden = true;
    this.panel.classList.remove("has-choices");
    this.options.root.classList.remove("dialogue-has-choices");
    this.choices.innerHTML = "";
  }

  hide(): void {
    this.panel.hidden = true;
  }
}
