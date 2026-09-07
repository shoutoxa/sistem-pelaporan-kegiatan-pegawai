# Integrasi FTTH — branch development

Kontrak: `API_INTEGRATION (3).md`, September 2026. Master, users, projects,
clusters tersedia untuk GET. `laporan-kegiatan` dan `dokumentasi-laporan`
menyediakan CRUD metadata. Upload biner tersedia melalui POST
`/integration/dokumentasi-laporan/upload`, multipart field `file`. Endpoint login
masih belum didokumentasikan.

## Hasil uji langsung 7 September 2026

Upload satu PNG sintetis 68 byte berhasil: mime_type image/png dan file_size 68.
Path hasil upload: `/uploads/6dccad77-ab13-4035-a7f6-0aace3f78167.png`.
Namun URL sesuai dokumen, `https://ftth.digitak.id/ftth/uploads/6dccad77-ab13-4035-a7f6-0aace3f78167.png`,
mengembalikan HTTP 200, Content-Type text/html, 776 byte, BUKAN PNG tersebut.
Tim FTTH perlu mengonfirmasi URL file atau memperbaiki routing static file.
Ini tidak membuktikan file publik/private; respons yang diterima bukan file.
File uji tertinggal di FTTH untuk diagnosis; tidak dibuat laporan atau metadata
lampiran dan endpoint penghapusan file fisik belum didokumentasikan.

Untuk lampiran yang sudah tercatat, aplikasi sekarang memakai endpoint resmi
`GET /dokumentasi-laporan/{id}/download` melalui backend. URL `/ftth/uploads/...`
tidak lagi diberikan langsung ke browser; backend memeriksa kepemilikan laporan,
menambahkan API key secara server-side, lalu meneruskan berkas sebagai response
binary. Tautan preview memakai mode default, sedangkan tombol Unduh meneruskan
`?mode=download` agar server mengirim `Content-Disposition: attachment`.

Client backend juga sudah memiliki dukungan endpoint foto profil FTTH:
`GET /users/{id}/foto` (preview/force download) dan `POST /users/{id}/foto`
(multipart field `file`). Fitur ini belum menggantikan foto profil lokal pada UI.

98 test backend, 25 test frontend, dan build lulus. Migration remote_path berhasil
di database lokal. API key disimpan di .env.local (diabaikan Git), mode FTTH tetap
false sampai akses file dikonfirmasi. Alur CRUD laporan live belum diuji.

## Asumsi sementara

- Login lokal tetap memverifikasi password dan session. Admin memetakan akun lokal
  ke UUID users FTTH secara eksplisit, bukan berdasarkan kesamaan nama/email.
- SUPERADMIN mengelola; PEGAWAI membuat dan melihat laporan miliknya, tanpa edit/hapus
  pada alur FTTH. Status dari API ditampilkan sebagai Menunggu/Diterima/Perlu revisi.
- Backend mengunggah lampiran BARU ke FTTH, menyimpan remote_path di jurnal, lalu
  mengirim metadata menggunakan file_url dari respons upload. MIME/ukuran/path
  respons divalidasi. Tautan file hanya dibentuk dari path /uploads/ yang aman
  pada host FTTH resmi, bukan URL bebas dari respons API.
- Lampiran lama dengan prefix ftth-laporan tetap memakai signed URL Supabase
  10 menit. Data/file lama tidak dipindahkan. Link server FTTH tidak disebut private.
- Izin cluster sementara ditetapkan admin dalam pemetaan development. Ini BUKAN
  sinkronisasi penugasan resmi FTTH; kontrak field penugasan masih perlu disepakati.

## Menjalankan dengan aman

Untuk pilihan Supabase lokal, gunakan [panduan Supabase lokal](supabase-local.md).
Gunakan command `db:local:migrate`, `db:local:seed`, dan `dev:local` dari panduan itu
agar `.env` database lama tidak terpakai. Langkah generik di bawah hanya untuk
environment yang sudah dipastikan terpisah.

1. Gunakan branch `feat/integrasi-api-ftth`.
2. Arahkan DATABASE_URL ke database development terpisah, bukan database utama.
   Buat backup sebelum migration. Jangan reset/seed database lama.
3. Dari folder backend, jalankan `npx prisma migrate deploy`, lalu `npx prisma generate`.
   Migration `202609030001_ftth_master_integration` menambah kategori/master process;
   `202609070001_ftth_identity` menambah pemetaan akun dan jurnal lampiran.
   `202609070002_ftth_remote_upload` menambah remote_path pada jurnal tanpa
   mengubah receipt atau file lama.
   Tidak ada penyalinan laporan lama ke FTTH. Migration lama memerlukan role PostgreSQL
   Supabase; PostgreSQL kosong biasa perlu persiapan role terlebih dahulu.
