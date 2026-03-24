# Cloud Stats, Leaderboards & Friends

Cloud-based player stats with cross-device sync, global and friends leaderboards, and game history. Extends the multiplayer relay server with REST endpoints and a SQLite database.

---

## Auth Model

Three identity fields:

- **Username** — unique, used for login. 3–20 characters, alphanumeric and underscores only. Not displayed publicly.
- **Display name** — cosmetic, shown on leaderboards and in matches. 1–20 characters, any printable characters. Duplicates allowed.
- **Passphrase** — secret, used with username for login. Minimum 8 characters. Stored as `bcrypt` hash.

A **friend code** (6 alphanumeric characters, excluding ambiguous chars `0OI1L`) is auto-generated on registration.

### Anonymous Play

Gameplay does not require an account. Without login, game records are stored in IndexedDB with no sync. If a player later registers, they can trigger a one-time "claim" that uploads all existing local records to the new account.

### Endpoints

| Endpoint | Method | Payload | Returns |
|----------|--------|---------|---------|
| `/auth/register` | POST | `{ username, displayName, passphrase }` | `{ token, profile }` |
| `/auth/login` | POST | `{ username, passphrase }` | `{ token, profile }` |

`profile` contains `{ id, username, displayName, friendCode }`.

### Token Lifecycle

Session token is a JWT with a 7-day TTL, stored in localStorage, sent as `Authorization: Bearer <token>`. No refresh endpoint — when a token expires, the client continues in offline/anonymous mode and prompts re-login on the next sync attempt. Game records continue accumulating locally and sync on next successful login.

### Error Codes

| Code | When |
|------|------|
| `USERNAME_TAKEN` | Registration with an existing username |
| `INVALID_CREDENTIALS` | Login with wrong username or passphrase |
| `VALIDATION_ERROR` | Username/display name/passphrase fails validation rules |

---

## Types

### Wire Type (sent to/from server)

```typescript
/** Sent over the network — no client bookkeeping fields. */
interface GameRecord {
  id: string;                                    // UUID, generated client-side
  mode: 'marathon' | 'practice' | 'versus';
  timestamp: number;                             // Date.now() at game end
  stats: GameStats;                              // existing type
  versusResult: 'win' | 'lose' | null;
}
```

### Storage Type (IndexedDB)

```typescript
/** GameRecord plus local sync state. */
interface StoredGameRecord extends GameRecord {
  syncedAt: number | null;                       // null = not yet synced
}
```

---

## Client-Side Storage (IndexedDB)

No localStorage for stats. No migration from existing localStorage data.

### Object Stores

**`gameRecords`** — Append-only. One entry per completed game. Key path: `id`.

Indexes: `[mode, timestamp]`, `syncedAt`.

**`derivedStats`** — Cached aggregates per mode. Key path: `mode`. Four entries: `"marathon"`, `"practice"`, `"versus"`, `"all"`. Same shape as `LifetimeModeStat`. Updated incrementally when records are added (from local play or sync). Avoids scanning all records on stats screen open.

For additive fields (`totalScore`, `linesCleared`, etc.), increment the cached value. For max fields (`highScore`, `maxCombo`), take the max of the cached value and the new record. If the cache becomes corrupt or out of sync, a full recompute is available by scanning all `gameRecords` — the client should expose a repair path (e.g., triggered on schema migration or manually from settings).

---

## Sync Protocol

### Design Principle

Event-sourced. Game records are immutable and identified by UUID. Two devices cannot produce the same game. Sync is purely additive — merge = union of records. No conflict resolution needed.

### Triggers

- **App open** — push unsynced records, pull missing records from other devices.
- **After each game ends** — push the new record.
- **`navigator.onLine` fires** after being offline — flush unsynced records.
- **Active WebSocket session** — piggyback on the multiplayer connection instead of REST.

### REST Sync

`POST /stats/sync`

Request:
```typescript
{
  records: GameRecord[];   // unsynced records (syncedAt === null)
  since: number;           // server-assigned timestamp of last received record (0 for full sync)
}
```

