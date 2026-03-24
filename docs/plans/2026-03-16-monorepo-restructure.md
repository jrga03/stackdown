# Monorepo Restructure Plan

**Goal:** Convert the current single-package frontend project into a lightweight monorepo using npm workspaces, enabling a shared server package for online multiplayer and cloud stats while keeping the frontend and server builds independent.

**Motivation:** The multiplayer relay server (MULTIPLAYER.md) and cloud stats backend (cloud-stats-design.md) share one Node.js server process. This server has completely different dependencies (ws, better-sqlite3, bcrypt, jsonwebtoken, an HTTP framework) and a different runtime/build/deploy target than the Vite+React client. A monorepo with workspaces gives clean dependency separation, proper shared type imports, and independent deploy pipelines — without the overhead of Turborepo or Nx.

---

## Target Structure

```
stackdown/
├── package.json                  ← workspace root (no app code)
├── tsconfig.base.json            ← shared TS compiler options
├── .gitignore                    ← updated for all packages
├── .nvmrc                        ← stays at root
├── docs/                         ← unchanged, stays at root
│   ├── game/
│   ├── multiplayer/
│   ├── plans/
│   └── project/
├── CLAUDE.md                     ← updated with new paths
│
├── packages/
│   ├── client/                   ← current frontend (moved from root)
│   │   ├── package.json          ← "name": "@stackdown/client"
│   │   ├── tsconfig.json         ← extends ../../tsconfig.base.json
│   │   ├── vite.config.ts
│   │   ├── index.html
│   │   ├── public/
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx
│   │       ├── engine/
│   │       ├── renderer/
│   │       ├── input/
│   │       ├── game/
│   │       ├── stats/
│   │       ├── ui/
│   │       ├── hooks/
│   │       ├── audio/
│   │       ├── multiplayer/      ← client-side networking (WebSocketAdapter, RoomManager, MultiplayerSession)
│   │       └── utils/
│   │
│   ├── server/                   ← new Node.js backend
│   │   ├── package.json          ← "name": "@stackdown/server"
│   │   ├── tsconfig.json         ← extends ../../tsconfig.base.json
│   │   └── src/
│   │       ├── index.ts          ← entry point (WebSocket + HTTP)
│   │       ├── rooms/            ← room management, relay, match timer
│   │       ├── auth/             ← registration, login, JWT
│   │       ├── stats/            ← sync, leaderboards, game history
│   │       ├── friends/          ← friend requests, friendships
│   │       ├── db/               ← SQLite schema, migrations, queries
│   │       ├── middleware/        ← auth middleware, rate limiting
│   │       └── __tests__/
│   │
│   └── shared/                   ← types and constants used by both client and server
│       ├── package.json          ← "name": "@stackdown/shared"
│       ├── tsconfig.json         ← extends ../../tsconfig.base.json
│       └── src/
│           ├── index.ts          ← barrel export
│           ├── messages.ts       ← GameMessage, room/game/match/stats message types and constants
│           ├── stats.ts          ← GameStats, GameRecord wire types
│           ├── room.ts           ← RoomState, PlayerSlot, RoomScore, VersusConfig
│           ├── match.ts          ← MatchEndResult, MatchStats, MatchEndReason
│           ├── friends.ts        ← friend request/response types
│           ├── auth.ts           ← login/register request/response types
│           └── validation.ts     ← shared validation rules (username, display name, room code, friend code character sets)
```

---

## What Goes in Shared

The `@stackdown/shared` package contains **only types and constants** used by both client and server. No runtime code with complex dependencies. No game engine logic.

| Category | Contents | Used by |
|----------|----------|---------|
| Message protocol | `GameMessage`, `RoomMessageType`, `GameMessageType`, `MatchMessageType`, `StatsMessageType`, all payload interfaces | Client (WebSocketAdapter), Server (relay + stats handler) |
| Room types | `RoomState`, `PlayerSlot`, `RoomScore`, `VersusConfig`, `RoomStatus` | Client (RoomManager, UI), Server (Room) |
| Match types | `MatchEndResult`, `MatchStats`, `MatchEndReason` | Client (MultiplayerSession), Server (match timer) |
| Stats types | `GameStats` (wire format), `GameRecord` | Client (sync service, StatsTracker), Server (stats endpoints) |
| Auth types | `RegisterRequest`, `LoginRequest`, `AuthResponse`, `Profile` | Client (auth service), Server (auth endpoints) |
| Friends types | `FriendRequest`, `Friendship`, friend endpoint payloads | Client (friends UI), Server (friends endpoints) |
| Validation | Username regex, display name rules, room code charset, friend code charset | Client (form validation), Server (input validation) |