4. Isi konfigurasi BACKEND di .env lokal, bukan variabel Vite/frontend atau Git:

   ```dotenv
   FTTH_API_BASE_URL=https://ftth.digitak.id/ftth_api/integration
   FTTH_API_KEY=<secret dari tim FTTH>
   FTTH_API_TIMEOUT_MS=10000
   FTTH_REPORTS_ENABLED=true
   ```

   Flag default false. Mode tulis development dinonaktifkan bila NODE_ENV=production.
   Pastikan tujuan API memang development; flag ini tidak mendeteksi lingkungan remote.
5. Jalankan `npm run dev` dari root proyek.
6. Login admin lokal, buka `/admin/ftth`. Petakan ID FTTH admin dan pegawai; pilih
   cluster yang memang ditugaskan kepada pegawai untuk pengujian.
7. Login pegawai lokal, buka `/pegawai/ftth`. Pilih Project → Cluster dan
   Kategori → Pekerjaan, isi laporan, lalu unggah lampiran.
8. Admin menerima, menolak (catatan wajib), membuka kembali, mengoreksi, atau menghapus
   laporan dari halaman FTTH. Buka kembali APPROVED sebelum mengoreksi.

Dashboard/Laporan/Dokumentasi lama tetap menggunakan data lokal. Menu FTTH adalah area
uji terpisah, belum penggantian penuh aplikasi. Sinkronisasi kategori/pekerjaan lama
tetap tersedia di Master Data; form FTTH membaca master langsung dari API.

## Endpoint aplikasi

Semua `/api/ftth/*` memerlukan session login lokal. API key tidak dikirim ke browser.

| Endpoint | Akses |
|---|---|
| GET status | Semua akun login |
| GET references | Admin semua; pegawai hanya project/cluster yang diizinkan |
| GET mappings, PUT mappings/:userId | Admin |
| GET reports, GET reports/:id | Admin semua; pegawai miliknya |
| GET reports/:reportId/attachments/:attachmentId/download | Admin; pegawai hanya lampiran laporan miliknya |
| POST reports (multipart dokumentasi) | Akun terpetakan; status selalu PENDING |
| PUT reports/:id | Admin; APPROVED terkunci |
| PATCH reports/:id/status | Admin; verifikator dari session/mapping |
| DELETE reports/:id | Admin; penghapusan berkas fisik mengikuti kebijakan FTTH |

List memakai limit 25 dan offset eksplisit. Master dipaginasi sampai 10.000 baris,
lalu berhenti dengan error jika memerlukan pagination UI yang lebih besar.
Lampiran sementara 1–5 JPG/PNG/WEBP/PDF, maksimum 10 MB per berkas dengan pemeriksaan
signature isi. KMZ/XLSX, input link, serta pekerjaan allow_file=false belum didukung.

## Kegagalan parsial dan pemulihan

Upload FTTH, metadata FTTH, dan jurnal lokal bukan transaksi tunggal.
Tidak ada retry otomatis POST/PUT/DELETE.
Jika POST laporan timeout, periksa list FTTH sebelum mengirim lagi: server mungkin
sudah membuat laporan. Kontrak idempotency key belum tersedia.

Setelah laporan terbentuk, tiap lampiran dicatat di `ftth_upload` sebelum upload:

- PREPARED: upload belum terkonfirmasi.
- REMOTE_UPLOADED: upload FTTH terkonfirmasi, remote_path tersimpan; metadata
  FTTH mungkin sudah tersimpan meski respons timeout.
- UPLOADED: receipt lama, upload ke Supabase terkonfirmasi.
- SYNCED: metadata FTTH terkonfirmasi.

Admin melihat maksimal 100 jurnal tertunda. Jangan mengirim ulang laporan. Periksa
server penyimpanan dan GET dokumentasi-laporan berdasarkan laporanId, cocokkan file_url
sebelum perbaikan manual. Tidak ada retry atau penghapusan berkas otomatis. Bila jurnal
gagal ditulis, nama lampiran muncul di peringatan respons dan file belum diunggah.

DELETE laporan menghapus laporan/metadata lewat FTTH; jurnal dan berkas Supabase lama
tidak diubah. Retensi/penghapusan berkas fisik FTTH belum dikonfirmasi.

Aturan status diperiksa backend aplikasi. API FTTH tetap perlu conditional updates
atau transaksi sendiri untuk melindungi balapan perubahan dari aplikasi lain.
Mode ini belum menjamin atomic approval lock lintas aplikasi dan belum siap produksi.

## Pengujian

```powershell
npm run test -w backend -- --run
npm run test -w frontend -- --run
npm run build
npm run lint -w frontend
git diff --check
```

Unit test memakai mock API/storage. Kelulusan test bukan bukti migration database,
upload bucket, atau round-trip API langsung berhasil.
