# P1 API contract

Semua endpoint berada di prefix `/api` dan memakai cookie session HttpOnly, kecuali health. Error memakai `{ "error": "..." }`.

| Method | Path | Auth | Ringkasan |
|---|---|---|---|
| GET | `/api/health` | Tidak | Status API/database |
| POST | `/api/auth/login` | Tidak | Body `username`, `password`; mengatur cookie |
| GET | `/api/auth/me` | Ya | Profil session aktif |
| POST | `/api/auth/logout` | Ya | Menghapus cookie |
| GET | `/api/master/desa` | Ya | Desa aktif |
| GET | `/api/master/desa/:desaId/rw` | Ya | RW aktif milik Desa |
| GET | `/api/master/tahapan` | Ya | Tahapan aktif |
| POST | `/api/laporan` | Pegawai | Multipart `tanggalKegiatan`, `rwId`, `tahapanId`, `keterangan`, `nomorPerangkat`, `dokumentasi` |
| PUT | `/api/laporan/:id` | Pegawai pemilik | Edit field tanpa mengganti PIC, maksimal 24 jam |
| GET | `/api/laporan/:id` | Pemilik/Superadmin | Detail + signed URL dokumentasi |
| GET | `/api/laporan/saya` | Pegawai | Histori owner-scoped |
| GET | `/api/admin/dashboard` | Superadmin | Metrik dashboard |
| GET | `/api/admin/laporan` | Superadmin | Daftar laporan dengan filter/pagination |
| GET | `/api/admin/laporan/export` | Superadmin | File XLSX dengan filter yang sama |
| GET/PATCH | `/api/admin/pegawai`, `/api/admin/pegawai/:id/status` | Superadmin | Daftar dan soft-disable Pegawai |

Endpoint CRUD master admin tersedia pada `/api/admin/desa`, `/api/admin/rw`, dan `/api/admin/tahapan` dengan pola POST/PUT/PATCH status.
