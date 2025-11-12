import { getApiBase } from '../net/http';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function safeGet<T>(fn: () => T, d: T): T {
  try { return fn(); } catch { return d; }
}

function basePayload(level: LogLevel, message: string, extra?: any) {
  const now = new Date().toISOString();
  const url = safeGet(() => window.location.href, '');
  const pid = safeGet(() => localStorage.getItem('pid') || '', '');
  const sid = safeGet(() => sessionStorage.getItem('sid') || '', '');
  const name = safeGet(() => localStorage.getItem('pname') || '', '');
  const gender = safeGet(() => (localStorage.getItem('pgender') || 'M').toUpperCase(), 'M');
  return { level, message, url, ts: now, pid, sid, name, gender, extra };
}

async function sendLogs(batch: any[]) {
  const base = getApiBase();
  const endpoint = `${base}/logs`;
  const body = JSON.stringify(batch);
  try {
    if ('sendBeacon' in navigator) {
      const blob = new Blob([body], { type: 'application/json' });
      if ((navigator as any).sendBeacon(endpoint, blob)) return;
    }
  } catch {}
  try {
    await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true as any });
  } catch {}
}

export function log(level: LogLevel, message: string, extra?: any) {
  return sendLogs([basePayload(level, message, extra)]);
}

export function debug(message: string, extra?: any) { return log('debug', message, extra); }
export function info(message: string, extra?: any) { return log('info', message, extra); }
export function warn(message: string, extra?: any) { return log('warn', message, extra); }
export function error(message: string, extra?: any) { return log('error', message, extra); }

export function initClientLogging() {
  // window.onerror
  try {
    window.addEventListener('error', (ev) => {
      try {
        const payload = basePayload('error', String(ev.message || 'window.error'));
        (payload as any).name = (ev.error && (ev.error as any).name) || 'Error';
        (payload as any).stack = (ev.error && (ev.error as any).stack) || '';
        (payload as any).source = ev.filename;
        (payload as any).lineno = ev.lineno;
        (payload as any).colno = ev.colno;
        sendLogs([payload]);
      } catch {}
    });
  } catch {}

  // unhandledrejection
  try {
    window.addEventListener('unhandledrejection', (ev: PromiseRejectionEvent) => {
      try {
        const reason: any = (ev && (ev as any).reason) || {};
        const msg = String(reason?.message || reason || 'unhandledrejection');
        const payload = basePayload('error', msg);
        (payload as any).name = reason?.name || 'UnhandledRejection';
        (payload as any).stack = reason?.stack || '';
        sendLogs([payload]);
      } catch {}
    });
  } catch {}
}

export default { log, debug, info, warn, error, initClientLogging };

