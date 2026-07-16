import { APP_NAME, API_BASE_URL } from "../core/config";
import { getSystemStatus } from "../core/http/apiClient";

export function createApp(root: HTMLElement): void {
  root.innerHTML = `
    <main class="shell">
      <p class="eyebrow">ARCHITECTURE RESET</p>
      <h1>${APP_NAME}</h1>
      <p class="summary">前端架構已就緒。舊遊戲內容已清空，等待新的世界設計。</p>
      <section class="status-card" aria-live="polite">
        <span class="status-dot"></span>
        <div>
          <strong>系統狀態</strong>
          <p data-system-status>正在確認 API…</p>
        </div>
      </section>
    </main>`;

  const status = root.querySelector<HTMLElement>("[data-system-status]");
  void getSystemStatus()
    .then((result) => {
      if (status) status.textContent = `${result.name} API 已連線（${result.environment}）`;
    })
    .catch(() => {
      if (status) status.textContent = `前端已啟動；API 尚未連線：${API_BASE_URL}`;
    });
}
