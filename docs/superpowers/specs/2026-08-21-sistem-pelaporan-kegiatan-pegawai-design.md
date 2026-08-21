# Sistem Pelaporan Kegiatan Pegawai Harian — Design Specification

**Status:** Disetujui sebagai dasar prototipe fungsional 1 minggu  
**Tanggal:** 21 Agustus 2026  
**Pelaksana:** Satu orang  
**Target operasi:** Frontend dan backend berjalan lokal; PostgreSQL dan Storage menggunakan Supabase  
**Pendekatan delivery:** Vertical slice bertahap

## 1. Ringkasan

Sistem Pelaporan Kegiatan Pegawai Harian adalah sub-sistem operasional untuk mencatat kegiatan lapangan setiap hari. Sistem bukan sistem kepegawaian menyeluruh. Pegawai mengirim laporan kegiatan beserta foto dokumentasi, melihat histori miliknya, dan mengedit data laporan selama masih dalam batas waktu. Superadmin mengelola master data serta memantau laporan melalui dashboard.

Prototipe harus mempunyai satu alur utuh yang dapat didemonstrasikan:

1. Superadmin mengelola master Desa, RW, dan Tahapan Pekerjaan.
2. Pegawai login.
3. Pegawai membuat laporan dengan dokumentasi foto.
4. Pegawai membuka histori dan detail laporan.
5. Superadmin melihat laporan tersebut pada daftar laporan dan dashboard.

Fondasi sistem tetap memisahkan frontend, backend, database, dan file storage agar dapat dikembangkan setelah periode prototipe.

## 2. Tujuan dan Kriteria Keberhasilan

### 2.1 Tujuan

- Menggantikan proses pelaporan Google Form dengan aplikasi yang memiliki autentikasi dan pembagian hak akses.
- Menjamin PIC laporan berasal dari akun yang login.
- Menjaga konsistensi hubungan Desa dan RW.
- Menyediakan Tahapan Pekerjaan yang dapat dikelola sebagai master data.
- Menyimpan data terstruktur pada PostgreSQL dan dokumentasi foto pada private object storage.
- Menyediakan histori Pegawai dan monitoring Superadmin.

### 2.2 Kriteria keberhasilan prototipe

Prototipe dianggap berhasil apabila:

- Dapat dijalankan dari petunjuk pada README.
- Login Pegawai dan Superadmin berhasil.
- Pengguna tidak dapat melewati pembatasan role melalui halaman maupun API.
- Master Desa, RW, dan Tahapan dapat dikelola.
- Pegawai dapat membuat laporan dengan 1–5 foto.
- PIC laporan berasal dari sesi login.
- Histori dan detail laporan dapat dibuka oleh pemilik.
- Superadmin dapat melihat seluruh laporan.
- Dashboard menampilkan perhitungan Pegawai sudah dan belum melapor secara benar.
- Tidak ada credential atau secret di repository.
- Alur demo utama berhasil dijalankan dua kali berturut-turut tanpa memperbaiki data secara manual.

## 3. Ruang Lingkup dan Prioritas

### 3.1 P1 — Wajib selesai

- Struktur frontend dan backend.
- Koneksi PostgreSQL dan private Storage melalui Supabase.
- Migrasi database dan data seed.
- Login, logout, sesi, dan pembatasan role.
- Master Desa, RW, dan Tahapan Pekerjaan.
- Aktif/nonaktif master data.
- Dependent dropdown Desa–RW.
- Nomor Perangkat kondisional berdasarkan Tahapan.
- Input laporan.
- Upload 1–5 foto.
- Histori dan detail laporan Pegawai.
- Daftar seluruh laporan Superadmin.
- Dashboard dasar: wajib lapor, sudah melapor, belum melapor, dan jumlah laporan.

### 3.2 P2 — Dikerjakan setelah P1 stabil

- Pengelolaan akun Pegawai melalui antarmuka Superadmin.
- Edit laporan oleh pemilik selama 24 jam.
- Filter laporan lengkap.
- Ekspor Excel.
- Refresh dashboard otomatis setiap 30 detik.

