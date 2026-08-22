# Sistem Pelaporan Kegiatan Pegawai

Prototipe fungsional lokal untuk pelaporan kegiatan harian pegawai, dokumentasi foto, master Desa/RW/Tahapan, histori, dan dashboard Superadmin. Arsitektur dipisah menjadi Vite/React frontend, Express backend, Prisma PostgreSQL, dan Supabase Storage privat.

## Prasyarat

- Node.js 22 atau lebih baru.
- Project Supabase dengan PostgreSQL dan bucket Storage privat bernama `dokumentasi-laporan`.
- Service key Supabase hanya disimpan di backend `.env`.

## Konfigurasi lokal

```powershell
npm install
Copy-Item .env.example .env
```

Isi `.env` dengan `DATABASE_URL`, `JWT_SECRET`, `SUPABASE_URL`, salah satu `SUPABASE_SECRET_KEY` atau `SUPABASE_SERVICE_ROLE_KEY`, `STORAGE_BUCKET`, dan password seed. Untuk memaksa konfigurasi lengkap sebelum backend start, set `REQUIRE_FULL_CONFIG=true`.

```powershell
$env:REQUIRE_FULL_CONFIG='true'
npm run prisma:generate -w backend
npm run prisma:migrate -w backend
npm run prisma:seed -w backend
```

Password demo tidak disimpan di repository; gunakan nilai `SEED_ADMIN_PASSWORD` dan `SEED_EMPLOYEE_PASSWORD` dari `.env` saat seed, lalu login menggunakan username `superadmin` atau salah satu username pegawai yang tercantum di `backend/prisma/seed-data.js`.

## Akun demo

- `superadmin`
- `pegawai.dewasari`
- `pegawai.kertasari`
- `pegawai.pamalayan`
- `pegawai.handapherang`

Superadmin dapat memantau dashboard, memfilter/mengekspor laporan, mengelola akun pegawai, dan mengelola master Desa, RW, serta Tahapan. Pegawai dapat membuat laporan, melihat histori/detail, dan mengedit data laporan miliknya selama 24 jam tanpa mengganti dokumentasi.

## Menjalankan

```powershell
npm run dev
```

Frontend: `http://localhost:5173`
Backend: `http://localhost:3000`

Mode tanpa `.env` masih dapat menjalankan health slice untuk pengembangan UI. Fitur login, database, dan Storage membutuhkan konfigurasi Supabase lengkap.

## Verifikasi

```powershell
npm test
npm run build
npm run lint -w frontend
npx prisma validate --config backend/prisma.config.ts
git diff --check
```

Checklist manual dan kontrak endpoint tersedia di `docs/testing/p1-smoke.md` dan `docs/testing/p1-api-contract.md`.
