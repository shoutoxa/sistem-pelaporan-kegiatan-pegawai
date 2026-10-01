# Sistem Pelaporan Kegiatan Pegawai

Aplikasi pelaporan kegiatan pegawai yang terintegrasi dengan REST API FTTH perusahaan. Alur kegiatan menggunakan Project → Cluster → Kategori → Pekerjaan, dengan laporan, lampiran, histori, dashboard admin, dan dokumentasi yang dapat dicetak melalui browser.

Frontend React/Vite berkomunikasi dengan backend Express. Backend mengakses API FTTH; API key perusahaan hanya disimpan di konfigurasi backend.

## Status pengembangan

Integrasi utama tersedia untuk login, Master Data, Pegawai, Laporan, Dashboard, dan Dokumentasi. Sumber data dipilih melalui feature flag. Penugasan cluster dan kewajiban lapor menggunakan endpoint resmi perusahaan.

**Aplikasi lokal masih membutuhkan Supabase lokal/Docker.** Laporan dan lampiran baru disimpan di FTTH, tetapi catatan proses upload (`ftthUpload`) masih memakai PostgreSQL lokal melalui Prisma. Catatan ini melacak pengiriman file dan metadata sampai `SYNCED`; bukan salinan laporan pegawai dan bukan mekanisme retry otomatis.

Pelepasan database lokal masih menunggu mekanisme pengganti, termasuk konfirmasi kemampuan API menangani kegagalan dan pengiriman ulang tanpa duplikasi. Deployment dan validasi produksi belum dilakukan. Data lama Supabase tidak akan dimigrasikan, tetapi belum dihapus secara fisik.

## Fitur dan hak akses

| Bagian | Perilaku pada mode FTTH |
| --- | --- |
| Login | Akun perusahaan melalui `/auth/login`; sesi diperiksa melalui `/auth/me`. |
| Dashboard admin | Laporan seluruh periode tanpa filter/search; kepatuhan pelaporan dihitung untuk hari ini. |
| Master Data | Membaca Project, Cluster, Kategori, dan Pekerjaan; pengelolaan master dilakukan di sistem perusahaan. |
| Pegawai | Membaca akun dan kewajiban lapor perusahaan; pengelolaan akun dilakukan di sistem perusahaan. |
| Laporan admin | Search nama pegawai, project/cluster, atau pekerjaan; detail, pengaturan status, koreksi, dan penghapusan laporan. |
| Laporan pegawai | Mengirim laporan pada cluster yang ditugaskan dan melihat histori miliknya; tidak memiliki aksi verifikasi atau penghapusan. |
| Dokumentasi | Filter Project/Cluster/Pekerjaan, preview foto, unduh lampiran, serta cetak/simpan PDF melalui browser. Dokumen lampiran tidak digabung ke PDF cetak. |

Status laporan: Menunggu, Diterima, atau Ditolak. Laporan Diterima perlu dibuka kembali sebelum dikoreksi admin. Lampiran baru mendukung JPG, PNG, WEBP, dan PDF: 1–5 berkas, maksimal 10 MB per berkas.

## Prasyarat lokal

- Node.js 22 atau lebih baru beserta npm.
- Docker Desktop dengan engine aktif untuk Supabase lokal.
- Akses API FTTH development, API key dari pengelola perusahaan, dan akun FTTH aktif.
- Penugasan cluster di sistem perusahaan untuk pegawai yang akan mengirim laporan.

Jalankan perintah dari root repository. Contoh berikut menggunakan PowerShell.

## Persiapan pertama

### 1. Instal dependensi dan mulai Supabase lokal

```powershell
npm install
npm run supabase:local:start
```

Script memeriksa Docker dan memulai Supabase pada network yang dibatasi ke localhost. Unduhan awal image Docker membutuhkan internet.

### 2. Siapkan konfigurasi

Buat file konfigurasi jika belum ada:

```powershell
if (-not (Test-Path .env.local)) {
    Copy-Item .env.local.example .env.local
}
```

Isi rahasia hanya di `.env.local`, yang diabaikan Git. Gunakan kredensial Supabase **lokal** dari hasil startup/status, bukan kredensial cloud.

| Variabel | Kegunaan |
| --- | --- |
| `DATABASE_URL` | PostgreSQL lokal; template menggunakan `127.0.0.1:54322`. |
| `SUPABASE_URL` | API Supabase lokal; template menggunakan `http://127.0.0.1:54321`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Kunci backend Supabase lokal dari hasil startup/status. |
| `JWT_SECRET` | Rahasia acak untuk konfigurasi autentikasi lokal; jangan gunakan password akun. |
| `FTTH_API_BASE_URL` | URL integration API FTTH dari pengelola perusahaan. |
| `FTTH_API_KEY` | API key perusahaan; jangan masukkan ke variabel frontend `VITE_*`. |
| `PORT` / `FRONTEND_ORIGIN` | Default backend `3000` dan frontend `http://localhost:5173`. |

