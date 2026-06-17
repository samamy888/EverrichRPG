export interface ScreenVector {
  x: number;
  y: number;
}

export interface GamePoint {
  x: number;
  y: number;
}

export interface GameSize {
  width: number;
  height: number;
}

export function isPortraitTouchLayout(): boolean {
  return document.documentElement.classList.contains("portrait-touch-layout");
}

export function mapScreenVectorToGameVector(vector: ScreenVector): ScreenVector {
  if (!isPortraitTouchLayout()) return vector;

  return {
    x: vector.y,
    y: -vector.x
  };
}

export function mapPointerToGamePoint(
  event: PointerEvent,
  canvas: HTMLCanvasElement | null,
  gameSize: GameSize
): GamePoint | null {
  const bounds = canvas?.getBoundingClientRect();
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) return null;

  const screenX = (event.clientX - bounds.left) / bounds.width;
  const screenY = (event.clientY - bounds.top) / bounds.height;
  if (screenX < 0 || screenX > 1 || screenY < 0 || screenY > 1) return null;

  if (isPortraitTouchLayout()) {
    return {
      x: gameSize.width * screenY,
      y: gameSize.height * (1 - screenX)
    };
  }

  return {
    x: gameSize.width * screenX,
    y: gameSize.height * screenY
  };
}
