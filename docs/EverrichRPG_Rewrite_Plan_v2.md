# EverrichRPG 全面重寫規劃 v2

> 狀態：規劃基線  
> 日期：2026-06-09  
> 目的：在不破壞舊資料的前提下，將專案重建為復古俯視角、旅客視角、分區式機場冒險 RPG。

## 1. 產品定位

### 1.1 核心概念

玩家扮演旅客，在免稅商店街探索不同店鋪、管理購物預算、完成購物清單、比較商品、與 NPC 互動並收集商品與旅程紀念。

遊戲優先服務純娛樂用途，未來才考慮擴充為品牌展示或工作訓練版本。

### 1.2 設計支柱

1. **探索感**：航廈由多個小型區域組成，鼓勵玩家主動尋路與發現支線。
2. **購物選擇**：預算、購物清單、商品屬性與行李容量形成取捨。
3. **人物故事**：旅客、店員與機場工作者提供短篇事件和持續角色線。
4. **收集成長**：商品圖鑑、旅程紀念、成就與旅客能力形成長期目標。
5. **重玩價值**：不同航班、旅客特質、隨機事件與路線帶來不同結果。

### 1.3 明確不做

- 不複製任何既有商業遊戲的角色、地圖、名稱、素材或介面。
- 第一版不做 MMO、即時多人或大型伺服器同步。
- 第一版不做完整真實機場模擬。
- 第一版不做航班、登機、趕飛機或時間倒數系統。
- 第一版不製作一張涵蓋整座航廈的巨大可玩地圖。
- 第一版不以傳統打怪戰鬥作為主要循環。
- 不直接把舊程式碼搬入新版核心。

## 2. 玩家體驗

### 2.1 玩家身分

首版固定為旅客。

未來角色模式：

- 旅客模式：探索、購物、趕飛機、事件選擇。
- 店員模式：服務旅客、商品推薦、店務事件。
- 特殊角色：機場工作者、導遊或活動角色。

資料模型從第一版就保留 `playerRole`，但只啟用 `traveler`。

### 2.2 一次旅程的核心循環

1. 選擇男性或女性旅客。
2. 取得本次預算與購物清單。
3. 從免稅商店街入口開始探索。
4. 進入不同類型的免稅商店。
5. 比較價格、商品特性與清單需求。
6. 購物、對話、解決事件或接受支線委託。
7. 管理金錢、行李容量與收藏進度。
8. 在服務櫃台完成購物結算與本次評價。

### 2.3 首版垂直切片

目標遊玩時間為 15 至 25 分鐘。

內容：

- 2 名可選旅客外觀，一男一女。
- 1 份主要購物清單。
- 6 個可玩區域。
- 3 名主要 NPC。
- 2 名一般 NPC。
- 1 間可進入的免稅商店。
- 6 項商品。
- 1 條主線事件。
- 2 條短支線。
- 2 種突發事件。
- 1 次完整購物與旅程結算。
- 存檔、讀檔與重新開始。

## 3. 世界與區域設計

### 3.1 地圖技術決策

依 `generate2dmap` 規格採用：

- `map_mode`: `tile_mode`
- `visual_model`: `layered_tilemap`
- `runtime_object_model`: `interactive_scene_objects + foreground_occluders + scene_hooks`
- `collision_model`: `tile_collision + trigger_zones`
- `engine_target`: `Phaser`
- `perspective`: `top-down`
- `art_style`: `retro_pixel`
- 邏輯解析度：`480 × 320`
- 基礎格尺寸：`16 × 16`
- 首發裝置：桌面瀏覽器與手機橫向

地圖必須保持可編輯。地板、牆面、裝飾、碰撞、傳送點、NPC 與互動物件不可烘焙成一張不可拆解的圖片。

### 3.2 區域拓撲

```text
免稅商店街入口
  └─ 中央商店街
      ├─ 美妝香氛店
      ├─ 菸酒食品店
      ├─ 精品伴手禮店
      ├─ 旅行用品店
      └─ 顧客服務中心
```

首版可玩區域：