Template masih menggunakan sumber `local`. Untuk identitas dan seluruh data utama FTTH, atur:

```dotenv
FTTH_API_BASE_URL=https://ftth.digitak.id/ftth_api/integration
FTTH_REPORTS_ENABLED=true
FTTH_AUTH_SOURCE=ftth
FTTH_MIGRATION_MASTER_SOURCE=ftth
FTTH_MIGRATION_USERS_SOURCE=ftth
FTTH_MIGRATION_REPORTS_SOURCE=ftth
FTTH_MIGRATION_DOCUMENTATION_SOURCE=ftth
```

Gunakan API development yang telah disetujui pengelola. `FTTH_REPORTS_ENABLED` tidak mengaktifkan alur tersebut ketika `NODE_ENV=production`; deployment memerlukan konfigurasi dan verifikasi tersendiri.

### 3. Buat Prisma client dan terapkan migration lokal

```powershell
$env:APP_ENV = 'local'
npm run prisma:generate -w backend
npm run db:local:migrate
```

Migration menyiapkan tabel lokal, termasuk jurnal upload. Pada mode FTTH penuh, login memakai ID akun perusahaan langsung: seed akun demo dan pemetaan akun lokal tidak diperlukan.

### 4. Jalankan aplikasi

```powershell
npm run dev:local
```

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend: [http://localhost:3000](http://localhost:3000)
- Health: [http://localhost:3000/api/health](http://localhost:3000/api/health)

Login menggunakan username/password akun FTTH. Role `administrator` dipetakan ke Superadmin dan `user` ke Pegawai. Mode login FTTH tidak menggunakan fallback password demo.

## Pemakaian berikutnya dan mode lama

Buka Docker Desktop, lalu jalankan:

```powershell
npm run supabase:local:start
npm run dev:local
```

`dev:local` secara eksplisit membaca `.env.local` dan menolak alamat database/Supabase remote. Tanpa `APP_ENV=local`, `npm run dev` menggunakan loader `.env` lama. Gunakan `dev:local` untuk panduan ini dan restart backend setelah konfigurasi berubah.

`.env.example` dan `.env.local.example` adalah template. Jangan menghapus `.env.local` selama masih digunakan. Jangan membagikan password, API key, token, atau output status yang memuat kredensial.

Mode legacy `local` tetap tersedia untuk pengembangan/rollback. `npm run db:local:seed` dan `npm run storage:local` ditujukan untuk alur lama yang membutuhkan akun seed dan bucket lokal; bukan syarat login FTTH penuh. Seed membutuhkan `SEED_ADMIN_PASSWORD` dan `SEED_EMPLOYEE_PASSWORD`.

Sesi FTTH berada di memori backend, maksimal satu jam dan tidak melebihi kedaluwarsa token perusahaan. Restart backend mengakhiri sesi sehingga pengguna perlu login kembali. Penyimpanan sesi ini belum ditujukan untuk deployment multi-instance.

## Verifikasi

```powershell
npm run test -w backend -- --run
npm run test -w frontend -- --run
npm run build
npm run lint -w frontend
git diff --check
```

Validasi schema dengan konfigurasi lokal yang sudah terisi:

```powershell
$env:APP_ENV = 'local'
npx prisma validate --config backend/prisma.config.ts
```

Hasil uji browser tanggal 8 September 2026 dan batas pengujiannya tersedia pada [catatan uji penerimaan](docs/integrations/acceptance-progress.md). Catatan itu bukan jaminan kondisi API saat ini atau bukti validasi produksi. Pada sesi tersebut, pengiriman baru, verifikasi admin, dan cetak PDF belum diuji langsung; preview dan download sudah diperiksa.

## Sebelum melepas Supabase/Docker

```powershell
npm run ftth:decommission:check
```

Perintah ini membaca konfigurasi, jumlah record lokal, dan status jurnal tanpa menghapus data. **`preflightPassed=true` tidak berarti aplikasi sudah bebas database lokal.** Jurnal tetap dipakai untuk pengiriman berikutnya meskipun seluruh catatan sebelumnya sudah `SYNCED`.

Sebelum Docker dilepas, mekanisme jurnal harus diganti, seluruh dependensi lokal diperiksa, dan login/laporan/upload/download diuji dengan database lokal dimatikan.

## Dokumentasi lanjutan

- [Kontrak integrasi FTTH](docs/integrations/ftth-api.md)
- [Tahapan migrasi dan feature flag](docs/integrations/full-migration.md)
- [Identitas dan sesi akun perusahaan](docs/integrations/company-identity.md)
- [Izin cluster resmi](docs/integrations/official-cluster-permissions.md)
- [Hasil pengujian dan pekerjaan tersisa](docs/integrations/acceptance-progress.md)
- [Penyempurnaan UI](docs/integrations/ui-refinement.md)

Dokumen tahapan migrasi juga memuat konteks historis. Untuk menjalankan mode FTTH penuh saat ini, gunakan konfigurasi README ini dan perhatikan batas pengujian pada catatan penerimaan.
