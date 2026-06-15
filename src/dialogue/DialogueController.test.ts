import { describe, expect, it } from "vitest";
import { DialogueController } from "./DialogueController";
import type {
  CancelableTimer,
  DialogueTimerPort,
  DialogueViewPort,
  DialogueViewState
} from "./DialoguePorts";

class ManualTimer implements DialogueTimerPort {
  callback: (() => void) | undefined;

  start(_characterCount: number, onCharacter: () => void): CancelableTimer {
    this.callback = onCharacter;
    return { cancel: () => (this.callback = undefined) };
  }

  tick(times: number): void {
    for (let index = 0; index < times; index += 1) this.callback?.();
  }
}

class RecordingView implements DialogueViewPort {
  readonly states: DialogueViewState[] = [];
  closed = 0;

  show(state: DialogueViewState): void {
    this.states.push(state);
  }

  close(): void {
    this.closed += 1;
  }
}

describe("DialogueController", () => {
  it("types, completes and closes dialogue pages", () => {
    const timer = new ManualTimer();
    const view = new RecordingView();
    const controller = new DialogueController({
      timer,
      view,
      playConfirm: () => undefined
    });

    controller.start({ title: "旅客", lines: ["你好"] });
    timer.tick(2);
    expect(view.states.at(-1)?.text).toBe("你好");
    controller.advance();
    expect(controller.isOpen).toBe(false);
    expect(view.closed).toBe(1);
  });

  it("moves and applies choices", () => {
    const timer = new ManualTimer();
    const view = new RecordingView();
    const controller = new DialogueController({
      timer,
      view,
      playConfirm: () => undefined
    });

    controller.start({
      title: "店員",
      lines: [""],
      choices: [
        { label: "看看", responseLines: ["請慢慢看"] },
        { label: "離開", responseLines: ["歡迎再來"] }
      ]
    });
    controller.moveChoice(1);
    controller.choose(1);
    timer.tick(4);

    expect(view.states.at(-1)?.text).toBe("歡迎再來");
  });
});