### 3.3 P3 — Ditunda jika waktu tidak cukup

- Grafik dashboard.
- Penyimpanan draft offline.
- Reset password melalui antarmuka.
- Penggantian foto dokumentasi setelah laporan dikirim.
- Pengujian end-to-end lengkap dengan Playwright.
- Animasi atau tampilan kompleks.
- Ekspor PDF.
- Notifikasi WhatsApp atau email.
- Aplikasi mobile native.

## 4. Arsitektur

### 4.1 Komponen

```text
Vite + React (localhost:5173)
           │
           │ HTTPS/REST API + cookie
           ▼
Node.js + Express (localhost:3000)
           ├── Prisma ORM ───────► Supabase PostgreSQL
           └─────────────────────► Supabase Storage (private bucket)
```

Frontend tidak mengakses PostgreSQL atau Storage secara langsung. Backend menjadi batas kepercayaan untuk autentikasi, otorisasi, validasi aturan bisnis, query database, upload file, dan pembuatan signed URL.

### 4.2 Struktur proyek

```text
sistem-pelaporan/
├── frontend/
│   └── src/
│       ├── api/
│       ├── components/
│       ├── features/
│       │   ├── auth/
│       │   ├── laporan/
│       │   ├── master-data/
│       │   └── dashboard/
│       ├── layouts/
│       ├── pages/
│       └── router/
├── backend/
│   ├── prisma/
│   ├── uploads-temp/
│   └── src/
│       ├── config/
│       ├── middleware/
│       ├── modules/
│       │   ├── auth/
│       │   ├── laporan/
│       │   ├── master-data/
│       │   └── dashboard/
│       ├── app.js
│       └── server.js
├── docs/
├── .env.example
└── README.md
```

### 4.3 Teknologi

- Frontend: Vite + React dengan JavaScript.
- Runtime: Node.js 22+; versi lokal terverifikasi `v22.23.1`.
- Backend: Express pada Node.js 22+.
- Database: Supabase PostgreSQL.
- Akses database dan migrasi: Prisma ORM.
- File storage: Supabase Storage.
- Autentikasi: username/password, bcrypt, dan JWT dalam cookie HttpOnly.
- Pengujian API: Vitest dengan Supertest.
- Pengujian end-to-end: Playwright hanya jika P1 dan P2 utama sudah stabil.

## 5. Model Data

### 5.1 Entitas dan atribut

#### users

```text
id             UUID primary key
nama           string
username       string unique
password_hash  string
role           SUPERADMIN | PEGAWAI
is_active      boolean
wajib_lapor    boolean
created_at     timestamp
updated_at     timestamp
```

#### desa

```text
id          UUID primary key
nama_desa   string
is_active   boolean
created_at  timestamp
updated_at  timestamp
```

#### rw

```text
id          UUID primary key
desa_id     UUID foreign key -> desa.id
nomor_rw    string
is_active   boolean
created_at  timestamp
updated_at  timestamp

unique (desa_id, nomor_rw)
```

#### tahapan

```text
id                           UUID primary key
nama_tahapan                 string
requires_nomor_perangkat     boolean
instruksi_dokumentasi        nullable string
is_active                    boolean
created_at                   timestamp
updated_at                   timestamp
```

#### laporan

```text
id                  UUID primary key
user_id             UUID foreign key -> users.id
rw_id               UUID foreign key -> rw.id
tahapan_id          UUID foreign key -> tahapan.id
tanggal_kegiatan    date
keterangan          text
nomor_perangkat     nullable string
created_at          timestamp
updated_at          timestamp
```

#### dokumentasi

```text
id              UUID primary key
laporan_id      UUID foreign key -> laporan.id
storage_path    string unique
original_name   string
mime_type       string
file_size       integer
created_at      timestamp
```

### 5.2 Relasi

