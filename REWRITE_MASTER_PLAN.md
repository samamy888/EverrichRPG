# EverrichRPG Rewrite Master Plan

## Vision
全面重寫 EverrichRPG，從「只換地圖」改為「系統級重建」，打造可擴充、可維護、可驗證的 2D RPG 架構。

## Core Principles
- Data-driven: 系統與內容分離，優先用 JSON/TS config 驅動。
- Modular architecture: Scene、UI、Battle、Quest、Save 各自解耦。
- Skill-first pipeline: 使用 AI skills 重劃地圖、生成角色資產、回歸驗證。
- MVP first: 先做可玩最小版本，再逐步擴內容。

## Skills Strategy
1. generate2dmap
- 重劃世界與區域地圖
- 定義 walkable / collision / layer 規格
- 產出可直接整合的地圖資產與配置

2. generate2dsprite
- 角色/NPC/怪物/特效資產生成
- 動畫序列與 sprite sheet 規範
- 統一美術風格與命名

3. Browser
- 本機互動驗證
- HUD/UI 響應式與視覺檢查
- 關鍵流程 smoke test

## Master Prompt (Reusable)
```text
你是資深 2D RPG 系統設計與前端遊戲工程師。請協助我把 EverrichRPG 從頭重寫，不沿用舊有地圖替換思路，而是重建核心架構。

目標：
1) 建立可擴充的 RPG 核心（場景、戰鬥、任務、對話、存檔、UI）。
2) 以資料驅動（JSON/TS config）管理內容，避免硬編碼。
3) 地圖、角色、美術資產流程可由 AI 生成並可回歸測試。
4) 先完成 MVP（可登入/進場景/移動/互動/戰鬥最小回合/任務一條），再擴展。

技術要求：
- TypeScript + Vite + Phaser（除非我明確要求更換）
- 模組化、可測試、低耦合
- UI 與遊戲邏輯分層
- 每次輸出都要包含：檔案清單、改動原因、驗證步驟、風險

工作方式：
- 先提小步驟計畫再動手
- 每步驟都提供可執行驗證
- 若需求不明，先給 2~3 個具體選項讓我選
```

## Phase Plan
### Phase 0: Product Definition
- 定義 MVP 範圍
- 決策：引擎、戰鬥型態、美術方向
- 產出：需求基線與不做清單

### Phase 1: Project Foundation
- 建立新專案骨架
- Scene Router / Event Bus / Global Config
- 建立 coding conventions 與目錄規範

### Phase 2: Gameplay Core
- 角色移動與場景互動
- 任務系統最小流程
- 背包與道具使用
- 基礎存檔/讀檔

### Phase 3: Battle MVP
- 最小可玩戰鬥循環
- 玩家/敵方行動、勝敗條件、獎勵
- 數值配置與平衡起點

### Phase 4: Map Pipeline
- 導入 generate2dmap
- 地圖層、碰撞層、傳送點規格
- 場景切換與區域流轉

### Phase 5: Asset Pipeline
- 導入 generate2dsprite
- 角色/NPC/怪物/技能特效
- 命名規範與版本管理

### Phase 6: HUD/UI Redesign
- 重做 HUD 架構與互動
- 訊息、任務追蹤、狀態面板
- 自動化回歸檢查（含 HUD）

### Phase 7: Stabilization & Release Baseline
- 效能調校
- 打包與部署檢查
- 建立可持續擴充版本基線

### Phase 8: Exploration Layer
- 機場導覽地圖與目前位置
- 旅客護照、人物與商品登錄
- 場景隱藏紀念章與探索完成率
- 詳細規格：`docs/Phase6_Exploration_Passport.md`

## Execution Rules
- 每階段完成後必做可執行驗證。
- 先穩定核心循環，再擴內容。
- 避免一次性大爆改，維持可回退節點。
- 所有新功能需附最小驗證方式。