Response:
```typescript
{
  records: GameRecord[];   // records from other devices newer than `since`
  serverTimestamp: number;  // use as `since` on the next sync
}
```

The `since` value is a **server-assigned timestamp** (from `game_records.created_at`), not the client's `Date.now()`. This eliminates clock skew issues — the server is the sole authority on ordering.

For the initial sync on a new device, `since: 0` pulls all records. If the response is large, the server may paginate (return a partial batch with `serverTimestamp` pointing to the cutoff; client calls again with the new `since` until the response is empty).

After sync, client sets `syncedAt` on all pushed records and stores any received records in IndexedDB. Derived stats are incrementally updated.

### WebSocket Piggyback

When a multiplayer WebSocket session is active, stats sync uses the existing connection. All `stats:*` messages conform to the `GameMessage` envelope from MULTIPLAYER.md. The server handles `stats:*` messages directly — they are **not** relayed to the other room participant.

| Type | Direction | Payload |
|------|-----------|---------|
| `stats:push` | client → server | `{ records: GameRecord[] }` |
| `stats:pull` | client → server | `{ since: number }` |
| `stats:update` | server → client | `{ records: GameRecord[], serverTimestamp: number }` |

Behavior:
- On WebSocket connect (room join), flush unsynced records via `stats:push`.
- After a versus match ends, push the game record via `stats:push`.
- Server responds to `stats:push` and `stats:pull` with `stats:update` containing records from other devices.
- When no WebSocket is active, sync falls back to REST.

The client sync service abstracts this — it checks for an active WebSocket and routes accordingly. IndexedDB logic and `syncedAt` bookkeeping are identical either way.

---

## Server-Side

### Database (SQLite)

Added to the existing multiplayer relay server. If scale demands it later, migrate to Postgres — queries are simple enough that schema changes are minimal.

**Tables:**

```sql
players
  id              TEXT PRIMARY KEY
  username        TEXT UNIQUE NOT NULL
  display_name    TEXT NOT NULL
  friend_code     TEXT UNIQUE NOT NULL
  passphrase_hash TEXT NOT NULL
  created_at      INTEGER NOT NULL

game_records
  id              TEXT PRIMARY KEY        -- UUID from client
  player_id       TEXT NOT NULL REFERENCES players(id)
  mode            TEXT NOT NULL
  timestamp       INTEGER NOT NULL        -- client timestamp (for display)
  stats           TEXT NOT NULL            -- JSON blob
  versus_result   TEXT                     -- 'win', 'lose', or NULL
  created_at      INTEGER NOT NULL        -- server timestamp (for sync ordering)

friendships
  player_id       TEXT NOT NULL REFERENCES players(id)
  friend_id       TEXT NOT NULL REFERENCES players(id)
  created_at      INTEGER NOT NULL
  PRIMARY KEY (player_id, friend_id)

friend_requests
  id              TEXT PRIMARY KEY
  from_player_id  TEXT NOT NULL REFERENCES players(id)
  to_player_id    TEXT NOT NULL REFERENCES players(id)  -- resolved from friend code at creation
  status          TEXT NOT NULL DEFAULT 'pending'  -- pending, accepted, rejected
  created_at      INTEGER NOT NULL
  UNIQUE (from_player_id, to_player_id)            -- prevent duplicate requests
```

`friendships` is bidirectional — accepting a request inserts two rows `(A, B)` and `(B, A)`.

**Indexes:**

```sql
-- Leaderboard: WHERE mode = ? GROUP BY player_id
CREATE INDEX idx_game_records_mode_player ON game_records(mode, player_id);

-- Sync pull: WHERE player_id = ? AND created_at > ?
CREATE INDEX idx_game_records_player_created ON game_records(player_id, created_at);
```

