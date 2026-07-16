import "./styles.css";
import {
  createProduct,
  createTraveler,
  deleteProduct,
  deleteTraveler,
  fetchShopCatalog,
  fetchTravelerRoster,
  updateProduct,
  updateTraveler,
  type ProductInput,
  type ProductSummary,
  type ShopCatalogResponse,
  type TravelerInput,
  type TravelerSummary
} from "./api";
import {
  loadAssetInventory,
  type AssetInventory,
  type AssetInventoryItem
} from "./assetInventory";

type ViewKey = "dashboard" | "products" | "travelers" | "assets";
type Editor = { kind: "product" | "traveler"; id?: string } | null;

interface BackendState {
  catalog: ShopCatalogResponse | null;
  travelers: TravelerSummary[];
  view: ViewKey;
  loading: boolean;
  saving: boolean;
  error: string | null;
  mutationError: string | null;
  editor: Editor;
  assetQuery: string;
  assetScope: string;
  assetCategory: string;
  assetType: string;
  assetDuplicatesOnly: boolean;
  assetPage: number;
  assetInventory: AssetInventory | null;
  assetLoading: boolean;
  assetError: string | null;
}

const state: BackendState = {
  catalog: null,
  travelers: [],
  view: "dashboard",
  loading: true,
  saving: false,
  error: null,
  mutationError: null,
  editor: null,
  assetQuery: "",
  assetScope: "all",
  assetCategory: "all",
  assetType: "all",
  assetDuplicatesOnly: false,
  assetPage: 0,
  assetInventory: null,
  assetLoading: false,
  assetError: null
};

function getAppRoot(): HTMLDivElement {
  const root = document.querySelector<HTMLDivElement>("#app");
  if (!root) throw new Error("Missing backend app root.");
  return root;
}

const appRoot = getAppRoot();

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("zh-TW", {
    style: "currency", currency: "TWD", maximumFractionDigits: 0
  }).format(value);
}

function formatDateRange(product: ProductSummary): string {
  if (!product.promotionStartAt || !product.promotionEndAt) return "無促銷期間";
  return `${new Date(product.promotionStartAt).toLocaleDateString("zh-TW")} ～ ${new Date(product.promotionEndAt).toLocaleDateString("zh-TW")}`;
}

function toLocalDateTime(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function render(): void {
  const productCount = state.catalog?.products.length ?? 0;
  const shopCount = state.catalog?.shops.length ?? 0;
  const travelerCount = state.travelers.length;
  appRoot.innerHTML = `
    <aside class="sidebar">
      <div class="brand"><span class="brand-mark">E</span><div><strong>EVERRICH RPG</strong><small>管理後台</small></div></div>
      <nav>${navButton("dashboard", "總覽")}${navButton("products", "商品管理")}${navButton("travelers", "旅客管理")}${navButton("assets", "資產管理")}</nav>
      <p class="sidebar-note">共用 API：<code>/api/v1</code></p>
    </aside>
    <main class="shell">
      <header class="topbar"><div><p class="eyebrow">Airport Operations Console</p><h1>${viewTitle(state.view)}</h1></div><button class="ghost-button" data-action="refresh">重新整理</button></header>
      ${state.view === "assets" ? renderAssets() : state.loading ? renderLoading() : state.error ? renderError(state.error) : renderView(productCount, shopCount, travelerCount)}
    </main>
    ${renderEditor()}`;
  bindEvents();
}

function bindEvents(): void {
  appRoot.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view as ViewKey;
      state.editor = null;
      render();
      if (state.view === "assets") void ensureAssetInventory();
    });
  });
  appRoot.querySelector<HTMLButtonElement>("[data-action='refresh']")?.addEventListener("click", () => void loadData());
  appRoot.querySelector<HTMLButtonElement>("[data-action='add-product']")?.addEventListener("click", () => openEditor("product"));
  appRoot.querySelector<HTMLButtonElement>("[data-action='add-traveler']")?.addEventListener("click", () => openEditor("traveler"));
  appRoot.querySelectorAll<HTMLButtonElement>("[data-action='edit-product']").forEach((button) => button.addEventListener("click", () => openEditor("product", button.dataset.id)));
  appRoot.querySelectorAll<HTMLButtonElement>("[data-action='edit-traveler']").forEach((button) => button.addEventListener("click", () => openEditor("traveler", button.dataset.id)));
  appRoot.querySelectorAll<HTMLButtonElement>("[data-action='delete-product']").forEach((button) => button.addEventListener("click", () => void removeItem("product", button.dataset.id!)));
  appRoot.querySelectorAll<HTMLButtonElement>("[data-action='delete-traveler']").forEach((button) => button.addEventListener("click", () => void removeItem("traveler", button.dataset.id!)));
  appRoot.querySelectorAll<HTMLElement>("[data-action='close-editor']").forEach((element) => element.addEventListener("click", closeEditor));
  appRoot.querySelector<HTMLFormElement>("#editor-form")?.addEventListener("submit", (event) => void saveEditor(event));
  bindAssetEvents();
}

