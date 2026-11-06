# Auth Backend

Production-ready authentication API built with **Express 5**, **Prisma 7**, **PostgreSQL** and **TypeScript**.

## Features

- Email + password registration and login
- Passwords hashed with **argon2id** (OWASP parameters), transparently re-hashed when parameters change
- Short-lived **JWT access tokens** (default 15 min) sent as `Authorization: Bearer …`
- Opaque **refresh tokens** in an `HttpOnly`, `Secure`, `SameSite=Strict` cookie scoped to `/api/v1/auth`
  - stored only as SHA-256 hashes
  - rotated on every refresh, with **reuse detection** — replaying an old token revokes the whole session family
- Logout (current session) and logout-all (every session + every outstanding access token via `tokenVersion`)
- Email verification and password reset with single-use, expiring, hashed tokens
- Change password (signs out all other sessions)
- Account lockout after repeated failed logins; constant-time-ish response for unknown emails
- Rate limiting, Helmet security headers, strict CORS, 10 kB body limit
- Structured logging (pino) with request IDs and secret redaction
- Env validation at boot (fails closed on insecure production config)
- Liveness `/health` and readiness `/ready` probes, graceful shutdown
- Integration tests against a real PostgreSQL database, Dockerfile, docker-compose and GitHub Actions CI

## Quick start

```bash
cp .env.example .env          # then edit values
docker compose up -d db        # or use your own PostgreSQL
npm install                    # also runs `prisma generate`
npm run db:migrate             # apply migrations to the dev database
npm run dev                    # http://localhost:3000
```

In development, emails are written to the log when `SMTP_HOST` is empty, so you can copy verification/reset links from there.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start with hot reload |
| `npm run build` / `npm start` | Compile to `dist/` and run |
| `npm run typecheck` | Type-check app and tests |
| `npm test` | Integration tests (needs PostgreSQL; uses `TEST_DATABASE_URL`, default `postgresql://postgres:postgres@localhost:5432/auth_test`) |
| `npm run db:migrate` | Create/apply migrations in development |
| `npm run db:deploy` | Apply migrations in production (`prisma migrate deploy`) |
| `npm run tokens:cleanup` | Delete expired/used tokens — schedule this daily |

## API

Base path: `/api/v1/auth`. Errors always have the shape `{ "error": { "code": "…", "message": "…", "details"?: […] } }`.

| Method | Path | Auth | Body | Result |
| --- | --- | --- | --- | --- |
| POST | `/register` | – | `{ email, password, name? }` | `201` `{ user, accessToken, tokenType, expiresIn }` + refresh cookie |
| POST | `/login` | – | `{ email, password }` | `200` same as above |
| POST | `/refresh` | cookie | – | `200` new access token, rotated cookie |
| POST | `/logout` | cookie | – | `204`, revokes this session |
| POST | `/logout-all` | Bearer | – | `204`, revokes all sessions and access tokens |
| GET | `/me` | Bearer | – | `200` `{ user }` |
| POST | `/verify-email` | – | `{ token }` | `200` `{ user }` |
| POST | `/resend-verification` | Bearer | – | `202` |
| POST | `/forgot-password` | – | `{ email }` | `202` (same response whether or not the account exists) |
| POST | `/reset-password` | – | `{ token, password }` | `200`, revokes all sessions |
| POST | `/change-password` | Bearer | `{ currentPassword, newPassword }` | `200` new session for the current client |

Passwords must be 12–128 characters. Browser clients must send requests with `credentials: "include"` so the refresh cookie is stored and sent.

### Protecting your own routes

```ts
import { requireAuth, requireRole } from "./middleware/auth.js";

router.get("/admin/stats", requireAuth, requireRole("ADMIN"), handler);
// req.auth = { userId, role }
```

`requireAuth` verifies the JWT and also checks the user still exists and that the token's `tokenVersion` matches, so password changes and logout-all take effect immediately.

## Deployment

1. Build the image: `docker build -t auth-backend .`
2. Run migrations once per release: `docker run --rm -e DATABASE_URL=… auth-backend node_modules/.bin/prisma migrate deploy`
3. Run the API with the env vars from `.env.example`. In production the app refuses to start unless `JWT_ACCESS_SECRET` (≥32 chars), `CORS_ORIGINS` and `SMTP_HOST` are set and secure cookies are enabled.

Production checklist:

- Terminate TLS in front of the app and set `TRUST_PROXY` to the number of proxies, so client IPs (rate limiting, logs) are correct.
- Running more than one instance? Switch the rate limiter to a shared store (e.g. `rate-limit-redis`) in `src/middleware/rate-limit.ts` — the default store is in-memory per process.
- Schedule `npm run tokens:cleanup` (e.g. daily cron / Kubernetes CronJob).
- If the frontend is on a different site (not just a different subdomain), `SameSite=Strict` cookies won't be sent; serve the API under the same site or adjust the cookie policy and add CSRF protection.
- Rotating `JWT_ACCESS_SECRET` invalidates all access tokens (clients will silently refresh).

## Project layout

```
prisma/              schema and migrations
src/
  app.ts             express app (middleware, routes)
  server.ts          HTTP server, graceful shutdown
  config/env.ts      validated environment
  lib/               prisma, logger, jwt, crypto, mailer, errors
  middleware/        auth, validation, rate limiting, error handling
  modules/auth/      routes, service, schemas, email templates
  routes/health.ts   liveness & readiness
  scripts/           maintenance jobs
tests/               integration tests (vitest + supertest)
```
