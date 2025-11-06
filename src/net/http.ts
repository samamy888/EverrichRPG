import { CONFIG } from '../config';

export function getApiBase(): string {
  // 覆蓋優先：?api= / VITE_API_BASE / window.__API_BASE / CONFIG.network.apiBase
  try {
    const qp = new URLSearchParams(window.location.search).get('api') || '';
    const env = (import.meta as any)?.env?.VITE_API_BASE as string | undefined;
    const win = (window as any).__API_BASE as string | undefined;
    const cfg = (CONFIG.network.apiBase || '').trim();
    if (qp) return qp;
    if (env) return env;
    if (win) return win;
    if (cfg) return cfg;
  } catch {}
  // 預設：dev/prod
  const isDev = !!(import.meta as any)?.env?.DEV;
  if (isDev) return CONFIG.network.apiDev;
  // 後備判斷：若是在 localhost/127.0.0.1 也視為開發
  try {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return CONFIG.network.apiDev;
  } catch {}
  return CONFIG.network.apiProd;
}
