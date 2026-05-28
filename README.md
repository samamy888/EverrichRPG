# EverrichRPG

> 閮餉?嚗??????湔閬死?誑 `TPE11` ?箔蜓閬遛?批皞?
EverrichRPG ?臭誑 Phaser 3 + TypeScript 鋆賭???2D RPG 撠?嚗?臭誑璈????璆剔征????詨???
## ??銵?
```powershell
npm ci
npm run dev
```

- ?垢?身嚗http://localhost:5173`
- 撱箇蔭嚗?
```powershell
npm run build
npm run preview
```

## 撠?蝯?

- `src/scenes/`嚗haser ?湔
- `src/ui/`嚗UD / Overlay / 鈭? UI
- `src/data/`嚗?????- `public/`嚗????????- `server/`嚗?蝡荔?ASP.NET Core嚗?
## ?桀??脣漲嚗?026-05-27嚗?
### ?啣??惜?孵?嚗歇蝣箇?嚗?
- ?寧銋暹楊?惜嚗????臭??隞嗥?脣???- ?格??惜嚗?  1. ?唳撅歹???憛韏?銝韏啣之敶Ｙ?嚗?  2. 撱箇?/??撅歹????????
  3. 鈭??拐辣撅歹?瑹?璇胯?瑼Ｘ??TM???Ｙ? runtime props嚗?  4. 璅惜/UI 撅歹?Gate??????蝔梧?

### HUD/UI嚗洵銝????

- 銝嚗?撠汗璇??圈?鞈?嚗?- 摨嚗PG 閮蝒?鈭??內嚗?- 撌虫?嚗??脩????芷＊蝷粹??ｇ?`$` + ?詨潘?
- ?喃?嚗????啣?嚗宏?文銝?憭???
- Debug ?批???身?梯?嚗? `~`嚗ackquote嚗??＊蝷?
### ?祆活撌脰?啁??琿?隤踵

- 蝘駁?椰銝???＊蝷綽??????Ｚ?閮?- 撌虫??獢?箄????RPG ?Ｘ瘥?敺????桀??
- 摨?豢筑 debug ??箔?撣賊?嚗?憯??脫?瘚豢?

## 銝?甇亙遣霅?
1. 靘???debug ?芸??洵鈭憚 UI 蝎曆耨嚗?蝝頝?摨艾???
2. ?亥??游?撌虫?獢?撱箄降??config ?批?舫甈?嚗??脣?/HP/隞餃????
3. ????隞嗆???runtime props嚗雁???舐雁霅瑟?
---

## 2026-05-28 Handoff Update (ASCII)

### Completed

1. Added HUD regression scripts:
   - `scripts/capture-hud.ps1`
   - `scripts/hud-regression.ps1`
2. Added npm shortcut:
   - `npm run hud:test` (build + full auto verification)
   - `npm run hud:test:quick` (skip build + full auto verification)
   - `npm run hud:test:manual` (manual in-app browser check only)
3. Added configurable left-bottom status panel in config:
   - `CONFIG.ui.statusPanel` in `src/config.ts`
4. Debug/chat defaults updated for cleaner HUD verification:
   - debug mode default off
   - chat panel default hidden
5. Added HUD automation mode:
   - `hudtest=1` (autostart + cleanhud + hudprobe)

### In Progress / Known Issue

1. `UIOverlay` scene is active and reports expected size, but Phaser-drawn bottom HUD is still not consistently visible in runtime verification.
2. DOM-based probe layer is visible and confirms top-layer rendering works.
3. Root cause is likely layering/visibility interaction in runtime rather than simple coordinate math.

### Current Auto Test Commands

```powershell
npm run hud:test
```

Manual fallback URL is:

```text
http://127.0.0.1:5173/?hudtest=1
```

### Next TODO (for next chat)

1. Force a minimal bottom bar in DOM probe mode and verify stable visibility in every run.
2. Decide final strategy:
   - keep Phaser HUD and fix layer ordering fully, or
   - switch production bottom/top HUD to DOM overlay for guaranteed visibility.
3. After HUD is stable, remove temporary probe visuals and keep only regression scripts.