```text
users    1 ─── N laporan
desa     1 ─── N rw
rw       1 ─── N laporan
tahapan  1 ─── N laporan
laporan  1 ─── N dokumentasi
```

Tabel `laporan` hanya menyimpan `rw_id`. Desa diturunkan melalui `rw.desa_id`; `desa_id` tidak disimpan ulang pada laporan.

### 5.3 Aturan referensi

- Master data yang sudah direferensikan tidak dihapus secara fisik.
- Superadmin mengubah `is_active` untuk menyembunyikan master dari input baru.
- Laporan lama tetap dapat menampilkan master data yang sudah nonaktif.
- Penghapusan relasi master menggunakan kebijakan database `RESTRICT`.
- Dokumentasi menggunakan relasi ke laporan; penghapusan laporan tidak tersedia pada MVP.

### 5.4 Kebijakan waktu

- Timestamp disimpan dalam UTC.
- Tanggal bisnis dan batas hari dihitung menggunakan zona waktu `Asia/Jakarta`.
- Aturan "hari ini atau satu hari sebelumnya" menggunakan tanggal kalender pada zona waktu tersebut.
- Batas edit 24 jam dihitung dari selisih timestamp `created_at` saat ini.

## 6. Data Seed

Seed menyediakan:

- Satu akun Superadmin.
- Empat akun Pegawai untuk demonstrasi.
- Desa Dewasari.
- Desa Handapherang.
- Kelurahan Kertasari.
- Desa Pamalayan.
- Beberapa RW contoh pada setiap Desa; data ini diberi label sebagai data demo, bukan pemetaan resmi perusahaan.
- Tahapan Pekerjaan awal dari Google Form:
  1. Absensi Mulai (Lengkap APD).
  2. Penggalian Lubang.
  3. Penanaman Tiang.
  4. Pengecoran Tiang.
  5. Penarikan Kabel FO.
  6. Pemasangan ODN.
  7. Penarikan Kabel DW.
  8. Pemasangan HB & Splicing.
  9. Pemasangan X-Frame.
  10. Pemasangan JC & Splicing.
  11. Perapihan.

Password seed dibaca dari environment variable. Password tidak ditulis sebagai literal di repository.

## 7. Autentikasi dan Otorisasi

### 7.1 Alur login

1. Pengguna mengirim username dan password.
2. Backend mencari user berdasarkan username.
3. Backend menolak user yang tidak ditemukan atau nonaktif.
4. Backend memverifikasi password melalui bcrypt.
5. Backend membuat JWT berisi `user_id` dan `role`.
6. JWT disimpan dalam cookie HttpOnly.
7. Frontend mengambil profil melalui `GET /api/auth/me`.
8. Frontend mengarahkan pengguna ke area sesuai role.

### 7.2 Kebijakan sesi prototipe

- Masa sesi: 8 jam.
- Cookie: `HttpOnly=true`, `SameSite=Lax`.
- Cookie lokal: `Secure=false`.
- Konfigurasi produksi harus menggunakan HTTPS dan `Secure=true`.
- Logout menghapus cookie sesi.
- Pesan login gagal dibuat umum: `Username atau password tidak valid.`
- Login dibatasi maksimum 10 percobaan dalam 15 menit per IP untuk prototipe.
- CORS hanya mengizinkan origin frontend yang dikonfigurasi.

### 7.3 Middleware

- `requireAuth`: memvalidasi JWT dan memastikan akun masih aktif.
- `requireRole(...roles)`: membatasi endpoint berdasarkan role.
- PIC laporan selalu menggunakan `request.user.id` dari sesi terverifikasi.

### 7.4 Hak akses

| Fungsi | Pegawai | Superadmin |
|---|---|---|
| Login/logout | Ya | Ya |
| Membuat laporan | Ya, untuk diri sendiri | Tidak diperlukan |
| Melihat histori | Hanya milik sendiri | Seluruh laporan |
| Mengedit laporan | P2, milik sendiri, maksimal 24 jam | Tidak |
| Menghapus laporan | Tidak | Tidak |
| Mengelola Pegawai | Tidak | P2 |
| Mengelola Desa/RW/Tahapan | Tidak | Ya |
| Dashboard | Tidak | Ya |
| Ekspor Excel | Tidak | P2 |

