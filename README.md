# Faraway

*not so faraway, tonight*

A private room for two people in different time zones — live countdown to your next call, presence, and a synced doodle pad to hang out in between.

## Structure

```
faraway/
  backend/    Express + Socket.io + SQLite
  frontend/   React (Vite) + React Three Fiber + Framer Motion
```

## Running locally

**Backend**
```bash
cd backend
cp .env.example .env   # edit JWT_SECRET at least
npm install
npm run dev             # http://localhost:4000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev              # http://localhost:5173
```

## v1 slice (build in this order)

1. Auth — `POST /api/auth/signup`, `POST /api/auth/login` ✅ scaffolded
2. Room creation + invite by email — `POST /api/rooms`, `POST /api/rooms/:id/accept` ✅ scaffolded
3. Countdown sync — `countdown:set` / `countdown:update` over the socket ✅ scaffolded
4. Presence — `presence:update`, with a 5s grace period on disconnect so refreshes don't flicker ✅ scaffolded
5. Doodle pad — incremental `doodle:stroke` events + snapshot-on-join ✅ scaffolded

Everything above is wired end-to-end but **not yet run or tested** — next step is `npm install` in both folders and smoke-testing signup → create room → two browser tabs to confirm presence + doodle sync work.

## Not done yet

- Actually sending invite emails (currently the invited user just needs to sign up with the matching email and hit accept — Resend integration is a v1.5 follow-up per the open questions in the project doc)
- Postgres migration (SQLite is fine through the demo)
- Three.js cozy room scene (currently a plain page — this is the next visual layer once the real-time plumbing is confirmed working)
- Deploy to Railway/Vercel
