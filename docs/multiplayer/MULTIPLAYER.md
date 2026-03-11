# ONLINE MULTIPLAYER

Online versus connects two players over a WebSocket relay server. Each player runs their own `GameEngine` locally; the server forwards messages between them without simulating game logic. The same versus rules from VERSUS.md apply — garbage exchange, KO system, match timer, and win conditions are identical.

---

## Architecture

### Local vs Online

```
LOCAL VERSUS:
  VersusSession
    ├─ PlayerEngine ←── KeyboardManager
    ├─ AIEngine ←────── AIController (Web Worker)
    ├─ GarbageManager
    └─ VersusLoop (single rAF, ticks both)

ONLINE VERSUS:
  MultiplayerSession
    ├─ LocalEngine ←─── KeyboardManager
    ├─ RemoteView ←──── NetworkAdapter (WebSocket)
    ├─ GarbageManager
    └─ GameLoop (single rAF, ticks local only)
```

In online mode, the client does not run a second engine. The opponent's board is rendered directly from snapshots received over the network. The local engine is authoritative for the local player's board state.

### NetworkAdapter Interface

All networking is abstracted behind a transport-agnostic interface. This allows future migration from WebSocket relay to WebRTC without changing game logic.

```typescript
interface GameMessage {
  type: string;
  payload: unknown;
  timestamp: number; // server-injected on relay
}

interface NetworkAdapter {
  connect(roomCode: string, role: 'host' | 'guest'): Promise<void>;
  send(message: GameMessage): void;
  onMessage(handler: (message: GameMessage) => void): void;
  onDisconnect(handler: (reason: string) => void): void;
  disconnect(): void;
  readonly latency: number; // rolling average RTT in ms
}
```

The initial implementation is `WebSocketAdapter`. The `MultiplayerSession` depends only on `NetworkAdapter` and is unaware of the transport.

### Server Responsibilities

The relay server is intentionally thin. It does **not** simulate game engines or validate board state. Its responsibilities:

| Responsibility | Detail |
|----------------|--------|
| Room management | Create rooms with codes, join by code, destroy on empty |
| Message relay | Forward game messages between the two room participants |
| Match timer | Authoritative countdown; broadcasts `match:end` on timeout |
| Countdown sync | Both clients receive the same `match:countdown` start timestamp |
| Reconnection | Hold room open during grace period, buffer messages |
| Timestamp injection | Add server timestamp to relayed messages for latency estimation |

The server does **not**: simulate engines, validate moves, detect cheating, or run garbage calculations.

---

## Room Lifecycle

```
Client A                    Server                    Client B
   │                          │                          │
   │── room:create ──────────▶│                          │
   │◀── room:created ─────── │  (generates room code)   │
   │                          │                          │
   │   (share code out-of-band)                          │
   │                          │                          │
   │                          │◀── room:join ────────────│
   │◀── room:state ───────── │ ──── room:state ────────▶│
   │                          │  (2 players connected)   │
   │                          │                          │
   │── room:ready ───────────▶│                          │
   │                          │◀── room:ready ───────────│
   │◀── room:countdown ───── │ ── room:countdown ──────▶│
   │                          │  (3-2-1, synced start)   │
   │                          │                          │
   │◀════ MATCH IN PROGRESS (game messages flowing) ════▶│
   │                          │                          │
   │◀── match:end ─────────── │ ── match:end ──────────▶│
   │                          │  (timer or KO)           │
   │                          │                          │
   │◀── room:state ───────── │ ── room:state ──────────▶│
   │    (back to lobby,       │   (room score updated)   │
   │     ready-up again       │                          │
   │     or leave)            │                          │
```

### Room State

```typescript
interface RoomState {
  roomCode: string;
  players: [PlayerSlot, PlayerSlot | null]; // host = index 0
  roomScore: RoomScore;
  status: 'waiting' | 'ready' | 'countdown' | 'playing' | 'results';
  config: VersusConfig;
}

interface PlayerSlot {
  id: string;         // connection ID
  displayName: string;
  ready: boolean;
  connected: boolean; // false during reconnection grace period
}

interface RoomScore {
  player1Wins: number;
  player2Wins: number;
}
```

### Room Code Generation

Room codes are 4 uppercase alphanumeric characters (e.g., `A3K7`), excluding ambiguous characters (`0`, `O`, `I`, `1`, `L`). This yields ~920K possible codes (31^4) — sufficient for concurrent room count. Codes are recycled when rooms close.

### Post-Match Flow

After a match ends, the room returns to lobby state with the updated `RoomScore`. Both players see the results screen with match stats and the running win/loss tally. From here:

- **Rematch:** Press ready. When both players are ready, a new countdown begins.
- **Leave:** Return to main menu. The other player is notified. Room closes when both leave.

---

## Message Protocol

Messages are JSON objects with a `type` field and a `payload` field. The server injects a `timestamp` on relay.

### Room Messages

Reliable, ordered. Used for room state transitions.

