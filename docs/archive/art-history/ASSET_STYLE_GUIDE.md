# EverrichRPG 資產風格規範

> 歷史文件：目前正式入口為 [`../../ART_PIPELINE.md`](../../ART_PIPELINE.md)，正式像素規格為 [`../../PIXEL_ART_STYLE_GUIDE.md`](../../PIXEL_ART_STYLE_GUIDE.md)。

> 本文件是所有新資產、地圖物件、角色與動畫的美術基準。  
> 之後產生或重畫資產時，優先遵守本文件，再依單一物件需求微調。

## 1. 核心風格

- 整體方向：現代機場 × 溫暖像素 RPG。
- 參考節奏：經典掌機俯視角 RPG 的清楚輪廓、可讀性與地圖格感。
- 真實依據：以 `docs` 內機場照片作為空間、材質與設施參考。
- 禁止方向：不要做成寫實照片風、3D 渲染風、過度斜角透視或高解析插畫風。
- 目標感覺：乾淨、明亮、可愛但不幼稚，像縮小版現代機場模型。

## 2. 視角與比例

- 視角：俯視 3/4 RPG 視角，前面與上表面都要看得到。
- 地圖格：以 `16 × 16` tile 為基準。
- 角色基準：角色約 `32 × 48` 顯示高度。
- 小物件：建議 `1–2` 格寬，`2–4` 格高。
- 中型物件：建議 `3–6` 格寬，`3–6` 格高。
- 大型設施：允許超過 `6` 格，但必須保留清楚走道。
- 所有物件底部都要能對齊 tile grid，避免 `x=191` 這類非格線座標。

## 3. 色彩

- 主色：近白米色、淺灰、溫暖木色、柔和金色。
- 機場牆面：幾乎接近白色的米白，避免黃到像舊牆。
- 地板：低飽和淺灰或暖灰，保留細微格線/材質，不搶角色。
- 點綴色：藍色、綠色、琥珀色可用於螢幕、燈光、出口提示。
- 禁止：高飽和霓虹色大面積使用、過黑陰影、照片感漸層。

## 4. 光影與輪廓

- 輪廓：使用柔和深色邊線，不能太黑太硬。
- 陰影：物件底部可加短而淡的接地陰影。
- 高光：金屬、玻璃、螢幕可加少量像素高光。
- 光源：預設由左上方照明。
- 動畫發光：只用在螢幕、燈箱、出口提示、販賣機、Kiosk 等有理由發光的物件。

## 5. 資產尺寸規則

- 靜態物件檔名：`prop.png`。
- 動畫物件檔名：`sheet-transparent.png`。
- 動畫影格：優先 4 格循環，必要時 6 或 8 格。
- 透明背景：所有遊戲資產必須輸出透明背景。
- 圖塊切分：可放進 Tiled 的物件必須能清楚落在格線上。
- 物件碰撞：碰撞區只覆蓋底部實體部分，不要覆蓋整張圖。

## 6. 方向規則

- 店面、櫃台、設施若會出現在走道兩側，需準備面向中間走道的版本。
- 基本方向：`north`、`south`、`east`、`west`。
- 若物件本質沒有方向，例如垃圾桶、植栽、椅子，可做 `front` 或 `side`，但不得使用不自然斜角。
- 左右側店面不能只是把正面圖壓扁，要有側面厚度與可讀的入口方向。

## 7. 動畫規則

- 動畫要小而有意義，不要整個物件大幅抖動。
- 植栽：葉片輕微擺動即可。
- 飲水機：水面或指示燈微亮。
- 洗手間：標示燈或門牌微亮。
- 販賣機/Kiosk：螢幕切換、按鈕燈閃爍。
- 手扶梯：階梯帶循環移動。
- 平面手扶梯：水平輸送帶循環移動，不要像斜向手扶梯。

## 8. 地圖擺放規則

- 每張小地圖先定主走道，再放大型物件。
- 主走道至少保留 `3` 格寬，重要區域建議 `4–5` 格。
- 牆邊設施優先貼牆：洗手間、飲水機、急救櫃、充電柱。
- 休息設施集中成小區塊：椅子、垃圾桶、販賣機、植栽。
- 不同功能區要有留白，不要把每個物件平均塞滿。
- Tiled 物件座標優先使用 `16px` 倍數。

## 9. 產圖 Prompt 基準

新資產 prompt 必須包含：

```text
clean modern airport, warm pixel RPG style, top-down 3/4 view,
16x16 tile-friendly, soft outline, subtle shadow, transparent background,
bright off-white and warm gray palette, readable silhouette,
not photorealistic, not 3D render, not isometric, no text unless requested
```

若要動畫，額外包含：

```text
4-frame sprite sheet, consistent object position across frames,
only subtle meaningful motion, no camera movement, magenta background for processing
```

## 10. 命名規則

- 公共設施：`airport-{object-name}-{variant}`
- 商店資產：`shop-{category}-{object-name}-{direction}`
- 動畫資產：`airport-{object-name}-animated-{direction}`
- 方向後綴：`north`、`south`、`east`、`west`、`front`、`side`
- 版本資料夾：`*-v1`、`*-v2`，不要覆蓋無法追蹤來源的舊資產。

## 11. 驗收清單

每個新資產完成前需確認：

- 放進地圖後不糊、不太大、不遮住主走道。
- 與角色比例合理。
- 透明背景乾淨，沒有白邊或雜點。
- 若是動畫，循環時不跳動、不超出框。
- Tiled 可以看到並正確選取。
- 遊戲內名稱、互動、碰撞位置符合物件底部。