| 區域 ID | 顯示名稱 | 建議尺寸 | 主要用途 |
|---|---|---:|---|
| `duty-free-entrance` | 免稅商店街入口 | 30×20 | 教學、預算與購物清單 |
| `duty-free-central` | 中央商店街 | 48×30 | 探索、NPC 與支線中心 |
| `shop-beauty-01` | 美妝香氛店 | 24×18 | 美妝、保養與香水 |
| `shop-liquor-food-01` | 菸酒食品店 | 28×20 | 酒類、食品與伴手禮 |
| `shop-gift-01` | 精品伴手禮店 | 24×18 | 精品、收藏與禮品 |
| `customer-service` | 顧客服務中心 | 20×16 | 任務回報、結算與教學 |

### 3.3 場景切換

玩家進入 Portal 後：

1. 鎖定玩家輸入。
2. 結束當前互動。
3. 畫面淡出至黑色。
4. 保存當前區域暫態。
5. 載入目標區域資料與必要資產。
6. 將玩家放置於指定 Spawn。
7. 設定面向與短暫防重觸發時間。
8. 畫面淡入。
9. 恢復玩家輸入。

Portal 資料範例：

```json
{
  "id": "to-gift-shop",
  "type": "portal",
  "bounds": { "x": 304, "y": 48, "width": 16, "height": 32 },
  "destination": {
    "regionId": "shop-gift-01",
    "spawnId": "from-shopping",
    "facing": "up"
  },
  "transition": {
    "type": "fade",
    "durationMs": 250
  }
}
```

必須防止：

- Spawn 落在碰撞格內。
- 淡入後立刻再次觸發原 Portal。
- 轉場期間重複輸入。
- 目標區域載入失敗後黑畫面卡死。
- NPC 對話或選單開啟時觸發轉場。

### 3.4 區域資料契約

```text
game/content/world/regions/<region-id>/
  region.json
  tilemap.json
  entities.json
  portals.json
  encounters.json
```

`region.json`：

```json
{
  "id": "duty-free-central",
  "nameKey": "region.dutyFreeCentral.name",
  "tilesetIds": ["duty-free-floor", "duty-free-walls", "duty-free-shops"],
  "width": 48,
  "height": 30,
  "tileSize": 16,
  "musicId": "bgm-shopping",
  "ambientId": "ambient-terminal",
  "defaultSpawnId": "from-entrance",
  "cameraMode": "follow-player"
}
```

Tilemap 圖層：

1. `ground`
2. `ground-detail`
3. `walls`
4. `low-props`
5. `objects`
6. `above-player`
7. `collision`
8. `portals`
9. `interaction-zones`
10. `spawn-points`

### 3.5 單一世界場景

Phaser 僅保留一個通用探索場景：

```text
WorldScene
  ├─ RegionLoader
  ├─ TilemapRenderer
  ├─ EntitySpawner
  ├─ CollisionController
  ├─ InteractionController
  ├─ PortalController
  └─ CameraController
```

禁止為每張地圖建立 `GateAScene`、`ShoppingScene` 或 `StoreScene` 等重複 Class。區域差異必須由資料驅動。

## 4. 玩法系統

### 4.1 時間系統

- 第一版不實作時間流逝、航班倒數或錯過航班。
- 遊戲設定與存檔格式預留 `journeyTimeMode`，但預設為 `disabled`。
- 未來可加入「行動時計時」與「悠閒模式」，不採玩家閱讀時持續倒數。

### 4.2 資源

- 現金／購物預算。
- 行李容量。
- 體力或心情，首版可只保留一項。
- 任務與航班必要物品。

### 4.3 互動

統一互動指令，不為每類物件另設按鍵。

可互動類型：

- NPC 對話。
- 商店入口。
- 商品貨架。
- 商店資訊板與商品型錄。
- 椅子或休息點。
- 自助報到機。
- 地圖與指示牌。
- Portal。

### 4.4 事件取代傳統戰鬥

第一版採「情境事件」：

- 安檢排隊。
- 找不到登機門。
- 商品選擇與預算取捨。
- 協助其他旅客。
- 遺失物品。
- 臨時折扣、缺貨或商品推薦事件。

事件由選項、條件、擲值或小型操作組成，輸出時間、金錢、道具、關係值或故事旗標變化。

未來若加入戰鬥，應作為幻想事件或小遊戲模式，不污染核心旅客資料模型。

### 4.5 商店系統

商品不只是價格清單，至少包含：