function navButton(view: ViewKey, label: string): string {
  return `<button class="nav-button ${state.view === view ? "active" : ""}" data-view="${view}">${label}</button>`;
}

function viewTitle(view: ViewKey): string {
  return { dashboard: "營運總覽", products: "商品管理", travelers: "旅客管理", assets: "資產管理" }[view];
}

function renderLoading(): string { return `<section class="panel state-panel">資料載入中...</section>`; }
function renderError(error: string): string { return `<section class="panel state-panel error">${escapeHtml(error)}</section>`; }

function renderView(productCount: number, shopCount: number, travelerCount: number): string {
  if (state.view === "products") return renderProducts();
  if (state.view === "travelers") return renderTravelers();
  if (state.view === "assets") return renderAssets();
  const products = state.catalog?.products ?? [];
  return `<section class="cards">
    ${metricCard("商店", shopCount, "目前可管理的免稅店")}
    ${metricCard("商品", productCount, "共用前台商品資料")}
    ${metricCard("旅客", travelerCount, "永久旅客資料池")}
    ${metricCard("促銷", products.filter((product) => product.promotionPrice != null).length, "有設定促銷價商品")}
    ${metricCard("低庫存", products.filter((product) => product.stockQuantity <= 10).length, "庫存小於等於 10")}
  </section><section class="panel"><h2>資料管理</h2><p class="panel-copy">使用左側商品管理與旅客管理，可新增、編輯或停用正式資料。</p></section>`;
}

function metricCard(label: string, value: number, hint: string): string {
  return `<article class="metric-card"><span>${label}</span><strong>${value}</strong><small>${hint}</small></article>`;
}

function renderProducts(): string {
  const products = state.catalog?.products ?? [];
  return `<section class="panel"><div class="panel-heading"><div><h2>商品資料</h2><span>${products.length} 筆</span></div><button class="primary-button" data-action="add-product">＋ 新增商品</button></div>
    <div class="table-wrap"><table><thead><tr><th>商品品號</th><th>商品名</th><th>商店</th><th>售價</th><th>促銷價</th><th>促銷期間</th><th>庫存</th><th>操作</th></tr></thead>
    <tbody>${products.map(renderProductRow).join("") || `<tr><td colspan="8" class="empty-cell">尚無商品</td></tr>`}</tbody></table></div></section>`;
}

function renderProductRow(product: ProductSummary): string {
  const shopName = state.catalog?.shops.find((shop) => shop.id === product.storeId)?.name ?? product.storeId;
  const id = escapeHtml(product.id);
  return `<tr><td><code>${escapeHtml(product.sku)}</code></td><td><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.description)}</small></td><td>${escapeHtml(shopName)}</td><td>${formatMoney(product.price)}</td><td>${formatMoney(product.promotionPrice)}</td><td>${formatDateRange(product)}</td><td><span class="stock ${product.stockQuantity <= 10 ? "low" : ""}">${product.stockQuantity}</span></td><td><div class="row-actions"><button class="link-button" data-action="edit-product" data-id="${id}">編輯</button><button class="link-button danger" data-action="delete-product" data-id="${id}">停用</button></div></td></tr>`;
}

