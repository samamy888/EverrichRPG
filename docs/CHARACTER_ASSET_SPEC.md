# EVERRICH RPG 角色紙娃娃資產規格

> 這份文件是角色、旅客、店員與未來試衣間系統的唯一資產規格。之後只要新增素體、髮型、衣服、褲子、鞋子或配件，都要先符合這裡的尺寸、命名與對齊規則。

## 1. 系統目標

- 角色不再只依賴整張固定 sprite，而是由 `base-body + hair + top + pants + shoes + accessories` 組合。
- 後端旅客資料只存配裝欄位，前端依配裝解析成可顯示的旅客 sprite。
- 短期仍採「離線合成」：用腳本預先輸出 `traveler-{recipeId}-v1/sheet-transparent.png`。
- 長期可升級成「即時換裝」：試衣間、店員制服、活動服裝都能共用同一套 layer。

## 2. 視覺風格

- **視角**：寶可夢綠寶石式 3/4 俯視 RPG。
- **比例**：角色頭身比約 2.2–2.6 頭身，與目前主角 `CONFIG.characterDisplaySize` 對齊。
- **線條**：深色 1–2 px 外框，避免過度柔邊與寫實漸層。
- **色彩**：明亮、低噪點、現代機場感；服裝顏色要能在灰白地板上清楚辨識。
- **背景**：所有原始與輸出 sheet 的透明前置處理背景一律使用 `#FF00FF`，最終輸出為透明 PNG。

## 3. 標準 Walk Sheet

- **Frame size**：`96x96 px`
- **Sheet layout**：`4x4`
- **Sheet size**：`384x384 px`
- **Rows**：`down`, `left`, `right`, `up`
- **Columns**：`stand`, `step-a`, `stand`, `step-b`
- **站立規則**：第 1、3 欄必須是閉腳站姿；停止移動時只能顯示站姿欄。
- **對齊錨點**：腳底中心固定在每格相同座標；衣服、褲子、頭髮不得造成身體漂移。

## 4. 斜向 Walk Sheet

- **Frame size**：`96x96 px`
- **Sheet layout**：`4x4`
- **Rows**：`down-left`, `down-right`, `up-left`, `up-right`
- **Columns**：`stand`, `step-a`, `stand`, `step-b`
- **用途**：只給主角或高價值 NPC 使用；一般旅客可先用四方向動畫。
- **規則**：斜向角色仍要維持同一腳底錨點，不能因為轉身變大或變小。

## 5. Layer 規格

### 5.1 Layer Slot

- `accessory-back`：背包、行李、翅膀等在身體後方的物件。
- `base-body`：素體、臉、手、皮膚與安全內層；不可裸露細節。
- `pants`：褲子、裙子、下身主要服裝。
- `shoes`：鞋子、襪子、腳部配件。
- `top`：上衣、外套、背心、制服上身。
- `hair`：頭髮、帽子形髮型；不能蓋掉整張臉。
- `accessory-front`：眼鏡、胸牌、前背包、手持小物。

### 5.2 合成順序

1. `accessory-back`
2. `base-body`
3. `pants`
4. `shoes`
5. `top`
6. `hair`
7. `accessory-front`

### 5.3 Layer 合格條件

- 每個 layer 都必須是 `384x384` 透明 PNG。
- layer 只能畫自己的部位，不能重畫整個角色。
- 同一 body type 的所有 layer 必須使用完全相同的格線與腳底錨點。
- 服裝要貼合素體，不能像浮在身體外，也不能蓋掉手腳必要輪廓。
- 產生器會用 `base-body` 的每幀透明邊界檢查 layer 是否合身，結果會寫入 `pipeline-meta.json` 的 `layerFit`。
- `hair` 可以比頭頂略高，但不能整片漂離頭部；每幀至少要與素體頭部有穩定重疊。
- `top` 可以因外套厚度左右略寬，但不能超出素體太多，也不能缺幀。
- `pants` / 裙子可以延伸到腳底附近；走路幀素體腿部收窄時，仍以腳底錨點與下身輪廓一致為準。
- 若 `acceptance.layerFitPassed` 不是 `true`，該 recipe 不可視為可用素材。

## 6. Body Type

目前正式支援：

- `adult-male`
- `adult-female`

未來預留：

- `child-male`
- `child-female`
- `elder-male`
- `elder-female`

新增 body type 時必須新增自己的 `paperdoll-manifest.json`，不能直接混用成人 layer。

## 7. 檔案結構

### 7.1 Paperdoll Root