```json
{
  "id": "souvenir-pineapple-cake",
  "nameKey": "item.pineappleCake.name",
  "category": "souvenir",
  "price": 380,
  "weight": 1,
  "volume": 2,
  "tags": ["taiwan", "gift", "food"],
  "storeIds": ["duty-free-01"],
  "effects": [],
  "collectibleId": "catalog-pineapple-cake"
}
```

商品資料需區分遊戲價格與未來可能使用的真實工作資料，兩者不可混用。

### 4.6 任務與故事

任務採節點式資料：

- 觸發條件。
- 對話或事件節點。
- 目標。
- 完成條件。
- 獎勵。
- 失敗或逾時分支。
- 可重複性。

主線必須允許玩家即使漏掉支線仍可完成購物結算。

## 5. 角色與 Sprite 設計

### 5.1 Sprite 技術決策

依 `generate2dsprite` 規格採用：

- `art_style`: `retro_pixel`
- `view`: `topdown`
- `anchor`: `feet`
- 移動：四方向 `4×4` sheet，每方向 4 幀。
- 待機：優先使用移動 sheet 的穩定幀；主角可另做細微 idle。
- 角色、NPC、FX 與可動物件分開生成。
- 生成原圖使用純洋紅背景並保留 prompt 與 pipeline metadata。
- 所有角色保持一致比例、腳底錨點與碰撞尺寸。

### 5.2 首版角色資產

| 資產 | 類型 | 動畫 |
|---|---|---|
| 玩家旅客 | player | 四方向 walk、idle |
| 店員 | npc | 四方向 walk 或 idle/talk |
| 商務旅客 | npc | 四方向 walk |
| 家庭旅客 | npc | idle、短距離 walk |
| 機場工作人員 | npc | 四方向 walk |
| 安檢人員 | npc | idle、talk |

### 5.3 玩家外觀

首版提供兩名完整旅客外觀，一男一女，能力與主線內容相同。資料仍需支援：

- body variant
- skin tone
- hair
- outfit
- luggage
- accessory

第一版不做自由換裝。以兩套完整角色 Sprite 切換，避免組件式角色造成大量動畫組合成本。

### 5.4 場景物件資產策略

適合小型 Prop Pack：

- 垃圾桶
- 植栽
- 小型指示牌
- 行李箱
- 小桌椅
- 零食展示物

必須獨立或使用專用 tileset：

- 報到櫃台
- 商店門面
- 手扶梯
- 電梯
- 安檢設備
- 長牆
- 貨架
- 大型航班資訊板
- Portal 門框

所有碰撞關鍵物件不可因方便而塞進一般方形 Prop Pack。

## 6. 美術方向

### 6.1 視覺語言

- GBA 時代俯視角 RPG 的清楚輪廓與有限色盤。
- 不仿製特定作品的 tiles、建築或 UI。
- 保留現代國際機場的明亮、乾淨與方向辨識性。
- 不追求真實比例，優先確保路線、入口與互動物可讀。
- 室內區域可透過色溫和地板圖案建立辨識。

### 6.2 建議色彩區分

- 公共大廳：中性白灰＋藍色導引。
- 安檢區：冷灰＋警示黃。
- 商店街：暖白＋金色與品牌變化。
- A 區登機門：藍綠色。
- 候機室：低飽和藍灰。
- 可互動提示：統一高亮色，不依賴文字。

### 6.3 畫面與鏡頭

- 邏輯解析度固定為 `480×320`。
- 像素資產使用 nearest-neighbor。
- 鏡頭以玩家為中心，邊界限制在區域內。
- UI 使用獨立 DOM 或固定 Phaser UI 層，不跟隨地圖縮放。
- 必須預先決定整數縮放與非 3:2 螢幕的黑邊／延伸策略。

## 7. 舊資料梳理與遷移

### 7.1 原則

1. Git 歷史是原始保險庫，不直接刪除歷史。
2. 舊資料保留在同一個 repository 的 `archive/`。
3. 先產生完整清冊，再決定搬遷。
4. 資料價值與程式可用性分開評分。
5. 舊大型地圖只作母版與參考，不直接當新版 runtime 地圖。
6. 舊資料必須標記來源、授權、狀態與最終去向。

### 7.2 分級

