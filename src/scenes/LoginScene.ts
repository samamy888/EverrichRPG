import * as Phaser from 'phaser';
import { initConnection } from '../net/ws';
import { initChat } from '../ui/chat';
import { getApiBase } from '../net/http';

const LOGIN_STYLE_ID = 'login-scene-style';

export class LoginScene extends Phaser.Scene {
  constructor() { super('LoginScene'); }

  create() {
    this.cameras.main.fadeIn(250, 0, 0, 0);
    this.cameras.main.setBackgroundColor('#10141a');

    try { document.getElementById('login-panel')?.remove(); } catch {}
    this.ensureLoginStyles();

    const form = document.createElement('div');
    form.id = 'login-panel';
    form.innerHTML = `
      <div class="login-shell">
        <section class="login-hero" aria-label="EverrichRPG">
          <div class="login-kicker">TAOYUAN TERMINAL 2</div>
          <h1>EverrichRPG</h1>
          <p>在桃園機場裡移動、探索、購物，遇見其他旅客。</p>
          <div class="login-tags">
            <span>像素風 RPG</span>
            <span>免稅店</span>
            <span>即時聊天</span>
          </div>
        </section>

        <section class="login-card" aria-label="玩家登入">
          <div class="login-card-head">
            <div>
              <div class="login-kicker">BOARDING PASS</div>
              <h2>建立旅客資料</h2>
            </div>
            <div class="login-live">Online</div>
          </div>

          <label class="field">
            <span>電子郵件</span>
            <input id="lg-email" type="email" autocomplete="email" placeholder="you@example.com">
          </label>

          <label class="field">
            <span>顯示名稱</span>
            <input id="lg-name" type="text" maxlength="20" autocomplete="nickname" placeholder="旅客名稱">
          </label>

          <div class="field">
            <span>角色</span>
            <div class="gender-grid">
              <label class="gender-card">
                <input type="radio" name="lg-g" value="M">
                <img src="/sprites/character/player_m.png" alt="">
                <strong>男旅客</strong>
              </label>
              <label class="gender-card">
                <input type="radio" name="lg-g" value="F">
                <img src="/sprites/character/player_f.png" alt="">
                <strong>女旅客</strong>
              </label>
            </div>
          </div>

          <label class="field">
            <span>起始地點</span>
            <select id="lg-scene">
              <option value="TPE2LobbyScene">桃園 T2 大廳</option>
            </select>
          </label>

          <button id="lg-ok" class="start-button" type="button">開始登機</button>
        </section>
      </div>
    `;

    document.body.appendChild(form);

    const box = form.querySelector('.login-card') as HTMLElement;
    try {
      const em = localStorage.getItem('pemail') || '';
      const nm = localStorage.getItem('pname') || '';
      const gd = localStorage.getItem('pgender') || 'M';
      const ss = 'TPE2LobbyScene';
      (box.querySelector('#lg-email') as HTMLInputElement).value = em;
      (box.querySelector('#lg-name') as HTMLInputElement).value = nm;
      const r = box.querySelector(`input[name="lg-g"][value="${gd}"]`) as HTMLInputElement | null;
      if (r) r.checked = true;
      const sel = box.querySelector('#lg-scene') as HTMLSelectElement | null;
      if (sel) sel.value = ss;
    } catch {}

    const start = async () => {
      const button = box.querySelector('#lg-ok') as HTMLButtonElement;
      button.disabled = true;
      button.textContent = '連線中...';

      const email = (box.querySelector('#lg-email') as HTMLInputElement).value.trim();
      const name = (box.querySelector('#lg-name') as HTMLInputElement).value.trim() || `旅客${Math.floor(Math.random() * 9000) + 1000}`;
      const gp = box.querySelector('input[name="lg-g"]:checked') as HTMLInputElement | null;
      const gender = (gp?.value || '').toUpperCase() === 'F' ? 'F' : 'M';
      let pid = '';

      try {
        pid = localStorage.getItem('pid') || '';
        if (!pid) {
          pid = Math.random().toString(36).slice(2);
          localStorage.setItem('pid', pid);
        }
      } catch {}

      try {
        localStorage.setItem('pemail', email);
        localStorage.setItem('pname', name);
        localStorage.setItem('pgender', gender);
      } catch {}

      const selectedScene = 'TPE2LobbyScene';
      try { localStorage.setItem('startScene', selectedScene); } catch {}

      try {
        const base = getApiBase();
        await fetch(`${base}/profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ Id: pid, Email: email, Name: name, Gender: gender, Ts: new Date().toISOString() })
        });
      } catch {}

      try { initConnection(); } catch {}

      this.cameras.main.fadeOut(250, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        try { document.body.removeChild(form); } catch {}
        this.scene.start(selectedScene);
        this.scene.launch('UIOverlay');
        try { initChat(this.game as any); } catch {}
        try { (window as any).__applyCameraZoom?.(); } catch {}
      });
    };

    (box.querySelector('#lg-ok') as HTMLButtonElement).onclick = () => { start(); };
  }

  private ensureLoginStyles() {
    if (document.getElementById(LOGIN_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = LOGIN_STYLE_ID;
    style.textContent = `
      #login-panel {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        display: grid;
        place-items: center;
        overflow: hidden;
        color: #eef7ff;
        background:
          linear-gradient(90deg, rgba(9, 16, 23, .88) 0%, rgba(9, 16, 23, .52) 48%, rgba(9, 16, 23, .88) 100%),
          url('/map/TPE2/lobby_bg.png') center / cover no-repeat;
        font: 14px/1.45 HanPixel, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      #login-panel::before {
        content: "";
        position: absolute;
        inset: 0;
        background-image: linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px);
        background-size: 100% 4px;
        opacity: .28;
        pointer-events: none;
      }

      .login-shell {
        position: relative;
        z-index: 1;
        width: min(980px, calc(100vw - 32px));
        min-height: min(560px, calc(100vh - 32px));
        display: grid;
        grid-template-columns: minmax(0, 1fr) 380px;
        gap: 24px;
        align-items: stretch;
      }

      .login-hero {
        display: flex;
        flex-direction: column;
        justify-content: end;
        min-height: 420px;
        padding: 28px;
        border: 1px solid rgba(173, 222, 255, .24);
        background: rgba(10, 20, 28, .34);
        box-shadow: inset 0 0 0 1px rgba(255,255,255,.04);
        backdrop-filter: blur(2px);
      }

      .login-kicker {
        color: #8fd3ff;
        font-size: 12px;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      .login-hero h1 {
        margin: 8px 0 10px;
        font-size: clamp(40px, 7vw, 82px);
        line-height: .95;
        letter-spacing: 0;
        color: #ffffff;
        text-shadow: 0 3px 0 rgba(0,0,0,.32);
      }

      .login-hero p {
        max-width: 520px;
        margin: 0;
        color: #d4e7f7;
        font-size: 18px;
      }

      .login-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 22px;
      }

      .login-tags span,
      .login-live {
        border: 1px solid rgba(143, 211, 255, .35);
        background: rgba(13, 30, 42, .72);
        color: #bfe8ff;
        padding: 6px 9px;
      }

      .login-card {
        min-width: 0;
        padding: 22px;
        border: 1px solid rgba(173, 222, 255, .3);
        background: rgba(7, 15, 22, .9);
        box-shadow: 0 18px 44px rgba(0, 0, 0, .34);
      }

      .login-card-head {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: start;
        margin-bottom: 18px;
      }

      .login-card h2 {
        margin: 4px 0 0;
        font-size: 26px;
        line-height: 1.1;
      }

      .field {
        display: grid;
        gap: 7px;
        margin-top: 14px;
        color: #cfe2f3;
      }

      .field > span {
        font-size: 13px;
        color: #9fc4da;
      }

      .field input[type="email"],
      .field input[type="text"],
      .field select {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #37546a;
        background: #0d1a24;
        color: #f1f8ff;
        padding: 10px 11px;
        border-radius: 0;
        outline: none;
        font: inherit;
      }

      .field input:focus,
      .field select:focus {
        border-color: #8fd3ff;
        box-shadow: 0 0 0 2px rgba(143, 211, 255, .16);
      }

      .gender-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }

      .gender-card {
        min-width: 0;
        display: grid;
        grid-template-columns: 42px 1fr;
        align-items: center;
        gap: 10px;
        border: 1px solid #37546a;
        background: #0d1a24;
        padding: 9px;
        cursor: pointer;
      }

      .gender-card input {
        position: absolute;
        opacity: 0;
        pointer-events: none;
      }

      .gender-card img {
        width: 42px;
        height: 42px;
        object-fit: contain;
        image-rendering: pixelated;
        background: rgba(255,255,255,.06);
      }

      .gender-card strong {
        color: #e8f4ff;
        font-weight: 600;
        white-space: nowrap;
      }

      .gender-card:has(input:checked) {
        border-color: #ffd17a;
        background: #1a2630;
        box-shadow: inset 0 0 0 1px rgba(255, 209, 122, .25);
      }

      .start-button {
        width: 100%;
        margin-top: 18px;
        border: 0;
        background: #ffd17a;
        color: #1b2430;
        padding: 12px 14px;
        font: inherit;
        font-size: 17px;
        font-weight: 700;
        cursor: pointer;
      }

      .start-button:hover { background: #ffe0a3; }
      .start-button:disabled { opacity: .7; cursor: wait; }

      @media (max-width: 760px) {
        #login-panel { place-items: stretch; overflow: auto; }
        .login-shell {
          width: 100%;
          min-height: 100%;
          grid-template-columns: 1fr;
          gap: 0;
        }
        .login-hero {
          min-height: 260px;
          padding: 22px;
          border-left: 0;
          border-right: 0;
        }
        .login-card {
          border-left: 0;
          border-right: 0;
          box-shadow: none;
        }
      }
    `;
    document.head.appendChild(style);
  }
}
