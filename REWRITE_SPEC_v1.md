# EverrichRPG Rewrite Spec v1

## Decision Baseline
- Engine: Phaser 3
- Language: TypeScript
- Bundler: Vite
- Battle Mode: Turn-based
- Art Style Target: Airport duty-free themed pixel-inspired style (Everrich terminal tone)
- Deployment Target: IIS static site (`dist/`)

## MVP Scope
- Enter world scene and move player.
- Talk with Elder to accept quest.
- Trigger battle and resolve win/lose loop.
- Complete one quest and claim reward.
- Use potion item.
- Save/load/reset with localStorage.
- Show runtime HUD state and log panel.

## Out of Scope (v1)
- Multiplayer and server sync.
- Complex map editor integration.
- Production art pipeline automation.
- Skill tree and advanced equipment system.
- Account/auth integration.

## Data-driven Rules
- Core gameplay numbers are defined in `src/data/content.ts`.
- Runtime state is centralized in `src/systems/gameStore.ts`.
- Scene logic reads state and dispatches mutations; it does not own canonical game data.
- UI reads from state snapshot and does not mutate gameplay directly.

## Validation Checklist
1. `npm ci`
2. `npm run build`
3. `npm run dev`
4. Manual play path:
   - Move player with `WASD` or arrows.
   - Go near Elder and press `E` to accept quest.
   - Press `B` to battle slime.
   - Win battle, then return to Elder and press `E` to turn in quest.
   - Press `K` to save, refresh browser, confirm save loaded.
