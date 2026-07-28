# Adaptive Code Platform

An IRT-adaptive coding practice platform built for ST6005CEM (Secure Software Development). Question difficulty adjusts in real time based on live performance, using a Rasch-style ability estimate (θ) rather than a fixed question order — students see harder or easier problems depending on how they're doing, not a static curriculum.

Built end-to-end with security-by-design as the primary constraint, not an afterthought: every feature below was built alongside its corresponding threat model, not retrofitted.

---

## Features

**For students**
- Adaptive 15-question tests (5 difficulty tiers, θ-driven item selection with exposure control)
- Real Python code execution against test cases, with genuine error feedback (wrong answer / runtime error / timeout — not just "incorrect")
- EXP-based hint system (spend earned points to unlock progressive hints)
- AI-generated performance summary after each test (Gemini + OpenRouter fallback chain)
- Dashboard with accuracy, average score, EXP, θ trend, and test history
- Shared study resources (admin-curated YouTube videos and PDFs)

**For admins**
- Full question CRUD, including bulk JSON import for populating large question banks
- Analytics dashboard: user counts, ability distribution, activity-over-time, accuracy-by-difficulty charts
- User management (view, delete)
- Resource management (upload PDFs, add YouTube videos)

**Security (see full breakdown below)**
- argon2id password hashing, zxcvbn strength scoring, reuse/expiry policy
- Mandatory TOTP MFA on every account, including OAuth-provisioned ones
- Email verification via OTP before an account is usable
- Google + GitHub OAuth (Authorization Code flow, CSRF-protected)
- Refresh token rotation with reuse detection
- Role-based access control enforced server-side, never trusting client-supplied roles
- Rate limiting (tiered by endpoint risk) + account lockout + conditional CAPTCHA
- Sandboxed code execution with documented, scoped isolation limits
- NoSQL injection defense, input validation on every endpoint, magic-byte file upload validation

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Monaco Editor, Recharts |
| Backend | Express, TypeScript, Mongoose |
| Database | MongoDB 7 (replica set — required for multi-document transactions) |
| Auth | Custom JWT + refresh token rotation, argon2id, otplib (TOTP), OAuth2 |
| AI | Google Gemini (direct, free tier) → OpenRouter free models (fallback) |
| Containerization | Docker, Docker Compose |

---

## Getting started

### Prerequisites
- Node.js 20+
- Docker Desktop (for Mongo replica set, or the full containerized stack)
- A Gmail account with an [app password](https://myaccount.google.com/apppasswords) (for email verification)
- Google Cloud Console OAuth client, GitHub OAuth App, hCaptcha site (see `.env.example` files for what's needed from each)

### Local development (fastest for iterating)

```bash
# 1. Start Mongo as a replica set
docker compose up -d mongo
docker compose exec mongo mongosh --eval "rs.initiate()"

# 2. Backend
cd backend
cp .env.example .env   # fill in every value — see comments in the file
npm install
npm run dev             # http://localhost:5001

# 3. Frontend (separate terminal)
cd frontend
cp .env.local.example .env.local
npm install
npm run dev             # http://localhost:3000
```

### Full Docker deployment

```bash
cp .env.example .env    # root-level — fills in build-time frontend vars + LAN config
docker compose up -d --build
docker compose exec mongo mongosh --eval "rs.initiate()"
```

See the root `.env.example` for LAN/VM testing notes — accessing the app from a separate machine (e.g. a pentest VM) requires every URL-bearing variable to use that machine's IP consistently, with the exception of OAuth redirect URIs, which must remain `localhost` since neither Google nor GitHub accept raw IP addresses as registered redirect URIs.

### Running tests

```bash
cd backend
npm test
```

Covers the IRT/θ engine's pure functions (item selection, ability updates, partial-credit scoring) — deliberately chosen as the first thing to unit-test since it's the platform's core differentiator and easiest to verify in isolation.

---

## Project structure

adaptive-code-platform/
├── backend/
│ └── src/
│ ├── config/ env, DB connection, logger
│ ├── models/ Mongoose schemas (single source of truth for data shape)
│ ├── repositories/ DB access layer — nothing outside this touches Mongoose directly
│ ├── services/ business logic (IRT engine, auth flows, EXP ledger, execution sandbox)
│ ├── controllers/ thin HTTP layer, no logic beyond request/response shaping
│ ├── routes/ Express routers, middleware composition per endpoint
│ ├── middlewares/ auth, RBAC, rate limiting, validation, error handling
│ ├── dtos/ Zod schemas — the input validation boundary
│ ├── utils/ crypto, tokens, OAuth, execution sandbox, IRT math
│ └── jobs/ reserved for async execution queue (see Known Limitations)
├── frontend/
│ └── src/
│ ├── app/
│ │ ├── (app)/ sidebar-wrapped authenticated pages (dashboard, admin, profile, resources)
│ │ ├── test/ full-screen test-taking flow (no sidebar — deliberate UX choice)
│ │ ├── login/ register/ verify-email/ mfa/ auth flow pages
│ │ └── page.tsx public landing page, redirects away if already authenticated
│ ├── components/ shared UI (forms, sidebar, route guards, question form)
│ ├── lib/ API client (with silent token-refresh interceptor), hooks
│ └── types/ shared TypeScript interfaces matching backend DTOs
└── docker-compose.yml


---

## Security design notes

A few decisions worth understanding, since they come up repeatedly in the codebase's comments and are central to the coursework's threat-modeling requirement:

- **Mandatory MFA, including for OAuth logins.** OAuth proves *who* the user is; it was deliberately not treated as a substitute for this application's own second factor. Every login path — password or OAuth — routes through the same MFA challenge gate.
- **Refresh tokens are opaque, not JWTs**, and rotate on every use. A reused (already-consumed) refresh token is treated as a signal of theft and revokes the entire session chain for that user, not just the one token.
- **Ownership is enforced at the query level**, not as a separate authorization check bolted on afterward — e.g. `Test.findByIdForStudent(id, studentId)` includes the requester's ID directly in the database query, so a request for another student's data returns "not found" by construction rather than relying on a check that could be forgotten in a future endpoint.
- **The code execution sandbox is a deliberately scoped implementation, not a claim of full isolation.** It defends against timeouts, output-flooding, and shell injection, but does *not* provide per-submission container isolation, network isolation, or cgroup resource limits. This is documented explicitly (see `execution.service.ts` header comment) with a stated upgrade path, rather than silently under-claiming or over-claiming what it does.

## Known limitations

- Code execution runs in-process rather than in per-submission isolated containers (see above) — scoped down from the production-grade approach due to project timeline, with `SubmissionJob` already modeled to support the upgrade without an API contract change.
- No promote-to-admin UI — the first admin account must be set via direct database update. Deliberate: this should never be a self-service action.
- CAPTCHA and OAuth both require real provider credentials (hCaptcha, Google Cloud Console, GitHub OAuth Apps) to function — see each service's `.env.example` comments for setup links.
- OAuth login is untestable from a separate machine/VM by IP address, since neither Google nor GitHub permit raw IPs as registered redirect URIs — a normal constraint of a project without a public domain, not an application bug.

## Coursework context

This project was built for ST6005CEM (Secure Software Development). The accompanying report covers the full internal penetration test (OWASP WSTG v4.2 methodology, Burp Suite), threat model (STRIDE), and vulnerability documentation with CVSS v3.1 ratings, referencing the source locations described above.