### REST Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/auth/register` | POST | Create account |
| `/auth/login` | POST | Login, returns token + profile |
| `/stats/sync` | POST | Push unsynced records, pull missing records |
| `/leaderboard/:mode` | GET | Global top N for a mode |
| `/leaderboard/:mode/friends` | GET | Friends-only leaderboard (authenticated) |
| `/friends` | GET | List accepted friends |
| `/friends/request` | POST | Send friend request by friend code |
| `/friends/request/:id` | PATCH | Accept or reject a request |
| `/friends/:friendId` | DELETE | Remove a friend |
| `/friends/requests` | GET | List pending incoming requests |
| `/games` | GET | Paginated game history (own records) |

### Error Codes

| Code | When |
|------|------|
| `PLAYER_NOT_FOUND` | Friend request sent to a non-existent friend code |
| `ALREADY_FRIENDS` | Friend request to an existing friend |
| `REQUEST_EXISTS` | Duplicate pending friend request |
| `SELF_REQUEST` | Friend request to own friend code |

### Rate Limits

Enforced in-memory using a sliding window counter per key (player ID or IP). State resets on server restart, which is acceptable for a single-process relay server. If the server scales to multiple instances, swap to Redis.

- `POST /friends/request` — max 10 per hour per player. Max 20 outstanding sent requests.
- `POST /stats/sync` — max 60 per hour per player.
- `POST /auth/register` — max 5 per hour per IP.
- `POST /auth/login` — max 20 per hour per IP.

Rate-limited requests return `429 Too Many Requests` with a `Retry-After` header (seconds until the window resets).

### Leaderboards

Derived queries over `game_records`. Not materialized — computed on read.

**Marathon & Practice:** Ranked by best score.

```sql
SELECT player_id, MAX(json_extract(stats, '$.score')) as best_score
FROM game_records WHERE mode = ?
GROUP BY player_id ORDER BY best_score DESC LIMIT N
```

**Versus:** Ranked by win count.

```sql
SELECT player_id, COUNT(*) as wins
FROM game_records WHERE mode = 'versus' AND versus_result = 'win'
GROUP BY player_id ORDER BY wins DESC LIMIT N
```

**Friends:** Same queries with `WHERE player_id IN (SELECT friend_id FROM friendships WHERE player_id = ?)` filter.

Joined with `players` for display names.

---

## Friends System

### Friend Codes

6 alphanumeric characters, excluding ambiguous chars (`0`, `O`, `I`, `1`, `L`). Same character set as room codes. ~887M possible codes.

### Flow

1. Player enters a friend code in the UI.
2. `POST /friends/request { friendCode }` — server resolves the code to a `player_id`, validates (not self, not already friends, no existing request), creates a pending request.
3. Recipient sees the request on next app open (`GET /friends/requests`) or via WebSocket push (`friends:request_received`) if online.
4. Recipient accepts or rejects: `PATCH /friends/request/:id { status: 'accepted' }`.
5. On accept, server inserts two rows into `friendships`. Rejected requests are kept for dedup (the unique constraint prevents re-sending).

### Scope

Friends are used solely for filtering leaderboards. No chat, no invites, no presence.

---

## UI

### Game History Screen

Accessible from stats screen or main menu.

- Paginated list of past games, newest first.
- Each entry shows: mode, date, score, lines cleared, level, duration, versus result.
- Expanding an entry shows full `GameStats` breakdown (t-spins, combos, back-to-backs, etc.).
- Filter by mode: All / Marathon / Practice / Versus.
- Data sourced from IndexedDB — no network call needed.

### Leaderboard Screen

Accessible from main menu.

- Tabs: Global / Friends.
- Sub-tabs per mode: Marathon / Practice / Versus.
- Marathon/Practice: shows rank, display name, best score.
- Versus: shows rank, display name, win count.
- Friends tab only visible when logged in with friends.
- Data fetched from `/leaderboard/:mode` and `/leaderboard/:mode/friends`.

### Friends Screen

Accessible from main menu or settings.

- Player's own friend code (prominent, copyable).
- Input field to add a friend by code.
- Pending incoming requests with accept/reject actions.
- Friends list with display names and remove option.
