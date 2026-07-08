# Adaptive Code Platform

IRT-adaptive coding practice platform. MERN stack, TypeScript throughout.

## Structure

```
adaptive-code-platform/
├── backend/          Express + TypeScript API
│   └── src/
│       ├── config/         env, db, logger setup
│       ├── models/         Mongoose schemas (see index.models.ts)
│       ├── repositories/   DB access layer
│       ├── services/       business logic (IRT engine, exp ledger, etc.)
│       ├── controllers/    request handlers
│       ├── routes/         Express routers
│       ├── middlewares/    auth, rate limiting, error handling
│       ├── dtos/           request/response validation schemas (zod)
│       ├── jobs/           async workers (sandboxed code execution queue)
│       └── utils/
├── frontend/         Next.js (App Router) + TypeScript + Tailwind + Zustand
└── docker-compose.yml
```

## Local setup

```bash
# Backend
cd backend
cp .env.example .env   # fill in real secrets — never commit .env
npm install
npm run dev

# Frontend
cd frontend
cp .env.example .env
npm install
npm run dev
```

Or via Docker:

```bash
docker compose up --build
```

## Security notes for graders / reviewers

- Secrets are never committed; `.env.example` files document required
  variables without real values.
- `backend/src/app.ts` wires up helmet, CORS allowlist, mongo-sanitize
  (NoSQL injection defense), hpp, and body-size limits at the app level.
- Rate limiting is tiered: strict on auth endpoints, stricter still on
  code submission (resource-exhaustion surface).
- The sandboxed code execution service (not yet added) will run in its
  own isolated Docker network with no outbound internet access — see
  `docker-compose.yml` comments once that service lands.