## 8. Master Data

### 8.1 API baca untuk form

```text
GET /api/master/desa
GET /api/master/desa/:desaId/rw
GET /api/master/tahapan
```

Endpoint tersebut hanya mengembalikan master aktif.

### 8.2 API Superadmin

```text
GET   /api/admin/desa
POST  /api/admin/desa
PUT   /api/admin/desa/:id
PATCH /api/admin/desa/:id/status

GET   /api/admin/rw
POST  /api/admin/rw
PUT   /api/admin/rw/:id
PATCH /api/admin/rw/:id/status

GET   /api/admin/tahapan
POST  /api/admin/tahapan
PUT   /api/admin/tahapan/:id
PATCH /api/admin/tahapan/:id/status

GET   /api/admin/pegawai
POST  /api/admin/pegawai
PUT   /api/admin/pegawai/:id
PATCH /api/admin/pegawai/:id/status
```

Endpoint Pegawai adalah P2. Endpoint Desa, RW, dan Tahapan adalah P1.

### 8.3 Aturan validasi

- Nama Desa wajib dan tidak boleh duplikat setelah normalisasi spasi dan huruf.
- Nomor RW wajib menggunakan format konsisten, misalnya `RW 01`.
- Kombinasi `desa_id` dan `nomor_rw` harus unik.
- RW wajib memiliki Desa.
- Nama Tahapan wajib dan tidak boleh duplikat.
- `requires_nomor_perangkat` wajib berupa boolean.
- Username Pegawai wajib unik.
- Role akun baru dari menu Pegawai selalu `PEGAWAI`.
- Master nonaktif tidak tersedia bagi laporan baru.

### 8.4 Dependent dropdown Desa–RW

1. Form memuat Desa aktif.
2. Dropdown RW nonaktif sebelum Desa dipilih.
3. Pemilihan Desa memicu permintaan RW milik Desa tersebut.
4. Perubahan Desa mengosongkan RW sebelumnya.
5. Laporan hanya mengirim `rwId`; `desaId` tidak menjadi sumber data laporan.

## 9. Laporan dan Dokumentasi

### 9.1 Definisi satu laporan

Satu laporan mewakili satu kegiatan oleh satu Pegawai pada satu RW, satu Tahapan Pekerjaan, dan satu tanggal kegiatan. Pegawai boleh membuat beberapa laporan pada hari yang sama apabila kegiatan, lokasi, atau Tahapan berbeda.

### 9.2 Kolom form

| Kolom | Status | Aturan |
|---|---|---|
| PIC | Otomatis | Dari sesi, read-only |
| Tanggal Kegiatan | Wajib | Hari ini atau satu hari sebelumnya |
| Desa | Wajib di UI | Memfilter RW |
| RW | Wajib | Master aktif |
| Tahapan | Wajib | Master aktif |
| Keterangan | Wajib | 5–2.000 karakter |
| Nomor Perangkat | Kondisional | Wajib bila Tahapan mengharuskan |
| Dokumentasi | Wajib | 1–5 foto |

Saat Tahapan dengan `requires_nomor_perangkat=false` dipilih, frontend menyembunyikan dan mengosongkan Nomor Perangkat. Backend mengulang pemeriksaan tersebut.

### 9.3 Aturan dokumentasi

- Jumlah: minimal 1 dan maksimal 5 file.
- Ukuran: maksimal 10 MB per file.
- Format: JPEG/JPG, PNG, dan WEBP.
- Validasi dilakukan berdasarkan MIME type dan batas ukuran di backend.
- Bucket bernama `dokumentasi-laporan` dan bersifat privat.
- Object path: `laporan/{userId}/{tanggalKegiatan}/{reportId}/{uuid-file}.{ext}`.
- Nama asli file disimpan sebagai metadata dan tidak menjadi object path.
- Database menyimpan `storage_path`, bukan permanent public URL.
- Backend membuat signed URL dengan masa berlaku 10 menit setelah pemeriksaan hak akses.

