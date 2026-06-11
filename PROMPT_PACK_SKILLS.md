# Skill Prompt Pack v1

## generate2dmap Prompt
```text
Create a production-ready 2D RPG map pack for EverrichRPG Rewrite.

Style:
- Pixel style, high readability, top-down perspective.
- Distinct biome contrast and clear traversal paths.

Required outputs:
1) Village map (safe zone), Forest map (combat zone), Shrine map (quest zone).
2) Layer guidance: ground, decor, collision, portal markers.
3) Walkable and blocked zone specification in machine-readable form.
4) Suggested spawn points and transition points between maps.

Gameplay constraints:
- Main quest route should be understandable in under 10 seconds.
- At least one optional side path for exploration.
- Keep combat route visibility clear.

Deliverables:
- PNG assets
- collision/walkability metadata
- map integration notes for Phaser
```

## generate2dsprite Prompt
```text
Create a cohesive 2D RPG sprite pack for EverrichRPG Rewrite.

Style:
- Pixel style matching map palette and lighting.

Required assets:
1) Player character: idle/walk/attack/hurt (4-direction or side-facing set).
2) Elder NPC: idle/talk gesture.
3) Slime enemy: idle/attack/hit/defeat.
4) Effects: slash hit, heal pulse.

Technical constraints:
- Transparent backgrounds.
- Consistent sprite scale aligned to 32x32 base tile.
- Export sprite sheets and frame index notes.

Deliverables:
- PNG sprite sheets
- frame index metadata
- naming convention list
```

## Browser Verification Prompt
```text
Open local game build and verify the MVP path:
1) Enter world scene
2) Move character
3) Accept Elder quest
4) Start and win one battle
5) Turn in quest
6) Save and reload

Report:
- Pass/Fail for each step
- visual or interaction regressions
- recommended fixes
```

