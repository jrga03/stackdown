# VERSUS MODE

Versus mode pits two players against each other in a timed garbage-exchange match. Both local (player vs AI) and online (player vs player) share the same match rules, garbage system, and win conditions documented here.

---

## Match Configuration

```typescript
interface VersusConfig {
  gravityLevel: number;    // 1–15, indexes GRAVITY_TABLE
  kosToWin: number;        // default 2
  matchDurationMs: number; // default 120_000 (2 minutes)
}
```

> **Note:** `VersusConfig` is a target interface. The current `VersusSession` constructor accepts these as individual parameters with `matchDurationMs` hardcoded to 120,000. This interface will be formalized when online multiplayer is implemented.

| Parameter | Default | Range | Notes |
|-----------|---------|-------|-------|
| `gravityLevel` | Player-selected | 1–15 | Both sides use the same level |
| `kosToWin` | 2 | 1–10 | KOs required to win the match |
| `matchDurationMs` | 120,000 | — | Match ends when timer expires |

Board dimensions, spawn position, lock delay, and all other engine constants are identical to single-player modes.

---

## Garbage System

### Attack Table

When a player clears lines, the engine emits an `ATTACK_SENT` event with the number of attack lines. The engine emits this event in all game modes; in single-player modes nothing listens to it. `VersusSession` subscribes to this event to drive the garbage exchange.

Attack values come from three tables in `constants.ts`:

**Standard clears:**

| Lines Cleared | Attack |
|---------------|--------|
| Single (1) | 0 |
| Double (2) | 1 |
| Triple (3) | 2 |
| Quad (4) | 4 |

**T-Spin clears:**

| Lines Cleared | Attack |
|---------------|--------|
| T-Spin Single | 2 |
| T-Spin Double | 4 |
| T-Spin Triple | 6 |

**T-Spin Mini clears:**

| Lines Cleared | Attack |
|---------------|--------|
| T-Spin Mini Single | 0 |
| T-Spin Mini Double | 1 |

**Combo bonus** (added to the base attack):

| Combo Count | Bonus |
|-------------|-------|
| 0–1 | 0 |
| 2–3 | 1 |
| 4–5 | 2 |
| 6–7 | 3 |
| 8+ | 4 |

**Back-to-back bonus:** +1 attack line when a quad or T-Spin clear follows another quad or T-Spin clear (with no non-qualifying clears in between).

### Net Cancellation

When a player sends an attack, three steps execute in order:

1. **Cancel pending garbage.** Reduce any garbage lines queued against the attacker. If the attacker has 3 pending garbage and sends 5 attack lines, 3 lines are cancelled, leaving 2.
2. **Remove physical garbage rows.** If excess remains after step 1, attempt to remove up to that many garbage rows from the attacker's board. Only rows tagged as garbage are eligible; normal player-placed rows are untouched.
3. **Send to opponent.** Any remaining excess is added to the opponent's pending garbage queue.

This net-cancel system rewards offensive play: clearing lines defends against incoming garbage before it even materializes.

### Deferred Materialization

Pending garbage does not appear on the board immediately. It is held in the `GarbageManager` and only materializes after the targeted player's next piece locks (the `PIECE_LOCKED` event fires, then pending garbage is consumed and pushed as solid rows from the board bottom).

This prevents garbage from disrupting a piece mid-placement. A player always has the duration of their current piece to mount a counter-attack and cancel incoming garbage.

After garbage rows are pushed, the engine emits `GARBAGE_RECEIVED` with `{ lines: number }`. Renderers and HUDs subscribe to this event to trigger incoming-garbage animations.

### GarbageManager

`GarbageManager` is a plain data container — it tracks pending garbage counts but contains no game-logic decisions:

```typescript
class GarbageManager {
  consumePending(side: 0 | 1): number;     // drain and return pending count
  getPending(side: 0 | 1): number;          // read without draining
  cancelPending(side: 0 | 1, lines: number): number; // cancel up to N, return actual
  addPending(side: 0 | 1, lines: number): void;
  reset(): void;
}
```

