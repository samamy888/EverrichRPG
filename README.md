# EverrichRPG Rewrite

Phaser + TypeScript + Vite based rewrite baseline for a modular 2D RPG.

## Quick Start
```powershell
npm ci
npm run dev
```

Build:
```powershell
npm run build
```

Map chunk pipeline:
```powershell
npm run map:slice
```

World data verify:
```powershell
npm run world:verify
```

Release prep (map slice + verify + IIS build):
```powershell
npm run release:prep
```

Preview build:
```powershell
npm run preview
```

## Phase 1.5 Prototype Controls
- Grid movement: `WASD`, Arrow keys, or mobile touch D-pad
- Interact: `Enter`, `Space`, or mobile `A`
- Close dialogue: `Esc`, mobile `B`, or interact again
- Collision and portal debug overlay: `D`
- Mobile pause/help: `MENU`
- Enter a region: walk into the yellow portal
- Test fade transition: `T` (temporary Phase 1 shortcut)
- Re-select traveler: `R`

Current prototype:
- Logical resolution: `480x320`
- Tile size: `16x16`
- Regions: duty-free entrance and central shopping street
- Player variants: male and female traveler
- Save behavior: current region and traveler restore after refresh
- Generated map source: `game/assets/tilesets/duty-free-terminal-v1-source.png`
- Tileset contract: `game/assets/tilesets/duty-free-terminal-v1.manifest.json`

Regenerate extracted tiles and props:
```powershell
python scripts/extract-duty-free-tileset.py
```

## Architecture
- `src/data/prototypeRegions.ts`: Phase 1 blockout region data
- `src/scenes/WorldScene.ts`: shared data-driven exploration scene
- `src/scenes/CharacterSelectScene.ts`: traveler selection
- `src/systems/prototypeSave.ts`: prototype save and restore
- `src/ui/UIOverlay.ts`: HUD and mobile touch controls
- `game/content`: new content drafts and world topology
- `game/schemas`: new content contracts
- `migration`: legacy inventory and migration decisions

## Deployment to IIS
1. Run `npm run build`.
2. Copy `dist/*` and `web.config` to IIS website root.
3. Ensure IIS URL Rewrite module is installed.
4. Verify SPA routing fallback works.

## Project Plan Files
- `REWRITE_MASTER_PLAN.md`: master plan and execution log
- `REWRITE_SPEC_v1.md`: decision baseline and MVP checklist
