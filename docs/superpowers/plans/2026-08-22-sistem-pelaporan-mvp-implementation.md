# Sistem Pelaporan Kegiatan Pegawai Harian — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a locally runnable vertical-slice prototype in which a Superadmin manages location/stage master data, a Pegawai logs in and submits a photo-backed report, and the Superadmin sees the report in a dashboard.

**Architecture:** A Vite + React frontend communicates only with a Node.js + Express REST API. The API owns authentication, role checks, validation, Prisma queries, and Supabase Storage uploads; PostgreSQL is accessed through Prisma's PostgreSQL adapter and private Storage files are exposed only through short-lived signed URLs. The work is sequenced as vertical slices so every completed slice is runnable before the next one begins.

**Tech Stack:** Node.js 22+, npm workspaces, Vite, React, React Router, Express, Prisma ORM 7 with `@prisma/adapter-pg`, PostgreSQL (Supabase), Supabase Storage, bcryptjs, JWT in HttpOnly cookies, Zod, Multer with `file-type` MIME detection, Vitest, Supertest, React Testing Library, and CSS without a UI framework.

**Spec:** `docs/superpowers/specs/2026-08-21-sistem-pelaporan-kegiatan-pegawai-design.md`

## Global Constraints

- Runtime is Node.js 22+; the verified bundled runtime is `v22.23.1`.
- Frontend and backend run locally on ports 5173 and 3000; PostgreSQL and Storage use Supabase.
- The browser never receives the Supabase service-role/secret key and never connects directly to PostgreSQL or Storage.
- The first release must complete P1 before any P2 feature is started.
- Business dates use `Asia/Jakarta`; timestamps are stored as UTC.
- A report stores `rw_id`, not a duplicate `desa_id`; Desa is derived through RW.
- PIC is always `request.user.id` from the verified session, never a client-supplied identity.
- A report accepts 1–5 JPEG/JPG, PNG, or WEBP files, each at most 10 MB.
- Storage bucket `dokumentasi-laporan` is private; signed URLs expire after 600 seconds.
- Master data is soft-disabled with `is_active`; referenced rows are not hard-deleted.
- Employee report access is owner-scoped; Superadmin report access is global.
- `.env` and service keys are ignored; a committed `.env.example` contains names only.
- Every task ends with its focused test command and a small commit; `main` must remain runnable.
- P2 work (employee CRUD UI, 24-hour edit, filters, Excel export, polling) starts only after the P1 exit criteria pass.

---

## Task 1: Scaffold the workspace and health slice

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `frontend/package.json`, `frontend/index.html`, `frontend/src/main.jsx`, `frontend/src/App.jsx`, `frontend/src/styles.css`
- Create: `frontend/src/App.test.jsx`
- Create: `backend/package.json`, `backend/src/app.js`, `backend/src/server.js`, `backend/src/config/env.js`, `backend/src/modules/health/health.routes.js`
- Create: `backend/test/health.test.js`
- Modify: `README.md`

**Interfaces:**
- Produces `createApp({ healthCheck, authRouter, masterRouter, reportRouter, dashboardRouter })`, returning an Express app with `GET /api/health`.
- `GET /api/health` returns `{ "status": "ok", "database": "up" }` when the injected check resolves and `{ "status": "error", "database": "down" }` with HTTP 503 when it rejects.
- Frontend `App` renders the API status from `GET /api/health` and displays an actionable offline message on failure.

- [ ] **Step 1: Create the workspace manifests and ignore rules**

  Write the root `package.json` with npm workspaces and scripts:

  ```json
  {
    "name": "sistem-pelaporan",
    "private": true,
    "workspaces": ["frontend", "backend"],
    "scripts": {
      "dev": "concurrently \"npm:dev:backend\" \"npm:dev:frontend\"",
      "dev:backend": "npm run dev -w backend",
      "dev:frontend": "npm run dev -w frontend",
      "test": "npm run test -w backend && npm run test -w frontend",
      "build": "npm run build -w frontend"
    },
    "devDependencies": {
      "concurrently": "latest"
    }
  }
  ```

  Add `.gitignore` entries for `node_modules/`, `.env`, `.env.*` except `.env.example`, `frontend/dist/`, `backend/uploads-temp/`, coverage output, and generated Prisma output. Add the variable names `DATABASE_URL`, `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STORAGE_BUCKET`, `PORT`, and `FRONTEND_ORIGIN` to `.env.example` with no values.

