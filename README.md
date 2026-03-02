# Circycle

Factory scrap operations app with trip tracking, weight reconciliation, bag (big bag) inventory, and dashboard-first UX.

## Engineering Guide

- See `docs/ENGINEERING_BEST_PRACTICES.md` for coding standards and implementation rules used in this project.

## Features

- First page is an operations dashboard (`/`)
- Vehicle status integration from Automil API (`/api/integrations/automil/vehicles`)
- Daily trip timeline tracking (depart/arrive/customer/return)
- Weight reconciliation (customer scale vs factory scale)
- Bag inventory snapshot by scrap type
- Workflow page for operations (`/operations`)

## Prerequisites

- Node.js 20+
- PostgreSQL running on `localhost:5432`

## Setup

```bash
npm install
cp .env.example .env
cp .env.example .env.local
npm run db:push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production Environment Template

- Local development: use `.env` / `.env.local` (localhost database)
- Production deploy: copy `env.production.example` to your server as `.env` and replace all placeholder values

## Environment

- `DATABASE_URL`: PostgreSQL connection string (required)
- `AUTOMIL_API_BASE_URL`: Automil backend base URL (optional)
- `AUTOMIL_API_TOKEN`: Bearer token for Automil API (optional)

If Automil env is not configured, the dashboard uses mock vehicle data.

## Key API

- `GET /api/operations/summary`: dashboard summary + trip timeline + bag inventory
- `GET /api/integrations/automil/vehicles`: automil vehicles (or mock fallback)
- `GET/POST /api/trips`
- `GET/PATCH /api/trips/:id` (supports updating `materials`)
- `POST /api/bags`, `PATCH/DELETE /api/bags/:id`