function renderTravelers(): string {
  return `<section class="panel"><div class="panel-heading"><div><h2>旅客資料</h2><span>${state.travelers.length} 筆</span></div><button class="primary-button" data-action="add-traveler">＋ 新增旅客</button></div>
    <div class="table-wrap"><table><thead><tr><th>姓名</th><th>外觀 Variant</th><th>性別 / 年齡</th><th>髮型</th><th>衣服</th><th>褲子</th><th>AI</th><th>操作</th></tr></thead>
    <tbody>${state.travelers.map(renderTravelerRow).join("") || `<tr><td colspan="8" class="empty-cell">尚無旅客</td></tr>`}</tbody></table></div></section>`;
}

function renderTravelerRow(traveler: TravelerSummary): string {
  const id = escapeHtml(traveler.id);
  return `<tr><td><strong>${escapeHtml(traveler.name)}</strong><small>${escapeHtml(traveler.dialogue)}</small></td><td><code>${escapeHtml(traveler.variant)}</code></td><td>${escapeHtml(traveler.appearance.gender)} / ${escapeHtml(traveler.appearance.ageGroup)}</td><td>${escapeHtml(traveler.appearance.hairStyle)}</td><td>${escapeHtml(traveler.appearance.top)}</td><td>${escapeHtml(traveler.appearance.pants)}</td><td>${escapeHtml(traveler.movementType)} · ${escapeHtml(traveler.facing)} · ${traveler.speed}</td><td><div class="row-actions"><button class="link-button" data-action="edit-traveler" data-id="${id}">編輯</button><button class="link-button danger" data-action="delete-traveler" data-id="${id}">停用</button></div></td></tr>`;
}

const ASSET_PAGE_SIZE = 100;

function renderAssets(): string {
  if (state.assetLoading) return `<section class="panel state-panel">資產清冊載入中...</section>`;
  if (state.assetError) return renderError(state.assetError);
  if (!state.assetInventory) return `<section class="panel state-panel">準備資產清冊...</section>`;
  const inventory = state.assetInventory;
  const categories = [...new Set(inventory.assets.map((asset) => asset.category))].sort();
  const types = [...new Set(inventory.assets.map((asset) => asset.type))].sort();
  const filtered = filteredAssets();
  const pageCount = Math.max(1, Math.ceil(filtered.length / ASSET_PAGE_SIZE));
  if (state.assetPage >= pageCount) state.assetPage = pageCount - 1;
  return `<section class="cards asset-cards">
    ${metricCard("全部資產", inventory.summary.totalFiles, formatBytes(inventory.summary.totalBytes))}
    ${metricCard("部署資產", inventory.summary.runtimeFiles, "public/assets")}
    ${metricCard("來源資產", inventory.summary.sourceFiles, "game/assets")}
    ${metricCard("重複群組", inventory.summary.duplicateGroups, `${inventory.summary.duplicateFiles} 個重複檔案`)}
  </section>
  <section class="panel asset-panel">
    <div class="panel-heading"><div><h2>資產清冊</h2><span id="asset-result-count">${filtered.length} / ${inventory.summary.totalFiles} 筆</span></div><span class="inventory-note">每次後台 build 自動重新掃描</span></div>
    <div class="asset-filters">
      <label class="search-field"><span>搜尋</span><input id="asset-search" type="search" value="${escapeHtml(state.assetQuery)}" placeholder="名稱、路徑、格式或雜湊"></label>
      ${filterSelect("asset-scope", "範圍", [["all", "全部"], ["runtime", "已部署"], ["source", "來源"]], state.assetScope)}
      ${filterSelect("asset-category", "分類", [["all", "全部"], ...categories.map((value) => [value, assetCategoryLabel(value)] as [string, string])], state.assetCategory)}
      ${filterSelect("asset-type", "類型", [["all", "全部"], ...types.map((value) => [value, assetTypeLabel(value)] as [string, string])], state.assetType)}
      <label class="duplicate-toggle"><input id="asset-duplicates" type="checkbox" ${state.assetDuplicatesOnly ? "checked" : ""}><span>只看重複檔</span></label>
    </div>
    <div class="table-wrap asset-table-wrap"><table class="asset-table"><thead><tr><th>預覽</th><th>資產</th><th>分類</th><th>範圍</th><th>類型</th><th>大小</th><th>重複</th></tr></thead><tbody id="asset-table-body">${renderAssetRows(filtered)}</tbody></table></div>
    <div id="asset-pagination">${renderAssetPagination(filtered.length)}</div>
  </section>`;
}