- [ ] **Step 2: Scaffold the two packages and install pinned lockfile dependencies**

  Run:

  ```powershell
  npm create vite@latest frontend -- --template react --no-interactive
  npm install -w backend express cors cookie-parser helmet jsonwebtoken bcryptjs multer file-type zod dotenv express-rate-limit @supabase/supabase-js @prisma/client @prisma/adapter-pg pg
  npm install -D -w backend prisma vitest supertest
  npm install -w frontend react-router-dom
  npm install -D -w frontend vitest jsdom @testing-library/react @testing-library/jest-dom
  npm install -D concurrently
  ```

  Replace the generated package scripts with `dev`, `build`, and `test` commands. Pin the resolved versions through the committed root `package-lock.json`; do not use uncommitted global installs.

- [ ] **Step 3: Write the failing health tests**

  `backend/test/health.test.js` must include both branches:

  ```js
  import request from "supertest";
  import { describe, expect, it } from "vitest";
  import { createApp } from "../src/app.js";

  describe("GET /api/health", () => {
    it("reports the API and database as healthy", async () => {
      const response = await request(createApp({ healthCheck: async () => true })).get("/api/health");
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: "ok", database: "up" });
    });

    it("returns 503 when the database check fails", async () => {
      const response = await request(createApp({ healthCheck: async () => { throw new Error("db down"); } })).get("/api/health");
      expect(response.status).toBe(503);
      expect(response.body).toEqual({ status: "error", database: "down" });
    });
  });
  ```

  `frontend/src/App.test.jsx` must mock `fetch` and initially assert the offline branch so the test fails before `App` is implemented.

- [ ] **Step 4: Implement the minimal health slice**

  Implement the route with the injected check, create a `server.js` that calls `app.listen(PORT)`, and implement `App` with three visible states: loading, connected, and connection failure. Set `credentials: "include"` on the fetch call even though authentication is not mounted yet.

- [ ] **Step 5: Run the focused tests and smoke the server**

  Run:

  ```powershell
  npm run test -w backend -- --run test/health.test.js
  npm run test -w frontend -- --run src/App.test.jsx
  npm run dev:backend
  ```

  Expected: both tests pass and `GET http://localhost:3000/api/health` returns HTTP 200 without a database configured because the scaffold uses an injected health check.

- [ ] **Step 6: Commit the runnable scaffold**

  ```powershell
  git add package.json package-lock.json .gitignore .env.example frontend backend README.md
  git commit -m "chore: scaffold frontend backend health slice"
  ```

## Task 2: Add the PostgreSQL data contract, migrations, RLS defense-in-depth, and seed

