import { getApiBase } from '../net/http';
import { getClient } from '../net/ws';
import { CONFIG } from '../config';

type ChatMessage = { id: string; playerId: string; name: string; text: string; ts: string };

let panel: HTMLDivElement | null = null;
let listEl: HTMLDivElement | null = null;
let inputEl: HTMLInputElement | null = null;
let inited = false;

export function initChat(game: Phaser.Game) {
  if (inited) return; inited = true;
  panel = document.createElement('div');
  panel.id = 'chat-panel';
  const bottomPadding = (CONFIG.ui.hudHeight || 40) + 8; // 放在置底狀態欄之上
  panel.style.cssText = [
    'position:fixed','left:8px','right:8px',`bottom:${bottomPadding}px`,'z-index:2147483600',
    'display:flex','flex-direction:column','gap:6px',
    'pointer-events:auto','user-select:text'
  ].join(';');
  const box = document.createElement('div');
  // 固定顯示約 10 筆訊息高度（14px 字 × 1.4 行高 × 10 行 ≈ 196px），再多就捲動
  box.style.cssText = [
    'background:rgba(15,22,30,0.75)','border:1px solid #3a4558','border-radius:10px',
    'padding:8px','max-height:196px','overflow:auto','color:#dbe7ff',
    'font:14px/1.4 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif'
  ].join(';');
  listEl = document.createElement('div');
  box.appendChild(listEl);
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:8px';
  inputEl = document.createElement('input');
  inputEl.type = 'text';
  inputEl.placeholder = '輸入訊息，按 Enter 送出';
  inputEl.style.cssText = [
    'flex:1','padding:8px 10px','border-radius:8px','border:1px solid #3a4558',
    'background:#0e1622','color:#e6f0ff'
  ].join(';');
  row.appendChild(inputEl);
  panel.appendChild(box); panel.appendChild(row);
  document.body.appendChild(panel);
  // 對外提供清空函數
  (window as any).__chatClear = () => { try { if (listEl) listEl.innerHTML = ''; } catch {} };

  const lockInput = (on: boolean) => { try { (game as any).registry?.set('inputLocked', !!on); } catch {} };
  const toggleKeyboard = (disable: boolean) => {
    try { const kb = (game as any).input?.keyboard; if (kb) kb.enabled = !disable; } catch {}
  };
  const swallow = (e: KeyboardEvent) => {
    try {
      const key = (e.key || '').toLowerCase();
      if (key === 'enter' || key === 'esc' || key === 'escape') return;
      e.stopPropagation();
    } catch {}
  };

  inputEl.addEventListener('focus', () => { lockInput(true); toggleKeyboard(true); });
  inputEl.addEventListener('blur',  () => { lockInput(false); toggleKeyboard(false); });
  // 阻擋事件往 Phaser 傳遞，避免打字時觸發移動/操作
  inputEl.addEventListener('keydown', swallow, true);
  inputEl.addEventListener('keyup', swallow, true);
  inputEl.addEventListener('keypress', swallow, true);
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const v = inputEl!.value.trim(); if (!v) return;
      try { getClient().sendChat(v); } catch {}
      inputEl!.value = '';
    }
    if (e.key === 'Escape') { (e.target as HTMLInputElement).blur(); }
  });

  // 點擊畫面（非聊天室）切回可移動；點擊聊天室則進入打字模式
  const clickSwitch = (ev: MouseEvent) => {
    try {
      const target = ev.target as HTMLElement | null;
      const inChat = !!(panel && target && panel.contains(target));
      if (inChat) { lockInput(true); toggleKeyboard(true); inputEl?.focus(); }
      else { lockInput(false); toggleKeyboard(false); try { inputEl?.blur(); } catch {} }
    } catch {}
  };
  window.addEventListener('mousedown', clickSwitch, true);

  // 初始載入歷史：由舊到新（最舊在上、最新在下）
  try {
    fetch(`${getApiBase()}/chat?limit=100`).then(r => r.json()).then((arr: ChatMessage[]) => {
      (arr || []).slice().reverse().forEach(renderMessage);
      scrollBottom();
    }).catch(() => {});
  } catch {}

  // 即時接收
  try {
    const ws = getClient();
    ws.on('chat', (d: any) => {
      renderMessage({ id: d.id, playerId: d.playerId, name: d.name, text: d.text, ts: d.ts });
      scrollBottom();
    });
  } catch {}
}

function renderMessage(m: ChatMessage) {
  if (!listEl) return;
  const time = new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const line = document.createElement('div');
  line.style.cssText = 'margin:2px 0; white-space:pre-wrap; word-break:break-word;';
  const name = document.createElement('span'); name.style.cssText='color:#8fb3ff;'; name.textContent = m.name || '玩家';
  const t = document.createElement('span'); t.style.cssText='opacity:0.7;margin-left:6px;font-size:12px;'; t.textContent = time;
  const msg = document.createElement('span'); msg.style.cssText='margin-left:8px;color:#e6f0ff;'; msg.textContent = m.text;
  line.appendChild(name); line.appendChild(t); line.appendChild(msg);
  listEl.appendChild(line);
}

function scrollBottom() { try { listEl!.parentElement!.scrollTop = listEl!.parentElement!.scrollHeight; } catch {} }