function filterSelect(id: string, label: string, options: [string, string][], selected: string): string {
  return `<label class="filter-field"><span>${label}</span><select id="${id}">${options.map(([value, text]) => `<option value="${escapeHtml(value)}" ${value === selected ? "selected" : ""}>${escapeHtml(text)}</option>`).join("")}</select></label>`;
}

function filteredAssets(): AssetInventoryItem[] {
  const inventory = state.assetInventory;
  if (!inventory) return [];
  const query = state.assetQuery.trim().toLowerCase();
  return inventory.assets.filter((asset) => {
    if (state.assetScope !== "all" && asset.scope !== state.assetScope) return false;
    if (state.assetCategory !== "all" && asset.category !== state.assetCategory) return false;
    if (state.assetType !== "all" && asset.type !== state.assetType) return false;
    if (state.assetDuplicatesOnly && asset.duplicateCount < 2) return false;
    if (!query) return true;
    return `${asset.name} ${asset.path} ${asset.extension} ${asset.role} ${asset.sha256}`.toLowerCase().includes(query);
  });
}

function renderAssetRows(assets: AssetInventoryItem[]): string {
  const start = state.assetPage * ASSET_PAGE_SIZE;
  const page = assets.slice(start, start + ASSET_PAGE_SIZE);
  if (page.length === 0) return `<tr><td colspan="7" class="empty-cell">找不到符合條件的資產</td></tr>`;
  return page.map(renderAssetRow).join("");
}

function renderAssetRow(asset: AssetInventoryItem): string {
  const imageUrl = asset.url && asset.type === "image" ? assetUrl(asset.url) : null;
  const preview = imageUrl
    ? `<a href="${escapeHtml(imageUrl)}" target="_blank" rel="noreferrer"><img class="asset-thumbnail" src="${escapeHtml(imageUrl)}" alt="" loading="lazy"></a>`
    : `<span class="asset-file-icon">${escapeHtml(asset.extension.slice(0, 4).toUpperCase())}</span>`;
  return `<tr><td>${preview}</td><td><strong>${escapeHtml(asset.name)}</strong><small class="asset-path" title="${escapeHtml(asset.path)}">${escapeHtml(asset.path)}</small><small><code>${escapeHtml(asset.sha256.slice(0, 12))}</code> · ${escapeHtml(asset.role)}</small></td><td><span class="asset-tag">${escapeHtml(assetCategoryLabel(asset.category))}</span></td><td>${asset.scope === "runtime" ? "已部署" : "來源"}</td><td>${escapeHtml(assetTypeLabel(asset.type))}<small>.${escapeHtml(asset.extension)}</small></td><td>${formatBytes(asset.bytes)}</td><td>${asset.duplicateCount > 1 ? `<span class="duplicate-badge">${asset.duplicateCount} 份</span>` : "—"}</td></tr>`;
}

