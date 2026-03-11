# Online Multiplayer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add online player-vs-player versus mode over WebSocket relay, keeping the existing AI versus mode intact as a separate mode.

**Architecture:** Each client runs one local `GameEngine` and renders the remote opponent's board from network snapshots. A thin WebSocket relay server forwards messages between two players in a room — no server-side game simulation. A `NetworkAdapter` interface abstracts the transport so WebRTC can be swapped in later. `MultiplayerSession` mirrors `VersusSession`'s patterns but replaces `AIController` with network I/O.

**Tech Stack:** WebSocket (native browser API + `ws` on Node), Vite for client, standalone Node server, Vitest for tests. No new client dependencies. Server is a separate package under `server/`.

---

## Task 1: Shared Multiplayer Types

**Files:**
- Create: `src/multiplayer/types.ts`
- Create: `src/multiplayer/index.ts`
- Test: `src/multiplayer/__tests__/types.test.ts`

**Step 1: Write the type definitions**

```typescript
// src/multiplayer/types.ts
import type { PieceType, RotationState, Grid, GameSnapshot, GameMode } from '../engine';

// --- Network adapter abstraction ---

export interface GameMessage {
  type: string;
  payload: unknown;
  timestamp: number;
}

export interface NetworkAdapter {
  connect(roomCode: string, role: 'host' | 'guest'): Promise<void>;
  send(message: GameMessage): void;
  onMessage(handler: (message: GameMessage) => void): void;
  onDisconnect(handler: (reason: string) => void): void;
  disconnect(): void;
  readonly latency: number;
}

// --- Room state ---

export interface PlayerSlot {
  id: string;
  displayName: string;
  ready: boolean;
  connected: boolean;
}

export interface RoomScore {
  player1Wins: number;
  player2Wins: number;
}

export interface VersusConfig {
  gravityLevel: number;
  kosToWin: number;
  matchDurationMs: number;
}

export type RoomStatus = 'waiting' | 'ready' | 'countdown' | 'playing' | 'results';

export interface RoomState {
  roomCode: string;
  players: [PlayerSlot, PlayerSlot | null];
  roomScore: RoomScore;
  status: RoomStatus;
  config: VersusConfig;
}

// --- Game messages ---

export interface PieceUpdatePayload {
  piece: PieceType;
  x: number;
  y: number;
  rotation: RotationState;
}

export interface PieceLockPayload {
  grid: Grid;
  score: number;
  linesCleared: number;
  combo: number;
  backToBack: boolean;
  holdPiece: PieceType | null;
  nextQueue: PieceType[];
}

export interface AttackPayload {
  lines: number;
}

export interface TopoutPayload {
  hasGarbage: boolean;
}

// --- Remote player rendering state ---

export interface RemotePlayerState {
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

// --- Match result ---

export type MatchEndReason = 'knockout' | 'topout' | 'timeout' | 'disconnect';

export interface MatchStats {
  score: number;
  linesCleared: number;
  linesSent: number;
  garbageReceived: number;
  kosAgainst: number;
  piecesPlaced: number;
}

export interface MatchEndResult {
  winner: 0 | 1;
  reason: MatchEndReason;
  roomScore: RoomScore;
  playerStats: [MatchStats, MatchStats];
}

// --- Multiplayer snapshot (pushed to React) ---

export interface MultiplayerSnapshot {
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

// --- Message type constants ---

export const RoomMessageType = {
  CREATE: 'room:create',
  CREATED: 'room:created',
  JOIN: 'room:join',
  READY: 'room:ready',
  LEAVE: 'room:leave',
  STATE: 'room:state',
  ERROR: 'room:error',
  COUNTDOWN: 'room:countdown',
  OPPONENT_LEFT: 'room:opponent_left',
} as const;

export const GameMessageType = {
  PIECE_UPDATE: 'game:piece_update',
  PIECE_LOCK: 'game:piece_lock',
  ATTACK: 'game:attack',
  HOLD: 'game:hold',
  TOPOUT: 'game:topout',
} as const;

export const MatchMessageType = {
  START: 'match:start',
  END: 'match:end',
  TIMER_SYNC: 'match:timer_sync',
} as const;
```

**Step 2: Write the barrel export**

```typescript
// src/multiplayer/index.ts
export type {
  GameMessage,
  NetworkAdapter,
  PlayerSlot,
  RoomScore,
  VersusConfig,
  RoomStatus,
  RoomState,
  PieceUpdatePayload,
  PieceLockPayload,
  AttackPayload,
  TopoutPayload,
  RemotePlayerState,
  MatchEndReason,
  MatchStats,
  MatchEndResult,
  MultiplayerSnapshot,
} from './types';

export {
  RoomMessageType,
  GameMessageType,
  MatchMessageType,
} from './types';
```

**Step 3: Write a basic compile/import test**

