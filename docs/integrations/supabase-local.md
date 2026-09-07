# Supabase lokal (Windows)

Verifikasi lokal 7 September 2026: Docker dan Supabase berhasil dijalankan,
5 migration diterapkan di 127.0.0.1:54322, seed berhasil, bucket private tersedia.
Uji upload/download melalui signed URL, penolakan akses publik, health backend,
serta login admin/pegawai berhasil. Ini bukan verifikasi pengiriman ke API FTTH.
Konfigurasi `.env` cloud tidak diubah. `.env.local` berisi kredensial lokal baru,
diabaikan Git, dan FTTH_REPORTS_ENABLED masih false.

Ruang C: setelah setup sekitar 5,2 GB. Pindahkan disk image Docker melalui pengaturan
resmi Docker atau sediakan ruang tambahan sebelum menyimpan banyak lampiran.

## Akun lokal

Admin: `superadmin`. Pegawai contoh: `pegawai.dewasari`.
Password ada di `.env.local`: SEED_ADMIN_PASSWORD dan SEED_EMPLOYEE_PASSWORD.
Password lokal berbeda dari akun database lama; jangan membagikan file env.

## Prasyarat

Pasang [Docker Desktop untuk Windows](https://docs.docker.com/desktop/setup/install/windows-install/)
dengan backend WSL 2. Selesaikan persetujuan lisensi dan restart jika diminta.
Pastikan Docker Engine berjalan. Sediakan ruang untuk image dan volume database;
pemeriksaan awal C: menunjukkan sekitar 24 GB kosong, pantau sebelum download besar.

## Aktivasi

Jalankan dari `C:\magang\sistem-pelaporan`:

```powershell
npm run supabase:local:start
npm run supabase:local:status
```

Script start membuat/memeriksa network Docker khusus yang mengikat port ke 127.0.0.1.
CLI dipin versi 2.116.0. Jangan menjalankan `supabase link`, `db push`, atau reset cloud.
Lihat [panduan lokal resmi](https://supabase.com/docs/guides/local-development).

Salin `.env.local.example` menjadi `.env.local` melalui editor. Isi service role key
dari hasil status LOKAL, JWT_SECRET acak baru, dan password seed admin/pegawai baru.
Jangan menyalin key cloud. Output status mengandung key; jangan commit atau bagikan.
URL contoh harus sesuai output status lokal (database 54322, API 54321).

```powershell
npm run db:local:migrate
npm run db:local:seed
npm run storage:local
npm run dev:local
```

Hentikan server `npm run dev` lama dengan Ctrl+C dahulu agar tidak memakai port yang
sama. Gunakan `dev:local`, BUKAN `dev`, untuk pengujian ini. Command lokal menolak
database/storage remote dan tidak memakai `.env` cloud sebagai fallback.
Seed hanya untuk akun demo lokal; menjalankan ulang seed mengembalikan password demo.
Bucket `dokumentasi-laporan` dibuat private, foto/PDF maksimal 10 MB.

- Aplikasi: http://localhost:5173
- Backend health: http://localhost:3000/api/health
- Studio lokal: http://localhost:54323

Untuk pengujian FTTH, isi key API DEVELOPMENT dan aktifkan FTTH_REPORTS_ENABLED pada
`.env.local`, restart `dev:local`, lalu ikuti [panduan FTTH](ftth-api.md).
Database/file lokal tidak membuat API FTTH menjadi offline: pengiriman laporan tetap
menulis ke API development perusahaan dan membutuhkan koneksi internet.

## Berhenti

Hentikan aplikasi dengan Ctrl+C, lalu `npm run supabase:local:stop`.
Jangan memakai `--no-backup`, menghapus volume Docker, atau reset tanpa backup.
Database lama tetap terpisah; jangan menjalankan migration dengan `npm run dev`/env cloud.
