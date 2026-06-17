# EverrichRPG Implementation Standards

This document records the rules that should stay stable as maps, props, UI, and deployment grow.

## Mobile Touch Coordinates

- Any pointer input that depends on game coordinates must use `src/ui/touchCoordinateMapper.ts`.
- Do not hand-roll `portrait-touch-layout` coordinate math inside scenes or UI components.
- In portrait touch layout, CSS rotates the game surface for landscape play. Screen vectors and canvas points must be mapped back to game coordinates before gameplay logic uses them.
- UI controls may stop event propagation when they should not trigger world clicks.
- World click-to-move should stay mouse-first unless a touch-specific world navigation mode is intentionally designed.

## Airport Prop Direction

- Facilities should face a clear cardinal direction: front, back, left, or right.
- Avoid diagonal props for practical airport objects such as charging stations, fire cabinets, trash bins, vending machines, kiosks, toilets, and water dispensers.
- Wall-mounted facilities should be vertical/front-facing when attached to walls.
- Corridor-side facilities should align horizontally or vertically with the hallway, not at a 3/4 diagonal.
- Preserve image canvas size when revising an existing prop unless the tileset and map placement are updated in the same change.
- Keep collision boxes aligned to the grounded footprint, not the full visual silhouette.

## Tiled Placement

- Keep walkways clear; decorative props should sit along walls, corners, waiting areas, or shop edges.
- Put collision-bearing props on `Props` plus matching collision objects.
- Visual-only product overlays should go on the visual/merchandise layer and should not add collision.
- For new interactable props, include `texture`, `label`, `interactionTitle`, and `interactionLines`.
- Every new region or tileset change should pass `npm run tiled:verify` before release.

## Text Encoding

- Source files, JSON, TMJ, TSJ, and docs should be UTF-8.
- Do not use PowerShell `Set-Content` for files containing Traditional Chinese unless the command explicitly preserves UTF-8 without BOM.
- Prefer `apply_patch` for small text edits.
- If a file already contains readable Traditional Chinese, verify the diff does not turn it into mojibake.
- Use `npm run text:scan` when touching UI copy, docs, TMJ, TSJ, or generated map scripts.

## Deployment Smoke Checks

- `/api/v1/health/ready` must pass before considering the API healthy.
- Production deploys should smoke-test data endpoints, not only live health.
- Required public smoke endpoints:
  - `/api/v1/shops/catalog`
  - `/api/v1/travelers/random?count=3`
