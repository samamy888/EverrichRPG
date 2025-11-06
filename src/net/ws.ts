import { CONFIG } from '../config';

type Handler = (data: any) => void;

class WSClient {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: Record<string, Handler[]> = {};
  private reconnectTimer: any = null;
  private backoff = 1000;
  private maxBackoff = 8000;
  private selfId: string | null = null;
  private selfName: string | null = null;
  private hbTimer: any = null;
  private lastPong = 0;
  private connId: string | null = null;

  constructor(url: string) {
    this.url = url;
  }

  connect(name?: string) {
    // 產生每個分頁唯一的 session Id（固定值，避免重連變動）
    let sid = '';
    try {
      sid = sessionStorage.getItem('sid') || '';
      if (!sid) { sid = Math.random().toString(36).slice(2, 8); sessionStorage.setItem('sid', sid); }
    } catch { sid = Math.random().toString(36).slice(2, 8); }

    // 取得/校正帳號 id（pid）；若以前誤存了帶 sid 的 connId，剝除所有 -sid 結尾
    if (!this.selfId) {
      try {
        let stored = localStorage.getItem('pid') || '';
        if (stored) {
          // 去除重複附加的 "-sid" 尾巴
          const re = new RegExp(`(-${sid})+$`);
          stored = stored.replace(re, '');
          // 若仍含過多連字號，保留第一段（避免歷史髒資料）
          if (stored.includes('-')) stored = stored.split('-')[0];
        }
        this.selfId = stored || (Math.random().toString(36).slice(2));
        localStorage.setItem('pid', this.selfId);
      } catch { this.selfId = Math.random().toString(36).slice(2); }
    }
    // 每次連線前再做一次規範化，防止記憶體中殘留帶連字號的 pid
    try {
      const norm = (pid: string) => {
        if (!pid) return pid;
        // 先去除當前 sid 結尾
        pid = pid.replace(new RegExp(`(-${sid})+$`), '');
        // 再去除任何由 "-<6~12位字母數字>" 組成的尾巴（歷史殘留）
        pid = pid.replace(/(-[a-z0-9]{4,12})+$/i, '');
        if (pid.includes('-')) pid = pid.split('-')[0];
        return pid;
      };
      this.selfId = norm(this.selfId!);
      // 確保 localStorage 也同步為乾淨的 pid
      try { localStorage.setItem('pid', this.selfId!); } catch {}
    } catch {}
    if (!this.selfName) {
      try {
        const stored = localStorage.getItem('pname');
        this.selfName = (name && name.trim()) || stored || '';
        if (!this.selfName) this.selfName = `旅客${Math.floor(Math.random()*9000)+1000}`;
        localStorage.setItem('pname', this.selfName);
      } catch { this.selfName = name || `旅客${Math.floor(Math.random()*9000)+1000}`; }
    }
    const raw = this.resolveUrl();
    const baseOnly = raw.split('?')[0]; // 確保不繼承舊的查詢參數，避免越連越長
    try { console.info('[ws] connecting to', baseOnly); } catch {}
    const url = new URL(baseOnly);
    // 先清空查詢參數，確保每次都從乾淨狀態開始
    try { url.search = ''; } catch {}
    const connId = `${this.selfId}-${sid}`;
    // 使用更隨機的 connection id，避免伺服器沿用舊連線狀態
    const cid = `${this.selfId}-${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`;
    this.connId = cid;
    try { console.debug('[ws] ids', { selfId: this.selfId, sid, connId, cid }); } catch {}
    url.searchParams.set('id', cid);
    url.searchParams.set('aid', this.selfId!); // 帳號 Id（後端可用於關聯 Profile）
    url.searchParams.set('name', this.selfName!);
    try {
      const g = (localStorage.getItem('pgender') || 'M').toUpperCase();
      url.searchParams.set('gender', g === 'F' ? 'F' : 'M');
    } catch {}

    try { if (this.ws) { try { this.ws.close(); } catch {} } } catch {}
    try { this.ws = new WebSocket(url.toString()); } catch (err) {
      try { console.error('[ws] construct failed', err); } catch {}
      this.emit('status', { connected: false });
      this.scheduleReconnect();
      return;
    }
    this.ws.onopen = () => {
      try { console.info('[ws] connected:', url.toString()); } catch {}
      this.emit('status', { connected: true });
      this.backoff = 1000;
      // 啟動心跳（client -> server），避免被中間代理關閉
      try { if (this.hbTimer) clearInterval(this.hbTimer); } catch {}
      this.lastPong = Date.now();
      this.hbTimer = setInterval(() => {
        try {
          if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
          this.send({ type: 'ping', t: Date.now() });
          // 若 45 秒內未收到任何 pong/訊息，判定斷線，主動關閉觸發重連
          if (Date.now() - this.lastPong > 45000) {
            try { this.ws.close(); } catch {}
          }
        } catch {}
      }, 15000);
      // announce profile once connected to keep server in sync
      try {
        const g = (localStorage.getItem('pgender') || 'M').toUpperCase() === 'F' ? 'F' : 'M';
        const n = (this.selfName || localStorage.getItem('pname') || '').toString();
        this.send({ type: 'profile', name: n, gender: g });
      } catch {}
    };
    this.ws.onclose = (ev) => {
      try { console.warn('[ws] disconnected', { code: ev.code, reason: ev.reason, clean: ev.wasClean }); } catch {}
      this.emit('status', { connected: false });
      try { if (this.hbTimer) clearInterval(this.hbTimer); this.hbTimer = null; } catch {}
      this.scheduleReconnect();
    };
    this.ws.onerror = (ev) => {
      try { console.error('[ws] error', ev); } catch {}
      this.emit('status', { connected: false });
    };
    this.ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        // 任意訊息都視為活躍，更新 lastPong
        this.lastPong = Date.now();
        if (data?.type === 'welcome' && data.id) this.selfId = data.id;
        try { if (data?.type) console.debug('[ws] <=', data.type, data); } catch {}
        this.emit(data?.type || 'message', data);
      } catch {}
    };
  }

  private resolveUrl(): string {
    // 1) 顯式指定：VITE_WS_URL / window.__WS_URL / ?ws= 覆蓋整個 URL
    try {
      const urlParam = new URLSearchParams(window.location.search).get('ws') || '';
      const override = (typeof (import.meta as any)?.env?.VITE_WS_URL === 'string' ? (import.meta as any).env.VITE_WS_URL : '')
        || (typeof (window as any).__WS_URL === 'string' ? (window as any).__WS_URL : '')
        || (CONFIG.network.wsUrl && CONFIG.network.wsUrl.trim())
        || urlParam;
      if (override) return override;
    } catch {}
    // 1.5) 明確的開發/生產預設（無覆蓋時，且啟用 useEnvDefault）
    try {
      const isDev = !!(import.meta as any)?.env?.DEV;
      if (CONFIG.network.useEnvDefault) {
        const envUrl = isDev ? CONFIG.network.devUrl : CONFIG.network.prodUrl;
        if (envUrl && typeof envUrl === 'string') return envUrl;
      }
    } catch {}
    // 2) 自動組合：依目前頁面 host/port 推導 ws/wss，支援 path/port 覆蓋
    const loc = window.location;
    const secure = CONFIG.network.secure;
    const proto = secure === 'always' ? 'wss' : secure === 'never' ? 'ws' : (loc.protocol === 'https:' ? 'wss' : 'ws');
    const host = loc.hostname;
    // port: ?wsport, __WS_PORT, VITE_WS_PORT, CONFIG.network.wsPort, fallback current
    let portOverride: string | null = null;
    try {
      const url = new URL(window.location.href);
      const qp = url.searchParams.get('wsport');
      if (qp) portOverride = qp;
    } catch {}
    if (!portOverride && typeof (window as any).__WS_PORT === 'number') portOverride = String((window as any).__WS_PORT);
    if (!portOverride && typeof (import.meta as any)?.env?.VITE_WS_PORT === 'string') portOverride = (import.meta as any).env.VITE_WS_PORT;
    if (!portOverride && CONFIG.network.wsPort != null) portOverride = String(CONFIG.network.wsPort);
    const port = portOverride ?? (loc.port || '');
    // path: ?wspath, __WS_PATH, VITE_WS_PATH, CONFIG.network.wsPath, default '/ws'
    let path = '/ws';
    try {
      const qpPath = new URLSearchParams(window.location.search).get('wspath');
      if (qpPath) path = qpPath;
    } catch {}
    if (typeof (window as any).__WS_PATH === 'string') path = (window as any).__WS_PATH;
    const envPath = (import.meta as any)?.env?.VITE_WS_PATH as any;
    if (typeof envPath === 'string' && envPath) path = envPath;
    if (CONFIG.network.wsPath) path = CONFIG.network.wsPath;
    const hostPort = port ? `${host}:${port}` : host;
    return `${proto}://${hostPort}${path}`;
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(this.selfName || undefined);
      this.backoff = Math.min(this.maxBackoff, this.backoff * 2);
    }, this.backoff);
  }

  on(type: string, h: Handler) {
    (this.handlers[type] ||= []).push(h);
  }

  off(type: string, h: Handler) {
    const arr = this.handlers[type];
    if (!arr) return;
    const i = arr.indexOf(h);
    if (i >= 0) arr.splice(i, 1);
  }

  private emit(type: string, data: any) {
    const arr = this.handlers[type];
    if (!arr) return;
    for (const h of arr) { try { h(data); } catch {} }
  }

  send(obj: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try { this.ws.send(JSON.stringify(obj)); } catch {}
  }

  sendMove(x: number, y: number, area: string) {
    this.send({ type: 'move', x, y, area });
  }

  sendChat(text: string) {
    this.send({ type: 'chat', text });
  }

  getId() { return this.selfId; }
  getName() { return this.selfName; }
  getCid() { return this.connId; }
  getAid() { return this.selfId; }
}

let client: WSClient | null = null;

export function getClient() {
  if (!client) client = new WSClient(CONFIG.network.wsUrl);
  return client;
}

export function initConnection() {
  const c = getClient();
  c.connect(CONFIG.player.name);
  return c;
}
