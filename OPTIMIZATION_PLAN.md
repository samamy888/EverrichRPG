# TPE11 Visual Match Plan

Last updated: 2026-05-27

## Goal

Make the in-game TPE2/TPE11-style scene read closer to `TPE11.jpg` and real airport duty-free references, while keeping clean layer architecture and runtime props.

## Reference Images (local)

- `public/view/47618_1_1.jpg`
- `public/view/62403_1_1.jpg`
- `public/view/china-airline-41.jpg.webp`
- `public/view/okayama-airport-23.jpg.webp`
- `public/view/177986336053576_P32374184.webp`

## Key Visual Cues Extracted

- Bright polished flooring with clear aisle reflections.
- Store frontage is a continuous band (not isolated tiny kiosks).
- Strong overhead fascia/sign bands for brand zones.
- Walkway edges are readable via columns/partitions/short walls, not invisible collision only.
- Lighting tone is warm neutral, with dark accents only at storefront headers.

## Execution Steps (next)

1. Floor tone pass  
   - Nudge base floor palette and contrast to approach warm polished terminal look.  
   - Keep base map object-free (no baked counters/walls/elevators).

2. Storefront rhythm pass  
   - Re-arrange runtime shop/check-in/info props into longer, coherent frontage blocks.  
   - Add spacing rules so aisle width feels consistent.

3. Architectural edge readability pass  
   - Use short-wall / glass-partition / column props to define route boundaries visibly.  
   - Keep collision and visible boundary aligned.

4. Signage and identity pass  
   - Move/align brand/service indicators into UI/signage layer style.  
   - Reduce random label noise; keep a few strong navigational anchors.

5. Final HUD harmony pass  
   - Keep current RPG HUD, then tune color/value contrast against updated floor/store tones.

## Progress

- [x] HUD polish pass 1
- [x] Minimap/player-info alignment pass 1
- [x] Mid-zone walkability pass 1
- [x] TPE11 visual-match pass 1

## Pass 1 Done

- Warmed floor/base ambience in scene runtime.
- Re-grouped shop and check-in anchors into clearer frontage rhythm.
- Reduced label noise by hiding dense gate short labels from world layer.
- Tuned HUD dark tones to warmer palette so it blends with terminal lighting.
