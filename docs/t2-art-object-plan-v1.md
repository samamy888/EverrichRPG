# T2 美術物件製作計畫 v1 (Map + Sprite) - Execution Updated 2026-05-29

## 1. 目標與分工
1. 以 runtime 可驗證為先，完成 T2 物件產線 Batch A -> D。
2. 使用兩技能分工：
- `generate2dmap`：地圖層、空間骨架、場景擺位策略（Batch B 主責）。
- `generate2dsprite`：可重用物件資產（props/signage/decor/fx/NPC 視覺族群，Batch A/C/D 主責）。

## 2. 統一 Prompt 規格（可直接生成）
每個物件皆已建立 `prompt.t2.txt`，統一欄位如下：
- `object_key`
- `batch`
- `owner_skill`
- `asset_type`
- `sheet_strategy`
- `output_format`
- `anchor`
- `canvas_hint`
- `runtime_scale_hint`
- `collision_hint`
- `style_tokens`
- `negative_tokens`
- `prompt`

共通約束：透明背景 PNG（或 magenta sheet for FX/NPC sheet）、錨點以 bottom-center 或 center、保持可讀輪廓與 runtime 尺度一致。

## 3. Batch A~D 物件拆解與 Prompt 規格檔

### Batch A（核心互動）
- `checkin-counter-module` -> `public/map/TPE2/props/checkin-counter-module/prompt.t2.txt`
- `info-counter` -> `public/map/TPE2/props/info-counter/prompt.t2.txt`
- `security-scanner` -> `public/map/TPE2/props/security-scanner/prompt.t2.txt`
- `dutyfree-shop-kiosk` -> `public/map/TPE2/props/dutyfree-shop-kiosk/prompt.t2.txt`
- `flight-board` -> `public/map/TPE2/props/flight-board/prompt.t2.txt`
- `airport-atm` -> `public/map/TPE2/props/airport-atm/prompt.t2.txt`
- `signage-pillar` -> `public/map/TPE2/props/signage-pillar/prompt.t2.txt`
- `self-checkin-kiosk` -> `public/map/TPE2/props/self-checkin-kiosk/prompt.t2.txt`

### Batch B（空間骨架）
- `airport-elevator` -> `public/map/TPE2/props/airport-elevator/prompt.t2.txt`
- `escalator-module` -> `public/map/TPE2/props/escalator-module/prompt.t2.txt`
- `customs-gate-module` -> `public/map/TPE2/props/customs-gate-module/prompt.t2.txt`
- `shopfront-module` -> `public/map/TPE2/props/shopfront-module/prompt.t2.txt`
- `security-partition` -> `public/map/TPE2/props/security-partition/prompt.t2.txt`
- `glass-partition` -> `public/map/TPE2/props/glass-partition/prompt.t2.txt`
- `wall-column` -> `public/map/TPE2/props/wall-column/prompt.t2.txt`
- `short-wall` -> `public/map/TPE2/props/short-wall/prompt.t2.txt`

### Batch C（氛圍補件 + 牌面變體）
- `airport-chairs` -> `public/map/TPE2/props/airport-chairs/prompt.t2.txt`
- `potted-palm` -> `public/map/TPE2/props/potted-palm/prompt.t2.txt`
- `trash-bin` -> `public/map/TPE2/props/trash-bin/prompt.t2.txt`
- 門區品牌變體：
  - `gate-brand-signage-d-zone` -> `public/map/TPE2/props/gate-brand-signage-d-zone/prompt.t2.txt`
  - `gate-brand-signage-c-zone` -> `public/map/TPE2/props/gate-brand-signage-c-zone/prompt.t2.txt`
- 店別識別牌變體：
  - `store-sign-cosmetics`
  - `store-sign-perfume`
  - `store-sign-liquor`
  - `store-sign-snacks`
  - `store-sign-electronics`
  - `store-sign-fashion`
  - `store-sign-books`
  - `store-sign-souvenirs`
  - `store-sign-food`
  - 上述皆在 `public/map/TPE2/props/<key>/prompt.t2.txt`

### Batch D（NPC 視覺族群 + 互動 FX + 微動態）
- NPC 視覺族群 prompt：
  - `npc-visual-traveler-business`
  - `npc-visual-traveler-family`
  - `npc-visual-traveler-solo`
  - `npc-visual-clerk-premium`
