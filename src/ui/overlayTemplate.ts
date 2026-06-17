export const OVERLAY_TEMPLATE = `
  <section class="prototype-hud">
    <p class="prototype-title">EVERRICH RPG · AIRPORT QUEST</p>
    <p class="prototype-region">準備進入免稅航廈</p>
    <p class="prototype-status">走路模式 · WASD / 方向鍵移動</p>
    <p class="prototype-data-source">資料來源檢查中</p>
    <p class="prototype-quest">靠近可互動物件時會顯示提示</p>
  </section>
  <section class="dialogue-box" aria-live="polite" hidden>
    <p class="dialogue-title"></p>
    <p class="dialogue-text"></p>
    <div class="dialogue-choices"></div>
    <span class="dialogue-next"></span>
  </section>
  <section class="game-menu" aria-label="遊戲選單" hidden>
    <aside class="game-menu-nav">
      <div>
        <p class="menu-kicker">TRAVELER MENU</p>
        <h2>旅客選單</h2>
      </div>
      <nav>
        <button type="button" data-menu-view="home">旅程總覽</button>
        <button type="button" data-menu-view="map">機場導覽</button>
        <button type="button" data-menu-view="passport">旅客護照</button>
        <button type="button" data-menu-view="bag">旅行袋</button>
        <button type="button" data-menu-view="quest">任務</button>
        <button type="button" data-menu-view="settings">設定</button>
        <button type="button" data-menu-view="controls">操作說明</button>
      </nav>
      <button class="menu-return-title" type="button" data-menu-action="return-title">回到主畫面</button>
    </aside>
    <main class="game-menu-main">
      <button class="menu-close" type="button" data-menu-action="close" aria-label="關閉選單">×</button>
      <div class="game-menu-content"></div>
    </main>
  </section>
  <section class="shop-panel" aria-label="免稅店購物介面" hidden>
    <header class="shop-header">
      <div>
        <p class="shop-kicker">DUTY FREE SHOP</p>
        <h2 class="shop-title"></h2>
        <p class="shop-data-source"></p>
        <p class="shop-welcome"></p>
        <p class="shop-clerk"></p>
      </div>
      <button class="shop-close" type="button" aria-label="離開商店">×</button>
    </header>
    <div class="shop-content">
      <div class="shop-products">
        <section class="quest-panel"></section>
        <h3>商品清單</h3>
        <div class="product-list"></div>
      </div>
      <aside class="shop-cart">
        <div class="shop-balance">旅費 <strong>NT$ <span></span></strong></div>
        <h3>購物籃</h3>
        <div class="cart-list"></div>
        <div class="cart-total">合計 <strong>NT$ <span>0</span></strong></div>
        <button class="checkout-button" type="button">結帳</button>
        <p class="checkout-message" aria-live="polite"></p>
        <h3>已購買</h3>
        <div class="purchased-list"></div>
      </aside>
    </div>
  </section>
  <section class="touch-controls" aria-label="手機虛擬操作">
    <div class="virtual-stick" role="group" aria-label="虛擬蘑菇頭方向控制">
      <div class="virtual-stick-ring" aria-hidden="true"></div>
      <div class="virtual-stick-knob" aria-hidden="true"></div>
    </div>
    <div class="mobile-actions">
      <button class="back-button" data-action="back" aria-label="切換走路與跑步">B</button>
      <button class="action-button" data-action="action" aria-label="互動">A</button>
    </div>
  </section>
`;