| 分級 | 定義 | 動作 |
|---|---|---|
| A | 可直接進新版的正式資料 | 清理、轉換、驗證 |
| B | 有價值但需視覺或格式審核 | 進候選庫 |
| C | 僅供設計參考 | 進 reference archive |
| D | 生成來源與中間產物 | 進 source archive |
| E | 失敗、重複或無依賴資料 | 提出淘汰清單 |

### 7.3 建議結構

```text
archive/
  legacy-code/
  source-assets/
  references/
  generation-records/

game/
  assets/
    characters/
    props/
    tilesets/
    ui/
    audio/
  content/
    world/
    characters/
    items/
    shops/
    quests/
    dialogue/
  schemas/

migration/
  inventory.json
  decisions.json
  reports/
```

### 7.4 清冊欄位

```json
{
  "path": "public/map/TPE2/props/airport-atm/prop.png",
  "type": "image",
  "category": "map-prop",
  "source": "legacy-git-head",
  "hash": "sha256",
  "dimensions": { "width": 512, "height": 512 },
  "status": "candidate",
  "grade": "B",
  "runtimeReferences": [],
  "licenseStatus": "review-required",
  "decision": null,
  "decisionReason": null
}
```

### 7.5 舊地圖拆區方法

1. 將舊航廈大圖視為空間參考。
2. 標記主要節點、路徑與地標。
3. 建立新版區域拓撲，不沿用舊世界座標。
4. 每區重新配置為 16px tile grid。
5. 只搬遷被核准的 props、文字與設施概念。
6. 建立舊設施 ID 到新版 entity ID 的映射表。
7. 驗證每個區域的入口、出口、路徑與登機流程。

## 8. 軟體架構

```text
src/
  app/
    bootstrap/
    config/
  game/
    scenes/
    world/
    entities/
    systems/
    ui/
  domain/
    player/
    journey/
    inventory/
    quests/
    dialogue/
    shops/
    events/
  content/
    loaders/
    validators/
  infrastructure/
    save/
    audio/
    input/
    telemetry/
```

### 8.1 分層規則

- `domain` 不得依賴 Phaser。
- Phaser Scene 不擁有唯一遊戲狀態。
- UI 只能發送命令與讀取 View Model。
- 所有內容資料載入時必須驗證 schema。
- 存檔只保存必要狀態，不保存可由內容資料重建的完整物件。
- 系統需支援版本化存檔遷移。

### 8.2 核心服務

- `GameStateStore`
- `RegionManager`
- `TransitionManager`
- `InteractionSystem`
- `DialogueSystem`
- `QuestSystem`
- `JourneyClock`
- `InventorySystem`
- `ShopSystem`
- `SaveRepository`
- `AudioManager`

## 9. 容易漏掉但必須納入的事項

### 9.1 地圖與轉場

- Portal 雙向連結完整性檢查。
- Spawn 與碰撞重疊檢查。
- 區域出口命名一致性。
- NPC 跨區域狀態保存。
- 區域重進時一次性事件不可重播。
- 讀檔後回到正確區域與 Spawn。
- 地圖載入失敗的恢復畫面。

### 9.2 存檔

- `saveVersion`。
- 自動存檔與手動存檔時機。
- 寫入中斷或 JSON 損毀處理。
- 舊版存檔不相容時的提示。
- 新增內容後的 migration。

### 9.3 輸入與裝置

- 鍵盤與手把 action mapping。
- 按鍵可重綁的資料結構。
- 避免把實際按鍵寫死在遊戲邏輯。
- 長按、連點與轉場輸入鎖。
- 瀏覽器失去焦點時暫停。

### 9.4 UI／UX

- 對話、商店、背包與暫停選單的輸入焦點。
- 字體中文字集與載入體積。
- 小螢幕、寬螢幕與全螢幕策略。
- 色弱與不依賴顏色的提示。
- 可調文字速度與跳過動畫。
- 購物清單、預算、行李容量與任務目標必須隨時可查。

### 9.5 音訊

- 各區 BGM。
- 航廈環境音。
- UI、腳步、購物與轉場音效。
- 場景切換時淡出淡入。
- 瀏覽器自動播放限制。
- 音量分類與靜音設定。

### 9.6 內容與法務

- 採用真實品牌，但品牌、商標、店名、商品圖與照片皆需記錄使用權。
- 未確認授權的項目只能使用開發代號與暫代圖示，不可進正式版本。
- AI 生成素材的 prompt、來源與版本紀錄。
- 商品資料為虛構或真實資料時的清楚標記。
- 未來工作版本與娛樂版本的資料隔離。