### GameStats: shared or client?

`GameStats` (currently in `src/stats/types.ts`) is a plain data interface with no dependencies — just numbers and booleans. The cloud stats design uses it as the wire type inside `GameRecord.stats`. The server stores it as a JSON blob and reads fields for leaderboard queries (`json_extract(stats, '$.score')`).

This makes it a shared type. Move `GameStats` to `@stackdown/shared/src/stats.ts` and have both client and server import it from there. The client's `src/stats/types.ts` re-exports it for convenience or imports it directly. `LifetimeModeStat` and `StoredStats` stay client-side — they're IndexedDB/localStorage shapes that the server never touches.

### What stays client-only

Engine types (`PieceType`, `RotationState`, `Grid`, `GameSnapshot`, etc.) remain in `packages/client/src/engine/types.ts`. The server never imports engine internals — it treats game state as opaque JSON.

`LifetimeModeStat`, `StoredStats` — client-side derived/cached stats shapes.

### What stays server-only

Database schemas, SQL queries, bcrypt hashing, JWT signing, rate limiter state. None of this is shared.

---

## Workspace Configuration

### Root package.json

```json
{
  "name": "stackdown",
  "private": true,
  "workspaces": [
    "packages/shared",
    "packages/client",
    "packages/server"
  ],
  "scripts": {
    "dev": "npm run dev -w @stackdown/client",
    "dev:server": "npm run dev -w @stackdown/server",
    "build": "npm run build -w @stackdown/shared && npm run build -w @stackdown/client && npm run build -w @stackdown/server",
    "build:shared": "npm run build -w @stackdown/shared",
    "test": "npm run test -w @stackdown/client && npm run test -w @stackdown/server",
    "typecheck": "npm run typecheck -w @stackdown/shared && npm run typecheck -w @stackdown/client && npm run typecheck -w @stackdown/server"
  }
}
```

Build order matters: `shared` must build first since both `client` and `server` depend on it. npm workspaces handles dependency hoisting — `@stackdown/shared` is symlinked into each consumer's `node_modules`.

For day-to-day dev, `npm run dev` and `npm run dev:server` are run in **separate terminals**. No need for `concurrently` — they're independent processes.

### tsconfig.base.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  }
}
```

Each package extends this and adds its own options:

**Client** (`packages/client/tsconfig.json`):
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "useDefineForClassFields": true,
    "allowImportingTsExtensions": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

**Server** (`packages/server/tsconfig.json`):
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src"]
}
```