- FX prompt：
  - `fx-interact-pulse`
  - `fx-interact-sparkle`
  - `fx-flightboard-flicker`
  - `fx-shopfront-breath-light`
  - `fx-ambient-flow-strip`
- 以上皆在 `public/map/TPE2/props/<key>/prompt.t2.txt`

## 4. Runtime 第一輪實作策略
1. `src/data/tpe2Layout.ts`：逐批將 A/B/C 物件從 floorplan fallback 升級為獨立 key（保留 floorplan 作為佔位來源，不破壞既有鏡頭與碰撞節奏）。
2. `src/actors/NpcCrowd.ts`：新增 NPC 視覺族群（business/family/solo）微差異（tint/scale/speed）。
3. `src/scenes/TPE2LobbyScene.ts`：新增 flight-board / shopfront 微動態亮度脈衝（不影響互動邏輯）。

## 5. 批次執行紀錄（每批含驗證）

### Batch A 完成紀錄
- 做了什麼：
  - 建立 8 個核心互動物件獨立目錄與 `prop.png`（由 floorplan 佔位升級）。
  - 建立 8 份 Batch A `prompt.t2.txt`。
  - 在 `src/data/tpe2Layout.ts` 移除 Batch A 對應 fallback 映射，改走獨立 key。
- 修改檔案清單：
  - `src/data/tpe2Layout.ts`
  - `public/map/TPE2/props/checkin-counter-module/*`
  - `public/map/TPE2/props/info-counter/*`
  - `public/map/TPE2/props/security-scanner/*`
  - `public/map/TPE2/props/dutyfree-shop-kiosk/*`
  - `public/map/TPE2/props/flight-board/*`
  - `public/map/TPE2/props/airport-atm/*`
  - `public/map/TPE2/props/signage-pillar/*`
  - `public/map/TPE2/props/self-checkin-kiosk/*`
- 驗證指令與結果：
  - `npm run verify:oneclick:quick` -> PASS（2026-05-29 22:29~22:30）
- debug 產物控管狀態：
  - `verify-oneclick` 的 debug hygiene 全數通過（暫存 profile 目錄無殘留）。
- 下一步：
  - 進 Batch B 空間骨架，補齊模組化建築物件 prompt 與 key 接線。

### Batch B 完成紀錄
- 做了什麼：
  - 建立 Batch B 缺失物件獨立目錄（`airport-elevator/security-partition/glass-partition/wall-column/short-wall`）。
  - 為 Batch B 8 物件建立 `prompt.t2.txt`（含已存在的 `customs-gate-module/escalator-module/shopfront-module`）。
  - 在 `src/data/tpe2Layout.ts` 移除 Batch B 對應 fallback 映射，走獨立 key。
- 修改檔案清單：
  - `src/data/tpe2Layout.ts`
  - `public/map/TPE2/props/airport-elevator/*`
  - `public/map/TPE2/props/security-partition/*`
  - `public/map/TPE2/props/glass-partition/*`
  - `public/map/TPE2/props/wall-column/*`
  - `public/map/TPE2/props/short-wall/*`
  - `public/map/TPE2/props/customs-gate-module/prompt.t2.txt`
  - `public/map/TPE2/props/escalator-module/prompt.t2.txt`
  - `public/map/TPE2/props/shopfront-module/prompt.t2.txt`
- 驗證指令與結果：
  - `npm run verify:oneclick:quick` -> PASS（2026-05-29 22:31~22:32）
- debug 產物控管狀態：
  - `verify-oneclick` 的 debug hygiene 全數通過。
- 下一步：
  - 進 Batch C 氛圍補件與品牌/店別識別牌變體。

### Batch C 完成紀錄
- 做了什麼：
  - 建立 `airport-chairs/potted-palm/trash-bin` 獨立目錄與 prompt。
  - 建立門區品牌牌與店別識別牌 11 個變體物件目錄與 prompt。
  - 在 `src/data/tpe2Layout.ts` 移除 Batch C 核心 decor 3 項 fallback 映射。
