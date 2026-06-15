# EverrichRPG 專案總計畫

> 本文件是專案唯一的玩法與開發計畫。  
> 更新日期：2026-06-11

## 1. 遊戲定位

EverrichRPG 是一款以機場免稅店為舞台的 2D 俯視角角色扮演遊戲。

- 第一階段以純娛樂體驗為主。
- 玩家扮演旅客，在免稅店區域探索、購物、與人物互動並完成旅程。
- 核心節奏參考經典掌機 RPG，特別重視清楚的區域切換、探索路線、NPC 事件、收集與任務推進。
- 不複製其他遊戲的角色、地圖、名稱或美術素材，只參考玩法節奏與操作體驗。
- 未來才考慮擴充工作用途、店員角色、航班與時間系統。

## 2. 已定案方向

### 技術

- 引擎：Phaser 3
- 語言：TypeScript
- 建置：Vite
- 地圖編輯：Tiled
- 邏輯解析度：`480 × 320`
- 地圖格：`16 × 16`
- 部署目標：網頁與 IIS 靜態站台

### 玩家與平台

- 首版提供男旅客與女旅客。
- 桌面支援鍵盤。
- 手機與平板支援橫向滿版與虛擬按鍵。
- 未來才開放自選旅客或店員身分。

### 首版不做

- 戰鬥系統
- 航班與錯過航班
- 強制時間倒數
- 多人連線
- 大量角色職業與複雜養成
- 一次擴充大量區域

## 3. 核心遊玩循環

```text
進入新區域
→ 看見清楚的地標或事件線索
→ 與旅客、店員或場景物件互動
→ 接受任務或取得購物目標
→ 探索其他店鋪並完成條件
→ 獲得商品、旅費、紀念章或護照紀錄
→ 場景與 NPC 狀態產生變化
→ 解鎖下一段旅程
```

每個區域至少要包含：

1. 一個醒目的區域地標。
2. 一位有用途的 NPC。
3. 一個可調查物件或小事件。
4. 一個明確或隱藏的獎勵。
5. 一條清楚通往下一區域的路線。

## 4. 經典掌機 RPG 體驗原則

### 地圖與移動

- 區域之間使用短暫黑幕切換。
- 進入新區域時顯示地點名稱。
- 道路寬度、入口方向與碰撞必須容易理解。
- 場景提供主路線與少量可選支路，不做無意義的大空地。
- 隱藏物品需要靠近並面向物件按互動鍵調查。

### NPC

- NPC 具有初始面向與移動模式。
- 與玩家對話時轉向面對玩家。
- 重要 NPC 可在看見玩家時顯示驚嘆號並靠近。
- 初次見面、任務進行中與任務完成後使用不同台詞。
- NPC 不只提供裝飾，每位角色至少負責提示、任務、商店或世界氣氛之一。

### 對話

- 對話文字逐字出現。
- 按互動鍵可加速文字或進入下一頁。
- 支援簡單選項，但選錯不應阻塞主線。
- 重要事件搭配短音效、停頓與角色轉向。

### 任務

- 任務由短目標串成可理解的旅程。
- 任務類型包含購買、找人、送物、失物招領、比較商品與場景調查。
- 任務完成後應改變 NPC 台詞、位置、可通行區域或場景物件。
- 支線提供旅費、紀念章、護照紀錄或特殊商品，不阻塞主線。

## 5. 現有完成內容

### 基礎遊戲

- 標題歡迎頁
- 男女旅客選角與踏步動畫
- 四方向走路與跑步
- 桌面鍵盤與手機虛擬按鍵
- 響應式橫向遊戲畫面
- 自動存檔與回到標題

### 世界與 Tiled

- 五個可遊玩區域
- 黑幕地圖切換
- 牆壁、物件、碰撞、傳送門與出生點圖層
- 可在 Tiled 調整地板、物件、NPC 與碰撞
- Tiled NPC 可設定 `idle`、`wander`、`patrol`
- 可設定 NPC 面向、速度與動畫角色

### 玩法