## Immediate Next Step
1. 確認三項決策：
- 引擎：Phaser 或更換
- 戰鬥：回合制或即時制
- 美術：像素風或手繪高清
2. 依決策啟動 Phase 0，建立 Rewrite Spec v1。

## Execution Log
### 2026-05-30 Step 01
- 完成：全專案清空後建立重寫基線檔案。
- 內容：`package.json`、`tsconfig.json`、`vite.config.ts`、`index.html`、`src/config.ts`、`src/core/events.ts`、`src/core/sceneRouter.ts`、`src/scenes/BootScene.ts`、`src/styles.css`。
- 目的：建立可持續擴充的 TypeScript + Phaser 入口。
- 驗證：後續會在整合完成後以 `npm run build` 一次驗證。

### 2026-05-30 Step 02
- 完成：Phase 0/1/2/3 MVP 核心實作。
- 內容：新增資料模型、狀態存取、世界場景、戰鬥場景、HUD Overlay。
- 主要檔案：
  - `src/types.ts`
  - `src/data/content.ts`
  - `src/systems/saveService.ts`
  - `src/systems/gameStore.ts`
  - `src/scenes/WorldScene.ts`
  - `src/scenes/BattleScene.ts`
  - `src/ui/UIOverlay.ts`
  - `src/main.ts`
- 功能：移動、互動接任務、戰鬥、任務進度、背包藥水、存檔/讀檔、重置存檔。
- 驗證：待安裝依賴後執行 `npm run build` 與 `npm run dev` 手動流程檢查。

### 2026-05-30 Step 03
- 完成：文件與部署基線。
- 新增：
  - `REWRITE_SPEC_v1.md`
  - `README.md`
  - `web.config`（IIS SPA fallback）
- 目的：固定重寫決策與提供 IIS 直接部署能力。
- 驗證：待 `npm run build` 成功後，使用 `dist/ + web.config` 佈署到 IIS。

### 2026-05-30 Step 04
- 完成：skills 專用 prompt pack。
- 新增：`PROMPT_PACK_SKILLS.md`
- 內容：`generate2dmap`、`generate2dsprite`、`Browser` 三組可重用 prompt。
- 目的：後續重劃地圖與資產可批次重用同一套流程。
- 驗證：下一階段可直接複用 prompt 生成資產並走 Browser 驗證。

### 2026-05-30 Step 05
- 完成：依賴安裝與編譯穩定化。
- 問題：
  - `npm ci` 因 lockfile 不存在而失敗。
  - `vite@7` 對目前 Node `20.11.1` 有 engine 警告。
  - TypeScript strict 編譯時出現 Phaser scene override 與敵人型別安全錯誤。
- 修正：
  - 使用 `npm install` 生成 lockfile。
  - 降版 Vite 至 `6.3.5` 以匹配現場 Node。
  - 調整 `tsconfig.json`（移除 `noImplicitOverride`），並將 enemy 常數抽成 `SLIME_ENEMY`。
- 驗證：`npm run build` 成功。

### 2026-05-30 Step 06
- 完成：IIS 專用打包指令。
- 新增：
  - `scripts/copy-web-config.mjs`
  - `package.json` script: `build:iis`
- 行為：`npm run build:iis` 會先 build，再把 `web.config` 複製到 `dist/`。
- 驗證：`npm run build:iis` 成功，`dist/web.config` 已生成。

### 2026-05-30 Step 07
- 最終驗證：
  - `npm run build` 成功。
  - `npm run build:iis` 成功。
- 觀察：
  - Phaser bundle 體積超過 500k 警告（預期現象，非阻塞）。
- 結論：
  - 專案已達成可開發、可打包、可佈署到 IIS 的重寫基線。

### 2026-05-30 Step 08
- 完成：背景啟動開發伺服器供即時檢視。
- 指令：`npm run dev -- --host 0.0.0.0 --port 5173`
- 狀態：Vite dev server 啟動成功。
- 檢視網址：`http://localhost:5173/`
- Log：
  - `logs/dev-server.out.log`
  - `logs/dev-server.err.log`