### 9.4 Proses penyimpanan

1. Verifikasi sesi Pegawai.
2. Validasi field dan file.
3. Pastikan RW dan Tahapan aktif.
4. Validasi aturan Nomor Perangkat.
5. Buat `reportId`.
6. Upload seluruh foto ke Storage.
7. Simpan laporan dan metadata dokumentasi dalam transaksi database.
8. Kembalikan respons berhasil setelah seluruh proses selesai.

Jika upload sebagian gagal, file yang sempat berhasil diunggah dibersihkan dan laporan tidak disimpan. Jika transaksi database gagal setelah upload selesai, backend menghapus seluruh file baru agar tidak menjadi file yatim.

### 9.5 API laporan

```text
POST /api/laporan
GET  /api/laporan/saya
GET  /api/laporan/:id
PUT  /api/laporan/:id   # P2
```

`POST /api/laporan` menggunakan `multipart/form-data` dengan field:

```text
tanggalKegiatan
rwId
tahapanId
keterangan
nomorPerangkat
dokumentasi[]
```

`userId`, nama PIC, dan `desaId` tidak diterima sebagai sumber identitas atau lokasi laporan.

### 9.6 Aturan edit P2

- Hanya pemilik laporan.
- Maksimal 24 jam sejak `created_at`.
- Field teks, tanggal, RW, Tahapan, dan Nomor Perangkat dapat diubah.
- Dokumentasi tidak dapat diganti pada prototipe.
- Laporan tidak dapat dihapus.

## 10. Histori dan Dashboard

### 10.1 Histori Pegawai

`GET /api/laporan/saya` selalu memfilter berdasarkan user pada sesi. Parameter opsional:

```text
page
limit
tanggal
tahapanId
```

Daftar menampilkan tanggal, waktu kirim, Desa/RW, Tahapan, Nomor Perangkat, ringkasan keterangan, jumlah foto, dan status edit. Detail menampilkan semua field serta galeri dokumentasi melalui signed URL.

### 10.2 Dashboard Superadmin

```text
GET /api/admin/dashboard?date=YYYY-MM-DD
```

Definisi metrik:

- **Pegawai wajib lapor:** user dengan `role=PEGAWAI`, `is_active=true`, dan `wajib_lapor=true`.
- **Sudah melapor:** Pegawai wajib lapor yang memiliki minimal satu laporan pada `tanggal_kegiatan` terpilih.
- **Belum melapor:** Pegawai wajib lapor tanpa laporan pada tanggal terpilih.
- **Jumlah laporan:** seluruh laporan pada tanggal terpilih.
- **Distribusi Desa:** jumlah laporan melalui relasi RW ke Desa.
- **Distribusi Tahapan:** jumlah laporan per Tahapan.
- **Laporan terbaru:** beberapa laporan berdasarkan `created_at` terbaru.

Pegawai yang mengirim tiga laporan dihitung satu kali dalam `Sudah melapor` dan tiga kali dalam `Jumlah laporan`.

### 10.3 Daftar laporan Superadmin

```text
GET /api/admin/laporan
```

Filter:

```text
from
to
pegawaiId
desaId
rwId
tahapanId
page
limit
```

### 10.4 Refresh dan ekspor P2

- Dashboard memuat data saat dibuka.
- Refresh manual selalu tersedia.
- Auto-refresh 30 detik ditambahkan sebagai P2 tanpa WebSocket.
- `GET /api/admin/laporan/export` menghasilkan `.xlsx` mengikuti filter daftar laporan.
- Foto tidak dimasukkan ke file Excel dan signed URL tidak diekspor karena memiliki masa kedaluwarsa.

## 11. Error Handling

### 11.1 Bentuk respons error