- 三間免稅店
- 商品瀏覽、購物籃、旅費與結帳
- 旅行袋
- 第一條三店購物任務
- 機場導覽
- 旅客護照
- NPC、區域、商品與隱藏紀念章登錄
- 五枚隱藏紀念章

### 美術

- 男女旅客四方向動畫
- 三位店員
- 四方向店面與機場物件
- 盆栽、飲水機、廁所入口與手扶梯
- 依機場照片整理的視覺參考與資產方向

## 6. 下一階段：讓展示原型成為真正 RPG

這是目前最高優先階段，完成前不新增大型區域。

### 6.1 寶可夢式對話系統

- [x] 對話逐字顯示
- [x] 按 A／Enter 加速文字
- [x] 分頁與繼續提示
- [x] NPC 對話時轉向玩家
- [x] 對話選項
- [x] 依任務狀態切換台詞
- [x] 重要對話期間暫停其他 NPC

驗收：

- 對話開始、加速、換頁與結束都可使用鍵盤及手機操作。
- NPC 面向正確，離開對話後恢復原本 AI。

### 6.2 NPC 視線與驚嘆號事件

- [ ] 為 NPC 設定視線方向與距離
- [ ] 玩家進入視線時顯示驚嘆號
- [ ] NPC 自動走近玩家
- [ ] 自動觸發事件對話
- [ ] 事件完成後不重複觸發
- [ ] Tiled 可設定是否為事件 NPC

驗收：

- 玩家可從四個方向觸發事件。
- NPC 不穿牆、不重疊玩家、不因切換地圖失效。

### 6.3 第一條完整主線任務

建議主線：「遺失的登機紀念袋」

1. 入口旅客請玩家協助尋找遺失物。
2. 美妝店員提供第一條線索。
3. 食品店旅客看見可疑紙袋。
4. 玩家調查展示櫃附近的隱藏物件。
5. 禮品店員協助確認失主。
6. 回到入口交還紀念袋並取得護照印章。

- [ ] 任務階段資料化
- [ ] NPC 台詞隨階段切換
- [ ] 任務物件依階段出現
- [ ] 完成後入口 NPC 改變位置或動作
- [ ] 獎勵寫入旅行袋與旅客護照
- [ ] 中途重新整理後正確恢復

驗收：

- 玩家不依賴除錯功能即可完成整條任務。
- 流程約 10 至 15 分鐘。
- 任務完成後世界有可見變化。

### 6.4 場景小機關

- [ ] 找到物品後移開擋路旅客
- [ ] 調查導覽機取得區域提示
- [ ] 手扶梯作為未來區域入口
- [x] 電子看板或燈光加入循環動畫
- [x] 三位店員加入待機、招呼與操作手勢動畫
- [x] 三樓大廳加入長版 Kiosk 與四畫面輪播
- [x] 依機場照片製作自助點餐機與四階段點餐畫面
- [ ] 特定紀念章需要從 NPC 對話取得線索

## 7. 後續階段

### 階段 A：區域品質

- 重整五區地圖動線與視覺層次。
- 補足座椅、垃圾桶、指示牌與機場細節。
- 每區加入獨立配色、音效與地標。
- 完成 Tiled 物件模板，降低錯誤設定。

### 階段 B：角色與世界反應

- 店員 idle、轉身與簡單手勢動畫。
- 旅客更多外觀與移動行為。
- NPC 排隊、看商品、停留與結伴移動。
- 任務完成後改變人物位置與場景狀態。

### 階段 C：收集與重玩

- 擴充護照人物剪影與商品圖鑑。
- 區域完成獎章。
- 每日或每輪隨機小事件。
- 不同對話選擇帶來小型獎勵差異。

### 階段 D：未來可選功能

- 可關閉的時間流逝。
- 新樓層與手扶梯區域。
- 更多免稅店類型。
- 店員遊玩模式。
- 工作用途資料模式。
- 航班系統僅在重新評估後規劃。

## 8. 美術與地圖規則

