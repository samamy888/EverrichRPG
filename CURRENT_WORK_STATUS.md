# Current Work Status (Handoff)

Last updated: 2026-05-27

## Scope

Current focus is TPE2 lobby visual/collision polish toward TPE11 style, plus prop pipeline for escalator/customs/storefront.

## Completed

1. HUD/overlay baseline polish
- Top thin bar + bottom message window + left-bottom money panel.
- Minimap framing and HUD tone alignment pass.

2. Debug workflow
- `DEBUG` switch added on screen (top-left).
- Default debug mode is ON.
- `C` toggles collision debug.
- `F2` toggles prop/blocker name labels.
- Blockers now also have debug labels (`blk-<index>`).

3. Prop pipeline (v1)
- Generated and imported:
  - `escalator-module`
  - `customs-gate-module`
  - `shopfront-module`
- Added raw concept images under `public/map/TPE2/props/raw/`.
- Added cut props under corresponding `.../prop.png`.

4. Scene integration
- Feature props added into `TPE2_FEATURE_PROPS` and loaded in `TPE2LobbyScene`.
- Escalator visual depth adjusted to avoid covering player body unnaturally.
- Added escalator carry logic (two-way lanes).
- Added escalator flow overlay animation.

## In Progress / Needs Verification

1. Lower escalator approach path
- User reported right-side wall blocking near lower escalator.
- Related blockers and short-wall collisions have been reduced/disabled in recent edits.
- Needs final in-game verification with latest build.

2. Escalator art edge quality
- Anti-fringe cleanup pass applied on generated props.
- May still need a second cleanup/generation pass for cleaner pixel edges.

## Key Files Changed

- `src/scenes/TPE2LobbyScene.ts`
- `src/data/tpe2Layout.ts`
- `src/data/facilities.ts`
- `src/ui/UIOverlay.ts`
- `src/ui/overlays/minimap.ts`
- `src/main.ts`
- `OPTIMIZATION_PLAN.md`
- `PROP_ROLLOUT_PLAN.md`
- `public/map/TPE2/props/**`

## Next Suggested Steps

1. Validate escalator lower-right path with `C + F2` and remove any remaining blocking `blk-*`.
2. Tune escalator lane speed and lane width for better ride feel.
3. Replace current generated customs/storefront props with cleaner production variants.
4. Continue TPE11 visual-match pass 2 (store rhythm + signage hierarchy).
