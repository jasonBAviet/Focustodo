# Vercel Deployment Guide

## Overview
This app deploys both **frontend** (React) and **backend** (Express + PostgreSQL) to Vercel.

- Frontend: Served as static files from `/dist`
- Backend: Runs as Vercel serverless functions in `/api`
- API requests: Proxied from `/api/*` to serverless functions

## Prerequisites
- Vercel account
- PostgreSQL database (local, SSH tunnel, or cloud)

## Setup

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Environment Variables
Set these in Vercel dashboard or via CLI:

```
DB_HOST=your-database-host
DB_PORT=5432
DB_NAME=focustodo
DB_USER=your-db-user
DB_PASSWORD=your-db-password
VITE_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

**Important:** Do NOT set `VITE_BACKEND_URL` on Vercel — leave it empty so frontend uses same-domain API (`/api/*`).

### 3. Deploy to Vercel
```bash
git push                    # Ensure all changes are committed
vercel --prod              # Deploy to production
```

Or link to GitHub and enable auto-deploy:
```bash
vercel link
```

## Local Development

### With Backend
```bash
npm run dev:full           # Frontend + Backend + DB sync
```

Runs on:
- Frontend: `http://localhost:8001` (or next available)
- Backend: `http://localhost:4000`

### Environment
Frontend connects to backend via `VITE_BACKEND_URL=http://localhost:4000` from `.env`

## Database Connection
- **Local dev:** Backend connects directly to PostgreSQL
- **Vercel:** Uses `DB_*` environment variables (set in Vercel dashboard)
- **SSH Tunnel:** If database is behind SSH, set up tunnel before deploying

## API Routes
All routes in `server.js` are available:
- `GET /api/state` — Full app state
- `POST /api/state` — Save app state
- `GET /api/tasks` — List tasks
- `POST /api/tasks` — Create task
- `POST /api/webhook/test` — Test Slack webhook
- `GET /api/health` — Health check

## Troubleshooting

### 404 on `/api/*`
- Check database env vars are set in Vercel dashboard
- Verify rewrite rules in `vercel.json`

### Database connection timeout
- Database must be accessible from Vercel servers
- If using SSH, need to set up persistent tunnel
- Check `DB_HOST` is resolvable from Vercel

### Schema not initializing
- Check `ensureSchema()` runs on first request
- Verify database credentials in env vars

## File Structure
```
/api/[...handler].ts       # Catch-all serverless function
/server.js                 # Express app
/src                       # Frontend React code
/dist                      # Build output
```

## See Also
- [Vercel Docs](https://vercel.com/docs)
- [Serverless Functions](https://vercel.com/docs/functions/runtimes/node-js)
