# EverrichRPG 美術產製入口

這是專案目前唯一的美術文件入口。新資產不要從 `docs/archive/` 的歷史文件開始。

## 規格優先順序

1. 場景、地圖物件與一般 2D 資產：[`PIXEL_ART_STYLE_GUIDE.md`](PIXEL_ART_STYLE_GUIDE.md)
2. 角色、旅客、店員與紙娃娃：[`CHARACTER_ASSET_SPEC.md`](CHARACTER_ASSET_SPEC.md)
3. TMJ／TSJ、方向、碰撞與地圖整合：[`Tiled_Map_Workflow.md`](Tiled_Map_Workflow.md)
4. 實機與離線畫面驗收：[`PIXEL_ART_VISUAL_QA.md`](PIXEL_ART_VISUAL_QA.md)
5. 機場實景只作空間參考：[`airport-photo-reference/Airport_Photo_Reference_Index.md`](airport-photo-reference/Airport_Photo_Reference_Index.md)

若文件內容互相衝突，以清單中較前面的正式規格為準。

## 使用哪個產圖流程

- 地圖、場景、地板、牆面、碰撞區與大型構圖：`generate2dmap`
- 角色、NPC、怪物、動畫格、透明道具與特效：`generate2dsprite`

Skill 決定執行流程；本目錄的正式規格決定 EverrichRPG 的視覺風格。Skill 不取代專案規格。

## 固定產製流程

1. 選擇正式規格與 A 級參考資產。
2. 保存本次產圖 Prompt，檔名使用 `*.prompt.txt`。
3. ImageGen 輸出只作 raw 原稿，不直接進遊戲。
4. 執行透視校正、等比縮放、透明邊清理、專案色盤量化與底部錨點校正。
5. 保存 raw、processed、pipeline metadata、manifest 與正式輸出。
6. 更新 TSJ、TMJ 與執行時 asset catalog。
7. 在完整場景中驗收，不以透明背景單圖決定是否合格。

## 驗證指令

```text
npm run tiled:cohesion-refine
npm run visual:qa
npm run pixel:verify
npm run build
```

其中 `pixel:verify` 會檢查資產准入、TSJ/TMJ、方向版本、非等比縮放、單元測試與型別。

## Prompt 與參考圖位置

- 個別資產的實際 Prompt：`public/assets/**/**.prompt.txt`
- 資產准入對照板：[`asset-style-audit/asset-style-reference-board.png`](asset-style-audit/asset-style-reference-board.png)
- 九張正式地圖總覽：[`visual-qa/all-regions-current.png`](visual-qa/all-regions-current.png)

## 歷史文件

已被取代的規格、稽核與改造計畫集中於 [`archive/art-history/`](archive/art-history/README.md)。它們只用來追溯決策，不再作為新產圖依據。