function renderAssetPagination(total: number): string {
  const pageCount = Math.max(1, Math.ceil(total / ASSET_PAGE_SIZE));
  return `<div class="pagination"><span>第 ${state.assetPage + 1} / ${pageCount} 頁</span><div><button class="ghost-button" data-action="asset-prev" ${state.assetPage === 0 ? "disabled" : ""}>上一頁</button><button class="ghost-button" data-action="asset-next" ${state.assetPage >= pageCount - 1 ? "disabled" : ""}>下一頁</button></div></div>`;
}

function bindAssetEvents(): void {
  const search = appRoot.querySelector<HTMLInputElement>("#asset-search");
  search?.addEventListener("input", () => {
    state.assetQuery = search.value;
    state.assetPage = 0;
    updateAssetResults();
  });
  const bindings: [string, (value: string) => void][] = [
    ["#asset-scope", (value) => { state.assetScope = value; }],
    ["#asset-category", (value) => { state.assetCategory = value; }],
    ["#asset-type", (value) => { state.assetType = value; }]
  ];
  for (const [selector, update] of bindings) {
    appRoot.querySelector<HTMLSelectElement>(selector)?.addEventListener("change", (event) => {
      update((event.currentTarget as HTMLSelectElement).value);
      state.assetPage = 0;
      updateAssetResults();
    });
  }
  appRoot.querySelector<HTMLInputElement>("#asset-duplicates")?.addEventListener("change", (event) => {
    state.assetDuplicatesOnly = (event.currentTarget as HTMLInputElement).checked;
    state.assetPage = 0;
    updateAssetResults();
  });
  bindAssetPagination();
}

function bindAssetPagination(): void {
  appRoot.querySelector<HTMLButtonElement>("[data-action='asset-prev']")?.addEventListener("click", () => {
    state.assetPage = Math.max(0, state.assetPage - 1);
    updateAssetResults();
  });
  appRoot.querySelector<HTMLButtonElement>("[data-action='asset-next']")?.addEventListener("click", () => {
    state.assetPage += 1;
    updateAssetResults();
  });
}

function updateAssetResults(): void {
  if (!state.assetInventory) return;
  const assets = filteredAssets();
  const pageCount = Math.max(1, Math.ceil(assets.length / ASSET_PAGE_SIZE));
  state.assetPage = Math.min(state.assetPage, pageCount - 1);
  const tbody = appRoot.querySelector<HTMLTableSectionElement>("#asset-table-body");
  const count = appRoot.querySelector<HTMLElement>("#asset-result-count");
  const pagination = appRoot.querySelector<HTMLElement>("#asset-pagination");
  if (tbody) tbody.innerHTML = renderAssetRows(assets);
  if (count) count.textContent = `${assets.length} / ${state.assetInventory.summary.totalFiles} 筆`;
  if (pagination) pagination.innerHTML = renderAssetPagination(assets.length);
  bindAssetPagination();
}