```typescript
// src/multiplayer/__tests__/types.test.ts
import { describe, it, expect } from 'vitest';
import {
  RoomMessageType,
  GameMessageType,
  MatchMessageType,
} from '../index';

describe('Multiplayer types', () => {
  it('exports room message type constants', () => {
    expect(RoomMessageType.CREATE).toBe('room:create');
    expect(RoomMessageType.STATE).toBe('room:state');
  });

  it('exports game message type constants', () => {
    expect(GameMessageType.PIECE_UPDATE).toBe('game:piece_update');
    expect(GameMessageType.ATTACK).toBe('game:attack');
  });

  it('exports match message type constants', () => {
    expect(MatchMessageType.START).toBe('match:start');
    expect(MatchMessageType.END).toBe('match:end');
  });
});
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/multiplayer/__tests__/types.test.ts`
Expected: PASS

**Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add src/multiplayer/
git commit -m "feat(multiplayer): add shared type definitions and message constants"
```

---

## Task 2: WebSocketAdapter

**Files:**
- Create: `src/multiplayer/WebSocketAdapter.ts`
- Modify: `src/multiplayer/index.ts` (add export)
- Test: `src/multiplayer/__tests__/WebSocketAdapter.test.ts`

**Context:** Implements the `NetworkAdapter` interface using the browser's native `WebSocket` API. Handles connection, message serialization, disconnect detection, and rolling RTT estimation via ping/pong.

**Step 1: Write failing tests**

```typescript
// src/multiplayer/__tests__/WebSocketAdapter.test.ts
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketAdapter } from '../WebSocketAdapter';
import type { GameMessage } from '../types';

// Mock WebSocket
class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSING = 2;
  readonly CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;

  sent: string[] = [];
  url: string;

  constructor(url: string) {
    this.url = url;
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }

  // Test helpers
  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.(new Event('open'));
  }

  simulateMessage(data: unknown): void {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }));
  }

  simulateClose(code = 1000, reason = ''): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close', { code, reason }));
  }
}

let mockWs: MockWebSocket;