Backend menggunakan bentuk konsisten:

```json
{
  "message": "Data laporan tidak valid",
  "errors": {
    "rwId": "RW tidak tersedia",
    "dokumentasi": "Minimal satu foto wajib diunggah"
  }
}
```

`errors` boleh tidak ada untuk kegagalan umum.

### 11.2 Status HTTP

- `400`: request tidak valid.
- `401`: belum login atau sesi tidak valid.
- `403`: tidak memiliki hak akses atau akun nonaktif.
- `404`: resource tidak ditemukan atau tidak terlihat oleh pengguna.
- `409`: konflik data unik.
- `413`: ukuran request/file terlalu besar.
- `500`: kegagalan internal yang tidak membocorkan detail sensitif.

### 11.3 Perilaku frontend

- Menampilkan pesan pada field yang bermasalah.
- Mempertahankan input saat request gagal selama halaman tidak dimuat ulang.
- Menonaktifkan tombol submit ketika request berjalan.
- Menampilkan loading saat mengambil data.
- Menampilkan halaman 403 untuk route role yang salah.
- Tidak menampilkan stack trace atau detail database.

## 12. Keamanan Dasar

- Password menggunakan bcrypt dan tidak pernah dikirim kembali ke frontend.
- JWT secret, database URL, dan Supabase key berada di `.env`.
- `.env` masuk `.gitignore`; `.env.example` hanya berisi nama variabel.
- Supabase service key hanya digunakan backend.
- PIC berasal dari sesi.
- Semua endpoint Superadmin memakai `requireRole("SUPERADMIN")`.
- Semua endpoint Pegawai memeriksa ownership resource.
- File storage privat dan diakses dengan signed URL sementara.
- Nama file disanitasi dan object path dibuat sistem.
- Request upload dibatasi jumlah dan ukuran.
- Error produksi tidak membocorkan query, password, token, atau key.

## 13. Pengujian

### 13.1 Pengujian backend minimum

- Health check membedakan server hidup dan database tersedia.
- Login berhasil.
- Password salah ditolak.
- Akun nonaktif ditolak.
- Pegawai tidak dapat membuka endpoint Superadmin.
- Master duplikat ditolak.
- RW hanya tersedia melalui Desa yang benar.
- PIC laporan sama dengan user sesi walaupun body mencoba mengirim identitas lain.
- Nomor Perangkat diwajibkan sesuai Tahapan.
- Foto kosong, terlalu banyak, terlalu besar, dan MIME type salah ditolak.
- Pegawai tidak dapat membuka laporan milik Pegawai lain.
- Perhitungan `Sudah melapor` menggunakan distinct user.
- Perhitungan `Jumlah laporan` menghitung seluruh laporan.

Tes integrasi memakai database atau schema khusus pengujian sehingga data demo tidak berubah.

### 13.2 Pengujian alur pengguna minimum

1. Login sebagai Superadmin.
2. Tambah atau ubah master data.
3. Login sebagai Pegawai.
4. Buat laporan dengan foto.
5. Buka histori dan detail laporan.
6. Pastikan Pegawai tidak dapat membuka URL Superadmin.
7. Login kembali sebagai Superadmin.
8. Pastikan laporan muncul pada daftar dan dashboard.

### 13.3 Pemeriksaan antarmuka

- Form dapat digunakan pada layar laptop dan ponsel.
- Label, status wajib, pesan error, loading, dan disabled state terlihat jelas.
- Tidak terdapat error pada console browser selama skenario demo.
- Klik submit berulang tidak membuat laporan ganda.

## 14. Rencana Delivery Vertical Slice Satu Orang

### Hari 1 — Fondasi

- Scaffold frontend dan backend.
- Siapkan Supabase, Prisma, migrasi, bucket privat, dan seed.
- Implementasikan `/api/health`.
- Hubungkan frontend ke endpoint health.

**Exit criteria:** frontend menampilkan status backend dan database.

### Hari 2 — Autentikasi

