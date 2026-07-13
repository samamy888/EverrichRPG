import "./styles.css";
import {
  fetchShopCatalog,
  fetchTravelerRoster,
  type ProductSummary,
  type ShopCatalogResponse,
  type TravelerSummary
} from "./api";

type ViewKey = "dashboard" | "products" | "travelers";

interface BackendState {
  catalog: ShopCatalogResponse | null;
  travelers: TravelerSummary[];
  view: ViewKey;
  loading: boolean;
  error: string | null;
}

const state: BackendState = {
  catalog: null,
  travelers: [],
  view: "dashboard",
  loading: true,
  error: null
};

const appRoot = getAppRoot();

function getAppRoot(): HTMLDivElement {
  const root = document.querySelector<HTMLDivElement>("#app");
  if (!root) throw new Error("Missing backend app root.");
  return root;
}

function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0
  }).format(value);
}

function formatDateRange(product: ProductSummary): string {
  if (!product.promotionStartAt || !product.promotionEndAt) return "無促銷期間";
  const start = new Date(product.promotionStartAt).toLocaleDateString("zh-TW");
  const end = new Date(product.promotionEndAt).toLocaleDateString("zh-TW");
  return `${start} ～ ${end}`;
}

function render(): void {
  const productCount = state.catalog?.products.length ?? 0;
  const shopCount = state.catalog?.shops.length ?? 0;
  const travelerCount = state.travelers.length;

  appRoot.innerHTML = `
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark">E</span>
        <div>
          <strong>EVERRICH RPG</strong>
          <small>管理後台</small>
        </div>
      </div>
      <nav>
        ${navButton("dashboard", "總覽")}
        ${navButton("products", "商品管理")}
        ${navButton("travelers", "旅客管理")}
      </nav>
      <p class="sidebar-note">共用 API：<code>/api/v1</code></p>
    </aside>
    <main class="shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">Airport Operations Console</p>
          <h1>${viewTitle(state.view)}</h1>
        </div>
        <button class="ghost-button" data-action="refresh">重新整理</button>
      </header>
      ${state.loading ? renderLoading() : state.error ? renderError(state.error) : renderView(productCount, shopCount, travelerCount)}
    </main>
  `;

  appRoot.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view as ViewKey;
      render();
    });
  });
  appRoot.querySelector<HTMLButtonElement>("[data-action='refresh']")?.addEventListener("click", loadData);
}

function navButton(view: ViewKey, label: string): string {
  return `<button class="nav-button ${state.view === view ? "active" : ""}" data-view="${view}">${label}</button>`;
}

function viewTitle(view: ViewKey): string {
  return {
    dashboard: "營運總覽",
    products: "商品清單",
    travelers: "旅客清單"
  }[view];
}

function renderLoading(): string {
  return `<section class="panel state-panel">資料載入中...</section>`;
}

function renderError(error: string): string {
  return `<section class="panel state-panel error">${error}</section>`;
}

function renderView(productCount: number, shopCount: number, travelerCount: number): string {
  if (state.view === "products") return renderProducts();
  if (state.view === "travelers") return renderTravelers();
  return renderDashboard(productCount, shopCount, travelerCount);
}

function renderDashboard(productCount: number, shopCount: number, travelerCount: number): string {
  const promotedProducts = state.catalog?.products.filter((product) => product.promotionPrice).length ?? 0;
  const lowStockProducts = state.catalog?.products.filter((product) => product.stockQuantity <= 10).length ?? 0;
  return `
    <section class="cards">
      ${metricCard("商店", shopCount, "目前可管理的免稅店")}
      ${metricCard("商品", productCount, "共用前台商品資料")}
      ${metricCard("旅客", travelerCount, "永久旅客資料池")}
      ${metricCard("促銷", promotedProducts, "有設定促銷價商品")}
      ${metricCard("低庫存", lowStockProducts, "庫存小於等於 10")}
    </section>
    <section class="panel">
      <h2>下一階段建議</h2>
      <ul class="todo-list">
        <li>商品 CRUD：新增、修改、停用商品。</li>
        <li>旅客 CRUD：調整紙娃娃穿搭與啟用狀態。</li>
        <li>商店配置：綁定商品、店員與貨架類型。</li>
        <li>任務管理：設定旅客需求商品與對話。</li>
      </ul>
    </section>
  `;
}

function metricCard(label: string, value: number, hint: string): string {
  return `
    <article class="metric-card">
      <span>${label}</span>
      <strong>${value}</strong>
      <small>${hint}</small>
    </article>
  `;
}

function renderProducts(): string {
  const products = state.catalog?.products ?? [];
  return `
    <section class="panel">
      <div class="panel-heading">
        <h2>商品資料</h2>
        <span>${products.length} 筆</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>商品品號</th>
              <th>商品名</th>
              <th>商店</th>
              <th>售價</th>
              <th>促銷價</th>
              <th>促銷期間</th>
              <th>庫存</th>
            </tr>
          </thead>
          <tbody>
            ${products.map(renderProductRow).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderProductRow(product: ProductSummary): string {
  const shopName = state.catalog?.shops.find((shop) => shop.id === product.storeId)?.name ?? product.storeId;
  return `
    <tr>
      <td><code>${product.sku}</code></td>
      <td><strong>${product.name}</strong><small>${product.description}</small></td>
      <td>${shopName}</td>
      <td>${formatMoney(product.price)}</td>
      <td>${formatMoney(product.promotionPrice)}</td>
      <td>${formatDateRange(product)}</td>
      <td><span class="stock ${product.stockQuantity <= 10 ? "low" : ""}">${product.stockQuantity}</span></td>
    </tr>
  `;
}

function renderTravelers(): string {
  return `
    <section class="panel">
      <div class="panel-heading">
        <h2>旅客資料</h2>
        <span>${state.travelers.length} 筆</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>姓名</th>
              <th>外觀 Variant</th>
              <th>性別 / 年齡</th>
              <th>髮型</th>
              <th>衣服</th>
              <th>褲子</th>
              <th>AI</th>
            </tr>
          </thead>
          <tbody>
            ${state.travelers.map(renderTravelerRow).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderTravelerRow(traveler: TravelerSummary): string {
  return `
    <tr>
      <td><strong>${traveler.name}</strong><small>${traveler.dialogue}</small></td>
      <td><code>${traveler.variant}</code></td>
      <td>${traveler.appearance.gender} / ${traveler.appearance.ageGroup}</td>
      <td>${traveler.appearance.hairStyle}</td>
      <td>${traveler.appearance.top}</td>
      <td>${traveler.appearance.pants}</td>
      <td>${traveler.movementType} · ${traveler.facing} · ${traveler.speed}</td>
    </tr>
  `;
}

async function loadData(): Promise<void> {
  state.loading = true;
  state.error = null;
  render();

  try {
    const [catalog, roster] = await Promise.all([
      fetchShopCatalog(),
      fetchTravelerRoster()
    ]);
    state.catalog = catalog;
    state.travelers = roster.travelers;
  } catch (error) {
    state.error = error instanceof Error ? error.message : "後台資料載入失敗";
  } finally {
    state.loading = false;
    render();
  }
}

render();
void loadData();