### 2026-05-30 Step 09
- 完成：正式使用 skills 產出並整合第一批視覺資產。
- 使用 skills：
  - `generate2dmap`
  - `generate2dsprite`
- 產出：
  - `public/assets/map/village-base.png`
  - `public/assets/map/village-base.prompt.txt`
  - `public/assets/map/village-layered-meta.json`
  - `public/assets/sprites/player_hero/raw-sheet.png`
  - `public/assets/sprites/player_hero/raw-sheet.prompt.txt`
  - `public/assets/sprites/player_hero/sheet-transparent.png`
  - `public/assets/sprites/player_hero/pipeline-meta.json`
  - `public/assets/sprites/player_hero/animation.gif`
- 整合：
  - `WorldScene` 改為載入 generated map + generated sprite sheet。
  - 加入四方向走路動畫與對應 idle frame。
- QC 備註：
  - `generate2dsprite` 的嚴格 reject-edge-touch 模式偵測到第 4 列貼邊。
  - 已保留 `pipeline-meta.json` 供後續再生更安全版本。
- 驗證：
  - `npm run build` 成功。

### 2026-05-30 Step 10
- 觸發：使用者確認本專案為「昇恆昌免稅店 RPG」，要求美術方向回歸主題。
- 對齊策略：改用機場免稅店 terminal 視覺語彙，並遵循原 AGENTS 主軸（HUD/驗證/可追蹤）。
- skills 實作：
  - `generate2dmap` 產生 duty-free terminal base map（取代奇幻地貌）。
  - `generate2dsprite` 產生 duty-free staff 4x4 walk sheet，並用 skill 腳本做去背/分幀輸出。
- 主要更新：
  - `public/assets/map/village-base.png`（新圖）
  - `public/assets/sprites/player_hero/raw-sheet.png`（新圖）
  - `public/assets/sprites/player_hero/sheet-transparent.png`（重新處理）
  - `src/scenes/WorldScene.ts`（改為機場場景語彙 + map size dynamic）
  - `src/data/content.ts`（任務與敘事文字改為 duty-free 情境）
  - `src/scenes/BattleScene.ts`（戰鬥文字改為服務情境）
- QC 註記：
  - 嚴格 `reject-edge-touch` 對最後一列仍有貼邊警告，已保留 pipeline metadata 供後續再生更安全版本。
- 驗證：
  - `npm run build` 成功。

### 2026-05-30 Step 11
- 觸發：使用者指出單張 PNG 地圖不利碰撞與可維護流程，要求切塊並結合 skills + `0x0funky/agent-sprite-forge`。
- 執行：
  - clone `tools/agent-sprite-forge` 供後續 pipeline 參照。
  - 新增地圖切塊腳本：`scripts/slice-map-tiles.py`
  - 產生切塊輸出：`public/assets/map/terminal/tiles/*.png`（96 塊，128x128）
  - 產生切塊 metadata：`public/assets/map/terminal/chunks-meta.json`
  - 新增可編輯碰撞資料：`src/data/terminalMap.ts`
  - `WorldScene` 改為「讀取 chunks metadata -> 載入 tiles -> 組圖渲染」並套用 collision rectangles。
- 操作指令：
  - `npm run map:slice`
- 驗證：
  - `npm run build` 成功。
- 結果：
  - 地圖不再依賴單張背景直接渲染，改成可切塊重建與可維護碰撞資料流程。

### 2026-05-30 Step 12
- 錯誤修復：`Uncaught TypeError: Cannot read properties of undefined (reading 'left')` in `WorldScene.handleMovement`.
- 原因：`WorldScene.create()` 採 async 切塊載入，`update()` 先於 input 初始化執行。
- 修正：在 `update()` 增加初始化防護，未完成載入前直接 return，不進入移動與互動流程。
- 檔案：`src/scenes/WorldScene.ts`
- 驗證：`npm run build` 成功。