- 修改檔案清單：
  - `src/data/tpe2Layout.ts`
  - `public/map/TPE2/props/airport-chairs/*`
  - `public/map/TPE2/props/potted-palm/*`
  - `public/map/TPE2/props/trash-bin/*`
  - `public/map/TPE2/props/gate-brand-signage-d-zone/*`
  - `public/map/TPE2/props/gate-brand-signage-c-zone/*`
  - `public/map/TPE2/props/store-sign-cosmetics/*`
  - `public/map/TPE2/props/store-sign-perfume/*`
  - `public/map/TPE2/props/store-sign-liquor/*`
  - `public/map/TPE2/props/store-sign-snacks/*`
  - `public/map/TPE2/props/store-sign-electronics/*`
  - `public/map/TPE2/props/store-sign-fashion/*`
  - `public/map/TPE2/props/store-sign-books/*`
  - `public/map/TPE2/props/store-sign-souvenirs/*`
  - `public/map/TPE2/props/store-sign-food/*`
- 驗證指令與結果：
  - `npm run verify:oneclick:quick` -> PASS（2026-05-29 22:34~22:35）
- debug 產物控管狀態：
  - `verify-oneclick` 的 debug hygiene 全數通過。
- 下一步：
  - 進 Batch D：NPC 視覺族群、互動 FX、場景微動態。

### Batch D 完成紀錄
- 做了什麼：
  - 新增 Batch D 9 個 NPC/FX 物件目錄與 prompt。
  - `src/actors/NpcCrowd.ts`：加入 NPC 視覺族群微差異（`business/family/solo` 的 tint/scale/speed）。
  - `src/scenes/TPE2LobbyScene.ts`：加入 `flight-board` 與 `shopfront-module` 微動態亮度脈衝。
- 修改檔案清單：
  - `src/actors/NpcCrowd.ts`
  - `src/scenes/TPE2LobbyScene.ts`
  - `public/map/TPE2/props/npc-visual-traveler-business/*`
  - `public/map/TPE2/props/npc-visual-traveler-family/*`
  - `public/map/TPE2/props/npc-visual-traveler-solo/*`
  - `public/map/TPE2/props/npc-visual-clerk-premium/*`
  - `public/map/TPE2/props/fx-interact-pulse/*`
  - `public/map/TPE2/props/fx-interact-sparkle/*`
  - `public/map/TPE2/props/fx-flightboard-flicker/*`
  - `public/map/TPE2/props/fx-shopfront-breath-light/*`
  - `public/map/TPE2/props/fx-ambient-flow-strip/*`
- 驗證指令與結果：
  - `npm run verify:oneclick:quick` -> PASS（2026-05-29 22:37~22:39）
- debug 產物控管狀態：
  - 最新 `debug/` 輸出受控，`verify-oneclick` hygiene 全 PASS。
- 下一步：
  - 針對 `prompt.t2.txt` 逐項啟動正式 image generation（先 A -> B -> C -> D），生成後以同指令回歸驗證。

## 6. HUD / Headless 阻塞處理方針
本輪未出現阻塞。若後續 HUD/headless 驗證偶發失敗，處理順序為：
1. 先保持 full-map runtime 驗證持續 PASS。
2. HUD 問題以獨立 hotfix 分支處理，不阻斷物件產線主流程。

## 7. Batch A 實際生成+切割（2026-05-29 補充）
1. 使用 `generate2dsprite` 生成 3x3 magenta prop pack：
- 來源圖：`C:/Users/samam/.codex/generated_images/019e7420-1a6e-7aa0-a472-d7bc3d03c821/ig_0cbc7cd96f2d3283016a19aa6bb18481919f559ff16218c862.png`
- 專案留存：`public/map/TPE2/props/raw/batchA-prop-pack-v1.png`
- Prompt 留存：`public/map/TPE2/props/raw/batchA-prop-pack-v1.prompt.txt`
2. 使用切割腳本抽出單體 props（含 magenta 去背 + bbox 裁切）：
- 腳本：`scripts/extract-t2-prop-pack.cjs`
- 報告：`public/map/TPE2/props/raw/batchA-pack-extract-report.json`
3. 覆蓋產出（8 個）：
- `checkin-counter-module`
- `info-counter`
- `security-scanner`
- `dutyfree-shop-kiosk`
- `flight-board`
- `airport-atm`
- `signage-pillar`
- `self-checkin-kiosk`
4. Runtime 驗證：`npm run verify:oneclick:quick` -> PASS。