**Shared** (`packages/shared/tsconfig.json`):
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src"]
}
```

### Key tsconfig gotcha

The current project uses `allowImportingTsExtensions: true` with `noEmit: true`. This is a **Vite-specific combo** — Vite handles the actual compilation, so TypeScript only type-checks. The server and shared packages need to emit compiled JS and declarations, so they **cannot** use `allowImportingTsExtensions`. This means the server and shared packages must use extensionless imports (`import { Foo } from './bar'`), which is fine — it's the standard Node convention.

The client can keep `allowImportingTsExtensions` if it currently uses `.ts` extensions in imports, or drop it if it doesn't (check existing imports to decide during migration).

---

## Dependencies by Package

| Package | Runtime deps | Dev deps |
|---------|-------------|----------|
| `@stackdown/shared` | _(none)_ | typescript |
| `@stackdown/client` | react, react-dom, tailwindcss, @tailwindcss/vite, comlink, `@stackdown/shared` | vite, @vitejs/plugin-react, vite-plugin-comlink, babel-plugin-react-compiler, typescript, vitest, jsdom, @types/react, @types/react-dom |
| `@stackdown/server` | ws, better-sqlite3, bcrypt, jsonwebtoken, `@stackdown/shared` | tsx, typescript, vitest, @types/ws, @types/better-sqlite3, @types/bcrypt, @types/jsonwebtoken |

Notes:
- The server will also need an HTTP framework for the REST endpoints defined in cloud-stats-design.md (auth, stats sync, leaderboards, friends). Options include Hono, Fastify, or bare `node:http`. Decide at implementation time — the multiplayer relay only needs `ws`, but cloud stats adds ~12 REST endpoints.
- `comlink` and `vite-plugin-comlink` are used for the AI controller's Web Worker. These are client-only.
- `babel-plugin-react-compiler` is the React Compiler (experimental). Client-only.

### Shared package build

The shared package is mostly types and `as const` objects. In development:
- **Client (Vite):** Can consume `.ts` source directly — Vite resolves workspace symlinks and compiles on the fly.
- **Server (tsx):** Can also consume `.ts` source directly in dev mode.

For production, the shared package needs a build step (`tsc`) to emit `.js` + `.d.ts` so the compiled server can import it. The `build:shared` root script handles this, and the main `build` script runs it first.

---

## Migration Steps

### Step 1: Create workspace root

**Files to create at root:**
- `tsconfig.base.json` — shared compiler options (see above).
- New `package.json` — workspace config only (no app deps).

**Files that stay at root (unchanged):**
- `.gitignore` — updated in Step 5.
- `.nvmrc` — stays as-is.
- `CLAUDE.md` — updated in Step 6.
- `docs/` — stays as-is.

**Files that move or are deleted:**
- `tsconfig.json` → `packages/client/tsconfig.json` (rewritten to extend base).
- `tsconfig.tsbuildinfo` → delete (regenerated).
- `vite.config.ts` → `packages/client/vite.config.ts`.
- `index.html` → `packages/client/index.html`.
- `package.json` → replaced with workspace root config; deps move to `packages/client/package.json`.
- `package-lock.json` → delete and regenerate with `npm install`.
- `dist/` → delete (regenerated on build; will now be at `packages/client/dist/`).

### Step 2: Move frontend into packages/client

1. Create `packages/client/`.
2. Move `src/`, `public/`, `index.html`, `vite.config.ts` into `packages/client/`.
3. Create `packages/client/package.json` with all current `dependencies` and `devDependencies` from the old root `package.json`. Add `"name": "@stackdown/client"`, `"private": true`, `"type": "module"`. Replicate the `scripts` (`dev`, `build`, `test`, `test:watch`, `preview`, `typecheck`).
4. Create `packages/client/tsconfig.json` extending `../../tsconfig.base.json` with client-specific options (see config above).
5. Vite config should work without path changes — it uses relative paths and plugins, nothing root-absolute. Verify `index.html`'s `<script src="/src/main.tsx">` still resolves correctly (Vite serves relative to the project root, which is now `packages/client/`).

**No source file content changes.** All relative imports within `src/` remain valid since the entire directory moves together.

### Step 3: Create shared package

1. Create `packages/shared/` with `package.json`, `tsconfig.json`, `src/index.ts`.
2. The shared package starts as a **stub** — an empty barrel export. Actual types are populated when implementing multiplayer (message protocol) and cloud stats (wire types, auth types, friend types).
3. When multiplayer Task 1 is implemented, the types from `src/multiplayer/types.ts` in the online multiplayer plan are created here instead.
4. `GameStats` moves here from client's `src/stats/types.ts` at that time. The client re-exports or imports directly from `@stackdown/shared`.

`packages/shared/package.json`:
```json
{
  "name": "@stackdown/shared",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "exports": {
    ".": {
      "import": "./src/index.ts",
      "types": "./src/index.ts"
    }
  },
  "scripts": {
    "build": "tsc -b",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
```

The `"main"` and `"exports"` point to `.ts` source so Vite and tsx can consume it directly in development without a build step. For production, the `build` script emits to `dist/`, and consumers resolve the compiled output.

### Step 4: Create server package

1. Create `packages/server/` with `package.json`, `tsconfig.json`, `src/index.ts`.
2. The server package starts mostly empty — a minimal WebSocket server entry point. It will be populated when implementing the relay server (online multiplayer Task 5) and cloud stats endpoints.
3. Add `@stackdown/shared` as a dependency.

### Step 5: Update .gitignore

```
node_modules/
dist/
tsconfig.tsbuildinfo
packages/*/dist/
*.db
*.sqlite
```

### Step 6: Verify everything works

1. `npm install` from root — workspaces should resolve, `node_modules` hoisted.
2. `npm run dev` — client dev server starts on localhost:5173, game is playable.
3. `npm run test` — all existing client tests pass with no changes.
4. `npm run typecheck` — no TypeScript errors across all packages.

### Step 7: Update docs and CLAUDE.md

Update file paths in `CLAUDE.md` (key source files table, commands, conventions), `docs/project/ARCHITECTURE.md` (project structure tree, system diagram), and this plan's relationship section.

---

## What Changes for Existing Code

**No source file content changes.** The engine, renderer, input, game loop, stats, UI, hooks — all move together into `packages/client/src/` with identical relative import paths. The only files that change content are configs (`package.json`, `tsconfig.json`).

The only import changes happen later:
1. When multiplayer types are created in `@stackdown/shared` instead of `packages/client/src/multiplayer/types.ts`.
2. When `GameStats` migrates from `packages/client/src/stats/types.ts` to `@stackdown/shared/src/stats.ts`.

Existing tests run the same way — Vitest is configured per package via `vite.config.ts` (which already has the test config inline, or add a `vitest.config.ts` per package).

---

## Dev Experience

### Running locally

Two terminals:
```bash
# Terminal 1: client
npm run dev              # → Vite on localhost:5173

# Terminal 2: server
npm run dev:server       # → Node server on localhost:8080
```

### CORS / WebSocket proxy

In development, the client (localhost:5173) connects to the server (localhost:8080). Two options:

1. **Vite proxy** — Add a proxy rule in `vite.config.ts` so `/ws` and `/api` requests are forwarded to the server. The client doesn't need to know the server URL in dev.
2. **CORS on server** — The server sets `Access-Control-Allow-Origin` headers. The client uses `VITE_SERVER_URL` to know where to connect.

Option 1 is simpler for dev. Option 2 is needed for production regardless. Both can coexist — proxy in dev, direct URL in prod.

### Environment variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `VITE_SERVER_URL` | Client (build-time) | WebSocket + REST base URL for production |
| `PORT` | Server | HTTP/WebSocket listen port (default 8080) |
| `JWT_SECRET` | Server | JWT signing key |
| `DATABASE_PATH` | Server | SQLite file path (default `./stackdown.db`) |

---

## Deploy Targets

| Package | Build output | Deploy to |
|---------|-------------|-----------|
| `@stackdown/client` | Static files (Vite build) | Vercel, Netlify, or any static host |
| `@stackdown/server` | Node.js server | Fly.io, Railway, or any Node host |
| `@stackdown/shared` | TS declarations + JS | Not deployed (consumed at build time) |

The client and server deploy independently. The shared package is a build-time dependency only.

---

## Why Not the Alternatives

**Side-by-side folders (no workspaces):** Dependencies bleed into one `package.json`. Server deps (bcrypt, better-sqlite3 with native bindings) slow down client installs and can cause CI issues. Path aliases between Vite and Node get finicky. Deploy scripts must manually exclude the wrong half of the repo.

**Separate repos:** Shared types become a pain — either copy-paste (drift risk) or publish a private npm package (overhead). Two repos to manage, two CI pipelines, version coordination. Overkill for a personal project.

**Turborepo / Nx:** With 3 packages and simple build dependencies, plain npm workspaces is sufficient. Turborepo adds caching and parallel orchestration — useful at scale, unnecessary here. Can be added later if build times become a problem.

---

## Relationship to Existing Plans

This restructure is a **prerequisite** for both:

1. **Online Multiplayer** (`docs/plans/2026-03-11-online-multiplayer.md`) — Task 5 (relay server) currently creates `server/` at the repo root. Under the monorepo, this becomes `packages/server/`. The flat file layout from Task 5 (`Room.ts`, `RoomManager.ts` in `server/src/`) is reorganized into subdirectories (`rooms/`, etc.) to accommodate the additional cloud stats modules. Tasks 1-4 place client-side multiplayer code in `src/multiplayer/`, which becomes `packages/client/src/multiplayer/`. Shared types (Task 1) move to `packages/shared/`.

2. **Cloud Stats** (`docs/plans/2026-03-16-cloud-stats-design.md`) — The server-side (SQLite, REST endpoints, auth) lives in `packages/server/`. Client-side (IndexedDB, sync service, UI) lives in `packages/client/`. Wire types (`GameRecord`, `GameStats`, auth payloads, friend types) live in `packages/shared/`.

The multiplayer plan's Task 5 already anticipates `server/` as a separate package. This restructure formalizes that and adds the shared package for type safety across the network boundary.