beforeEach(() => {
  vi.stubGlobal('WebSocket', vi.fn((url: string) => {
    mockWs = new MockWebSocket(url);
    return mockWs;
  }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('WebSocketAdapter', () => {
  it('connects to the server and sends join message for host', async () => {
    const adapter = new WebSocketAdapter('ws://localhost:8080');
    const connectPromise = adapter.connect('ABCD', 'host');
    mockWs.simulateOpen();
    mockWs.simulateMessage({ type: 'room:created', payload: { roomCode: 'ABCD' }, timestamp: 0 });
    await connectPromise;
    const sent = JSON.parse(mockWs.sent[0]!);
    expect(sent.type).toBe('room:create');
  });

  it('connects to the server and sends join message for guest', async () => {
    const adapter = new WebSocketAdapter('ws://localhost:8080');
    const connectPromise = adapter.connect('ABCD', 'guest');
    mockWs.simulateOpen();
    mockWs.simulateMessage({ type: 'room:state', payload: {}, timestamp: 0 });
    await connectPromise;
    const sent = JSON.parse(mockWs.sent[0]!);
    expect(sent.type).toBe('room:join');
    expect(sent.payload.roomCode).toBe('ABCD');
  });

  it('sends messages as JSON', () => {
    const adapter = new WebSocketAdapter('ws://localhost:8080');
    const connectPromise = adapter.connect('ABCD', 'host');
    mockWs.simulateOpen();
    mockWs.simulateMessage({ type: 'room:created', payload: {}, timestamp: 0 });

    const msg: GameMessage = { type: 'game:attack', payload: { lines: 4 }, timestamp: Date.now() };
    adapter.send(msg);

    // sent[0] is the room:create, sent[1] is the game:attack
    const parsed = JSON.parse(mockWs.sent[1]!);
    expect(parsed.type).toBe('game:attack');
    expect(parsed.payload).toEqual({ lines: 4 });
  });

  it('calls message handler on incoming messages', async () => {
    const adapter = new WebSocketAdapter('ws://localhost:8080');
    const handler = vi.fn();
    adapter.onMessage(handler);

    const connectPromise = adapter.connect('ABCD', 'host');
    mockWs.simulateOpen();
    mockWs.simulateMessage({ type: 'room:created', payload: {}, timestamp: 0 });
    await connectPromise;

    mockWs.simulateMessage({ type: 'game:piece_update', payload: { piece: 'T', x: 4, y: 25, rotation: 0 }, timestamp: 123 });
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ type: 'game:piece_update' }));
  });

  it('calls disconnect handler on close', async () => {
    const adapter = new WebSocketAdapter('ws://localhost:8080');
    const handler = vi.fn();
    adapter.onDisconnect(handler);

    const connectPromise = adapter.connect('ABCD', 'host');
    mockWs.simulateOpen();
    mockWs.simulateMessage({ type: 'room:created', payload: {}, timestamp: 0 });
    await connectPromise;

    mockWs.simulateClose(1006, 'connection lost');
    expect(handler).toHaveBeenCalledWith('connection lost');
  });

  it('disconnect closes the WebSocket', async () => {
    const adapter = new WebSocketAdapter('ws://localhost:8080');
    const connectPromise = adapter.connect('ABCD', 'host');
    mockWs.simulateOpen();
    mockWs.simulateMessage({ type: 'room:created', payload: {}, timestamp: 0 });
    await connectPromise;

    adapter.disconnect();
    expect(mockWs.readyState).toBe(MockWebSocket.CLOSED);
  });

  it('rejects connect promise on error', async () => {
    const adapter = new WebSocketAdapter('ws://localhost:8080');
    const connectPromise = adapter.connect('ABCD', 'host');
    mockWs.simulateClose(1006, 'failed');
    await expect(connectPromise).rejects.toThrow();
  });

  it('latency starts at 0', () => {
    const adapter = new WebSocketAdapter('ws://localhost:8080');
    expect(adapter.latency).toBe(0);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/multiplayer/__tests__/WebSocketAdapter.test.ts`
Expected: FAIL — `WebSocketAdapter` does not exist

**Step 3: Implement WebSocketAdapter**

The adapter wraps the native `WebSocket`. On `connect()`, it opens the connection, sends either `room:create` (host) or `room:join` (guest), and resolves when the server confirms. All messages are JSON-serialized. A periodic ping measures RTT for the `latency` property.

Key implementation details:
- `connect()` returns a Promise that resolves on first `room:created` or `room:state` message, rejects on close/error before that.
- `send()` serializes to JSON and calls `ws.send()`.
- `onMessage()` stores a handler called for every incoming parsed message.
- `onDisconnect()` stores a handler called on `ws.onclose`.
- `disconnect()` calls `ws.close()`.
- `latency` is a rolling average from ping/pong (updated every 5s during play).

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/multiplayer/__tests__/WebSocketAdapter.test.ts`
Expected: PASS

**Step 5: Update barrel export**

Add `export { WebSocketAdapter } from './WebSocketAdapter';` to `src/multiplayer/index.ts`.

**Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 7: Commit**

```bash
git add src/multiplayer/
git commit -m "feat(multiplayer): implement WebSocketAdapter with connection and message handling"
```

---

## Task 3: RoomManager (client-side room state machine)

**Files:**
- Create: `src/multiplayer/RoomManager.ts`
- Modify: `src/multiplayer/index.ts` (add export)
- Test: `src/multiplayer/__tests__/RoomManager.test.ts`

**Context:** Client-side state machine for room lifecycle. Consumes room messages from `NetworkAdapter`, exposes `RoomState`, and provides methods for room actions (ready, leave). React hooks will subscribe to this rather than parsing raw messages.

**Step 1: Write failing tests**

Tests should cover:
- Creating a room (host flow): sends `room:create`, receives `room:created`, state transitions to `waiting`.
- Joining a room (guest flow): sends `room:join`, receives `room:state`, state transitions to `waiting`.
- Ready up: sends `room:ready`, state reflects readiness after server confirms.
- Both ready → countdown: receives `room:countdown`, state transitions.
- Match start: receives `match:start`, state transitions to `playing`.
- Match end → results: receives `match:end`, state transitions, `roomScore` updated.
- Opponent disconnect: receives `room:opponent_left`, state reflects.
- Leave: sends `room:leave`, cleans up.
- Error handling: `room:error` triggers error callback.

The `RoomManager` should:
- Take a `NetworkAdapter` in its constructor.
- Subscribe to messages via `adapter.onMessage()`.
- Expose `getState(): RoomState | null` and `onStateChange(callback)`.
- Provide `ready()`, `leave()` methods that send messages through the adapter.

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/multiplayer/__tests__/RoomManager.test.ts`
Expected: FAIL

**Step 3: Implement RoomManager**

Key design:
- Internal state machine with transitions driven by incoming messages.
- `onStateChange` callback fires on every state transition.
- `onError` callback for `room:error` messages.
- `onCountdown` callback with `startsAtMs` for countdown UI.
- `onMatchStart` callback when `match:start` received (triggers `MultiplayerSession.start()`).
- `onMatchEnd` callback with `MatchEndResult`.
- Methods: `ready()`, `leave()`, `destroy()`.

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/multiplayer/__tests__/RoomManager.test.ts`
Expected: PASS

**Step 5: Type-check and commit**

```bash
npx tsc --noEmit
git add src/multiplayer/
git commit -m "feat(multiplayer): add RoomManager client-side room state machine"
```

---

## Task 4: MultiplayerSession

**Files:**
- Create: `src/multiplayer/MultiplayerSession.ts`
- Modify: `src/multiplayer/index.ts` (add export)
- Test: `src/multiplayer/__tests__/MultiplayerSession.test.ts`

**Context:** The core online game session. Mirrors `VersusSession` (see `src/game/VersusSession.ts`) but replaces the AI engine with network I/O. Owns one local `GameEngine`, one `GameRenderer` for local board, one `GameRenderer` for remote board (rendering from snapshots), one `GarbageManager`, one `GameLoop`, and one `NetworkAdapter`.

**Step 1: Write failing tests**

Tests should cover:
- **Local engine ticks normally.** Create session with a mock adapter, verify `GameEngine.tick()` is called on game loop tick.
- **Piece updates are sent.** When local engine's `PIECE_MOVED` or `PIECE_ROTATED` fires, `adapter.send()` is called with `game:piece_update`.
- **Piece lock sends board state.** When local `PIECE_LOCKED` fires, `adapter.send()` is called with `game:piece_lock` containing the grid.
- **Attack events are sent.** When local `ATTACK_SENT` fires, net cancellation runs locally, then excess is sent as `game:attack` via adapter.
- **Remote attack received.** When adapter delivers `game:attack`, `garbageManager.addPending()` is called for local side.
- **Remote piece updates update RemotePlayerState.** When adapter delivers `game:piece_update`, the remote display state updates.
- **Remote piece lock updates grid.** When adapter delivers `game:piece_lock`, the remote display grid is replaced.
- **Snapshot includes remote state.** `getSnapshot()` returns a `MultiplayerSnapshot` with both local and remote state.
- **Timer sync.** When adapter delivers `match:timer_sync`, local `remainingMs` adjusts to server value.
- **Topout sends message.** When local `GAME_OVER` fires, `game:topout` is sent via adapter.
- **Remote topout triggers KO/end logic.** When adapter delivers `game:topout`, KO or match-end logic runs (same rules as VersusSession).
- **Disconnect sets opponentConnected=false.** When adapter fires disconnect handler, snapshot reflects it.
- **Destroy cleans up.** Calling `destroy()` stops the loop, detaches keyboard, disconnects adapter.

Use a mock `NetworkAdapter` (implement the interface with `vi.fn()` for all methods) and run the engine without a real canvas (mock `GameRenderer` or use `OffscreenCanvas` if available in jsdom).

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/multiplayer/__tests__/MultiplayerSession.test.ts`
Expected: FAIL

**Step 3: Implement MultiplayerSession**

Follow the `VersusSession` constructor pattern (lines 68-233 of `src/game/VersusSession.ts`):

```typescript
class MultiplayerSession {
  // Owns:
  private localEngine: GameEngine;
  private localRenderer: GameRenderer;
  private remoteRenderer: GameRenderer;
  private localEventBus: EventBus;
  private garbageManager: GarbageManager;
  private adapter: NetworkAdapter;
  private inputMapper: InputMapper;
  private dasManager: DASManager;
  private keyboardManager: KeyboardManager;
  private gameLoop: GameLoop; // single-engine loop, not VersusLoop

  // Remote display state (not a GameEngine):
  private remoteState: RemotePlayerState;

  // Match state:
  private matchResult: 'playing' | 'win' | 'lose' = 'playing';
  private matchEndReason: MatchEndReason | null = null;
  private localKOs = 0;
  private remoteKOs = 0;
  private remainingMs: number;
  private roomScore: RoomScore;
  private opponentConnected = true;

  // Piece update throttle:
  private lastPieceUpdate = 0;
  private static readonly PIECE_UPDATE_INTERVAL_MS = 33; // ~30fps
```

Key differences from `VersusSession`:
1. **No AI engine or controller.** Only one `GameEngine` runs locally.
2. **Remote board is display-only.** `remoteState` is a plain object updated from network messages, rendered by the second `GameRenderer` using a custom draw method.
3. **Piece position broadcasting.** On each tick (after DAS + engine tick), if the active piece changed position since last send and throttle interval elapsed, send `game:piece_update`.
4. **Garbage exchange goes through network.** Local `ATTACK_SENT` → net cancel locally → send excess via `game:attack`. Incoming `game:attack` → `garbageManager.addPending(0, lines)`.
5. **Topout is a network event.** Local `GAME_OVER` → send `game:topout { hasGarbage }`. Remote `game:topout` → evaluate KO/topout using same logic as `VersusSession.handleSideGameOver()`.
6. **Timer is server-authoritative.** Local countdown is displayed, but `match:timer_sync` messages override it. `match:end` from server is the definitive match-over signal.
7. **No pause in online mode.** The PAUSE action is intercepted and ignored.

For rendering the remote board: the second `GameRenderer` needs to accept a `RemotePlayerState` for drawing. The simplest approach is to construct a synthetic `GameSnapshot` from `RemotePlayerState` and pass it to `renderer.draw()`. The renderer already accepts any `GameSnapshot` — only a few fields need defaults (e.g., `isGameOver: false`, `isPaused: false`, `elapsedMs: 0`, `gameMode: GameMode.VERSUS`, `remainingMs: null`, `holdUsed: false`, `lockDelayRemaining: 0`, `moveResetCount: 0`, `lastActionWasRotation: false`, `lastKickIndex: 0`).

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/multiplayer/__tests__/MultiplayerSession.test.ts`
Expected: PASS

**Step 5: Type-check and commit**

```bash
npx tsc --noEmit
git add src/multiplayer/
git commit -m "feat(multiplayer): implement MultiplayerSession with network sync"
```

---

## Task 5: Relay Server

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/src/index.ts`
- Create: `server/src/Room.ts`
- Create: `server/src/RoomManager.ts` (server-side, distinct from client)
- Create: `server/src/generateRoomCode.ts`
- Test: `server/src/__tests__/Room.test.ts`
- Test: `server/src/__tests__/RoomManager.test.ts`
- Test: `server/src/__tests__/generateRoomCode.test.ts`

**Context:** Standalone Node server. Separate package from the client — does not import from `src/`. Uses `ws` library for WebSocket. No game engine simulation. Pure relay + room management + match timer.

**Step 1: Initialize server package**

```json
// server/package.json
{
  "name": "stackdown-server",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "ws": "^8.18.0"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^3.0.0",
    "@types/ws": "^8.5.0"
  }
}
```

```json
// server/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "isolatedModules": true,
    "esModuleInterop": true
  },
  "include": ["src"]
}
```

**Step 2: Write generateRoomCode and tests**

Room codes: 4 uppercase alphanumeric characters, excluding ambiguous `0OIL1`. Pool is 31 chars: `A-Z` minus `O,I,L` + `0-9` minus `0,1` = `ABCDEFGHJKMNPQRSTUVWXYZ2345678` + `9` = 31 chars.

```typescript
// server/src/__tests__/generateRoomCode.test.ts
import { describe, it, expect } from 'vitest';
import { generateRoomCode, ROOM_CODE_CHARS } from '../generateRoomCode';

describe('generateRoomCode', () => {
  it('returns a 4-character string', () => {
    const code = generateRoomCode(new Set());
    expect(code).toHaveLength(4);
  });

  it('contains only allowed characters', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateRoomCode(new Set());
      for (const char of code) {
        expect(ROOM_CODE_CHARS).toContain(char);
      }
    }
  });

  it('does not generate codes already in the existing set', () => {
    const existing = new Set(['ABCD', 'EFGH']);
    const code = generateRoomCode(existing);
    expect(existing.has(code)).toBe(false);
  });
});
```

**Step 3: Write Room class and tests**

`Room` manages two player connections, readiness, countdown, match timer, message relay, and reconnection grace period.

Tests should cover:
- Adding host (slot 0) and guest (slot 1).
- Ready up from both sides triggers countdown.
- Message relay: game message from one player is forwarded to the other.
- Match timer: starts on `match:start`, emits `match:timer_sync` every 10s, emits `match:end` when expired.
- Player disconnect: starts 15s grace timer, sets `connected = false`.
- Reconnection within grace period: flushes buffered messages.
- Grace period expiry: ends match with disconnect reason.
- Room destruction: when both players leave.

**Step 4: Write server-side RoomManager and tests**

Manages a `Map<string, Room>`. Methods: `createRoom(ws) → roomCode`, `joinRoom(ws, roomCode)`, `handleDisconnect(ws)`. Tests verify room creation, joining, and cleanup.

**Step 5: Write server entry point**

```typescript
// server/src/index.ts
import { WebSocketServer } from 'ws';
import { ServerRoomManager } from './RoomManager';

const PORT = parseInt(process.env.PORT ?? '8080', 10);
const wss = new WebSocketServer({ port: PORT });
const roomManager = new ServerRoomManager();

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    roomManager.handleMessage(ws, message);
  });

  ws.on('close', () => {
    roomManager.handleDisconnect(ws);
  });
});