## 8. Batch B/C 實際生成+切割（2026-05-29 補充）
### Batch B
1. `generate2dmap` 導向 3x3 結構件 pack 生成。
- 來源圖：`C:/Users/samam/.codex/generated_images/019e7420-1a6e-7aa0-a472-d7bc3d03c821/ig_0cbc7cd96f2d3283016a19ac9ce15c81918db8cff66c020b86.png`
- 專案留存：`public/map/TPE2/props/raw/batchB-prop-pack-v1.png`
- Prompt：`public/map/TPE2/props/raw/batchB-prop-pack-v1.prompt.txt`
2. 版型設定：`public/map/TPE2/props/raw/layout-batchB-3x3.json`
3. 切割輸出：8 件
- `airport-elevator`, `escalator-module`, `customs-gate-module`, `shopfront-module`, `security-partition`, `glass-partition`, `wall-column`, `short-wall`
4. 報告：`public/map/TPE2/props/raw/layout-batchB-3x3-extract-report.json`

### Batch C
1. `generate2dsprite` 導向兩包生成。
- C1 (3x3) 來源圖：`C:/Users/samam/.codex/generated_images/019e7420-1a6e-7aa0-a472-d7bc3d03c821/ig_0cbc7cd96f2d3283016a19ad907c048191b77990ba0f4f03b0.png`
- C2 (3x2) 來源圖：`C:/Users/samam/.codex/generated_images/019e7420-1a6e-7aa0-a472-d7bc3d03c821/ig_0cbc7cd96f2d3283016a19addf16b48191837b3b89e3285ebf.png`
- 專案留存：`batchC1-prop-pack-v1.png`, `batchC2-prop-pack-v1.png`
- Prompt：`batchC1-prop-pack-v1.prompt.txt`, `batchC2-prop-pack-v1.prompt.txt`
2. 版型設定：`layout-batchC1-3x3.json`, `layout-batchC2-3x2.json`
3. 切割輸出：14 件
- `airport-chairs`, `potted-palm`, `trash-bin`
- `gate-brand-signage-d-zone`, `gate-brand-signage-c-zone`
- `store-sign-cosmetics`, `store-sign-perfume`, `store-sign-liquor`, `store-sign-snacks`
- `store-sign-electronics`, `store-sign-fashion`, `store-sign-books`, `store-sign-souvenirs`, `store-sign-food`
4. 報告：`layout-batchC1-3x3-extract-report.json`, `layout-batchC2-3x2-extract-report.json`

### 驗證
- `npm run verify:oneclick:quick` -> PASS（Batch B/C 切割後）

## 9. Batch B 手扶梯拆件化 Hotfix（2026-05-29）
- 做了什麼：
  - 依 `generate2dsprite` 重新生成手扶梯拆件資產：`escalator-frame`（靜態框體）+ `escalator-steps-strip`（可垂直循環階梯帶）。
  - 使用 `scripts/extract-t2-prop-pack.cjs`（1x1 版型）做 magenta 去背與裁切，輸出可直接 runtime 使用的 `prop.png`。
  - `src/scenes/TPE2LobbyScene.ts` 改為拆件渲染：
    - 不再只依賴整塊 `escalator-module`。
    - 每個 escalator 實例由 `escalator-frame` + 雙 lane `escalator-steps-strip` tileSprite 合成。
    - 階梯動畫方向與玩家 carry lane 判定改為同源資料，避免視覺與判定錯位。
  - `src/data/tpe2Layout.ts` 將 `escalator-module` scale 調整為 `0.14`，修正 oversized 畫面。
- 修改檔案清單：
  - `src/scenes/TPE2LobbyScene.ts`
  - `src/data/tpe2Layout.ts`
  - `public/map/TPE2/props/escalator-frame/prop.png`
  - `public/map/TPE2/props/escalator-frame/prompt.t2.txt`
  - `public/map/TPE2/props/escalator-steps-strip/prop.png`
  - `public/map/TPE2/props/escalator-steps-strip/prompt.t2.txt`
  - `public/map/TPE2/props/raw/batchB-escalator-split/escalator-frame-raw-v2.png`
  - `public/map/TPE2/props/raw/batchB-escalator-split/escalator-frame-raw-v2.prompt.txt`
  - `public/map/TPE2/props/raw/batchB-escalator-split/escalator-steps-strip-raw-v2.png`
  - `public/map/TPE2/props/raw/batchB-escalator-split/escalator-steps-strip-raw-v2.prompt.txt`
  - `public/map/TPE2/props/raw/layout-escalator-frame-1x1.json`
  - `public/map/TPE2/props/raw/layout-escalator-frame-1x1-extract-report.json`
  - `public/map/TPE2/props/raw/layout-escalator-steps-strip-1x1.json`
  - `public/map/TPE2/props/raw/layout-escalator-steps-strip-1x1-extract-report.json`
