# Better Auth + Express example

Minimal, working Better Auth setup: email + password, email verification,
password reset, database sessions and a protected route.

```bash
cp .env.example .env            # set DATABASE_URL, then: npx auth secret
npm install
npm run db:migrate              # creates user, session, account, verification tables
npm run dev                     # http://localhost:3000
```

Emails are printed to the console; copy the link from there.

| Method | Path | Body |
| --- | --- | --- |
| POST | `/api/auth/sign-up/email` | `{ email, password, name }` |
| POST | `/api/auth/sign-in/email` | `{ email, password }` |
| GET  | `/api/auth/get-session` | – (cookie) |
| POST | `/api/auth/sign-out` | – (cookie) |
| POST | `/api/auth/request-password-reset` | `{ email, redirectTo }` |
| POST | `/api/auth/reset-password` | `{ newPassword, token }` |
| GET  | `/api/me` | – (cookie), example protected route |

Browser requests must send an `Origin` listed in `TRUSTED_ORIGINS`.
