import { loadSystemStatus } from "./api";
import "./styles.css";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Admin root not found.");

root.innerHTML = `
  <main class="admin-shell">
    <aside><strong>Everrich RPG</strong><span>ADMIN</span></aside>
    <section>
      <p class="eyebrow">SYSTEM OVERVIEW</p>
      <h1>管理後台骨架</h1>
      <article><span>API 狀態</span><strong data-api-status>檢查中…</strong></article>
      <p class="note">舊商品、地圖、角色與任務管理功能已移除。</p>
    </section>
  </main>`;

const status = root.querySelector<HTMLElement>("[data-api-status]");
void loadSystemStatus()
  .then((result) => { if (status) status.textContent = `${result.environment} · ${result.version}`; })
  .catch(() => { if (status) status.textContent = "尚未連線"; });
