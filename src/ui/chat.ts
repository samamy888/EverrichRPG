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
  box.style.cssText = [
    'background:rgba(15,22,30,0.75)','border:1px solid #3a4558','border-radius:10px',
    'padding:8px','max-height:30vh','overflow:auto','color:#dbe7ff',
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

  const lockInput = (on: boolean) => { try { (game as any).registry?.set('inputLocked', !!on); } catch {} };

  inputEl.addEventListener('focus', () => lockInput(true));
  inputEl.addEventListener('blur',  () => lockInput(false));
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const v = inputEl!.value.trim(); if (!v) return;
      try { getClient().sendChat(v); } catch {}
      inputEl!.value = '';
    }
    if (e.key === 'Escape') { (e.target as HTMLInputElement).blur(); }
  });

  // 初始載入歷史
  try {
    fetch(`${getApiBase()}/chat?limit=100`).then(r => r.json()).then((arr: ChatMessage[]) => {
      (arr || []).forEach(renderMessage);
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
