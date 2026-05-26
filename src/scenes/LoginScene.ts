import Phaser from 'phaser';
import { CONFIG } from '../config';
import { initConnection } from '../net/ws';
import { initChat } from '../ui/chat';
import { getApiBase } from '../net/http';

export class LoginScene extends Phaser.Scene {
  constructor() { super('LoginScene'); }

  create() {
    this.cameras.main.fadeIn(250, 0, 0, 0);
    this.cameras.main.setBackgroundColor('#0d1220');

    // 頁面上方標題
    const titleEl = document.createElement('div');
    titleEl.textContent = '一起來逛免稅店';
    titleEl.style.cssText = [
      'position:fixed','top:12px','left:50%','transform:translateX(-50%)',
      'z-index:2147483648','color:#e6f0ff',
      `font:${Math.max(12,(CONFIG.ui.fontSize||12)+6)}px/1.2 HanPixel,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif`,
      'text-shadow:0 1px 0 rgba(0,0,0,0.4)'
    ].join(';');

    const form = document.createElement('div');
    form.id = 'login-panel';
    form.style.cssText = [
      'position:fixed','inset:0','display:flex','align-items:center','justify-content:center',
      'background:rgba(0,0,0,0.45)','z-index:2147483647'
    ].join(';');

    const box = document.createElement('div');
    box.style.cssText = [
      'min-width:320px','max-width:420px','padding:16px 20px','border-radius:12px',
      'background:#0b111a','border:1px solid #3a4558','color:#cfe2f3',
      'font:14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif'
    ].join(';');

    box.innerHTML = `
      <div style="font-weight:600;font-size:16px;margin-bottom:8px;color:#e6f0ff">玩家登入</div>
      <label style="display:block;margin:6px 0 2px">電子郵件</label>
      <input id="lg-email" type="email" style="width:100%;padding:6px;border-radius:8px;border:1px solid #405065;background:#0e1622;color:#e6f0ff">
      <label style="display:block;margin:10px 0 2px">顯示名稱</label>
      <input id="lg-name" type="text" maxlength="20" style="width:100%;padding:6px;border-radius:8px;border:1px solid #405065;background:#0e1622;color:#e6f0ff">
      <div style="margin:10px 0 8px">性別：
        <label><input type="radio" name="lg-g" value="M"> 男</label>
        <label style="margin-left:12px"><input type="radio" name="lg-g" value="F"> 女</label>
      </div>
      <label style="display:block;margin:10px 0 2px">起始場景</label>
      <select id="lg-scene" style="width:100%;padding:6px;border-radius:8px;border:1px solid #405065;background:#0e1622;color:#e6f0ff">
        <option value="TPE2LobbyScene">桃園 T2 大廳 (NEW)</option>
        <option value="TPE01Scene">TPE-01 地圖</option>
        <option value="AirportScene">桃園 3F（現有）</option>
      </select>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px">
        <button id="lg-ok" style="padding:6px 10px;border-radius:8px;border:1px solid #4a5668;background:#1a2330;color:#e6f0ff;cursor:pointer">開始遊戲</button>
      </div>
    `;

    form.appendChild(box);
    try { form.appendChild(titleEl); } catch {}
    document.body.appendChild(form);

    // 預填值
    try {
      const em = localStorage.getItem('pemail') || '';
      const nm = localStorage.getItem('pname') || '';
      const gd = localStorage.getItem('pgender') || 'M';
      const ss = localStorage.getItem('startScene') || 'TPE01Scene';
      (box.querySelector('#lg-email') as HTMLInputElement).value = em;
      (box.querySelector('#lg-name') as HTMLInputElement).value = nm;
      const r = box.querySelector(`input[name="lg-g"][value="${gd}"]`) as HTMLInputElement | null;
      if (r) r.checked = true;
      const sel = box.querySelector('#lg-scene') as HTMLSelectElement | null;
      if (sel) sel.value = ss;
    } catch {}

    const start = async () => {
      const email = (box.querySelector('#lg-email') as HTMLInputElement).value.trim();
      const name = (box.querySelector('#lg-name') as HTMLInputElement).value.trim() || `旅客${Math.floor(Math.random()*9000)+1000}`;
      const gp = box.querySelector('input[name="lg-g"]:checked') as HTMLInputElement | null;
      const gender = (gp?.value || '').toUpperCase() === 'F' ? 'F' : 'M';
      let pid = '';
      try { pid = localStorage.getItem('pid') || ''; if (!pid) { pid = Math.random().toString(36).slice(2); localStorage.setItem('pid', pid); } } catch {}
      try { localStorage.setItem('pemail', email); localStorage.setItem('pname', name); localStorage.setItem('pgender', gender); } catch {}
      const selectedScene = (box.querySelector('#lg-scene') as HTMLSelectElement | null)?.value || 'TPE01Scene';
      try { localStorage.setItem('startScene', selectedScene); } catch {}
      
      // 後端存檔
      try {
        const base = getApiBase();
        await fetch(`${base}/profile`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ Id: pid, Email: email, Name: name, Gender: gender, Ts: new Date().toISOString() }) });
      } catch {}

      // 啟動連線
      try { initConnection(); } catch {}
      
      // 平滑轉場
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
}
