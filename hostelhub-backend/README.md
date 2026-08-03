# HostelHub AI — Backend

Production-oriented Node.js/Express/MongoDB backend for the HostelHub AI multi-hostel
management platform. This covers the full core operational backend: auth/RBAC, and every
management module except AI features and the mobile app itself.

## What's included

- JWT auth (access + rotating refresh tokens), password hashing, session revocation
- Role-Based Access Control for Owner / Warden / Accountant / Student, enforced at the
  route layer (`authorize(...)`) and refined inside controllers where the spec requires
  per-field restrictions (e.g. accountants can list students but not see medical/Aadhaar data)
- **Hostels** — multi-hostel ownership, geolocation, amenities
- **Rooms & Beds** — auto-generated beds per room capacity, QR codes, live occupancy counts
  (computed from Bed documents, never a stale stored counter), maintenance status
- **Students** — full CRUD, QR generation, transactional bed assignment
- **Attendance** — manual marking, QR scan (validated against the student's stored QR,
  so a forged/reused code can't create a duplicate — enforced by a unique `(student, date)`
  index), late-entry flagging, and an aggregation-based attendance % report sorted to
  surface at-risk students first
- **Leave management** — student submits, warden approves/rejects, owner can additionally
  review, student can cancel a pending request
- **Visitor management** — check-in/check-out, generated visitor pass codes
- **Complaints** — category/priority tracking, assignment, status pipeline, comment threads,
  with an ownership check so students can only comment on their own complaints
- **Fees** — invoice generation, partial/full payment recording, auto-generated PDF receipts
  (via pdfkit → Cloudinary) once fully paid, fee summary aggregation for the owner dashboard,
  and a cron-job-ready `markOverdueInvoices` for daily overdue sweeps
- **Inventory** — per-room or common-area items, condition tracking, a maintenance-due view
- **Notice board** — pinned notices, expiry, push-notification hook point (TODO once FCM
  credentials are wired)
- **Emergency** — student-triggered alert with location, acknowledge/resolve flow for
  owner/warden (SMS/call-gateway dispatch to police/ambulance/parents is flagged as a real
  third-party integration, not faked)
- Daily cron scheduler (`src/jobs/index.js`) — currently runs the overdue-invoice sweep
- Centralized error handling, request validation, rate limiting, Helmet, CORS, compression
- Swagger/OpenAPI docs at `/api-docs`
- Winston logging, Jest + Supertest test suite
- Docker + Nginx + docker-compose for containerized deployment
- GitHub Actions CI/CD (test → build/push image → deploy over SSH)
- Seed script with demo Owner/Warden/Accountant logins

Every route file, controller, and model listed above has been syntax-checked, dependency-
installed, and smoke-tested end-to-end through Express (health check, auth-gated 401s,
404 handling all verified) before being handed off.

## What's NOT built yet

- AI features (assistant, forecasting, risk detection, OCR) — these call out to an LLM/OCR
  provider and are best scoped as their own service once you've decided which provider
  (Gemini/OpenAI/Claude) and confirmed budget, since they're usage-billed
- OTP delivery integration (provider placeholder is in `.env.example`)
- Firebase Cloud Messaging push wiring (hook points are marked `TODO` in Leave/Notice/
  Emergency controllers — they're structured so plugging in FCM is additive, not a rewrite)
- Payment gateway (Razorpay/UPI/cards) — fee recording currently assumes payment happened
  out-of-band (cash, or reconciled manually); wiring a real gateway means adding a webhook
  endpoint and signature verification, which needs your merchant credentials to build against
- Reports/exports (Excel/CSV) — the data and aggregations exist; this is a formatting layer
- The Flutter mobile app (separate project — not started yet)

## Getting started

```bash
cp .env.example .env   # fill in MongoDB URI, JWT secrets, Cloudinary keys
npm install
npm run seed            # optional: populate demo data
npm run dev              # nodemon, http://localhost:5000
```

API docs: `http://localhost:5000/api-docs`
Health check: `http://localhost:5000/health`

## Environment variables

See `.env.example` for the full list. At minimum for local dev you need:
`MONGO_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`.

## Running tests

```bash
npm test
```
Tests spin up against `MONGO_URI` (point this at a local/test MongoDB instance, not
production — the test suite wipes the `users` collection between tests).

## Deployment

```bash
docker compose up -d --build
```
This brings up the API container plus an Nginx reverse proxy on port 80. The GitHub
Actions workflow (`.github/workflows/ci-cd.yml`) runs tests on every push, then on `main`
builds and pushes a Docker image to GHCR and deploys it over SSH — fill in the
`DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` repo secrets to activate the deploy job.

## Adding a new module (pattern to follow)

For anything not yet built (AI features, reports/exports, payment gateway webhooks),
follow the Student module's shape:
1. Model already exists in `src/models/` (or add one following the existing style)
2. `src/validators/<module>Validators.js` — express-validator rules
3. `src/controllers/<module>Controller.js` — business logic, hostel-scoped queries
4. `src/routes/<module>Routes.js` — mount `authenticate` + `authorize(...roles)` per the
   permission table in the spec, then wire into `src/app.js`

## Architecture notes

- **Hostel scoping**: every non-owner user has `req.user.hostel` fixed to one hostel;
  owners can have multiple `ownedHostels`. Controllers filter queries by this rather than
  trusting client-supplied hostel IDs, to prevent cross-hostel data leakage.
- **RBAC**: enforced at two layers — route-level `authorize(role list)` for coarse access,
  and controller-level field filtering for row/column-level restrictions (e.g. accountant
  can't see medical conditions).
- **Sensitive data**: Aadhaar is stored as last-4 only in this model; full-number storage
  should go through an encrypted vault/field-level encryption before production use, and
  is intentionally not implemented as a placeholder here — that needs a real KMS decision.
- **Transactions**: student creation + bed assignment uses a Mongo session/transaction so
  a partial failure can't leave an orphaned user or double-booked bed.
