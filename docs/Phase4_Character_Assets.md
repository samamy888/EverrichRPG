# Phase 4：角色資產管線

## 第一批完成內容

- 使用 `generate2dsprite` 生成三款免稅店店員。
- 美妝、菸酒食品、精品禮品店各有專屬制服配色。
- 原始圖、透明圖、獨立 Sprite、Prompt 與 pipeline metadata 均保留。
- 店員以 Tiled `NPCs` 圖層配置，可在地圖編輯器移動。
- 靠近店員互動會開啟對應商店與店員推薦。

## 驗證

- `npm run character:verify`
- `npm run tiled:verify`
- `npm run build`

## 後續

- 男女旅客正式四方向角色已完成。
- 走路與跑步動畫已接入，停止時會保留正確面向。
- 補店員 idle 或轉身動畫。
- 將角色配置改為正式 JSON loader。