- 美術維持真正 retro pixel 風格。
- 地圖格固定 `16 × 16`。
- 玩家與 NPC 使用一致腳底錨點與碰撞尺寸。
- 地板、牆壁、物件、碰撞、Portal、Spawn 與 NPC 必須分層。
- 移動 Tiled 物件時必須同步移動對應碰撞框。
- 左側物件朝中央走道右方，右側物件朝中央走道左方。
- 不把碰撞關鍵物件烘焙進不可編輯背景。
- AI 生成資產需保留來源、Prompt、原圖與處理紀錄。
- 導覽機與出口動畫使用 Tiled 的 `visualEffect`、`effectColor`、`effectDurationMs` 調整。

Tiled 操作細節請見 `docs/Tiled_Map_Workflow.md`。

## 9. 資料與程式原則

- 內容優先由 JSON、Tiled 自訂屬性或設定資料驅動。
- UI 不直接持有遊戲的唯一狀態。
- 任務、商店、探索與存檔服務分離。
- 每個 ID 必須唯一且不可因顯示名稱改變。
- 刪除舊資料前先確認新系統不再引用。
- 正式品牌與照片在發布前必須確認授權。

## 10. 驗證基線

每次完成功能至少執行：

```powershell
npm run tiled:verify
npm run character:verify
npm run shop:verify
npm run exploration:verify
npm run build
```

重要流程還需在桌面與手機尺寸測試：

1. 進入標題頁。
2. 選擇男女旅客。
3. 在五區之間往返。
4. 與 NPC 對話。
5. 購物並完成任務。
6. 開啟選單、護照與旅行袋。
7. 重新整理並確認進度恢復。

## 11. 完成定義

功能只有在以下條件都成立時才算完成：

- 鍵盤與手機皆可操作。
- 切換地圖後仍能移動與互動。
- 存檔後重新整理可恢復。
- Tiled 資料驗證通過。
- 正式建置通過。
- 無阻塞流程的瀏覽器錯誤。
- 玩法目的對第一次遊玩的玩家足夠清楚。

## 12. 前後端分離與後端設計

### 12.1 技術選型

- 前端維持 Phaser 3、TypeScript 與 Vite，部署為純靜態網站。
- 後端採用 `.NET 10 LTS` 與 ASP.NET Core Web API。
- 資料存取採用 Entity Framework Core。
- 第一選擇資料庫為 PostgreSQL。
- API 文件使用 OpenAPI。
- 開發環境允許前端繼續使用本機 JSON 與 localStorage，逐步切換到 API。
- 正式環境由後端掌握玩家進度、商品價格、結帳結果與任務獎勵。

選擇 ASP.NET Core 的理由：

- 可直接部署到 IIS。
- 可包裝成 Linux 或 Windows Docker 容器。
- 同一套程式不因最終部署方式不同而重寫。
- 適合未來加入後台管理、公司帳號或 Microsoft Entra ID。

目前電腦只有 `.NET 8 SDK`。正式建立後端專案前先安裝 `.NET 10 SDK`，不要新建一個即將需要升級的 `.NET 8` 專案。

### 12.2 架構形式

第一版採用「模組化單體」，不要拆微服務。

```text
Phaser Web Client
        │ HTTPS / JSON
        ▼
EverrichRPG API
├─ Identity       匿名玩家、未來會員
├─ Saves          角色、位置與設定
├─ Exploration    區域、NPC、紀念章
├─ Commerce       商品、購物籃、結帳
├─ Quests         任務階段與獎勵
└─ Content        商店與可變遊戲內容
        │
        ▼
PostgreSQL
```

- 每個模組有自己的資料模型、服務與 API 端點。
- 模組共用同一個 ASP.NET Core 程序與資料庫。
- 模組之間透過明確服務介面呼叫，不直接修改別人的資料表。
- 等到流量、團隊或部署需求真的出現，再評估拆服務。

### 12.3 前端與後端責任

仍由前端版本控管：

- Phaser 場景與操作。
- Tiled 地圖、碰撞與 Portal。
- 圖片、動畫、音效與 BGM。
- 純視覺 UI 狀態。
- 可離線使用的預設內容快照。

改由後端管理：

