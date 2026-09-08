# Migrasi penuh ke FTTH Core

Migrasi dilakukan bertahap. Default seluruh sumber data tetap `local` sehingga
pengembangan tidak memutus login, laporan lama, atau storage Supabase.

## Feature flag

Flag backend berikut menerima nilai `local` atau `ftth` dan default ke `local`:

```dotenv
FTTH_MIGRATION_MASTER_SOURCE=local
FTTH_MIGRATION_USERS_SOURCE=local
FTTH_MIGRATION_REPORTS_SOURCE=local
FTTH_MIGRATION_DOCUMENTATION_SOURCE=local
```

Status flag dapat diperiksa admin melalui `GET /api/admin/integration/ftth/status`.

Tahap kedua: `FTTH_MIGRATION_MASTER_SOURCE=ftth` mengaktifkan pembacaan langsung
Project, Cluster, Kategori, dan Pekerjaan pada halaman Master Data. Endpoint
`GET /api/admin/master-ftth` mempertahankan ID perusahaan dan status nonaktif.
Perubahan master lokal serta sinkronisasi ke lokal diblokir dalam mode ini.
Endpoint referensi formulir lama tetap lokal sampai adapter laporan selesai.
Flag documentation didukung pada tahap Dokumentasi di bawah.
Tidak ada penyalinan atau penghapusan data pada tahap ini.

Tahap Pegawai: `FTTH_MIGRATION_USERS_SOURCE=ftth` mengalihkan daftar
`GET /api/admin/pegawai` ke users perusahaan. Semua role ditampilkan sesuai API,
tanpa mengubah hak akses login lokal. Kewajiban lapor yang tidak diberikan API
ditampilkan sebagai belum tersedia. Admin dapat upload foto profil melalui
endpoint foto FTTH (JPG/PNG/WEBP maksimal 5 MB).
Create/update akun, status aktif, dan wajib lapor diblokir dalam mode FTTH;
pengelolaannya tetap melalui sistem perusahaan. Penugasan cluster memakai endpoint resmi users/:id/clusters;
login dapat dialihkan melalui flag autentikasi di bawah. Tidak ada penyalinan
users maupun penghapusan akun lokal.

Tahap Laporan admin: `FTTH_MIGRATION_REPORTS_SOURCE=ftth` mengalihkan
`GET /api/admin/laporan` dan halaman `/admin/laporan` ke data perusahaan.
Panel detail menggunakan endpoint FTTH yang sudah dilindungi autentikasi,
pemetaan akun, dan role admin untuk status, koreksi, hapus serta unduh lampiran.
Laporan diterima harus dibuka kembali sebelum koreksi. Search hanya nama
pegawai, project/cluster, dan pekerjaan; pencarian dilakukan sebelum pagination.
Karena API belum mendokumentasikan pencarian lintas nama relasi, adapter membaca
batch 100 hingga batas 10.000; jika batas/pagination tidak valid, tampilkan error
dan jangan menampilkan total parsial. Ini perlu diganti search server untuk skala besar.
URL detail lokal lama tetap lokal agar tautan laporan historis tidak berubah sumber.
Pengisian dan histori pegawai pada menu utama sekarang membaca
flag laporan; jika `ftth`, keduanya memakai halaman FTTH yang sama dengan
project/cluster, kategori/pekerjaan, lampiran, dan pembatasan cluster akun.
Jika `local`, komponen lama tetap dipakai. URL percobaan `/pegawai/ftth` dan
`/admin/ftth` dihapus dari navigasi setelah uji langsung; alur utama memakai
halaman Laporan, Histori, Dashboard, Dokumentasi, Pegawai, dan Master Data.
Histori perusahaan menampilkan laporan milik akun yang dipetakan dan statusnya,
tanpa tombol edit/hapus/verifikasi pegawai. Penugasan menggunakan endpoint resmi
FTTH users/:id/clusters dan diperiksa ulang sebelum pengiriman laporan.
Lampiran baru mendukung JPG/PNG/WEBP/PDF (1–5 berkas, maksimal 10 MB per berkas).
Byte lampiran baru dimiliki server FTTH dan dibuka melalui endpoint download
backend; signed URL Supabase tidak digunakan pada jalur FTTH.
Tidak ada migrasi data historis. Rollback laporan: set flag reports ke local.

Tahap Dokumentasi: `FTTH_MIGRATION_DOCUMENTATION_SOURCE=ftth` mengalihkan
halaman `/admin/dokumentasi` dan endpoint datanya ke API perusahaan.
Filter menggunakan ID Project, Cluster, Pekerjaan; pilihan berasal dari laporan
perusahaan sehingga histori master nonaktif tetap dapat dicari. Kelompok cetak
dibedakan berdasarkan ID, bukan hanya nama yang mungkin sama.
Preview foto memakai endpoint download backend dengan pemeriksaan akses dan
relasi lampiran; API key tidak dikirim ke browser. PDF/dokumen disediakan sebagai
tautan buka/unduh, tidak digabung ke PDF cetak. Cetak menunggu seluruh foto siap.
Rollback: ubah flag documentation ke local, restart backend, refresh halaman.

