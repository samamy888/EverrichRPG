import type {
  PrototypeInteractionHintDetail,
  PrototypeMovementModeDetail
} from "../../core/prototypeEvents";

interface TouchControlsOptions {
  root: HTMLElement;
  onJoystick: (vector: { x: number; y: number; strength: number }) => void;
  onAction: (action: string) => void;
  onUnlockAudio: () => void;
}

export class TouchControls {
  private readonly actionButton: HTMLButtonElement;
  private readonly runButton: HTMLButtonElement;
  private joystickVector = { x: 0, y: 0, strength: 0 };

  constructor(private readonly options: TouchControlsOptions) {
    this.actionButton = options.root.querySelector(".action-button")!;
    this.runButton = options.root.querySelector(".back-button")!;
    this.bind();
  }

  setInteractionHint(detail: PrototypeInteractionHintDetail): void {
    this.actionButton.classList.toggle("is-ready", detail.available);
    this.actionButton.setAttribute(
      "aria-label",
      detail.available && detail.label ? detail.label : "互動"
    );
  }

  setMovementMode(detail: PrototypeMovementModeDetail): void {
    this.runButton.classList.toggle("is-running", detail.running);
    this.runButton.textContent = detail.running ? "RUN" : "B";
    this.runButton.setAttribute(
      "aria-label",
      detail.running ? "切換為走路" : "切換為跑步"
    );
  }

  private bind(): void {
    const stick = this.options.root.querySelector<HTMLElement>(".virtual-stick")!;
    const knob =
      this.options.root.querySelector<HTMLElement>(".virtual-stick-knob")!;
    const updateStick = (event: PointerEvent): void => {
      const bounds = stick.getBoundingClientRect();
      const offsetX = event.clientX - (bounds.left + bounds.width / 2);
      const offsetY = event.clientY - (bounds.top + bounds.height / 2);
      const maxDistance = bounds.width * 0.28;
      const distance = Math.hypot(offsetX, offsetY);
      const scale = distance > maxDistance ? maxDistance / distance : 1;
      const x = offsetX * scale;
      const y = offsetY * scale;
      const deadZone = bounds.width * 0.11;
      const normalizedLength = Math.hypot(x, y) || 1;
      const strength = Math.max(
        0,
        Math.min(1, (distance - deadZone) / (maxDistance - deadZone))
      );
      if (strength < 0.2) {
        this.joystickVector = { x: 0, y: 0, strength: 0 };
        this.options.onJoystick(this.joystickVector);
        knob.style.transform = "translate(0, 0)";
        return;
      }

      const smoothX = this.joystickVector.x * 0.55 + (x / normalizedLength) * 0.45;
      const smoothY = this.joystickVector.y * 0.55 + (y / normalizedLength) * 0.45;
      const smoothStrength = this.joystickVector.strength * 0.55 + strength * 0.45;
      this.joystickVector = {
        x: smoothX,
        y: smoothY,
        strength: smoothStrength
      };
      this.options.onJoystick(this.joystickVector);
      knob.style.transform = `translate(${x}px, ${y}px)`;
    };
    const releaseStick = (): void => {
      this.options.onJoystick({ x: 0, y: 0, strength: 0 });
      this.joystickVector = { x: 0, y: 0, strength: 0 };
      knob.style.transform = "translate(0, 0)";
      stick.classList.remove("is-active");
    };

    stick.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      this.options.onUnlockAudio();
      stick.setPointerCapture(event.pointerId);
      stick.classList.add("is-active");
      updateStick(event);
    });
    stick.addEventListener("pointermove", (event) => {
      if (stick.hasPointerCapture(event.pointerId)) updateStick(event);
    });
    stick.addEventListener("pointerup", releaseStick);
    stick.addEventListener("pointercancel", releaseStick);
    stick.addEventListener("lostpointercapture", releaseStick);

    this.options.root
      .querySelectorAll<HTMLButtonElement>("[data-action]")
      .forEach((button) => {
        button.addEventListener("pointerdown", (event) => {
          event.preventDefault();
          this.options.onUnlockAudio();
          if (button.dataset.action) this.options.onAction(button.dataset.action);
        });
      });
  }
}
