const OVERLAY_ID = 'scene-loading-overlay';
const STYLE_ID = 'scene-loading-overlay-style';

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${OVERLAY_ID} {
      position: fixed;
      inset: 0;
      z-index: 2147483646;
      display: none;
      place-items: center;
      background: radial-gradient(120% 120% at 50% 50%, rgba(9, 15, 22, .72) 0%, rgba(4, 7, 12, .88) 100%);
      pointer-events: auto;
    }
    #${OVERLAY_ID}[data-open="1"] {
      display: grid;
    }
    #${OVERLAY_ID} .panel {
      min-width: 280px;
      max-width: min(90vw, 560px);
      border: 1px solid rgba(173, 222, 255, .35);
      background: rgba(8, 16, 24, .92);
      box-shadow: 0 18px 44px rgba(0, 0, 0, .45);
      color: #e8f4ff;
      padding: 14px 16px;
      font: 14px/1.45 HanPixel, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    #${OVERLAY_ID} .title {
      color: #8fd3ff;
      margin-bottom: 8px;
      letter-spacing: 0;
    }
    #${OVERLAY_ID} .msg {
      color: #d6e8f8;
      margin-bottom: 10px;
    }
    #${OVERLAY_ID} .bar {
      position: relative;
      height: 8px;
      border: 1px solid #355165;
      background: #0a141e;
      overflow: hidden;
    }
    #${OVERLAY_ID} .bar::before {
      content: "";
      position: absolute;
      inset: 0;
      width: 42%;
      background: linear-gradient(90deg, #5aa9dd, #9fd4ff);
      animation: scene-loading-loop 1.2s ease-in-out infinite;
    }
    @keyframes scene-loading-loop {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(340%); }
    }
  `;
  document.head.appendChild(style);
}

function ensureOverlay() {
  ensureStyle();
  let overlay = document.getElementById(OVERLAY_ID) as HTMLDivElement | null;
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.dataset.open = '0';
  overlay.innerHTML = `
    <div class="panel" role="status" aria-live="polite">
      <div class="title">Loading Scene</div>
      <div class="msg">Preparing world...</div>
      <div class="bar"></div>
    </div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

function setMessage(message: string) {
  const overlay = ensureOverlay();
  const msg = overlay.querySelector('.msg');
  if (msg) msg.textContent = message;
}

export function showSceneLoadingOverlay(message = 'Preparing world...') {
  const overlay = ensureOverlay();
  setMessage(message);
  overlay.dataset.open = '1';
}

export function updateSceneLoadingOverlay(message: string) {
  setMessage(message);
}

export function hideSceneLoadingOverlay() {
  const overlay = ensureOverlay();
  overlay.dataset.open = '0';
}

