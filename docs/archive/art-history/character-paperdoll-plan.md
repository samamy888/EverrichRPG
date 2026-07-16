# 角色紙娃娃系統 POC

> 歷史 POC 紀錄：目前角色正式規格為 [`../../CHARACTER_ASSET_SPEC.md`](../../CHARACTER_ASSET_SPEC.md)。

> 角色資產的正式規格以 `docs/CHARACTER_ASSET_SPEC.md` 為準。本文件只記錄目前 POC 的做法與落地狀態；之後新增或重畫資產時，必須先符合主規格。

## 目標

- 用「身體 + 髮型 + 上衣 + 褲子」組合旅客外觀。
- 先採離線合成，讓現有旅客系統可直接吃完整 sprite sheet。
- 後續再評估是否改為 runtime layer 疊圖。

## 目前資料欄位

- `gender`：`male`、`female`
- `ageGroup`：`adult`、`child`、`elder`
- `hairStyle`：髮型 slug
- `top`：上衣 slug
- `pants`：褲子 slug

## 目前資產狀態

- 目前已有少量 POC 紙娃娃配方可對應旅客資料。
- 若資料組合沒有對應紙娃娃資產，系統會 fallback 到既有 `variant`，避免旅客消失。
- `paperdoll-blue-male` 已改成規格化 v2 成品，沿用原本遊戲路徑 `public/assets/sprites/traveler-paperdoll-blue-male-v1/sheet-transparent.png`，不用改前端載入邏輯。
- `paperdoll-green-male` 已改成同骨架的合身 v2 成品，沿用原本遊戲路徑 `public/assets/sprites/traveler-paperdoll-green-male-v1/sheet-transparent.png`。
- `paperdoll-beige-male`、`paperdoll-yellow-male` 已加入男性成人旅客池。
- `paperdoll-coral-female` 已建立 `adult-female` 規格化成品，沿用 `public/assets/sprites/traveler-paperdoll-coral-female-v1/sheet-transparent.png`。
- `paperdoll-yellow-female`、`paperdoll-lavender-female` 已加入女性成人旅客池。
- `top` / `pants` layer 已從乾淨 outfit layer 拆出，並由 `npm run assets:paperdoll` 重建。
- 目前看到的「衣服與身體比例不對」屬於 layer 生成時沒有固定 base guide 的問題，後續重畫要依照 `docs/CHARACTER_ASSET_SPEC.md` 重新產生。

## 下一步

1. 補齊 `adult-female` 更多髮型與服裝 recipe。
2. 產生合成 preview，人工確認合身後才接入旅客池。
3. 再擴充 `child` 與 `elder` 的男女 body type。
