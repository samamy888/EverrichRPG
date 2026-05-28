# Repository Guidelines

> 撠?閮餉?嚗????湔隤踵嚗?隞?`TPE11` 雿銝餉?隞輻?箸???
?祆?隞嗥?砍?獢?隞??鈭綽?Codex/?嗡? AI coding agent嚗極雿?撘? 
?亙??桅??瘛勗惜 `AGENTS.md`嚗誑?湔楛撅斗?獢??
## 撠?蝯?

- ?寧??`index.html`?vite.config.ts`?tsconfig.json`?package.json`
- ??蝣潘?`src/`
  - `src/scenes/`嚗haser ?湔
  - `src/ui/`嚗??Ｗ?隞嗉? overlay嚗 `UIOverlay.ts`嚗?  - `src/data/`嚗?????閮剖?
- ??鞈嚗public/`
- ?Ｙ嚗dist/`嚗?遣嚗?
## 撣貊?誘

- 摰?嚗npm ci`
- ?嚗npm run dev`
- 撱箇蔭嚗npm run build`
- ?汗嚗npm run preview`

## 蝔?憸冽

- TypeScript嚗SM嚗?- 蝮格? 2 spaces?蝙?典???- 瑼?嚗?  - Scene/UI/Class嚗ascalCase
  - 霈/?賢?嚗amelCase
  - 撣豢嚗PPER_SNAKE_CASE
- ?⊿?雿輻?瑕??臬

## ????

- ?踹?銝撟脩?憭批???
- ?芸?撱嗥??暹??嗆????- 靽格 UI ??隢?銝??湔?閬?雿蔭??蝙?刻蔣?選?

## ?桀?鈭斗???2026-05-27嚗?
### ?啣?蝑

- 撌脫?蝣箸?具????/鈭??拐辣/璅內??撅方身閮?- 銝????啜璇胯??Ｙ?鈭??拐辣?日脣???
### HUD/UI 撌脣???
- 銝?寧??閬賣?嚗蜓憿舐內?圈?嚗?- 摨?寧 RPG 閮蝒??內??嚗?- 撌虫?閫獢?憿舐內?嚗??歇蝘駁嚗?- ?喃??????啣?嚗?瘨銝???嚗?- Debug ?批??閮剝????`~` ??

### 銝餉?靽格瑼?嚗???

- `src/ui/UIOverlay.ts`
- `src/main.ts`

## 銝?雿?Agent 撱箄降

1. 靘?`debug/` ??唳?脰? HUD 蝚砌?頛芰移靽?2. 霈椰銝??脫??舀 config ??甈??舫???
3. ????臭??隞嗆??runtime props嚗???文摨?

## 2026-05-28 Agent Handoff Update (ASCII)

### What Was Done

1. HUD test automation is now in repo:
   - `scripts/capture-hud.ps1`
   - `scripts/hud-regression.ps1`
2. NPM scripts added:
   - `npm run hud:test`
   - `npm run hud:test:quick`
   - `npm run hud:test:manual`
3. `src/config.ts` now has `CONFIG.ui.statusPanel` for left-bottom panel toggles/size.
4. Default runtime cleanliness for HUD checks:
   - debug mode default OFF
   - chat panel default hidden
5. Login test URL helper:
   - `hudtest=1` (autostart + cleanhud + hudprobe)

### Current Status

1. `UIOverlay` is running and probe values are visible.
2. Top probe layer is visible consistently.
3. Bottom HUD visibility remains unstable in runtime verification and still needs final fix.

### Required Verification Command

```powershell
npm run hud:test
```

Fast mode (skip build):

```powershell
npm run hud:test:quick
```

Manual fallback:

```powershell
npm run hud:test:manual
```

### Next Agent Checklist

1. Keep using `npm run hud:test` after every HUD edit.
2. Stabilize bottom HUD rendering (layering/visibility path), then remove temporary probe visuals.
3. Keep updates scoped; do not revert unrelated working-tree changes.

