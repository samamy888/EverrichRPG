# 角色紙娃娃系統 POC

## 目標

用「素體 + 髮型 + 衣褲鞋 + 配件」組合出更多旅客外觀，降低每次新增旅客都要重畫整套角色的成本，並為未來試衣間、換裝、店員制服切換預留擴充點。

## 第一版範圍

- Body：`adult-male`
- Base：安全素體，保留簡化內搭，不使用裸身細節
- Hair：`hair-tousled-brown`、`hair-sidepart-black`
- Outfit：`outfit-blue-travel`、`outfit-green-hoodie`
- Recipe：`paperdoll-blue-male`、`paperdoll-green-male`

## 資產規格

- 每張 layer 都是 `4x4`、每格 `96x96`
- Row 順序：`down`、`left`、`right`、`up`
- Column 順序：`contact`、`passing`、`opposite-contact`、`passing`
- 背景使用 `#FF00FF`，後處理轉透明
- 合成順序：`base-body` → `outfit` → `hair`

## 現階段策略

目前先採「離線合成」：layer 會保留在 `public/assets/sprites/paperdoll/adult-male-v1`，再輸出成可被現有旅客系統直接使用的完整 sheet。這樣可以先驗證美術與資料格式，不必立刻重寫 `TravelerAI` 的單 sprite 架構。

## 後續方向

- 加入女性、兒童、老人 body base
- 將 hair、top、bottom、shoes、accessory 拆得更細
- 後端旅客資料改存 `bodyType` 與 `wardrobeRecipe`
- 前端可選擇維持離線合成，或升級成 runtime 多 layer sprite 疊圖
