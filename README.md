# Faraway

*not so faraway, tonight*

A private room for two people in different time zones — live countdown to your next call/presence, and synced games to hang out in between.

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
npm run dev            
```

**Frontend**
```bash
cd frontend
npm install
npm run dev             
```