| Type | Direction | Payload |
|------|-----------|---------|
| `room:create` | client → server | `{ config: VersusConfig }` |
| `room:created` | server → client | `{ roomCode: string }` |
| `room:join` | client → server | `{ roomCode: string, displayName: string }` |
| `room:ready` | client → server | `{}` |
| `room:leave` | client → server | `{}` |
| `room:state` | server → client | `{ state: RoomState }` |
| `room:error` | server → client | `{ code: string, message: string }` |
| `room:countdown` | server → client | `{ startsAtMs: number }` |
| `room:opponent_left` | server → client | `{ reason: 'leave' \| 'disconnect' }` |

### Game Messages

High-frequency during play. Relayed between clients through the server.

| Type | Frequency | Payload |
|------|-----------|---------|
| `game:piece_update` | ~20–30 fps | `{ piece: PieceType, x: number, y: number, rotation: RotationState }` |
| `game:piece_lock` | on lock | `{ grid: Grid, score: number, linesCleared: number, combo: number, backToBack: boolean }` |
| `game:attack` | on attack | `{ lines: number }` |
| `game:hold` | on hold | `{ holdPiece: PieceType, activePiece: PieceType }` |
| `game:topout` | on topout | `{ hasGarbage: boolean }` |

### Server-Originated Messages

| Type | When | Payload |
|------|------|---------|
| `match:start` | countdown ends | `{ seed: number }` |
| `match:end` | timer expires or KO limit | `{ result: MatchEndResult }` |
| `match:timer_sync` | every 10s during play | `{ remainingMs: number }` |

```typescript
interface MatchEndResult {
  winner: 0 | 1;                   // player slot index
  reason: MatchEndReason;          // 'knockout' | 'topout' | 'timeout' | 'disconnect'
  roomScore: RoomScore;
  playerStats: [MatchStats, MatchStats];
}

interface MatchStats {
  score: number;
  linesCleared: number;
  linesSent: number;
  garbageReceived: number;
  kosAgainst: number;
  piecesPlaced: number;
}
```

---

## State Sync Model

Three tiers of update frequency, from most frequent to least:

### Tier 1: Active Piece Position (~20–30 fps)

The local client sends the active piece's position and rotation at a target rate of 20–30 messages per second. This enables the remote client to render smooth piece movement on the opponent's board.

```typescript
// ~40–50 bytes per message
{ piece: 'T', x: 4, y: 25, rotation: 2 }
```

The remote client interpolates between received positions for visual smoothness. These updates are **display-only** — the remote board state is not authoritative until a piece locks.

At 30 fps, this is ~1.5 KB/s per player — trivial bandwidth.

### Tier 2: Board State on Piece Lock (1–3 per second)

When a piece locks, the client sends the full board state (or a delta). This is the authoritative update: the remote renderer replaces its displayed grid with this data. Attack events are sent simultaneously.

The `game:piece_lock` message includes the full grid so the remote side can correct any drift from interpolated piece positions. A full `Grid` (10×40 `Cell[][]`) is several KB as JSON. If bandwidth becomes a concern, delta encoding (only changed rows) or binary encoding can reduce this — but at 1–3 locks per second, the raw JSON payload is within budget for typical broadband connections.

### Tier 3: Match Events (infrequent)

KO resets, topouts, and match end. These are rare and must be reliable and ordered. The server adjudicates timeout results and KO match-end decisions.

### Data Flow

```
Local Player                                          Remote Player
    │                                                      │
    │ piece moves ──▶ game:piece_update ──▶ render         │
    │                  (~20–30 fps)         opponent's      │
    │                                      active piece    │
    │                                                      │
    │ piece locks ──▶ game:piece_lock ────▶ replace         │
    │                 game:attack           opponent's      │
    │                 (on lock)             grid            │
    │                                                      │
    │ ◀── game:attack ─────────────────── piece locks      │
    │     add to local                                     │
    │     pending garbage                                  │
    │                                                      │
    │ next piece locks ──▶ materialize                     │
    │                      pending garbage                 │
```

---

## Garbage Synchronization

Each client tracks garbage independently using its local `GarbageManager`. The flow:

1. Local player clears lines. Local engine emits `ATTACK_SENT`.
2. Local `GarbageManager` runs net cancellation (same logic as local versus).
3. If excess remains, send `game:attack { lines }` to remote.
4. Remote receives `game:attack`, calls `garbageManager.addPending()` for the remote player's side.
5. Remote player's pending garbage materializes after their next piece lock.

Attack events are the **only** garbage-related messages. The pending garbage counter, cancellation logic, and materialization timing all run locally on each client.

---

## Latency Handling

### Acceptable Latency

| Update Type | Tolerance | Reasoning |
|-------------|-----------|-----------|
| Piece position | 30–80 ms | Display-only; opponent's board is observational |
| Attack events | 30–80 ms | Garbage is deferred until next piece lock (~500–1000 ms) |
| Match timer | 100 ms | Server-authoritative; clients sync periodically |
| Room state | 200 ms | Infrequent; human reaction time dominates |