**Files:**
- Create: `backend/prisma.config.ts`
- Create: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/*/migration.sql`
- Create: `backend/src/config/prisma.js`
- Create: `backend/prisma/seed.js`, `backend/prisma/seed-data.js`
- Create: `backend/test/seed-data.test.js`
- Modify: `backend/package.json`, `backend/src/app.js`, `.env.example`, `README.md`

**Interfaces:**
- Produces `prisma` from `backend/src/config/prisma.js` using `PrismaPg` and `DATABASE_URL`.
- Produces seed constants `DEMO_VILLAGES`, `DEMO_STAGES`, and `DEMO_USERS` from `backend/prisma/seed-data.js`.
- Produces models `User`, `Desa`, `Rw`, `Tahapan`, `Laporan`, and `Dokumentasi` with the relations and indexes in the spec.

- [ ] **Step 1: Write the failing seed contract test**

  Assert the seed contains exactly four named villages, eleven stage names from the approved spec, one Superadmin, four Pegawai, and only `PEGAWAI` for non-admin seeded users. The test imports seed constants without a database so it is deterministic.

- [ ] **Step 2: Implement Prisma 7 configuration and schema**

  Configure `prisma.config.ts` with `schema: "prisma/schema.prisma"`, migrations under `prisma/migrations`, and `env("DATABASE_URL")`. Use the Prisma 7 `prisma-client` generator with output `../generated/prisma`, the PostgreSQL datasource, snake_case `@map` names, UUID primary keys, enums for roles, and indexes for `(user_id, tanggal_kegiatan)`, `tanggal_kegiatan`, `rw_id`, and `tahapan_id`. Add the composite unique constraint `(desa_id, nomor_rw)` and `storage_path @unique`.

- [ ] **Step 3: Implement the Prisma adapter singleton**

  Create `backend/src/config/prisma.js`:

  ```js
  import "dotenv/config";
  import { PrismaPg } from "@prisma/adapter-pg";
  import { PrismaClient } from "../../generated/prisma/client.js";

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  export const prisma = new PrismaClient({ adapter });
  ```

  Update the health route to run `prisma.$queryRawUnsafe("SELECT 1")` through an injected `healthCheck` only when `DATABASE_URL` exists; keep the scaffold fallback for unit tests.

- [ ] **Step 4: Implement seed data and seed command**

  Use `bcryptjs.hash(password, 12)` for passwords read from `SEED_ADMIN_PASSWORD` and `SEED_EMPLOYEE_PASSWORD`. Upsert villages, RW rows, stages, and users by stable names/usernames. Set `wajib_lapor=true` for seeded Pegawai and `is_active=true` for every seed row. Add package scripts `prisma:migrate: "prisma migrate dev"`, `prisma:generate: "prisma generate"`, and `prisma:seed: "node prisma/seed.js"`, then configure Prisma's seed command.

- [ ] **Step 5: Create the migration and Supabase security SQL**

  With a configured `DATABASE_URL`, run `npx prisma migrate dev --name init` and `npx prisma generate`. Add a migration SQL block that explicitly enables RLS on all six public tables and revokes Data API privileges from `anon` and `authenticated` because the app uses the backend's direct PostgreSQL connection:

  ```sql
  alter table public.users enable row level security;
  alter table public.desa enable row level security;
  alter table public.rw enable row level security;
  alter table public.tahapan enable row level security;
  alter table public.laporan enable row level security;
  alter table public.dokumentasi enable row level security;

  revoke all on table public.users, public.desa, public.rw,
    public.tahapan, public.laporan, public.dokumentasi
    from anon, authenticated;
  ```

  Do not grant the service key or direct database credentials to the frontend. Confirm the migration and seed with `npx prisma migrate status`, `npm run prisma:seed -w backend`, and one `SELECT 1` health request.

- [ ] **Step 6: Run tests and commit the data contract**

  ```powershell
  npm run test -w backend -- --run test/seed-data.test.js
  npx prisma validate --config backend/prisma.config.ts
  npx prisma format --schema backend/prisma/schema.prisma
  git add backend/prisma backend/src/config/prisma.js backend/test/seed-data.test.js backend/package.json .env.example README.md
  git commit -m "feat: add postgres schema migrations and seed"
  ```

  If the Supabase connection variables are not present, complete schema validation and unit tests, then report the exact missing variables before attempting a remote migration; do not invent credentials.

## Task 3: Implement backend authentication and role middleware

**Files:**
- Create: `backend/src/modules/auth/auth.service.js`
- Create: `backend/src/modules/auth/auth.routes.js`
- Create: `backend/src/modules/auth/auth.middleware.js`
- Create: `backend/src/modules/auth/auth.schemas.js`
- Create: `backend/test/auth.service.test.js`, `backend/test/auth.routes.test.js`
- Modify: `backend/src/app.js`, `backend/src/config/env.js`, `backend/package.json`

**Interfaces:**
- `createAuthService({ userRepository, passwordHasher, tokenSigner, clock })` exposes `login({ username, password })`, `readSession(token)`, and `logout()`.
- `requireAuth({ tokenVerifier, userRepository })` attaches `{ id, role }` to `request.user` and returns 401/403 without leaking details.
- Routes: `POST /api/auth/login`, `GET /api/auth/me`, and `POST /api/auth/logout`.

- [ ] **Step 1: Write failing service tests**

  Cover valid login, wrong password, missing user, inactive user, and expired token. Use fake repository and fake signer; do not require Supabase. Assert wrong credentials produce the same public error.

- [ ] **Step 2: Implement the service and schema**

  Validate username and password as non-empty strings with Zod. Query only `id`, `nama`, `username`, `passwordHash`, `role`, and `isActive`. Use `bcrypt.compare`. Sign a JWT with `sub=user.id`, `role=user.role`, and an 8-hour expiry. Never serialize `passwordHash`.

- [ ] **Step 3: Write failing route and middleware tests**

  Use Supertest with an injected fake auth service. Assert login sets an HttpOnly cookie, `/me` returns the public user, logout clears the cookie, missing cookie returns 401, and a valid Pegawai token is rejected by a Superadmin-only test route with 403.

- [ ] **Step 4: Implement routes and middleware**

  Set cookie options `{ httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 8 * 60 * 60 * 1000 }`. Configure `cookie-parser`, `helmet`, CORS with `origin: FRONTEND_ORIGIN` and `credentials: true`, and rate limit login to 10 attempts per 15 minutes per IP. `requireRole(...roles)` must compare the role from `request.user`, not a client header.

- [ ] **Step 5: Run focused tests and commit**

  ```powershell
  npm run test -w backend -- --run test/auth.service.test.js test/auth.routes.test.js
  git add backend/src/modules/auth backend/test/auth.service.test.js backend/test/auth.routes.test.js backend/src/app.js backend/src/config/env.js
  git commit -m "feat: add cookie jwt authentication and role middleware"
  ```

## Task 4: Add the frontend login and protected role routing

**Files:**
- Create: `frontend/src/api/http.js`, `frontend/src/api/auth.js`
- Create: `frontend/src/features/auth/AuthProvider.jsx`, `frontend/src/features/auth/ProtectedRoute.jsx`, `frontend/src/features/auth/LoginPage.jsx`
- Create: `frontend/src/layouts/EmployeeLayout.jsx`, `frontend/src/layouts/AdminLayout.jsx`
- Create: `frontend/src/pages/EmployeeHomePage.jsx`, `frontend/src/pages/AdminHomePage.jsx`, `frontend/src/pages/ForbiddenPage.jsx`
- Create: `frontend/src/features/auth/AuthProvider.test.jsx`, `frontend/src/features/auth/LoginPage.test.jsx`
- Modify: `frontend/src/App.jsx`, `frontend/src/main.jsx`, `frontend/src/styles.css`

**Interfaces:**
- `http.request(path, options)` always uses `credentials: "include"`, parses JSON, and throws `{ status, message, errors }` for non-2xx responses.
- `AuthProvider` exposes `{ user, loading, login, logout, refreshUser }`.
- Routes map `/login`, `/pegawai/*`, `/admin/*`, and `/403` to role-protected screens.

- [ ] **Step 1: Write failing component tests**

  Mock `fetch`; assert the login form sends the expected endpoint and redirects a successful Pegawai to `/pegawai`, while an invalid response displays `Username atau password tidak valid.`. Assert `ProtectedRoute` renders `/403` for the wrong role.

- [ ] **Step 2: Implement the HTTP client and AuthProvider**

  Use the backend cookie rather than storing a JWT in localStorage. On app mount call `/api/auth/me`; a 401 sets `user=null` without a noisy error. `login` calls `/api/auth/login` then refreshes `/api/auth/me`. `logout` calls the endpoint and clears local state.

- [ ] **Step 3: Implement layouts and route guards**

  Render a small navigation shell with the signed-in user's name, role, and logout button. A Pegawai cannot render AdminLayout; a Superadmin cannot render EmployeeLayout. Keep the first screens functional and responsive with plain CSS.

- [ ] **Step 4: Run frontend tests and commit**

  ```powershell
  npm run test -w frontend -- --run src/features/auth/AuthProvider.test.jsx src/features/auth/LoginPage.test.jsx
  git add frontend/src
  git commit -m "feat: add frontend login and protected role routes"
  ```

## Task 5: Implement master-data backend APIs and validation

**Files:**
- Create: `backend/src/modules/master-data/master.schemas.js`
- Create: `backend/src/modules/master-data/master.service.js`
- Create: `backend/src/modules/master-data/master.routes.js`
- Create: `backend/test/master.service.test.js`, `backend/test/master.routes.test.js`
- Modify: `backend/src/app.js`

**Interfaces:**
- `createMasterService({ prisma })` exposes `listActiveDesa()`, `listActiveRwByDesa(desaId)`, `listActiveTahapan()`, `listAdmin(resource)`, `create(resource, input)`, `update(resource, id, input)`, and `setActive(resource, id, isActive)`.
- Routes implement the P1 read endpoints and Superadmin P1 CRUD/status endpoints exactly as listed in the spec.

- [ ] **Step 1: Write failing service tests**

  Assert active-only reads, RW filtering by `desaId`, duplicate name rejection, composite RW uniqueness, stage boolean validation, and soft-disable behavior. Use a fake Prisma object whose methods record calls.

- [ ] **Step 2: Implement Zod schemas and service**

  Normalize names with `trim()` and collapse repeated spaces before uniqueness checks. Reject an inactive parent Desa for new RW rows. Use Prisma `findMany` with `isActive: true`, `orderBy`, and the indexes from Task 2. Never issue `delete` for master data.

- [ ] **Step 3: Add route authorization and error mapping**

  Public-to-authenticated master reads require `requireAuth`; writes require `requireRole("SUPERADMIN")`. Map validation to 400, duplicate constraints to 409, and missing rows to 404.

- [ ] **Step 4: Run focused backend tests and commit**

  ```powershell
  npm run test -w backend -- --run test/master.service.test.js test/master.routes.test.js
  git add backend/src/modules/master-data backend/test/master.service.test.js backend/test/master.routes.test.js backend/src/app.js
  git commit -m "feat: add master data api and dependent lookup"
  ```

## Task 6: Implement Superadmin master-data screens and Desa–RW dropdown

**Files:**
- Create: `frontend/src/api/master.js`
- Create: `frontend/src/features/master-data/MasterTable.jsx`, `MasterTable.test.jsx`
- Create: `frontend/src/features/master-data/AdminMasterPage.jsx`
- Create: `frontend/src/features/master-data/LocationFields.jsx`, `LocationFields.test.jsx`
- Create: `frontend/src/features/master-data/StageFields.jsx`
- Modify: `frontend/src/pages/AdminHomePage.jsx`, `frontend/src/features/laporan/ReportForm.jsx` when Task 8 exists

**Interfaces:**
- `fetchDesa()`, `fetchRwByDesa(desaId)`, and `fetchTahapan()` return normalized API data.
- `LocationFields({ value, onChange, errors })` emits `{ desaId, rwId }`, clears `rwId` whenever `desaId` changes, and disables RW until a Desa is selected.
- `MasterTable` accepts `{ title, columns, rows, onCreate, onEdit, onToggleActive }` and contains no resource-specific network code.

- [ ] **Step 1: Write failing component tests**

  Assert RW is disabled initially, selecting Desa fetches only its RW, changing Desa clears the old RW, and inactive rows do not render in the report selector. Assert the Stage form shows the `Nomor Perangkat wajib` flag.

- [ ] **Step 2: Implement API helpers and generic table**

  Keep all fetch calls in `frontend/src/api/master.js`. The generic table displays status, edit, and activate/deactivate actions, with confirmation for status changes and a visible error state.

- [ ] **Step 3: Implement admin pages and report field components**

  Add tabbed or route-based pages for Desa, RW, and Tahapan. The RW form requires a parent Desa. The Tahapan form exposes `namaTahapan`, `requiresNomorPerangkat`, `instruksiDokumentasi`, and `isActive`.

- [ ] **Step 4: Run frontend tests and commit**

  ```powershell
  npm run test -w frontend -- --run src/features/master-data/MasterTable.test.jsx src/features/master-data/LocationFields.test.jsx
  git add frontend/src/features/master-data frontend/src/api/master.js frontend/src/pages/AdminHomePage.jsx
  git commit -m "feat: add superadmin master data screens"
  ```

## Task 7: Implement report creation, private Storage adapter, and atomic cleanup

**Files:**
- Create: `backend/src/config/supabase.js`
- Create: `backend/src/modules/laporan/report.schemas.js`
- Create: `backend/src/modules/laporan/report.storage.js`
- Create: `backend/src/modules/laporan/report.service.js`
- Create: `backend/src/modules/laporan/report.routes.js`
- Create: `backend/test/report.service.test.js`, `backend/test/report.routes.test.js`, `backend/test/report.storage.test.js`
- Modify: `backend/src/app.js`, `backend/package.json`, `.env.example`

**Interfaces:**
- `createStorage({ client, bucket, clock })` exposes `upload({ path, file })`, `remove(paths)`, and `createSignedUrl(path, expiresInSeconds=600)`.
- `createReportService({ prisma, storage, clock })` exposes `createReport({ actor, fields, files })` and `getReportDetail({ actor, reportId })`.
- `POST /api/laporan` consumes multipart field names `tanggalKegiatan`, `rwId`, `tahapanId`, `keterangan`, `nomorPerangkat`, and `dokumentasi[]`.

- [ ] **Step 1: Write failing storage and service tests**

  Test that a successful report uploads every file, creates one report plus documentation rows, and returns a report ID. Test that a second upload failure calls `remove` for the first path and never calls `prisma.laporan.create`. Test that a database transaction failure removes every uploaded path. Test that `getReportDetail` calls `createSignedUrl` with 600 seconds and never exposes Storage credentials.

- [ ] **Step 2: Implement Supabase client and Storage adapter**

  Create the server-only client with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; never import this file from frontend code. Use `.storage.from(STORAGE_BUCKET).upload(path, fileBuffer, { contentType, upsert: false })`, `.remove(paths)`, and `.createSignedUrl(path, 600)`. Treat every Supabase `{ data, error }` error as a thrown domain error.

- [ ] **Step 3: Implement multipart validation**

  Use Multer disk storage under `backend/uploads-temp` with a random temporary filename. Reject more than 5 files, files over 10 MB, and MIME types outside `image/jpeg`, `image/png`, and `image/webp`. Use file extension only for the generated path; use the detected MIME type for validation. Always delete temporary files in a `finally` block.

- [ ] **Step 4: Implement report domain validation and transaction**

  Validate `keterangan` length 5–2,000, `tanggalKegiatan` against the `Asia/Jakarta` today/yesterday rule, active RW/Tahapan, and `requiresNomorPerangkat`. Generate a UUID report ID before upload so the object path is deterministic. Run the Prisma writes in a transaction and persist only `storagePath`, original name, MIME type, and byte size.

- [ ] **Step 5: Mount routes and map errors**

  Require a Pegawai session for creation. Derive `actor.id` from the cookie. Return 201 with `{ message, data: { id, createdAt } }` only after all uploads and database writes succeed. Map file and field failures to 400/413 and storage/database failures to 500 without exposing the Supabase error string.

- [ ] **Step 6: Run focused tests and commit**

  ```powershell
  npm run test -w backend -- --run test/report.storage.test.js test/report.service.test.js test/report.routes.test.js
  git add backend/src/config/supabase.js backend/src/modules/laporan backend/test/report.* backend/src/app.js backend/package.json .env.example
  git commit -m "feat: add atomic report and private photo storage"
  ```

## Task 8: Implement the Pegawai report form and upload UX

**Files:**
- Create: `frontend/src/api/reports.js`
- Create: `frontend/src/features/laporan/ReportForm.jsx`, `ReportForm.test.jsx`
- Create: `frontend/src/features/laporan/FilePicker.jsx`, `FilePicker.test.jsx`
- Create: `frontend/src/features/laporan/ReportSuccess.jsx`
- Modify: `frontend/src/features/master-data/LocationFields.jsx`, `frontend/src/features/auth/EmployeeLayout.jsx`, `frontend/src/App.jsx`, `frontend/src/styles.css`

**Interfaces:**
- `createReport(formState)` builds `FormData`, appends exactly the approved field names, and sends `POST /api/laporan` with credentials.
- `FilePicker({ files, onChange, maxFiles=5, maxBytes=10_000_000 })` emits only accepted File objects and presents previews/removal.
- `ReportForm` renders `{ user, stages, villages }` and produces a successful navigation to the report detail route.

- [ ] **Step 1: Write failing component tests**

  Assert PIC is read-only, RW stays disabled until Desa is selected, a stage requiring a device number makes the field required, six files are rejected, a 10 MB plus one byte file is rejected, and a successful submit sends the expected `FormData` fields.

- [ ] **Step 2: Implement FilePicker and field validation**

  Validate size and MIME on selection, show count `n dari maksimal 5 foto`, render object URL previews, revoke object URLs on removal/unmount, and keep text fields in React state after a failed request.

- [ ] **Step 3: Implement the report form**

  Default `tanggalKegiatan` to the current `Asia/Jakarta` date, render the signed-in user's name as read-only, reuse `LocationFields`, load active Tahapan, and show/hide Nomor Perangkat from `requiresNomorPerangkat`. Keep the submit button disabled during the request.

- [ ] **Step 4: Implement success and error behavior**

  On 201, reset the form and route to `/pegawai/laporan/:id`. On 400/413, display field/file errors without clearing the current form. On 401, refresh authentication and return to `/login`.

- [ ] **Step 5: Run frontend tests and commit**

  ```powershell
  npm run test -w frontend -- --run src/features/laporan/FilePicker.test.jsx src/features/laporan/ReportForm.test.jsx
  git add frontend/src/features/laporan frontend/src/features/master-data/LocationFields.jsx frontend/src/features/auth/EmployeeLayout.jsx frontend/src/App.jsx frontend/src/styles.css
  git commit -m "feat: add employee report form and photo picker"
  ```

## Task 9: Implement history, detail, and dashboard backend queries

**Files:**
- Create: `backend/src/modules/history/history.service.js`, `backend/src/modules/history/history.routes.js`
- Create: `backend/src/modules/dashboard/dashboard.service.js`, `backend/src/modules/dashboard/dashboard.routes.js`
- Create: `backend/test/history.service.test.js`, `backend/test/dashboard.service.test.js`, `backend/test/dashboard.routes.test.js`
- Modify: `backend/src/app.js`

**Interfaces:**
- `listOwnReports({ actor, page, limit, tanggal, tahapanId })` always adds `userId: actor.id`.
- `getReportDetail({ actor, reportId })` permits the owner or a Superadmin and enriches documentation with 600-second signed URLs.
- `getDashboard({ date })` returns `{ wajibLapor, sudahMelapor, belumMelapor, jumlahLaporan, distribusiDesa, distribusiTahapan, terbaru }`.
- `listAdminReports(filters)` supports `from`, `to`, `pegawaiId`, `desaId`, `rwId`, `tahapanId`, `page`, and `limit`.

- [ ] **Step 1: Write failing query-service tests**

  Assert owner scoping, 404 for another Pegawai's report, Superadmin access, distinct-user counting for `sudahMelapor`, total-row counting for `jumlahLaporan`, and correct `belumMelapor` set subtraction from active `wajibLapor` users.

- [ ] **Step 2: Implement indexed queries**

  Use Prisma relation filters through `rw.desaId` for Desa filters. Use a single selected business date, not the browser's local date. Query only fields needed by each card/table. Apply stable ordering by `createdAt desc` and bounded `limit`.

- [ ] **Step 3: Implement routes and ownership checks**

  Mount `GET /api/laporan/saya`, `GET /api/laporan/:id`, `GET /api/admin/dashboard`, and `GET /api/admin/laporan`. Require `requireAuth` for owner routes and `requireRole("SUPERADMIN")` for admin routes.

- [ ] **Step 4: Run focused tests and commit**

  ```powershell
  npm run test -w backend -- --run test/history.service.test.js test/dashboard.service.test.js test/dashboard.routes.test.js
  git add backend/src/modules/history backend/src/modules/dashboard backend/test/history.service.test.js backend/test/dashboard.service.test.js backend/test/dashboard.routes.test.js backend/src/app.js
  git commit -m "feat: add report history and dashboard queries"
  ```

## Task 10: Implement history, detail, reports table, and dashboard frontend

**Files:**
- Create: `frontend/src/api/history.js`, `frontend/src/api/dashboard.js`
- Create: `frontend/src/features/laporan/HistoryPage.jsx`, `HistoryPage.test.jsx`
- Create: `frontend/src/features/laporan/ReportDetailPage.jsx`, `ReportDetailPage.test.jsx`
- Create: `frontend/src/features/dashboard/DashboardPage.jsx`, `DashboardPage.test.jsx`
- Create: `frontend/src/features/dashboard/AdminReportsPage.jsx`, `AdminReportsPage.test.jsx`
- Modify: `frontend/src/App.jsx`, `frontend/src/layouts/EmployeeLayout.jsx`, `frontend/src/layouts/AdminLayout.jsx`, `frontend/src/styles.css`

**Interfaces:**
- History pages call only `/api/laporan/saya` and `/api/laporan/:id`.
- Dashboard page renders the exact dashboard response shape from Task 9 and treats missing optional distribution arrays as empty.
- Admin reports page serializes filters using `URLSearchParams` and preserves them during pagination.

- [ ] **Step 1: Write failing page tests**

  Assert history renders reports returned by the API, detail renders a signed URL gallery, Dashboard renders `sudahMelapor` and `belumMelapor` separately from `jumlahLaporan`, and filter changes update the admin request query.

- [ ] **Step 2: Implement history and detail pages**

  Add loading, empty, error, and pagination states. Render the edit action only when the backend-provided `editableUntil` is in the future; never compute permission from the browser alone.

- [ ] **Step 3: Implement dashboard cards and admin table**

  Build responsive cards first, then the report table. Add a manual refresh button. Keep charts out of P1; distributions render as accessible tables or compact bars without a charting dependency.

- [ ] **Step 4: Add P2 polling behind a constant**

  Use a 30-second `setInterval` only on the mounted dashboard, clear it on unmount, and expose a manual refresh button. Add a focused test with fake timers proving the interval is cleared.

- [ ] **Step 5: Run frontend tests and commit**

  ```powershell
  npm run test -w frontend -- --run src/features/laporan/HistoryPage.test.jsx src/features/laporan/ReportDetailPage.test.jsx src/features/dashboard/DashboardPage.test.jsx src/features/dashboard/AdminReportsPage.test.jsx
  git add frontend/src/api frontend/src/features/laporan frontend/src/features/dashboard frontend/src/App.jsx frontend/src/layouts frontend/src/styles.css
  git commit -m "feat: add history admin reports and dashboard ui"
  ```

## Task 11: Add the highest-value P2 features only after P1 verification

**Files:**
- Create: `backend/src/modules/pegawai/pegawai.service.js`, `backend/src/modules/pegawai/pegawai.routes.js`
- Create: `backend/src/modules/export/export.service.js`, `backend/src/modules/export/export.routes.js`
- Create: `backend/test/pegawai.service.test.js`, `backend/test/export.service.test.js`
- Create: `frontend/src/features/pegawai/AdminEmployeesPage.jsx`, `frontend/src/features/pegawai/AdminEmployeesPage.test.jsx`
- Create: `frontend/src/api/export.js`
- Modify: `backend/src/app.js`, `backend/package.json`, `frontend/src/App.jsx`, `frontend/src/features/laporan/HistoryPage.jsx`, `frontend/src/features/laporan/ReportDetailPage.jsx`

**Interfaces:**
- `PATCH /api/admin/pegawai/:id/status` toggles `isActive` and never deletes a user.
- `PUT /api/laporan/:id` rejects edits after `createdAt + 24 hours` and never accepts a new `userId`.
- `GET /api/admin/laporan/export` returns an `.xlsx` stream using the same filter contract as the admin table.

- [ ] **Step 1: Run all P1 tests and the manual vertical slice**

  Do not begin this task until Tasks 1–10 pass and the full demo path works. Record the command output and a short manual checklist in `docs/testing/p1-smoke.md`.

- [ ] **Step 2: Write failing P2 service tests**

  Test user status changes, 24-hour edit acceptance/rejection, filter preservation, and Excel headers/row values. Use a fixed clock in edit tests.

- [ ] **Step 3: Implement user status, edit, filters, and export**

  Keep account creation and password reset out unless the existing P2 changes are green. Use `exceljs` only after the export tests are written and commit the lockfile update.

- [ ] **Step 4: Run P2 tests and commit only green features**

  ```powershell
  npm run test -w backend -- --run test/pegawai.service.test.js test/export.service.test.js
  npm run test -w frontend -- --run src/features/pegawai/AdminEmployeesPage.test.jsx
  git add backend/src/modules/pegawai backend/src/modules/export backend/test frontend/src/features/pegawai frontend/src/api/export.js
  git commit -m "feat: add prioritized admin p2 features"
  ```

  If any P2 feature threatens the P1 demo, revert that feature's work from the current branch and leave P1 intact; do not remove or weaken P1 validation.

## Task 12: Harden the local demo, document setup, and verify completion

**Files:**
- Create: `docs/testing/p1-smoke.md`
- Create: `docs/testing/p1-api-contract.md`
- Modify: `README.md`, `.env.example`, `package.json`, `backend/package.json`, `frontend/package.json`

**Interfaces:**
- `README.md` is the single local setup guide and contains exact commands, required env names, ports, seed commands, test commands, and demo credentials source instructions.
- `docs/testing/p1-smoke.md` records the manual acceptance checklist and the date/result of the last run.
- `docs/testing/p1-api-contract.md` lists the implemented endpoint method, path, auth requirement, request fields, and success/error response shape.

- [ ] **Step 1: Write the failing completion checklist**

  Create the smoke checklist with explicit checks for health, login, role isolation, master data, dependent dropdown, report upload, signed URL detail, history, dashboard, and duplicate-submit prevention. Mark each line as unchecked initially and use it as the manual test artifact.

- [ ] **Step 2: Implement the README and environment guard**

  Document:

  ```powershell
  npm install
  Copy-Item .env.example .env
  npm run prisma:migrate -w backend
  npm run prisma:seed -w backend
  npm run dev
  npm test
  ```

  Backend startup must fail fast with a readable list of missing variables, while unit tests can inject dependencies without a real database.

- [ ] **Step 3: Run the full verification suite**

  ```powershell
  npm test
  npm run build
  npx prisma validate --config backend/prisma.config.ts
  git diff --check
  ```

  Start both services, run the manual smoke checklist twice, confirm no browser console errors, confirm Storage signed URLs expire after 600 seconds, and confirm `git grep` finds no service key, password, JWT secret, or `.env` file.

- [ ] **Step 4: Freeze the demo and commit**

  ```powershell
  git add README.md .env.example docs/testing package.json frontend/package.json backend/package.json package-lock.json
  git commit -m "docs: harden local demo and verification checklist"
  git status --short
  ```

  Expected final state: clean worktree, `main` runnable, P1 tests green, and the manual smoke checklist completed.

## Plan Self-Review

### Spec coverage

- Architecture and local ports: Tasks 1–2.
- PostgreSQL schema, relations, indexes, migrations, seed: Task 2.
- RLS defense-in-depth and service-key boundary: Task 2 and Task 7.
- Login, cookie JWT, role checks, rate limit, owner scoping: Tasks 3–4.
- Desa/RW/Tahapan master and dependent dropdown: Tasks 5–6.
- Report fields, date validation, PIC, conditional device number: Tasks 7–8.
- 1–5 photo upload, private Storage, cleanup, signed URL: Tasks 7–8.
- History and detail: Tasks 9–10.
- Dashboard metrics, filters, polling: Tasks 9–10.
- P2 user management, edit, filters, export: Task 11.
- Error statuses and frontend preservation: Tasks 3, 5, 7, and 8.
- Testing, README, smoke, and demo: Task 12.

### Placeholder scan

The plan contains no `TBD`, `TODO`, "implement later", or "add appropriate error handling" steps. P2/P3 items are explicit priority decisions with concrete boundaries, not missing requirements.

### Interface consistency

- Auth routes use the same cookie and `request.user` contract across Tasks 3, 4, and 7.
- Master data emits `requiresNomorPerangkat`, consumed by the report form.
- Report creation persists `rwId` and `tahapanId`, consumed by history and dashboard queries.
- Dashboard metrics distinguish distinct reporting users from total report rows.
- Storage paths are persisted as `storagePath` and converted to signed URLs only by the backend.