```text
public/assets/sprites/paperdoll/{bodyType}-v{version}/paperdoll-manifest.json
public/assets/sprites/paperdoll/{bodyType}-v{version}/layers/{slot}-{slug}/sheet-transparent.png
public/assets/sprites/paperdoll/{bodyType}-v{version}/layers/{slot}-{slug}/prompt-used.txt
public/assets/sprites/paperdoll/{bodyType}-v{version}/layers/{slot}-{slug}/pipeline-meta.json
```

### 7.2 合成旅客輸出

```text
public/assets/sprites/traveler-{recipeId}-v1/sheet-transparent.png
public/assets/sprites/traveler-{recipeId}-v1/animation.gif
public/assets/sprites/traveler-{recipeId}-v1/pipeline-meta.json
public/assets/sprites/traveler-{recipeId}-v1/traveler-{recipeId}-1.png
```

## 8. Manifest 規格

每個 `paperdoll-manifest.json` 至少要包含：

- `schemaVersion`：目前為 `3`。
- `spec`：必須是 `docs/CHARACTER_ASSET_SPEC.md`。
- `bodyType`：例如 `adult-male`。
- `cellSize`：必須是 `[96, 96]`。
- `rows`：必須是 `["down", "left", "right", "up"]`。
- `columns`：必須是 `["stand", "step-a", "stand", "step-b"]`。
- `layerOrder`：必須符合第 5.2 節。
- `layers`：列出可用 layer。
- `recipes`：列出會被合成輸出的角色。

每個 recipe 必須包含：

- `id`：例如 `paperdoll-blue-male`。
- `bodyType`：必須與 manifest 相同。
- `appearance`：後端與前端可使用的配裝欄位。
- `slots`：實際使用的 layer id。
- `output`：輸出的 `sheet-transparent.png` 路徑。
- `status`：目前建議使用 `manifest-built-v1`。

## 9. 旅客資料欄位

後端與前端應使用同一組欄位描述配裝：

- `gender`：`male` 或 `female`
- `ageGroup`：`adult`, `child`, `elder`
- `hairStyle`：髮型 slug，例如 `tousled-brown`
- `top`：上衣 slug，例如 `blue-travel-jacket`
- `pants`：下身 slug，例如 `dark-trousers`

後續可擴充：

- `bodyType`
- `skinTone`
- `shoes`
- `accessoryBack`
- `accessoryFront`
- `mood`

## 10. 產圖 Prompt 基準

### 10.1 Base Body

```text
Create a clean modern airport RPG pixel-art character base body sprite sheet.
Top-down 3/4 view, Game Boy Advance era RPG readability, 96x96 px per frame, 4x4 sheet.
Rows: down, left, right, up. Columns: stand, step-a, stand, step-b.
Neutral safe innerwear, no nudity details, consistent body proportions, clear 1-2 px outline.
Use solid magenta #FF00FF background for processing. No text, no logo, no shadow outside the character.
```

### 10.2 Clothing Layer

```text
Create ONLY the {slot} layer for the provided base body guide.
Do not redraw the body, face, skin, hair, hands, or shoes unless the slot requires it.
Keep exactly the same 96x96 frame size, same body anchor, same pose, same walk-cycle timing.
The clothing must fit tightly on the guide body and follow every frame pose.
Use solid magenta #FF00FF background for processing. No text, no logo, no full character redraw.
```

### 10.3 Hair Layer

```text
Create ONLY the hair layer for the provided base body guide.
Do not redraw the face, skin, clothes, pants, or shoes.
Keep exactly the same 96x96 frame size, same head anchor, same pose, same walk-cycle timing.
Hair should be readable in all four directions and must not cover the entire face.
Use solid magenta #FF00FF background for processing. No text, no logo, no full character redraw.
```

## 11. 驗收清單

新增或修改任何角色資產後，必須通過：

- `npm run assets:paperdoll`
- `npm run character:verify`
- `npm run test:traveler`
- `npm run typecheck`

檢查重點：

- sheet 必須是 `384x384`。
- 每格必須是 `96x96`。
- `stand` 欄必須是站立姿勢。
- 所有 layer 必須跟素體貼合。
- `pipeline-meta.json` 必須包含通過的 `layerFit` 報告。
- 合成輸出不得有洋紅殘留。
- recipe 的 `appearance` 必須能對應到前端旅客 variant。
- Tiled NPC tileset 必須有對應 texture。

## 12. 未來擴充順序

1. 補齊 `child-*` 與 `elder-*` 的真正紙娃娃素體。
2. 新增鞋子與背包 layer。
3. 將主角也改成紙娃娃 recipe。
4. 做遊戲內試衣間與店員制服切換。
5. 視效穩定後，再考慮前端即時 layer 合成。