Side 0 = left player, side 1 = right player (or AI in local mode).

---

## KO and Topout Rules

When a player tops out (a newly spawned piece overlaps existing blocks), the engine emits `GAME_OVER`. The match evaluates the topout in two ways:

### Topout Without Garbage

If the player's board has **no garbage rows** at the moment of topout, it is a clean topout — the player lost on their own. The match ends immediately in defeat for that player, regardless of KO count.

### KO (Topout With Garbage)

If the player's board **has garbage rows** at the moment of topout, it is a knockout. The opponent scores one KO point. The knocked-out player's board resets via `resetForKO()` (clears garbage rows, resets hold state, resets gravity and lock delay timers, spawns fresh piece). Pending garbage against that player is also cleared.

If the opponent's KO count reaches `kosToWin`, the match ends. Otherwise, play continues.

---

## Match Timer and Timeout

The match timer counts down from `matchDurationMs`. When it reaches zero:

1. The player with **fewer KOs against them** wins.
2. If KO counts are tied, the player with the **higher score** wins.
3. If scores are also tied, the local player wins (in online mode, the server adjudicates this case).

The timer is decremented in the tick callback. The match ends with reason `'timeout'`.

---

## Match Lifecycle

```
             ┌──────────────────────────────────────────────┐
             │              ROOM / LOBBY                    │
             │  (room score persists across rematches)      │
             └──────────────┬───────────────────────────────┘
                            │ both players ready
                            ▼
                       ┌─────────┐
                       │COUNTDOWN│  3-2-1 synced start
                       └────┬────┘
                            ▼
                  ┌──────────────────┐
             ┌───▶│     PLAYING      │◀──┐
             │    └──┬────────────┬──┘   │
             │       │            │      │
             │   topout w/     topout    KO but
             │   garbage     w/o garbage  not match-
             │       │            │      deciding
             │       ▼            ▼      │
             │   ┌───────┐   ┌────────┐  │
             │   │  KO   │   │MATCH   │  │
             │   │ CHECK │   │ END    │  │
             │   └───┬───┘   └────────┘  │
             │       │                   │
             │    match     ┌────────┐   │
             │   deciding?──│MATCH   │   │
             │   yes        │ END    │   │
             │              └────────┘   │
             │       │ no                │
             │       └──── reset ────────┘
             │
         timeout
             │
             ▼
        ┌─────────┐
        │MATCH END│  tiebreak: fewer KOs, then score
        └─────────┘
             │
             ▼
     ┌───────────────┐
     │ RESULTS SCREEN │  shows stats + room score
     └───────┬───────┘
             │
       ┌─────┴─────┐
       ▼           ▼
   [Rematch]    [Leave]
   ready up     return to menu
```

### Room Score

When playing in a room (online or repeated local rematches), a running win/loss tally is tracked:

```typescript
interface RoomScore {
  player1Wins: number;
  player2Wins: number;
}
```

The room score resets when the room closes (both players leave or disconnect). It is displayed on the waiting/ready-up screen and on the results screen.

---

## VersusSnapshot

The snapshot type bundles both players' engine state with match-level metadata. Pushed to React at ~100ms intervals (`STATE_THROTTLE_MS = 100`).

```typescript
interface VersusSnapshot {
  player: GameSnapshot;
  ai: GameSnapshot;               // "ai" in local mode, "opponent" in online
  playerPendingGarbage: number;
  aiPendingGarbage: number;
  playerKOs: number;              // times the player has been KO'd (opponent's KO score)
  aiKOs: number;                  // times the AI/opponent has been KO'd (player's KO score)
  remainingMs: number;
  matchResult: 'playing' | 'win' | 'lose';
  matchEndReason: MatchEndReason | null;
}

type MatchEndReason = 'knockout' | 'topout' | 'timeout';
```

---

## Pause Behavior

In local versus, both engines pause and unpause together. The `VersusLoop` stops during pause. DAS state is cleared on pause to prevent stuck movement.

In online versus, pause is not available — the match timer is server-authoritative and cannot be stopped. See MULTIPLAYER.md for disconnection handling.