console.log(`Stackdown server listening on port ${PORT}`);
```

**Step 6: Install deps, run tests, type-check**

```bash
cd server && npm install
npm test
npx tsc --noEmit
```

**Step 7: Commit**

```bash
git add server/
git commit -m "feat(server): add WebSocket relay server with room management"
```

---

## Task 6: Online Lobby Screen (Create/Join Room UI)

**Files:**
- Create: `src/ui/OnlineLobbyScreen.tsx`
- Modify: `src/App.tsx` (add screen to router)
- Modify: `src/App.tsx` (add `Screen` type union member)

**Context:** New screen accessible from mode select. Two options: "Create Room" (generates code, shows waiting screen) or "Join Room" (text input for room code). Uses `useMenuNavigation` hook for keyboard nav (same pattern as `VersusPreMatchScreen.tsx`).

**Step 1: Add screen types to App.tsx**

Add `'online-lobby' | 'online-prematch' | 'online-versus'` to the `Screen` type union.

**Step 2: Implement OnlineLobbyScreen**

Props:
```typescript
interface OnlineLobbyScreenProps {
  onCreateRoom: (config: VersusConfig) => void;
  onJoinRoom: (roomCode: string) => void;
  onBack: () => void;
}
```

Layout:
- Title: "ONLINE VERSUS"
- Config sliders: gravity level (1-15), KOs to win (1-10) — same as `VersusPreMatchScreen`.
- "CREATE ROOM" button → calls `onCreateRoom(config)`.
- Text input for room code (4 chars, uppercase, auto-focused).
- "JOIN ROOM" button → calls `onJoinRoom(roomCode)`.
- "BACK" button.

Follow the styling pattern of `VersusPreMatchScreen.tsx` (inline styles, same color scheme).

**Step 3: Commit**

```bash
git add src/ui/OnlineLobbyScreen.tsx src/App.tsx
git commit -m "feat(ui): add online lobby screen with create/join room"
```

---

## Task 7: Online Waiting Room Screen

**Files:**
- Create: `src/ui/OnlineWaitingScreen.tsx`
- Modify: `src/App.tsx` (add routing)

**Context:** Shown after creating or joining a room. Displays room code prominently (for sharing), player slots, ready buttons, room score (for rematches), and countdown.

**Step 1: Implement OnlineWaitingScreen**

Props:
```typescript
interface OnlineWaitingScreenProps {
  roomState: RoomState;
  isHost: boolean;
  onReady: () => void;
  onLeave: () => void;
}
```

Layout:
- Room code displayed large (e.g., "Room: A3K7") with copy-to-clipboard.
- Two player slots showing display name, ready status (green check / gray dash).
- "Waiting for opponent..." if only one player connected.
- Room score (`player1Wins - player2Wins`) shown if any wins > 0.
- "READY" button (disabled if already ready).
- "LEAVE" button.
- Countdown overlay (3-2-1) when both ready and `status === 'countdown'`.

**Step 2: Commit**

```bash
git add src/ui/OnlineWaitingScreen.tsx src/App.tsx
git commit -m "feat(ui): add online waiting room screen with room code and ready state"
```

---

## Task 8: Online Versus Screen

**Files:**
- Create: `src/ui/OnlineVersusScreen.tsx`
- Create: `src/ui/useMultiplayerSession.ts`
- Modify: `src/App.tsx` (add routing)

**Context:** The in-game screen for online versus. Nearly identical to `VersusScreen.tsx` but uses `MultiplayerSession` instead of `VersusSession`. No pause button. Shows opponent connection status.

**Step 1: Write useMultiplayerSession hook**

Follow the pattern of `useVersusSession.ts` (lines 32-129 of `src/ui/useVersusSession.ts`):

```typescript
export function useMultiplayerSession(
  localCanvasRef: React.RefObject<HTMLCanvasElement | null>,
  remoteCanvasRef: React.RefObject<HTMLCanvasElement | null>,
  adapter: NetworkAdapter,
  config: VersusConfig,
  onMatchEnd?: (result: 'win' | 'lose') => void,
)
```

Key differences from `useVersusSession`:
- Takes `NetworkAdapter` instead of `aiLevel`.
- Creates `MultiplayerSession` instead of `VersusSession`.
- No `aiLevel` or `versusKey` dependency.
- Flattens `MultiplayerSnapshot` into a `MultiplayerUIState` for React consumption.
- Returns `{ gameState, sessionRef, resizeLocal, resizeRemote }`.

**Step 2: Implement OnlineVersusScreen**

Follow `VersusScreen.tsx` layout:
- Two canvases side-by-side (local left, remote right).
- HUD panels on each side (reuse `VersusHUDLeft` / `VersusHUDRight`).
- Timer display at top.
- "Opponent disconnected — waiting for reconnection..." overlay when `!opponentConnected`.
- `VersusGameOverOverlay` on match end (reuse, but adapt props for `MultiplayerSnapshot`).
- Post-match: "REMATCH" returns to waiting room, "LEAVE" returns to menu.

**Step 3: Wire up App.tsx routing**

Screen flow:
```
menu → mode-select → online-lobby → online-prematch (waiting room) → online-versus
                                                    ↑                      │
                                                    └── rematch ───────────┘