### 2026-05-30 Step 13
- 需求：遊戲內可見文案全面改為中文。
- 完成：
  - 標題、載入文字、任務/道具/敵人名稱、HUD 標籤、場景提示、互動訊息、戰鬥訊息、事件紀錄全部改為繁中。
  - 任務狀態顯示由內部值（locked/active/completed/turned-in）轉為中文（未接取/進行中/可回報/已完成）。
- 主要檔案：
  - `src/config.ts`
  - `src/scenes/BootScene.ts`
  - `src/data/content.ts`
  - `src/systems/gameStore.ts`
  - `src/ui/UIOverlay.ts`
  - `src/scenes/WorldScene.ts`
  - `src/scenes/BattleScene.ts`
- 驗證：`npm run build` 成功。

### 2026-05-30 Step 14
- 目標：繼續原計畫的可維護性與除錯能力強化（不打斷主流程）。
- 完成：
  - 將航廈場景 runtime 參數外部化：`public/assets/map/terminal/runtime-config.json`
    - spawn、serviceZone、collisionRects 改為資料檔驅動
  - `WorldScene` 改為同時載入：
    - `chunks-meta.json`（切塊清單）
    - `runtime-config.json`（碰撞與互動配置）
  - 新增 `~` 鍵除錯層：
    - 顯示碰撞矩形與服務櫃台互動區
    - 遊戲內 log 會記錄開關狀態
  - 新增世界資料一致性檢查：
    - `scripts/verify-world-data.mjs`
    - npm script: `npm run world:verify`
- 驗證：
  - `npm run world:verify` 成功（map=1536x1024, tiles=96, collisionRects=22）
  - `npm run build` 成功。

### 2026-05-31 Step 15
- 需求：遊戲內文案全面中文化，且持續沿原計畫推進。
- 完成：
  - 世界場景、戰鬥場景、HUD、任務/道具/敵人、系統 log 文案改為繁中。
  - 任務狀態顯示改為中文（未接取/進行中/可回報/已完成）。
  - 除錯層文案（`~`）與地圖載入錯誤訊息同步中文化。
- 主要檔案：
  - `src/config.ts`
  - `src/scenes/BootScene.ts`
  - `src/scenes/WorldScene.ts`
  - `src/scenes/BattleScene.ts`
  - `src/data/content.ts`
  - `src/systems/gameStore.ts`
  - `src/ui/UIOverlay.ts`
- 驗證：
  - `npm run build` 成功。

### 2026-05-31 Step 16
- 目標：收斂發佈流程，提供一鍵可交付檢查。
- 完成：
  - 新增 `release:prep` 流程並執行驗證：
    - `npm run map:slice`
    - `npm run world:verify`
    - `npm run build:iis`
  - 確認 `dist/web.config` 自動拷貝成功，IIS 佈署輸出完整。
- 驗證：
  - `npm run release:prep` 成功（map=1536x1024, tiles=96, collisionRects=22）。

### 2026-05-31 Step 17
- 目標：完成「遊戲內文案全面中文化」最後收斂。
- 完成：
  - 將可見欄位英文殘留改為中文語彙：
    - `HP` -> `生命值`
    - `Lv.2` -> `2 級`
  - 調整戰鬥 HUD 的玩家/敵方生命值列，改由 i18n 文案驅動。
- 主要檔案：
  - `src/i18n/zhTW.ts`
  - `src/scenes/BattleScene.ts`
- 驗證：
  - `npm run release:prep` 再次成功。

### 2026-06-10 Step 18
- 目標：參考經典掌機 RPG 的探索節奏，補足現有免稅店世界的發現感。
- 規劃：
  - MENU 新增機場導覽與旅客護照。
  - 區域、NPC、商品與隱藏紀念章共用探索進度。
  - 每個現有區域配置一枚不主動發光的隱藏紀念章。
- 不包含：航班、戰鬥、時間流逝。
- 規格文件：`docs/Phase6_Exploration_Passport.md`