- 驗證指令與結果：
  - `npm run verify:oneclick:quick` -> FAIL（HUD 檢查 `debugCollisionTeal` 比例 0，非 escalator 功能阻塞）
  - `npm run map:verify:browser:quick` -> PASS（runtime full-map stitch/verify 通過）
- debug 產物控管狀態：
  - `debug/` 產物有更新（`maprt-full-*`, `hud-auto-*`），未出現失控累積；可依既有 hygiene 規則持續保留 latest。
- 下一步：
  - 在不阻塞主流程前提下，補做 `C` 鍵 debug 模式下 escalator 區域定點截圖比對（含 lane label），並獨立處理 HUD `debugCollisionTeal` 穩定性。

## 10. Batch B 牆壁模組化（2026-05-30）
- 做了什麼：
  - 使用 `generate2dsprite` 生成牆體模組包（2x1）：`wall-block` + `wall-cap-block`。
  - 以 `scripts/extract-t2-prop-pack.cjs` 切割後落地成可重用 props。
  - 使用 `generate2dmap` 的空間組裝策略，將 `wall-column` / `short-wall` 從單張 PNG 渲染改為 runtime block 組裝：
    - `wall-column`: 1 列 x 4 層 body + 1 層 cap
    - `short-wall`: 3 列 x 1 層 body + 1 層 cap
  - 保留碰撞語義：可碰撞牆段改為隱形組合 collider，維持主流程可通行/阻擋邏輯。
- 修改檔案清單：
  - `src/scenes/TPE2LobbyScene.ts`
  - `public/map/TPE2/props/wall-block/prop.png`
  - `public/map/TPE2/props/wall-block/prompt.t2.txt`
  - `public/map/TPE2/props/wall-cap-block/prop.png`
  - `public/map/TPE2/props/wall-cap-block/prompt.t2.txt`
  - `public/map/TPE2/props/raw/batchB-wall-modular/wall-modular-pack-v1.png`
  - `public/map/TPE2/props/raw/batchB-wall-modular/wall-modular-pack-v1.prompt.txt`
  - `public/map/TPE2/props/raw/layout-wall-modular-2x1.json`
  - `public/map/TPE2/props/raw/layout-wall-modular-2x1-extract-report.json`
- 驗證指令與結果：
  - `npm run verify:oneclick:quick` -> FAIL（HUD `debugCollisionTeal` 比例 0；非牆體模組化主流程阻塞）
  - `npm run map:verify:browser:quick` -> PASS（runtime full-map stitch/verify 通過）
  - `npm run build` -> PASS
- debug 產物控管狀態：
  - `debug/` 產物受控（latest 檔案正常輪替，無異常膨脹）。
- 下一步：
  - 針對你實機觀感，再把 `wall-column/short-wall` 的單塊比例與列數做第二輪微調（不改碰撞語義）。

## 11. T2_v2 重製啟動（2026-05-30）
- 參考流程：
  - 依照你提供的 `agent-sprite-forge` README（image-gen first + 可重用資產切割 + runtime 驗證）啟動新圖重製流程。
- 做了什麼：
  - 新增 `T2_v2` 底圖（foundation-only）並獨立存放：
    - `public/map/TPE2_v2/tpe2_v2_base.png`
  - 新增 `T2_v2` 場景資料與擺位：
    - `src/data/tpe2LayoutV2.ts`
  - 建立新場景：
    - `src/scenes/TPE2LobbyV2Scene.ts`（由舊場景分支，改用 v2 layout）
  - 主程式接線：
    - `src/main.ts` 註冊 `TPE2LobbyV2Scene`
    - `src/scenes/LoginScene.ts` 加入地圖選項並預設 `TPE2LobbyV2Scene`
  - 驗證工具升級為支援新舊場景：
    - `scripts/map-regression-cdp.cjs`：可自動辨識 `TPE2LobbyV2Scene` / `TPE2LobbyScene`
    - `scripts/capture-hud-pw.cjs`：HUD capture 同步支援新舊場景
  - 第二輪比例校正：
    - 放大 `T2_v2` 的 architecture/feature/decor 與 facility 顯示比例，改善「小圖示感」。