WebSocket relay through a same-region server adds 30–50 ms round-trip. This is within tolerance for all message types.

### Clock Synchronization

The server broadcasts `match:timer_sync` every 10 seconds with the authoritative `remainingMs`. Clients adjust their local countdown to match. The server is the sole authority on match timeout — clients never independently end a match on timer.

### Latency Estimation

The `NetworkAdapter` maintains a rolling average RTT computed from periodic ping/pong messages. This value is available for display in the HUD (optional) and for interpolation tuning.

---

## Disconnection and Reconnection

### Grace Period

When a player disconnects (WebSocket close, network drop, browser tab close), the server holds the room open for 15 seconds. During this window:

- The connected player sees a "Waiting for opponent..." overlay.
- The match timer **continues** (server-authoritative).
- Game messages are buffered by the server (up to a reasonable limit).

### Reconnection

If the disconnected player reconnects within the grace period:

1. Server sends buffered messages.
2. Server sends current `room:state` with updated timer.
3. Play resumes. No board state is lost — each client's engine continued ticking locally during the interruption.

### Forfeit

If the grace period expires without reconnection, the connected player wins by forfeit. The match ends with reason `'disconnect'` (treated as a topout for room score purposes).

---

## MultiplayerSession

`MultiplayerSession` is the online equivalent of `VersusSession`. It owns:

- One local `GameEngine` + `GameRenderer` + `EventBus`
- One `NetworkAdapter` (WebSocket connection)
- One `GarbageManager` (local pending garbage tracking)
- One `GameLoop` (ticks only the local engine)
- Remote board rendering from network snapshots

```typescript
class MultiplayerSession {
  // Setup
  constructor(
    localCanvas: HTMLCanvasElement,
    remoteCanvas: HTMLCanvasElement,
    adapter: NetworkAdapter,
    config: VersusConfig,
  );

  // Lifecycle
  connect(roomCode: string, role: 'host' | 'guest'): Promise<void>;
  start(): void;   // called after match:start received
  destroy(): void;

  // State
  onStateUpdate(callback: (snapshot: MultiplayerSnapshot) => void): void;
  getSnapshot(): MultiplayerSnapshot;
}
```

### MultiplayerSnapshot

```typescript
interface MultiplayerSnapshot {
  local: GameSnapshot;
  remote: RemotePlayerState;
  localPendingGarbage: number;
  remotePendingGarbage: number;
  localKOs: number;
  remoteKOs: number;
  remainingMs: number;
  matchResult: 'playing' | 'win' | 'lose';
  matchEndReason: MatchEndReason | null;
  roomScore: RoomScore;
  opponentConnected: boolean;
}

interface RemotePlayerState {
  grid: Grid;
  activePiece: {
    type: PieceType;
    x: number;
    y: number;
    rotation: RotationState;
  } | null;
  holdPiece: PieceType | null;
  nextQueue: PieceType[];
  score: number;
  linesCleared: number;
  combo: number;
  backToBack: boolean;
}
```

---

## Server Contract

The relay server must implement the following. No specific framework or language is prescribed.

### WebSocket Endpoint

- Accept WebSocket connections at a configured path (e.g., `/ws`).
- Authenticate connections via a simple token or anonymous session ID.
- Support concurrent rooms (at least 100 simultaneous).

### Room Operations

| Operation | Behavior |
|-----------|----------|
| Create | Generate room code, store room state, assign creator as host (slot 0) |
| Join | Look up room by code, assign joiner as guest (slot 1), broadcast `room:state` |
| Ready | Mark player as ready, start countdown when both ready |
| Leave | Remove player from room, notify other, destroy room if empty |

### Message Relay

- Forward all `game:*` messages from one client to the other in the same room.
- Inject `timestamp` (server time in ms) into relayed messages.
- Do not inspect or validate `game:*` payloads beyond basic size limits.

### Match Timer

- Start a server-side countdown when `match:start` is sent.
- Broadcast `match:timer_sync` every 10 seconds.
- Broadcast `match:end` when the timer reaches zero, computing the winner from reported KO counts and scores.

### Reconnection

- On WebSocket close, start a 15-second grace timer.
- Buffer incoming `game:*` messages from the connected player (max 1000 messages or 1 MB).
- On reconnect within grace period: flush buffer, send current `room:state`.
- On grace period expiry: end match, notify connected player.

### Error Codes

| Code | When |
|------|------|
| `ROOM_NOT_FOUND` | Join with invalid room code |
| `ROOM_FULL` | Join when room already has 2 players |
| `NOT_IN_ROOM` | Game message sent without being in a room |
| `OPPONENT_DISCONNECTED` | Grace period expired |

---

## Security Considerations

The server is a relay and does not validate game state. This means a malicious client could send fabricated attacks or board states. For a casual game with room codes shared between friends, this is acceptable. If competitive integrity becomes a requirement, future options include:

- Server-side engine simulation (full authority)
- Replay validation (detect impossible states after the match)
- Statistical anomaly detection (attack rate, piece placement speed)

These are out of scope for the initial implementation.