```

App-level state needed:
- `roomCode: string`
- `isHost: boolean`
- `adapter: NetworkAdapter | null` (created on create/join, destroyed on leave)
- `roomState: RoomState | null`
- `roomManager: RoomManager | null`

**Step 4: Commit**

```bash
git add src/ui/OnlineVersusScreen.tsx src/ui/useMultiplayerSession.ts src/App.tsx
git commit -m "feat(ui): add online versus screen with multiplayer session hook"
```

---

## Task 9: Mode Select Integration

**Files:**
- Modify: `src/ui/ModeSelectScreen.tsx` (add "Online Versus" option)
- Modify: `src/App.tsx` (route mode-select → online-lobby)

**Context:** Add "Online Versus" as a third mode option on the mode select screen, alongside Marathon, Practice, and AI Versus.

**Step 1: Add "ONLINE" button to ModeSelectScreen**

Follow existing button pattern. New button labeled "ONLINE" or "ONLINE VS" navigates to the online lobby screen.

**Step 2: Update App.tsx routing**

`mode-select` → "ONLINE" → `setScreen('online-lobby')`.

**Step 3: Commit**

```bash
git add src/ui/ModeSelectScreen.tsx src/App.tsx
git commit -m "feat(ui): add online versus option to mode select screen"
```

---

## Task 10: Remote Board Rendering

**Files:**
- Modify: `src/renderer/GameRenderer.ts` (add method or overload for remote state)
- Test: `src/renderer/__tests__/GameRenderer.test.ts` (if feasible with OffscreenCanvas)

**Context:** The remote player's board needs to render from `RemotePlayerState`, not a full `GameSnapshot`. The cleanest approach is a helper that converts `RemotePlayerState` into a synthetic `GameSnapshot` with default values for fields the renderer needs but the remote state doesn't provide.

**Step 1: Create a conversion helper**

```typescript
// src/multiplayer/remoteToSnapshot.ts
import type { GameSnapshot, GameMode } from '../engine';
import type { RemotePlayerState } from './types';

