# Docs Audit & Tech Stack Review

Date: 2026-03-04

## Tech Stack Verdict

All choices validated. No major changes.

| Choice | Verdict | Action |
|--------|---------|--------|
| Canvas 2D | Keep | WebGL/PixiJS/Phaser unnecessary for ~1,600 draw calls/frame |
| React | Keep | Preact swap available later if bundle size matters |
| Vite | Keep | No concerns |
| Vitest | Keep | Use seeded randomizer in all engine tests |
| No state lib | Keep | Engine-owns-state is clean and multiplayer-ready |
| TS strict | Keep | Zero runtime cost |
| OffscreenCanvas | Add fallback | `document.createElement('canvas')` for older iOS Safari |
| rAF + fixed timestep | Keep | Use `while` loop for accumulator |

**Missing tooling to add in task 1.1:**
- ESLint with `@typescript-eslint/recommended-type-checked`
- Biome or Prettier for formatting

---

## Doc Fixes (28 changes)

### ENGINE.md (12 changes)

1. **Combo bonus API** — Remove `addComboBonus()` from ScoreManager. `processLineClear()` handles base points, B2B, and combo. Signature: `processLineClear(count, isTSpin, isTSpinMini, combo): number`.

2. **T-Spin replaces base points** — Add: "T-Spin base points replace (not add to) normal line clear base points."

3. **B2B excludes T-Spin Mini** — Change to: "Applicable to: Quad and full T-Spin clears. T-Spin Mini clears do not qualify."

4. **Soft drop bypasses gravity** — Add: "When soft drop is active (key held), gravity timer does not advance. Soft drop provides its own downward movement."

5. **Hard drop lock semantics** — Clarify: "Hard drop locks the piece instantly — bypasses lock delay entirely."

6. **Lock delay + line clear** — Add: "If a line clear beneath the active piece causes it to no longer touch a surface, lock delay deactivates and timer resets to 500ms. When the piece lands again, lock delay reactivates with fresh timer and full 15 resets."

7. **Lock delay counter direction** — Change field from "resets used" to "resets remaining", initialized at 15, counting down.

8. **O-piece lastKickIndex** — Add: "O-piece does not use wall kicks. lastKickIndex is set to 0 after any O-piece rotation."

9. **Practice mode pause** — Add: "When paused, remainingMs does not decrement. Timer freezes and resumes from same value."

10. **Spawn collision** — Add: "If newly spawned piece overlaps occupied cells at spawn position (row 18), game over with reason: 'topout'. Piece is not placed on the grid."

11. **ScoreManager constructor** — Add: "level initialized to startLevel (default 1). When fixedLevel is true, checkLevelUp() always returns null."

12. **fromSnapshot()** — Add note: "(Future feature — not implemented in initial release.)"

### RENDERER.md (5 changes)

13. **Hold/Next canvas dimensions** — Add: "Hold: 4×cellSize wide, 3×cellSize tall. Next queue: 4×cellSize wide, (3×cellSize×5)+(gap×4) tall, gap = cellSize×0.5."

14. **Text popup duration** — Add: "Default 2000ms. Fade-in 100ms, hold 1600ms, float-up + fade-out 300ms."

15. **Lock flash effect** — Add: "Locked piece cells flash white rgba(255,255,255,0.6) for 100ms (single frame overlay), then normal rendering."

16. **Bevel gradient midpoint** — Clarify: "Vertical gradient from y=bevelWidth to y=cellSize-bevelWidth. 50% midpoint."

17. **Garbage block color** — Add to palette: "GARBAGE: '#8A8A8A' (medium gray) with standard bevel shading."

### INPUT.md (3 changes)

18. **Input during pause/game-over** — New section: "On PAUSE: applyAction fires, DAS fully reset. On resume: clean state. During game over: all game input ignored."

19. **Window blur/focus** — New section: "On blur: simulate keyup for all held keys. On focus: resume from clean state."

20. **Input during animations** — Add: "Engine processes input during line clear animations. Animations are renderer-only visual effects."

### UI.md (4 changes)

21. **Overlay behavior** — Add: "Pause/game-over overlays render on top of frozen canvas. Block game input, allow menu clicks."

22. **useGameSession return API** — Clarify: "Hook wraps session methods in stable callbacks. session not exposed. Returns: pause(), resume(), restart(), quit()."

23. **destroy() cleanup** — Add: "Stops rAF loop, detaches KeyboardManager, destroys Renderer (releases OffscreenCanvas), clears EventBus listeners."

24. **Task 5.2 vs 5.8 scope** — Add: "5.2: ScoreDisplay, LevelDisplay, LinesDisplay, HoldPiece, NextQueue. 5.8: TimerDisplay (practice only)."

### ARCHITECTURE.md (3 changes)

25. **Error handling section** — New: "Engine spawn collisions emit GAME_OVER. Renderer errors logged to console. localStorage failures fall back to defaults."

26. **Cleanup chain** — New: "destroy() → stop GameLoop → detach KeyboardManager → destroy Renderer → clear EventBus."

27. **Pause semantics** — New: "When paused: tick() no-op, all timers frozen, applyAction ignores non-PAUSE actions, snapshots reflect frozen state."

### Task Index (1 change)

28. **OffscreenCanvas fallback** — Add to task 3.3 acceptance criteria: "Include OffscreenCanvas fallback using document.createElement('canvas')."
