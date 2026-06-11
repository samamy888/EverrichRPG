# Tiled 地圖編輯流程

## 開啟專案

1. 安裝 [Tiled Map Editor](https://www.mapeditor.org/)。
2. 在 Tiled 開啟 `public/assets/maps/tiled/EverrichRPG.tiled-project`。
3. 從 `regions` 資料夾開啟任一 `.tmj` 地圖。
4. 儲存後重新整理本地遊戲頁面，Phaser 會直接讀取新地圖。

## 圖層約定

| 圖層 | 用途 |
| --- | --- |
| `Ground` | 主要地板 |
| `Accent` | 中央走道或地板裝飾 |
| `Walls` | 場景邊界；物件需有 `texture` |
| `Props` | 店面、櫃台、展示台與招牌 |
| `Collision` | 隱藏碰撞框；`ownerId` 對應 Props 名稱 |
| `Portals` | 換區觸發框與目的地資料 |
| `Spawns` | 玩家出生點與面向 |

## 重要規則

- 地圖格固定為 `16 × 16`。
- 移動 Props 時，也要同步移動它在 `Collision` 圖層的碰撞框。
- Props 的物件名稱必須唯一，Collision 的 `ownerId` 必須完全相同。
- Portal 必須設定 `destinationRegionId` 與 `destinationSpawnId`。
- Spawn 必須設定 `facing`：`up`、`down`、`left` 或 `right`。
- Tiled 檔案放在 `public` 內，存檔後不用轉檔；重新整理遊戲即可看到結果。

## 四向機場資產

- `airport-props` tileset 內的盆栽、飲水機、廁所入口與手扶梯都有 `south`、`west`、`east`、`north` 四向版本。
- 方向代表資產面向或延伸方向，不是玩家必須面向的方向。
- 盆栽與飲水機建議使用底部 `1 × 1` 格碰撞；寬盆栽可使用 `2 × 1` 格。
- 廁所入口只替牆面與立柱建立碰撞，門口中央需保留可通行或互動區。
- 手扶梯的整段機體應有碰撞；若之後加入搭乘功能，再於物件自訂屬性加入 `travelDirection`。
- 原始生成圖、方向規格與推薦碰撞尺寸放在 `public/assets/props/airport-directional-v1`。
- 原本的免稅店面、展示島、展示架、服務台、店門、導覽機與看板也已收錄四向新版，檔名以 `dutyfree-*` 或 `airport-*` 開頭並以方向結尾。
- 店面 `south` 是入口朝下方走道，`north` 是背牆朝下方，`west`／`east` 則適合放在左右兩側的直向走廊。
- 新地圖請優先使用帶方向結尾的資產；未帶方向的舊資產只保留給既有地圖相容使用。
- 現有五區已依中央走道配置方向：左側物件朝 `east`、右側朝 `west`、上方主櫃朝 `south`、下方服務台朝 `north`。
- `npm run tiled:orient-props` 可重新套用這套朝向規則，並同步修正尺寸、GID 與碰撞框。
- 左右兩側免稅店使用與中央走道平行的「縱向側店模組」：店內空間往外側延伸，入口開在內側中段，店體碰撞與入口 Portal 分開。不要改回橫向正面店面或薄側牆。

## NPC 動畫與移動

在 `NPCs` 圖層選取角色後，可從「自訂屬性」調整：

| 屬性 | 類型 | 用途 |
| --- | --- | --- |
| `movementType` | string | `idle` 原地、`wander` 隨機移動、`patrol` 沿初始方向往返 |
| `facing` | string | 初始面向：`up`、`down`、`left`、`right` |
| `speed` | float | 每秒移動像素；旅客建議 `40` 到 `64` |
| `animationKey` | string | `traveler-male` 或 `traveler-female` |

- Tiled 負責 NPC 的位置、碰撞框與行為參數。
- Phaser 負責播放上下左右走路動畫。
- `idle` 不會移動，`speed` 可設為 `0`。
- `patrol` 會沿 `facing` 指定的方向移動，遇到牆壁、物件或活動範圍邊界時折返。
- 移動 NPC 後，也要同步移動 `Collision` 圖層中 `ownerId` 相同的初始碰撞框。

## 指令

- `npm run tiled:verify`：檢查圖層、尺寸與傳送門連結。
- `npm run tiled:bootstrap`：重新產生初始三區。這會覆蓋 Tiled 內的調整，只在需要重建範例時使用。
