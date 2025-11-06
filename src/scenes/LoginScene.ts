import Phaser from 'phaser';
import { CONFIG } from '../config';
import { initConnection } from '../net/ws';
import { getApiBase } from '../net/http';

export class LoginScene extends Phaser.Scene {
  constructor() { super('LoginScene'); }

  create() {
    this.cameras.main.setBackgroundColor('#0d1220');
    this.add.text(16, 16, '登入', { fontSize: `${CONFIG.ui.fontSize}px`, color: '#e6f0ff' });
    // 使用簡單的 DOM 覆蓋表單
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
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px">
        <button id="lg-ok" style="padding:6px 10px;border-radius:8px;border:1px solid #4a5668;background:#1a2330;color:#e6f0ff;cursor:pointer">開始遊戲</button>
      </div>
    `;
    form.appendChild(box); document.body.appendChild(form);

    // 預填值
    try {
      const em = localStorage.getItem('pemail') || '';
      const nm = localStorage.getItem('pname') || '';
      const gd = localStorage.getItem('pgender') || '';
      (box.querySelector('#lg-email') as HTMLInputElement).value = em;
      (box.querySelector('#lg-name') as HTMLInputElement).value = nm;
      const r = box.querySelector(`input[name="lg-g"][value="${gd}"]`) as HTMLInputElement | null;
      if (r) r.checked = true;
    } catch {}

    const start = async () => {
      const email = (box.querySelector('#lg-email') as HTMLInputElement).value.trim();
      const name = (box.querySelector('#lg-name') as HTMLInputElement).value.trim() || `旅客${Math.floor(Math.random()*9000)+1000}`;
      const gp = box.querySelector('input[name="lg-g"]:checked') as HTMLInputElement | null;
      const gender = (gp?.value || '').toUpperCase() === 'F' ? 'F' : 'M';
      let pid = '';
      try { pid = localStorage.getItem('pid') || ''; if (!pid) { pid = Math.random().toString(36).slice(2); localStorage.setItem('pid', pid); } } catch {}
      try { localStorage.setItem('pemail', email); localStorage.setItem('pname', name); localStorage.setItem('pgender', gender); } catch {}
      // 後端存檔
      try {
        const base = getApiBase();
        await fetch(`${base}/profile`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ Id: pid, Email: email, Name: name, Gender: gender, Ts: new Date().toISOString() }) });
      } catch {}
      // 啟動連線與主場景
      try { initConnection(); } catch {}
      try { document.body.removeChild(form); } catch {}
      this.scene.start('AirportScene');
      this.scene.launch('UIOverlay');
      try { (window as any).__applyCameraZoom?.(); } catch {}
    };
    (box.querySelector('#lg-ok') as HTMLButtonElement).onclick = () => { start(); };
  }
}