- 修改檔案清單：
  - `public/map/TPE2_v2/tpe2_v2_base.png`
  - `public/map/TPE2_v2/tpe2_v2_base.prompt.txt`
  - `src/data/tpe2LayoutV2.ts`
  - `src/scenes/TPE2LobbyV2Scene.ts`
  - `src/main.ts`
  - `src/scenes/LoginScene.ts`
  - `scripts/map-regression-cdp.cjs`
  - `scripts/capture-hud-pw.cjs`
- 驗證指令與結果：
  - `npm run build` -> PASS
  - `npm run map:verify:browser:quick` -> PASS（active scene: `TPE2LobbyV2Scene`）
  - `npm run verify:oneclick:quick` -> FAIL（HUD `debugCollisionTeal` 比例檢查未過；full-map runtime PASS）
- debug 產物控管狀態：
  - `debug/` 持續產生 latest 輸出（`maprt-full-latest.*`, `hud-auto-*`），未見無界增長。
- 下一步：
  - `T2_v2` 進入「美術重整第 2 階段」：
    - 重新生成一組統一風格的 Batch A/B 核心互動與骨架物件（避免舊 pack 風格混雜）
    - 同步調整 blocker 與走道骨架，讓互動點/碰撞更符合新底圖動線。

## 12. T2 重製版拆成三圖連通（2026-05-30）
- 做了什麼：
  - 新增三張重製底圖（同風格）
    - `central`: `public/map/TPE2_v3/tpe2_v3_central_base.png`
    - `north-d`: `public/map/TPE2_v3/tpe2_v3_north_d_base.png`
    - `south-c`: `public/map/TPE2_v3/tpe2_v3_south_c_base.png`
  - 建立三份獨立 layout
    - `src/data/tpe2LayoutV3Central.ts`
    - `src/data/tpe2LayoutV3NorthD.ts`
    - `src/data/tpe2LayoutV3SouthC.ts`
  - 建立三個場景並可連通（中央<->D、中央<->C）
    - `src/scenes/TPE2CentralHallV3Scene.ts`
    - `src/scenes/TPE2NorthDZoneV3Scene.ts`
    - `src/scenes/TPE2SouthCZoneV3Scene.ts`
  - 設施分流，避免三張圖重複同一批物件
    - `src/data/facilitiesT2V3.ts`
  - 主流程接線
    - `src/main.ts` 註冊三個 v3 scene
    - `src/scenes/LoginScene.ts` 新增三圖入口，預設中央大廳 v3
  - 驗證器相容新場景
    - `scripts/map-regression-cdp.cjs`
    - `scripts/capture-hud-pw.cjs`
- 修改檔案清單：
  - `public/map/TPE2_v3/tpe2_v3_central_base.png`
  - `public/map/TPE2_v3/tpe2_v3_north_d_base.png`
  - `public/map/TPE2_v3/tpe2_v3_south_c_base.png`
  - `public/map/TPE2_v3/tpe2_v3_central_base.prompt.txt`
  - `public/map/TPE2_v3/tpe2_v3_north_d_base.prompt.txt`
  - `public/map/TPE2_v3/tpe2_v3_south_c_base.prompt.txt`
  - `src/data/facilitiesT2V3.ts`
  - `src/data/tpe2LayoutV3Central.ts`
  - `src/data/tpe2LayoutV3NorthD.ts`
  - `src/data/tpe2LayoutV3SouthC.ts`
  - `src/scenes/TPE2CentralHallV3Scene.ts`
  - `src/scenes/TPE2NorthDZoneV3Scene.ts`
  - `src/scenes/TPE2SouthCZoneV3Scene.ts`
  - `src/main.ts`
  - `src/scenes/LoginScene.ts`
  - `scripts/map-regression-cdp.cjs`
  - `scripts/capture-hud-pw.cjs`
- 驗證指令與結果：
  - `npm run build` -> PASS
  - `npm run map:verify:browser:quick` -> PASS（active scene: `TPE2CentralHallV3Scene`）
  - `npm run verify:oneclick:quick` -> FAIL（HUD debugCollisionTeal/debugCollisionOrange 失敗；full-map runtime PASS）
  - 連通性 smoke（Playwright eval）：
    - 中央 -> D -> 中央：PASS
    - 中央 -> C -> 中央：PASS
- debug 產物控管狀態：
  - `debug/` 產物受控，latest 輸出正常更新，無失控堆積。
- 下一步：
  - 針對三圖各自做 Batch A/B/C 精修擺位與比例（不再共用同一組密度）
  - 補上 D 區 / C 區專屬品牌牌與等候區節奏，提升區域辨識度。