export function remoteToSnapshot(remote: RemotePlayerState): GameSnapshot {
  return {
    grid: remote.grid,
    activePiece: remote.activePiece
      ? {
          type: remote.activePiece.type,
          position: { x: remote.activePiece.x, y: remote.activePiece.y },
          rotation: remote.activePiece.rotation,
          lockDelayRemaining: 0,
          moveResetCount: 0,
          lastActionWasRotation: false,
          lastKickIndex: 0,
        }
      : null,
    holdPiece: remote.holdPiece,
    holdUsed: false,
    nextQueue: remote.nextQueue,
    score: remote.score,
    level: 1,
    linesCleared: remote.linesCleared,
    combo: remote.combo,
    backToBack: remote.backToBack,
    isGameOver: false,
    isPaused: false,
    elapsedMs: 0,
    gameMode: GameMode.VERSUS,
    remainingMs: null,
  };
}
```

**Step 2: Write tests**

```typescript
// src/multiplayer/__tests__/remoteToSnapshot.test.ts
import { describe, it, expect } from 'vitest';
import { remoteToSnapshot } from '../remoteToSnapshot';
import { PieceType, RotationState } from '../../engine';

describe('remoteToSnapshot', () => {
  it('converts RemotePlayerState to a valid GameSnapshot', () => {
    const remote = {
      grid: Array.from({ length: 40 }, () => Array(10).fill(null)),
      activePiece: { type: PieceType.T, x: 4, y: 25, rotation: RotationState.SPAWN },
      holdPiece: PieceType.I,
      nextQueue: [PieceType.S, PieceType.Z, PieceType.L, PieceType.J, PieceType.O],
      score: 1500,
      linesCleared: 10,
      combo: 3,
      backToBack: true,
    };
    const snapshot = remoteToSnapshot(remote);
    expect(snapshot.grid).toBe(remote.grid);
    expect(snapshot.activePiece?.type).toBe(PieceType.T);
    expect(snapshot.activePiece?.position).toEqual({ x: 4, y: 25 });
    expect(snapshot.holdPiece).toBe(PieceType.I);
    expect(snapshot.score).toBe(1500);
    expect(snapshot.isGameOver).toBe(false);
  });

  it('handles null active piece', () => {
    const remote = {
      grid: Array.from({ length: 40 }, () => Array(10).fill(null)),
      activePiece: null,
      holdPiece: null,
      nextQueue: [],
      score: 0,
      linesCleared: 0,
      combo: -1,
      backToBack: false,
    };
    const snapshot = remoteToSnapshot(remote);
    expect(snapshot.activePiece).toBeNull();
  });
});
```

**Step 3: Run tests**

Run: `npx vitest run src/multiplayer/__tests__/remoteToSnapshot.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/multiplayer/remoteToSnapshot.ts src/multiplayer/__tests__/remoteToSnapshot.test.ts src/multiplayer/index.ts
git commit -m "feat(multiplayer): add remoteToSnapshot conversion for remote board rendering"
```

---

## Task 11: End-to-End Integration Test

**Files:**
- Test: `src/multiplayer/__tests__/integration.test.ts`

**Context:** Integration test that wires up two `MultiplayerSession` instances connected through a mock relay (in-memory message passing, no real WebSocket). Verifies the full game flow: both engines tick, piece updates flow, attack events cause garbage, KO logic works across the network boundary.

**Step 1: Create a MockNetworkAdapter pair**

```typescript
// Create two mock adapters that relay messages to each other
function createLinkedAdapters(): [NetworkAdapter, NetworkAdapter] {
  // Messages sent by adapter A are received by adapter B, and vice versa
}
```

**Step 2: Write integration test**

- Create two `MultiplayerSession` instances with linked adapters.
- Tick both sessions' game loops manually.
- Verify piece updates from session A appear in session B's remote state.
- Simulate a quad clear on session A, verify attack message arrives at session B.
- Verify garbage pending increments on session B.

**Step 3: Run test**

Run: `npx vitest run src/multiplayer/__tests__/integration.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/multiplayer/__tests__/integration.test.ts
git commit -m "test(multiplayer): add end-to-end integration test with linked mock adapters"
```

---

## Task 12: Server Integration Test

**Files:**
- Test: `server/src/__tests__/integration.test.ts`

**Context:** End-to-end server test. Starts the server on a random port, connects two WebSocket clients, creates/joins a room, readies up, verifies countdown and message relay, then cleans up.

**Step 1: Write integration test**

- Start `WebSocketServer` on port 0 (random available port).
- Client A sends `room:create`, receives `room:created` with a code.
- Client B sends `room:join` with the code, both receive `room:state`.
- Both send `room:ready`, both receive `room:countdown`.
- After countdown, client A sends `game:attack { lines: 4 }`, client B receives it.
- Cleanup: close both clients, close server.

**Step 2: Run test**

Run: `cd server && npm test`
Expected: PASS

**Step 3: Commit**

```bash
git add server/src/__tests__/integration.test.ts
git commit -m "test(server): add end-to-end integration test for room lifecycle and message relay"
```

---

## Task 13: Stats and XP Integration

**Files:**
- Modify: `src/ui/OnlineVersusScreen.tsx` (hook up `StatsTracker`)

**Context:** Online matches should record game stats and award XP, same as AI versus. Follow the pattern in `VersusScreen.tsx` lines 66-92.

**Step 1: Hook up StatsTracker**

Same `useEffect` pattern as `VersusScreen.tsx`:
- Create `StatsTracker(session.getLocalEventBus())` when session is created.
- Record game stats on match end via `recordGame()`.
- Record incomplete stats on quit.
- Destroy tracker on cleanup.

**Step 2: Commit**

```bash
git add src/ui/OnlineVersusScreen.tsx
git commit -m "feat(multiplayer): integrate stats tracking and XP for online matches"
```

---

## Task 14: Documentation Updates

**Files:**
- Modify: `CLAUDE.md` (add multiplayer key files, update mode description)
- Modify: `docs/project/ARCHITECTURE.md` (add online multiplayer to system diagram and data flow)

**Step 1: Update CLAUDE.md**

Add to the key source files table:

| Area | Key files |
|------|-----------|
| Multiplayer types | `src/multiplayer/types.ts` |
| Network adapter | `src/multiplayer/WebSocketAdapter.ts` |
| Room management | `src/multiplayer/RoomManager.ts` |
| Online session | `src/multiplayer/MultiplayerSession.ts` |
| Relay server | `server/src/index.ts`, `server/src/Room.ts` |
| Online UI | `src/ui/OnlineLobbyScreen.tsx`, `src/ui/OnlineWaitingScreen.tsx`, `src/ui/OnlineVersusScreen.tsx` |

Update the opening description to mention online versus mode.

**Step 2: Update ARCHITECTURE.md**

Add online multiplayer to the system diagram, data flow section, and project structure tree. Add a section describing the network layer.

**Step 3: Commit**

```bash
git add CLAUDE.md docs/project/ARCHITECTURE.md
git commit -m "docs: update architecture and project docs for online multiplayer"
```

---

## Task Dependency Graph

```
Task 1 (types)
  ├──▶ Task 2 (WebSocketAdapter)
  │      └──▶ Task 3 (RoomManager)
  │             └──▶ Task 6 (lobby screen)
  │                    └──▶ Task 7 (waiting screen)
  │                           └──▶ Task 9 (mode select)
  ├──▶ Task 4 (MultiplayerSession)
  │      ├──▶ Task 8 (online versus screen)
  │      │      └──▶ Task 13 (stats/XP)
  │      ├──▶ Task 10 (remote rendering)
  │      └──▶ Task 11 (integration test)
  ├──▶ Task 5 (server)
  │      └──▶ Task 12 (server integration test)
  └──▶ Task 14 (docs) — after all others
```

Tasks 2, 4, and 5 can run in parallel after Task 1.
Tasks 6-7-9 can run in parallel with Tasks 8, 10, 11.
Task 14 runs last.