- Login/logout, JWT cookie, middleware auth/role.
- Halaman login, protected route, dan layout role.

**Exit criteria:** kedua role login dan tidak dapat membuka area role lain.

### Hari 3 — Master Data

- CRUD aktif/nonaktif Desa, RW, dan Tahapan.
- Dependent dropdown Desa–RW.
- Nomor Perangkat kondisional.

**Exit criteria:** perubahan master Superadmin tersedia pada form Pegawai.

### Hari 4 — Laporan dan Dokumentasi

- Form, validasi, preview foto, upload, transaksi, dan cleanup.

**Exit criteria:** Pegawai membuat satu laporan lengkap dan membuka kembali fotonya.

### Hari 5 — Histori dan Monitoring

- Histori/detail Pegawai.
- Daftar laporan Superadmin.
- Kartu dashboard dasar.

**Exit criteria:** laporan baru terlihat pada histori dan dashboard.

### Hari 6 — Stabilitas dan P2

Urutan kerja:

1. Bug alur P1.
2. Pengelolaan akun Pegawai.
3. Edit laporan 24 jam.
4. Filter laporan.
5. Ekspor Excel.
6. Auto-refresh dashboard.
7. Grafik dashboard.

Item bawah tidak boleh menghambat item di atas.

### Hari 7 — Freeze dan Demo

- Tidak menambah fitur baru.
- Perbaiki bug kritis saja.
- Reset seed demo.
- Siapkan foto contoh aman.
- Verifikasi README dan `.env.example`.
- Jalankan skenario demo dua kali.
- Siapkan rekaman atau tangkapan layar cadangan karena Supabase memerlukan internet.

## 15. Strategi Git

- Gunakan `main` dan maksimal satu feature branch aktif.
- Contoh branch: `feature/auth`, `feature/master-data`, `feature/report`, `feature/dashboard`.
- Selesaikan, uji, dan gabungkan satu slice sebelum membuka slice berikutnya.
- Commit dibuat kecil dan menjelaskan outcome.
- `main` harus tetap dapat dijalankan.

## 16. Skenario Demo

1. Jalankan frontend dan backend lokal.
2. Login sebagai Superadmin.
3. Tampilkan master Desa, RW, dan Tahapan.
4. Login sebagai Pegawai.
5. Isi laporan dan unggah beberapa foto.
6. Buka histori dan detail laporan.
7. Login kembali sebagai Superadmin.
8. Tampilkan perubahan pada dashboard.
9. Jika P2 selesai, filter dan ekspor laporan ke Excel.

## 17. Asumsi Bisnis yang Digunakan

Keputusan berikut berlaku sebagai asumsi prototipe sampai pembimbing magang memberikan arahan berbeda:

- Satu Pegawai boleh membuat beberapa laporan per hari.
- Satu laporan mewakili satu kegiatan/lokasi/Tahapan.
- Hanya Pegawai aktif dengan `wajib_lapor=true` yang masuk perhitungan dashboard.
- Tanggal kegiatan boleh hari ini atau satu hari sebelumnya.
- Tidak ada approval laporan pada prototipe.
- Edit laporan adalah P2 dan terbatas 24 jam.
- Laporan tidak dapat dihapus.
- Nomor Perangkat kondisional berdasarkan konfigurasi Tahapan.
- Dokumentasi berupa foto, bukan video.
- Batas dokumentasi 1–5 foto, maksimum 10 MB per file.
- Bucket Storage privat.
- Desa, RW, dan Tahapan dianggap cukup untuk lokasi prototipe.
- Daftar Tahapan seed berasal dari Google Form dan belum dianggap SOP resmi perusahaan.
- Retensi foto berlangsung selama prototipe aktif; kebijakan retensi resmi mengikuti keputusan perusahaan.
- Dashboard menggunakan polling, bukan WebSocket.

Perubahan asumsi harus diperbarui pada spesifikasi, skema, validasi, dan tes yang terdampak sebelum diimplementasikan.
