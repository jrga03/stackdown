# Task Index

## Phases

1. **Foundation** — Types, constants, board, pieces, SRS, randomizer, events
2. **Engine Core** — Gravity, lock delay, T-spin, scoring, combo, game engine
3. **Rendering** — Colors, block/board/piece rendering, animations, text popups
4. **Input + Game Loop** — Key mapping, DAS/ARR, keyboard manager, game loop, session
5. **React UI** — Game screen, HUD, layout, menus, overlays, routing
6. **Polish** — Particles, settings, responsive sizing, audio stub, utilities

## Task List

| # | Task | Phase | Status |
|---|------|-------|--------|
| 1.1 | Project Scaffold | 1 | [ ] |
| 1.2 | Types and Constants | 1 | [ ] |
| 1.3 | Piece Shapes | 1 | [ ] |
| 1.4 | Board | 1 | [ ] |
| 1.5 | SRS | 1 | [ ] |
| 1.6 | Randomizer | 1 | [ ] |
| 1.7 | EventBus | 1 | [ ] |
| 1.8 | Game Mode Types | 1 | [ ] |
| 2.1 | Gravity Timer | 2 | [ ] |
| 2.2 | Lock Delay | 2 | [ ] |
| 2.3 | T-Spin Detector | 2 | [ ] |
| 2.4 | Score Manager | 2 | [ ] |
| 2.5 | Combo Tracker | 2 | [ ] |
| 2.6 | Game Engine | 2 | [ ] |
| 2.7 | Engine Barrel Export | 2 | [ ] |
| 2.8 | Practice Mode Engine | 2 | [ ] |
| 3.1 | Color Palette | 3 | [ ] |
| 3.2 | Block Renderer | 3 | [ ] |
| 3.3 | Board Renderer | 3 | [ ] |
| 3.4 | Piece Renderer | 3 | [ ] |
| 3.5 | Animation Manager | 3 | [ ] |
| 3.6 | Text Popup | 3 | [ ] |
| 3.7 | Game Renderer | 3 | [ ] |
| 4.1 | Input Mapper | 4 | [ ] |
| 4.2 | DAS Manager | 4 | [ ] |
| 4.3 | Keyboard Manager | 4 | [ ] |
| 4.4 | Game Loop | 4 | [ ] |
| 4.5 | Game Session | 4 | [ ] |
| 5.1 | Game Screen | 5 | [ ] |
| 5.2 | HUD Components | 5 | [ ] |
| 5.3 | Game Layout | 5 | [ ] |
| 5.4 | Main Menu | 5 | [ ] |
| 5.5 | Overlays | 5 | [ ] |
| 5.6 | App Router | 5 | [ ] |
| 5.7 | Mode Select Screen | 5 | [ ] |
| 5.8 | Timer Display | 5 | [ ] |
| 5.9 | Personal Bests | 5 | [ ] |
| 5.10 | Game Over Enhancements | 5 | [ ] |
| 6.1 | Particle System | 6 | [ ] |
| 6.2 | Settings Screen | 6 | [ ] |
| 6.3 | Responsive Sizing | 6 | [ ] |
| 6.4 | Audio Stub | 6 | [ ] |
| 6.5 | Utilities | 6 | [ ] |

## Dependency Graph

```
Phase 1:
  1.1 --> 1.2 --> 1.3
                  1.4
                  1.6
                  1.7
         1.2 + 1.3 + 1.4 --> 1.5
         1.2 --> 1.8

Phase 2:
  1.2 --> 2.1, 2.2, 2.4, 2.5
  1.2 + 1.4 --> 2.3
  1.3 + 1.4 + 1.5 + 1.6 + 1.7 + 2.1-2.5 --> 2.6 --> 2.7
  1.8 + 2.6 --> 2.8

Phase 3:
  1.2 --> 3.1 --> 3.2 --> 3.3
  3.2 + 1.3 --> 3.4
  3.1 + 1.7 --> 3.5, 3.6
  3.3 + 3.4 + 3.5 + 3.6 --> 3.7

Phase 4:
  1.2 --> 4.1 --> 4.2 --> 4.3
  (none) --> 4.4
  2.7 + 3.7 + 4.3 + 4.4 --> 4.5  ★ GAME PLAYABLE

Phase 5:
  4.5 --> 5.1 --> 5.2, 5.3
  1.1 --> 5.4
  5.1 + 5.4 --> 5.5
  5.1 + 5.4 + 5.5 --> 5.6
  1.8 + 5.4 --> 5.7 (mode select)
  5.1 --> 5.8 (timer display)
  5.4 --> 5.9 (personal bests)
  5.5 + 5.9 --> 5.10 (game over enhancements)

Phase 6:
  3.5 --> 6.1
  5.4 --> 6.2
  5.3 --> 6.3
  (none) --> 6.4, 6.5
```

## Milestones

- After **2.7**: Engine complete — all game logic works in isolation
- After **4.5**: ★ Game playable — pieces fall, move, rotate, lock, lines clear
- After **5.6**: Full UI — menus, HUD, overlays, screen routing
- After **5.10**: Practice mode + personal bests complete
- After **6.5**: Polish complete — particles, settings, responsive, audio stub