### 9.7 測試與工具

- 區域資料 schema 驗證。
- Portal graph 無斷點檢查。
- 所有 Spawn 可行走檢查。
- 資產引用與遺失檔案檢查。
- 存檔 round-trip 測試。
- 核心 domain 單元測試。
- Browser 完整旅程 smoke test。
- 碰撞、Portal、互動區 debug overlay。

### 9.8 效能

- 區域級資產載入與釋放。
- 共用 tileset 快取。
- 音訊與大型 atlas 的載入策略。
- 避免每次進區域重建全域 UI。
- 低階裝置 FPS 與記憶體目標。

## 10. 開發階段

### Phase 0：規格與資料治理

- 確認本文件。
- 建立舊資料完整清冊。
- 建立去留決策表。
- 固定 16×16 tileset、角色尺寸與 480×320 邏輯解析度。
- 完成首版區域拓撲。

驗收：

- 舊資料 100% 進清冊。
- 沒有資料在未分類前被刪除。
- 每個首版區域都有入口、出口與功能描述。

### Phase 1：技術垂直原型

- 建立乾淨新版骨架。
- 完成單一 `WorldScene`。
- 兩張測試地圖。
- Portal 黑幕轉場。
- 玩家四方向移動與碰撞。
- 基礎存檔與區域恢復。
- 桌面鍵盤與手機橫向觸控輸入。

驗收：

- 可在兩區之間往返 20 次。
- 無重複觸發、黑畫面或 Spawn 卡牆。
- 重新整理後回到正確區域。

### Phase 2：首版世界骨架

- 製作 6 區 blockout。
- 完成所有 Portal graph。
- 加入 NPC、互動與購物清單目標。
- 完成 debug overlay 和資料驗證。

驗收：

- 不看開發工具也能從入口完成購物並抵達服務中心。
- 所有主要路線可完成。
- 無不可達區域。

### Phase 3：玩法垂直切片

- 對話、任務、商店、背包、時間與事件。
- 完整購物結算。
- 自動存檔。

驗收：

- 15 至 25 分鐘完整購物旅程。
- 主線可完成。
- 支線失敗不阻塞主線。

### Phase 4：正式美術與音訊

- 使用 `generate2dmap` 製作正式 tileset、區域和 props。
- 使用 `generate2dsprite` 製作玩家與 NPC。
- 音訊、UI 與動畫整合。

驗收：

- 資產來源、prompt 與版本資訊完整。
- 無碰撞關鍵物件烘焙進背景。
- 所有 Sprite 通過 edge-touch、尺寸與錨點 QC。

### Phase 5：穩定化

- Browser 完整流程測試。
- 存檔遷移測試。
- 效能與裝置測試。
- IIS 發布流程。

驗收：

- build、資料驗證和 smoke test 一鍵通過。
- 無阻塞級錯誤。
- 可產生可部署版本。

## 11. 第一批設計產出

在正式寫遊戲功能前，先產出：

1. `migration/inventory.json`
2. `migration/decisions.json`
3. 世界區域拓撲 JSON。
4. Region、Portal、Entity、Item、Quest schema。
5. 兩張 blockout 地圖：商店街入口與中央商店街。
6. 男女各一名玩家旅客的 sprite 規格與視覺概念。
7. 一套航廈 tileset 規格。
8. Portal 黑幕轉場技術原型。

## 12. 進入動工前的決策門

以下項目確認後才建立新版程式：

- [x] 邏輯解析度採 `480×320`。
- [x] Tile 尺寸固定為 `16×16`。
- [x] 美術採真正 retro pixel，而非 pixel-inspired。
- [x] 首版提供男女各一名完整旅客外觀。
- [x] 第一版不實作時間流逝；未來提供行動計時與悠閒模式。
- [x] 第一版不實作航班與錯過航班流程。
- [x] 使用真實店名與品牌，但正式發布前必須通過授權檢查。
- [x] 舊資料保留在同一 Git repo 的 `archive/`。
- [x] 第一版同時支援桌面瀏覽器與手機橫向。

本文件確認後，下一步是執行 Phase 0 的清冊工具與資料契約設計，不直接開始製作正式地圖或重寫全部程式。
