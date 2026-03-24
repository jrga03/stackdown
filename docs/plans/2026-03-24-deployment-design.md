# Deployment Design

Infrastructure plan for deploying Stackdown's client, server, and database. All platforms are free-forever tiers with no credit card required.

---

## Platform Overview

| Component | Platform | Tier | Key Limits |
|-----------|----------|------|------------|
| Client (`@stackdown/client`) | Cloudflare Pages | Free | Already deployed, global CDN |
| Server (`@stackdown/server`) | Koyeb | Free Starter | 0.1 vCPU, 512MB RAM, 2GB SSD, 100GB bandwidth/mo |
| Database | Neon | Free | Postgres, 0.5GB storage, auto-suspends on idle, 1 compute branch |

### Database: Postgres instead of SQLite

The cloud stats design (`2026-03-16-cloud-stats-design.md`) specifies SQLite with `better-sqlite3`. Since we're deploying to Koyeb (ephemeral filesystem) with Neon (managed Postgres), use Postgres instead. This means:

- Replace `better-sqlite3` with a Postgres client (`pg` or `postgres.js`)
- Replace `json_extract(stats, '$.score')` with `stats->>'score'`
- Replace `DATABASE_PATH` env var with `DATABASE_URL` (Neon connection string)

The schema itself is simple and translates directly. The cloud stats plan already anticipated a Postgres migration.

---

## Regions

All server-side infrastructure in Singapore to minimize latency for Southeast Asia.

| Platform | Region |
|----------|--------|
| Cloudflare Pages | Global CDN (no config needed) |
| Koyeb | Singapore |
| Neon | Singapore (`ap-southeast-1`) |

---

## Deploy Configuration

### Cloudflare Pages (client)

Already deployed. After the monorepo restructure, update build settings:

- **Build command**: `npm run build -w @stackdown/client`
- **Build output directory**: `packages/client/dist`
- **Root directory**: `/` (so npm workspaces resolve correctly)

### Koyeb (server)

Connect GitHub repo, configure:

- **Builder**: Buildpack (auto-detects Node.js)
- **Build command**: `npm run build -w @stackdown/shared && npm run build -w @stackdown/server`
- **Run command**: `node packages/server/dist/index.js`
- **Port**: 8080
- **Region**: Singapore
- **Instance type**: Free (nano)

Auto-deploys on push to main.

### Neon (database)

Provision via dashboard:

- **Project name**: `stackdown`
- **Region**: Singapore (`ap-southeast-1`)
- **Database**: `stackdown`

---

## Environment Variables

### Koyeb (server)

| Variable | Value | Notes |
|----------|-------|-------|
| `PORT` | `8080` | Koyeb default |
| `DATABASE_URL` | `postgres://...@ep-xxx.ap-southeast-1.aws.neon.tech/stackdown?sslmode=require` | From Neon dashboard |
| `JWT_SECRET` | (generated secret) | For auth tokens |

### Cloudflare Pages (client)

| Variable | Value | Notes |
|----------|-------|-------|
| `VITE_SERVER_URL` | `https://<app-name>.koyeb.app` | Koyeb-provided subdomain |

---

## CORS & WebSocket Connectivity

### Production

- Server sets `Access-Control-Allow-Origin` to the Cloudflare Pages domain
- WebSocket: `wss://<app-name>.koyeb.app/ws`
- REST: `https://<app-name>.koyeb.app/api/*`

### Development (local)

- Vite proxy in `vite.config.ts` forwards `/ws` and `/api` to `localhost:8080`
- No CORS config needed locally

### Neon connection

- Koyeb connects to Neon over SSL (`?sslmode=require`)
- Both in Singapore — DB round-trip ~1-2ms

---

## Neon Idle Behavior

Neon's free tier auto-suspends compute after 5 minutes of inactivity. First query after idle has a cold start of ~500ms-1s.

**Impact:**
- First request after idle (login, stats sync, leaderboard fetch) has a one-time delay
- Subsequent queries are fast while compute stays warm
- WebSocket relay traffic doesn't hit the database — multiplayer gameplay is unaffected

**Mitigation:** None needed. Sub-second delay on first DB query after idle is acceptable. Not worth a keep-alive ping that would waste Neon's free compute hours.

---

## Relationship to Existing Plans

- **Monorepo restructure** (`2026-03-16-monorepo-restructure.md`): Deploy targets table updated — Cloudflare Pages for client, Koyeb for server (replacing Vercel/Fly.io suggestions). `DATABASE_PATH` replaced by `DATABASE_URL`.
- **Cloud stats** (`2026-03-16-cloud-stats-design.md`): SQLite replaced by Neon Postgres. Server dependencies change: `better-sqlite3` → `pg` or `postgres.js`. SQL syntax adjusted for Postgres.
- **Online multiplayer** (`docs/multiplayer/MULTIPLAYER.md`): No changes — WebSocket relay runs on Koyeb, no database interaction for relay traffic.