async function ensureAssetInventory(): Promise<void> {
  if (state.assetInventory || state.assetLoading) return;
  state.assetLoading = true;
  state.assetError = null;
  render();
  try {
    state.assetInventory = await loadAssetInventory();
  } catch (error) {
    state.assetError = error instanceof Error ? error.message : "資產清冊載入失敗";
  } finally {
    state.assetLoading = false;
    render();
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function assetUrl(url: string): string {
  return import.meta.env.DEV ? `http://127.0.0.1:5173${url}` : url;
}

function assetCategoryLabel(category: string): string {
  return ({ maps: "地圖", sprites: "角色", props: "場景物件", tilesets: "圖塊", fonts: "字型", audio: "音效", previews: "預覽", characters: "角色來源", reference: "參考素材" } as Record<string, string>)[category] ?? category;
}

function assetTypeLabel(type: string): string {
  return ({ image: "圖片", audio: "音訊", tiled: "Tiled", font: "字型", data: "資料", text: "文字", other: "其他" } as Record<string, string>)[type] ?? type;
}

function openEditor(kind: "product" | "traveler", id?: string): void {
  state.editor = id ? { kind, id } : { kind };
  state.mutationError = null;
  render();
}

function closeEditor(): void {
  if (state.saving) return;
  state.editor = null;
  state.mutationError = null;
  render();
}

function renderEditor(): string {
  if (!state.editor) return "";
  const isEdit = Boolean(state.editor.id);
  const title = `${isEdit ? "編輯" : "新增"}${state.editor.kind === "product" ? "商品" : "旅客"}`;
  const form = state.editor.kind === "product" ? renderProductForm(state.editor.id) : renderTravelerForm(state.editor.id);
  return `<div class="modal-backdrop" data-action="close-editor"></div><section class="modal" role="dialog" aria-modal="true" aria-label="${title}"><div class="modal-heading"><h2>${title}</h2><button class="icon-button" type="button" data-action="close-editor" aria-label="關閉">×</button></div>${state.mutationError ? `<p class="form-error">${escapeHtml(state.mutationError)}</p>` : ""}<form id="editor-form">${form}<div class="form-actions"><button class="ghost-button" type="button" data-action="close-editor">取消</button><button class="primary-button" type="submit" ${state.saving ? "disabled" : ""}>${state.saving ? "儲存中..." : "儲存"}</button></div></form></section>`;
}

function field(label: string, name: string, value: unknown, options: { type?: string; required?: boolean; min?: number; max?: number; step?: number } = {}): string {
  const type = options.type ?? "text";
  return `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${escapeHtml(value)}" ${options.required ? "required" : ""} ${options.min !== undefined ? `min="${options.min}"` : ""} ${options.max !== undefined ? `max="${options.max}"` : ""} ${options.step !== undefined ? `step="${options.step}"` : ""}></label>`;
}

function renderProductForm(id?: string): string {
  const product = id ? state.catalog?.products.find((item) => item.id === id) : undefined;
  const shops = state.catalog?.shops ?? [];
  const shopId = product?.storeId ?? shops[0]?.id ?? "";
  return `<div class="form-grid">
    <label class="field"><span>商店</span><select name="shopId" required ${product ? "disabled" : ""}>${shops.map((shop) => `<option value="${escapeHtml(shop.id)}" ${shop.id === shopId ? "selected" : ""}>${escapeHtml(shop.name)}</option>`).join("")}</select>${product ? `<input type="hidden" name="shopId" value="${escapeHtml(shopId)}">` : ""}</label>
    ${field("商品品號", "sku", product?.sku ?? "", { required: true })}
    ${field("商品名稱", "name", product?.name ?? "", { required: true })}
    ${field("分類", "category", product?.category ?? "", { required: true })}
    <label class="field field-wide"><span>商品描述</span><textarea name="description" maxlength="500">${escapeHtml(product?.description ?? "")}</textarea></label>
    ${field("售價", "price", product?.price ?? 0, { type: "number", required: true, min: 0 })}
    ${field("促銷價", "promotionPrice", product?.promotionPrice ?? "", { type: "number", min: 0 })}
    ${field("促銷開始", "promotionStartAt", toLocalDateTime(product?.promotionStartAt), { type: "datetime-local" })}
    ${field("促銷結束", "promotionEndAt", toLocalDateTime(product?.promotionEndAt), { type: "datetime-local" })}
    ${field("庫存", "stockQuantity", product?.stockQuantity ?? 0, { type: "number", required: true, min: 0 })}
    ${field("顯示順序", "displayOrder", product?.displayOrder ?? 0, { type: "number", required: true, min: 0 })}
  </div>`;
}

function renderTravelerForm(id?: string): string {
  const traveler = id ? state.travelers.find((item) => item.id === id) : undefined;
  return `<div class="form-grid">
    ${field("姓名", "name", traveler?.name ?? "", { required: true })}
    ${field("外觀 Variant", "variant", traveler?.variant ?? "paperdoll-blue-male", { required: true })}
    ${field("性別", "gender", traveler?.appearance.gender ?? "male", { required: true })}
    ${field("年齡群組", "ageGroup", traveler?.appearance.ageGroup ?? "adult", { required: true })}
    ${field("髮型", "hairStyle", traveler?.appearance.hairStyle ?? "tousled-brown", { required: true })}
    ${field("上衣", "top", traveler?.appearance.top ?? "blue-travel-jacket", { required: true })}
    ${field("褲子", "pants", traveler?.appearance.pants ?? "dark-trousers", { required: true })}
    ${field("移動類型", "movementType", traveler?.movementType ?? "wander", { required: true })}
    ${field("朝向", "facing", traveler?.facing ?? "down", { required: true })}
    ${field("速度", "speed", traveler?.speed ?? 40, { type: "number", required: true, min: 1, max: 200 })}
    <label class="field field-wide"><span>對話</span><textarea name="dialogue" maxlength="500" required>${escapeHtml(traveler?.dialogue ?? "")}</textarea></label>
  </div>`;
}

function stringValue(data: FormData, key: string): string { return String(data.get(key) ?? "").trim(); }
function numberValue(data: FormData, key: string): number { return Number(data.get(key)); }
function nullableNumber(data: FormData, key: string): number | null { const value = stringValue(data, key); return value === "" ? null : Number(value); }
function nullableDate(data: FormData, key: string): string | null { const value = stringValue(data, key); return value ? new Date(value).toISOString() : null; }

async function saveEditor(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  if (!state.editor || state.saving) return;
  const form = event.currentTarget as HTMLFormElement;
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const editor = state.editor;
  state.saving = true;
  state.mutationError = null;
  render();
  try {
    if (editor.kind === "product") {
      const input: ProductInput = {
        shopId: stringValue(data, "shopId"), name: stringValue(data, "name"),
        description: stringValue(data, "description"), category: stringValue(data, "category"),
        sku: stringValue(data, "sku"), price: numberValue(data, "price"),
        promotionPrice: nullableNumber(data, "promotionPrice"),
        promotionStartAt: nullableDate(data, "promotionStartAt"),
        promotionEndAt: nullableDate(data, "promotionEndAt"),
        stockQuantity: numberValue(data, "stockQuantity"), displayOrder: numberValue(data, "displayOrder")
      };
      if (editor.id) await updateProduct(editor.id, input); else await createProduct(input);
    } else {
      const input: TravelerInput = {
        name: stringValue(data, "name"), variant: stringValue(data, "variant"),
        gender: stringValue(data, "gender"), ageGroup: stringValue(data, "ageGroup"),
        hairStyle: stringValue(data, "hairStyle"), top: stringValue(data, "top"),
        pants: stringValue(data, "pants"), dialogue: stringValue(data, "dialogue"),
        movementType: stringValue(data, "movementType"), facing: stringValue(data, "facing"),
        speed: numberValue(data, "speed")
      };
      if (editor.id) await updateTraveler(editor.id, input); else await createTraveler(input);
    }
    state.editor = null;
    await loadData();
  } catch (error) {
    state.mutationError = error instanceof Error ? error.message : "儲存失敗";
  } finally {
    state.saving = false;
    render();
  }
}

async function removeItem(kind: "product" | "traveler", id: string): Promise<void> {
  const label = kind === "product" ? "商品" : "旅客";
  if (!window.confirm(`確定要停用這筆${label}資料嗎？停用後前台將不再讀取。`)) return;
  try {
    if (kind === "product") await deleteProduct(id); else await deleteTraveler(id);
    await loadData();
  } catch (error) {
    window.alert(error instanceof Error ? error.message : `停用${label}失敗`);
  }
}

async function loadData(): Promise<void> {
  state.loading = true;
  state.error = null;
  render();
  try {
    const [catalog, roster] = await Promise.all([fetchShopCatalog(), fetchTravelerRoster()]);
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