- 玩家識別與存檔版本。
- 角色、所在區域、出生點、面向與移動模式。
- 已拜訪區域、已見 NPC 與已取得紀念章。
- 玩家旅費、購物籃、持有商品與結帳紀錄。
- 任務狀態、任務階段與獎勵領取。
- 正式商品價格、上下架狀態與未來營運內容。

後端不保存玩家每一幀的座標。只在切換區域、重要互動、結帳、任務變更與離開遊戲時保存必要狀態。

### 12.4 API 第一版

所有端點使用 `/api/v1` 前綴。

#### 系統

- `GET /api/v1/health`：存活檢查。
- `GET /api/v1/version`：API 與內容版本。

#### 玩家與存檔

- `POST /api/v1/players/anonymous`：建立匿名玩家與憑證。
- `GET /api/v1/me`：取得玩家基本資料。
- `GET /api/v1/me/save`：取得完整遊戲存檔。
- `PUT /api/v1/me/save/location`：儲存角色、區域、Spawn 與面向。
- `DELETE /api/v1/me/save`：重置遊戲進度。

#### 探索

- `POST /api/v1/me/exploration/regions/{regionId}/visit`
- `POST /api/v1/me/exploration/npcs/{npcId}/meet`
- `POST /api/v1/me/exploration/collectibles/{collectibleId}/discover`

#### 商店

- `GET /api/v1/shops`
- `GET /api/v1/shops/{shopId}`
- `GET /api/v1/shops/{shopId}/products`
- `GET /api/v1/me/cart`
- `PUT /api/v1/me/cart/items/{productId}`
- `DELETE /api/v1/me/cart/items/{productId}`
- `POST /api/v1/me/checkouts`

結帳端點必須由後端重新計算價格，並支援 `Idempotency-Key`，避免手機網路重送造成重複扣款或重複取得商品。

#### 任務

- `GET /api/v1/me/quests`
- `POST /api/v1/me/quests/{questId}/start`
- `POST /api/v1/me/quests/{questId}/advance`
- `POST /api/v1/me/quests/{questId}/claim`

### 12.5 資料表第一版

- `Players`
  - `Id`
  - `DisplayName`
  - `PlayerType`
  - `CreatedAt`
  - `LastSeenAt`
- `PlayerCredentials`
  - `PlayerId`
  - `TokenHash`
  - `ExpiresAt`
- `PlayerSaves`
  - `PlayerId`
  - `SaveVersion`
  - `PlayerVariant`
  - `RegionId`
  - `SpawnId`
  - `Facing`
  - `MovementMode`
  - `UpdatedAt`
  - `RowVersion`
- `PlayerExploration`
  - `PlayerId`
  - `EntryType`
  - `EntryId`
  - `DiscoveredAt`
- `PlayerWallets`
  - `PlayerId`
  - `Balance`
  - `UpdatedAt`
  - `RowVersion`
- `PlayerInventory`
  - `PlayerId`
  - `ProductId`
  - `Quantity`
- `PlayerCartItems`
  - `PlayerId`
  - `ProductId`
  - `Quantity`
- `Checkouts`
  - `Id`
  - `PlayerId`
  - `Total`
  - `IdempotencyKey`
  - `CreatedAt`
- `CheckoutItems`
  - `CheckoutId`
  - `ProductId`
  - `UnitPrice`
  - `Quantity`
- `PlayerQuests`
  - `PlayerId`
  - `QuestId`
  - `Status`
  - `Stage`
  - `UpdatedAt`
- `PlayerRewards`
  - `PlayerId`
  - `RewardId`
  - `ClaimedAt`
- `Shops`
- `Products`
- `QuestDefinitions`

商品、商店與任務定義初期可由目前 JSON 匯入資料庫。Tiled 地圖本身不匯入資料庫。

### 12.6 驗證與安全

- 所有 ID、數量、價格與狀態轉移都由後端驗證。
- 購物結帳與任務獎勵使用資料庫交易。
- API 回傳統一使用 RFC 7807 Problem Details。
- 所有時間保存為 UTC。
- 金額使用整數，不使用浮點數。
- 正式環境強制 HTTPS。
- CORS 只允許指定前端網域。
- 匿名玩家使用伺服器產生的高強度不透明憑證，資料庫只保存雜湊。
- 日誌不得記錄完整憑證或個人資料。
- 寫入 API 加入請求大小限制與基本 Rate Limit。
- 未來帳號系統優先採用 ASP.NET Core Identity 或 OpenID Connect，不自製密碼驗證。