Tahap Dashboard mengikuti `FTTH_MIGRATION_REPORTS_SOURCE`: jika `ftth`,
ringkasan, distribusi berdasarkan ID Project/Pekerjaan, dan laporan terbaru
dibaca seluruhnya dari perusahaan. Tidak menerima filter/search untuk ringkasan
FTTH. Kepatuhan dihitung per tanggal hari ini zona Asia/Jakarta berdasarkan
akun aktif dengan wajib_lapor=true. Jika atribut wajib_lapor belum lengkap,
angka kepatuhan ditampilkan tidak tersedia, bukan nol. Detail laporan terbaru
membuka panel FTTH; tidak memakai URL detail lokal. Rollback memakai flag reports.

Restart backend setelah mengubah `.env.local` dengan `npm run dev:local`.
Rollback: ubah flag master/users menjadi `local`, restart backend, lalu refresh halaman.
Kesalahan API ditampilkan tanpa fallback otomatis agar sumber tidak tercampur.

## Urutan cutover

1. Master Data: project/cluster/process/category dari API FTTH, dengan pemetaan
   ID perusahaan dan rollback eksplisit ke `local`.
2. Pegawai: users FTTH dan penugasan cluster setelah endpoint assignment serta
   aturan login dikonfirmasi.
3. Laporan: endpoint `laporan-kegiatan` sebagai sumber utama, termasuk status
   dan verifikasi.
4. Dokumentasi: endpoint `dokumentasi-laporan` sebagai sumber utama, termasuk
   upload/download dan migrasi file lama.
5. Setelah audit jumlah data, relasi, akses, dan rollback selesai, baru hentikan
   tabel/storage Supabase yang sudah tidak dipakai.

## Login FTTH (transisi)

`FTTH_AUTH_SOURCE=ftth` memakai POST HTTPS `/ftth_api/auth/login` dengan
JSON username/password. Tidak ada fallback akun/password lokal di mode ini.
Role resmi saat pengujian: administrator -> SUPERADMIN, user -> PEGAWAI;
role lain ditolak. Jika seluruh sumber utama sudah ftth, identitas langsung
memakai ID perusahaan tanpa ftthIdentity atau akun lokal. Pada mode campuran,
pemetaan ke akun lokal aktif dengan role yang sama tetap diperlukan.
Lihat `company-identity.md` untuk aktivasi, akses arsip, dan rollback.
Password tidak disimpan. Token upstream hanya berada di memori backend selama
sesi aktif; tidak ditulis ke database/log atau dikirim ke browser.
Cookie HttpOnly berisi ID sesi acak; sesi disimpan di memori backend maksimal
1 jam (tidak melebihi exp upstream). Restart backend mengakhiri semua sesi FTTH.
Setiap permintaan memeriksa token dan status/role user melalui GET resmi
`/ftth_api/auth/me` dengan Bearer token di backend. Respons 401/403 mencabut sesi
lokal. Timeout atau kegagalan server menghasilkan 502 tanpa memberikan akses;
sesi dapat dicoba kembali sampai kedaluwarsa. Redirect upstream ditolak.
Sesi juga terikat ke ID akun lokal dan role saat login. Jika pemetaan atau role
berubah, sesi dibatalkan dan pengguna harus login kembali; sesi lama tidak
berpindah akun atau memperoleh role baru secara diam-diam.
Logout menghapus sesi dan token di memori aplikasi ini. Kontrak FTTH menyatakan
logout bersifat stateless, sehingga endpoint logout tidak mencabut JWT global.
Tidak ada endpoint refresh yang didokumentasikan. Reset password upstream belum
tentu mencabut JWT; aplikasi mengikuti hasil /auth/me dan batas sesi satu jam.
Mode ini belum untuk multi-instance.
Rollback: FTTH_AUTH_SOURCE=local, restart, login kembali dengan akun lokal.

## Syarat sebelum melepas database lokal

- Penugasan dan wajib_lapor sudah dikonfirmasi serta diimplementasikan; lihat
  `official-cluster-permissions.md`. Daftar kosong tidak memberi izin mengirim.
- Identitas langsung perusahaan tersedia ketika semua sumber utama ftth;
  lakukan uji login browser admin/pegawai setelah restart backend.
- Tentukan penyimpanan sesi untuk deployment multi-instance serta mekanisme
  kedaluwarsa/pencabutan sesi perusahaan. Login sukses saja belum membuktikan ini.
- Putuskan migrasi atau arsip laporan/foto lama; siapkan backup, mapping ID,
  deduplikasi, pemeriksaan jumlah/relasi/file, dan latihan rollback.
- Pindahkan fungsi pemetaan yang masih diperlukan sebelum menghapus menu Dev.
- Jalankan uji browser kedua role: login, batas akses cluster, laporan, upload,
  verifikasi, download, preview dan cetak PDF. Test mock tidak menggantikan uji ini.

Jalankan `npm run ftth:decommission:check` sebelum cleanup. Perintah ini hanya
membaca jumlah record lokal dan jurnal upload. `preflightPassed` memastikan
seluruh sumber sudah FTTH dan tidak ada jurnal pending; output selalu menandai
`destructiveCleanupAuthorized=false`. Backup, retensi, dan persetujuan eksplisit
tetap diperlukan sebelum menghentikan Supabase lokal.

## Guardrails

- Jangan mengatur flag ke `ftth` sebelum adapter tahap tersebut tersedia.
- Jangan menghapus Supabase selama login, mapping, laporan lama, atau storage
  masih memakainya.
- Migrasi data harus idempotent, menyimpan mapping ID lama/baru, dan memiliki
  backup serta rollback.
- Perubahan flag diuji di branch migrasi dan environment development terlebih
  dahulu.