### 12.7 存檔同步策略

- localStorage 暫時保留為離線快取與舊存檔遷移來源。
- 玩家第一次連線後，由前端將本機存檔上傳到後端。
- 成功遷移後記錄伺服器存檔版本。
- 重要狀態修改採伺服器優先，不做雙向任意合併。
- `RowVersion` 或等價併發欄位用來阻止舊分頁覆蓋新存檔。
- 網路中斷時允許繼續移動與瀏覽，但結帳、任務領獎等關鍵操作必須等待伺服器確認。

### 12.8 專案目錄規劃

```text
EverrichRPG/
├─ src/                         Phaser 前端
├─ game/                        地圖與內容來源
├─ server/
│  ├─ EverrichRPG.sln
│  ├─ src/
│  │  ├─ EverrichRPG.Api/
│  │  ├─ EverrichRPG.Application/
│  │  ├─ EverrichRPG.Domain/
│  │  └─ EverrichRPG.Infrastructure/
│  └─ tests/
│     ├─ EverrichRPG.UnitTests/
│     └─ EverrichRPG.IntegrationTests/
├─ Dockerfile.frontend
├─ Dockerfile.api
└─ compose.yaml
```

第一版雖然分成四個 .NET 專案，但仍是一個可部署的 API 程序，不是四個服務。

### 12.9 部署方案

#### Docker

- 前端使用 Nginx 靜態容器。
- API 使用 ASP.NET Core Linux 容器。
- PostgreSQL 使用獨立容器或託管資料庫。
- 由 Docker Compose 提供本機與測試環境。
- 正式環境的資料庫密碼與 Token 金鑰使用環境變數或 Secret，不寫入映像。

#### IIS

- 前端可作為 IIS 靜態網站。
- API 由 ASP.NET Core Module 反向代理至 Kestrel。
- Windows Server 安裝對應版本的 Hosting Bundle。
- PostgreSQL 可使用獨立主機、雲端服務或同機 Windows 服務。
- IIS 可將 `/api` 反向代理至 API，使前後端維持同網域並簡化 CORS。

不論採 Docker 或 IIS，前端都只透過環境設定取得 API Base URL，不在程式碼寫死部署位址。

### 12.10 後端執行階段

#### Backend Phase 0：基礎骨架

- [x] 安裝 `.NET 10 SDK`
- [x] 建立 Solution 與四層專案
- [x] 建立 Health、Version 與 OpenAPI
- [x] 建立 PostgreSQL 與 EF Core Migration
- [x] 建立統一錯誤格式、日誌與 Rate Limit
- [x] 建立 Docker Compose 開發環境

Phase 0 完成狀態：

- Solution：`server/EverrichRPG.slnx`
- API：`server/src/EverrichRPG.Api`
- 第一版 Migration：`InitialPlayers`
- Docker：`Dockerfile.api` 與 `compose.yaml`
- IIS：Release publish 已確認會產生 `web.config`
- 測試：Domain 單元測試與 Health／Version 整合測試
- 注意：目前本機 Docker CLI 為舊版 `20.10.10`，Compose 設定可解析，但正式映像建置需在 Docker daemon 正常或更新 Docker Desktop 後再次驗證。

#### Backend Phase 1：匿名玩家與雲端存檔

- [ ] 建立匿名玩家
- [ ] 讀寫角色與位置
- [ ] 遷移 localStorage 存檔
- [ ] 加入存檔版本與併發保護
- [ ] 前端加入 API Client 與離線 fallback

#### Backend Phase 2：探索與任務

- [ ] 同步已拜訪區域、NPC 與紀念章
- [ ] 任務階段由後端驗證
- [ ] 任務獎勵不可重複領取
- [ ] 完成重新整理與跨裝置恢復測試

#### Backend Phase 3：商店與結帳

- [x] 商品與商店內容 API
- [x] 前端商品清單 API 串接與本機 JSON 備援
- [ ] 購物籃同步
- [ ] 交易式結帳
- [ ] Idempotency-Key 防重送
- [ ] 商品價格與上下架由後端控制

#### Backend Phase 4：營運與工作模式

- [ ] 管理後台
- [ ] 帳號登入與匿名帳號升級
- [ ] 角色權限與店員模式
- [ ] 稽核紀錄
- [ ] 監控、備份與資料保留政策

### 12.11 後端第一個可驗收版本

第一個後端里程碑只做：

1. 建立匿名玩家。
2. 儲存男女角色選擇。
3. 儲存目前區域、Spawn、面向與走跑模式。
4. 重新整理後從 API 恢復。
5. API 無法連線時仍能使用 localStorage 繼續遊玩。

先完成這五項，再搬探索、任務與商店，避免一次改寫全部前端狀態服務。

## 13. 三樓出境大廳六區改造

### 13.1 設計方向

- 參考桃園機場第二航廈三樓出境大廳的設施關係與辨識元素。
- 採用「真實機場配置骨架＋寶可夢式緊湊探索節奏」，不追求真實公尺比例。
- 公共空間拆成六張 Tiled 地圖，以淡出切換維持區域感與手機效能。
- Tile 維持 `16 × 16`，所有地圖沿用相同地板、碰撞、Portal、Spawn 與物件資料契約。
- 三間免稅店內地圖維持獨立，不併入大廳地圖。

### 13.2 六個公共區域

1. `duty-free-entrance`：出境入口、樓層歡迎牌、玩家起點。
2. `security-check`：安檢排隊區、查驗櫃台與教學互動。
3. `departure-hall`：中央出境大廳、旅客主要動線與分流核心。
4. `information-core`：資訊櫃台、機場地圖與任務提示。
5. `airport-facilities`：廁所、飲水機、電梯與手扶梯。
6. `duty-free-central`：安檢後中央免稅商店街與三間店鋪入口。

### 13.3 區域拓撲

```text
duty-free-entrance
        │
security-check
        │
information-core ─ departure-hall ─ airport-facilities
                         │
                duty-free-central
                 ├─ shop-beauty-01
                 ├─ shop-liquor-food-01
                 └─ shop-gift-01
```

### 13.4 地圖節奏與尺寸

- 主線保持南北向，玩家不需看地圖也能走到免稅商店街。
- 資訊區與設施區是短支線，不阻擋主要進度。
- 每張公共地圖控制在約 `32 × 22` 至 `48 × 30` 格。
- 主通道保持至少 5 格寬，Portal 前保留安全出生與迴轉空間。
- 大型物件貼近牆邊或側翼，中央不放會阻塞玩家的櫃台與裝飾。
- 每區至少安排一項互動、一名 NPC 或一個未來任務掛點。

### 13.5 Tiled 圖層契約

1. `Ground`
2. `Accent`
3. `Walls`
4. `Props`
5. `NPCs`
6. `Collision`
7. `Portals`
8. `Spawns`

第一版先重用現有機場資產完成可走、可切換、可在 Tiled 編輯的灰盒地圖。後續美術批次再補上 X-Ray、航班資訊看板、候機座椅、排隊護欄、電梯門與安檢設備。

### 13.6 執行順序

- [x] 確立六區拓撲與統一地圖契約
- [x] 建立六張公共區域第一版地圖
- [x] 驗證所有 Portal 與 Spawn 雙向銜接
- [ ] 製作三樓大廳專屬設施資產
- [ ] 依參考照片調整地板、牆面與指示系統
- [ ] 增加 NPC 分區行為與大廳環境音
- [ ] 使用 Tiled 進行第二輪人工微調

第一版灰盒已完成三樓出境入口、安全檢查、中央出境大廳、旅客服務中心、機場設施區與綜合免稅店的串接。實機已走通「入口 → 安全檢查 → 中央出境大廳」，其餘支線由地圖驗證腳本確認 Portal、Spawn 與目的地資料完整。
