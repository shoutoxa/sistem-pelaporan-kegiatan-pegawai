# P1 smoke checklist

Tanggal checklist: 2026-08-22. Status remote Supabase: migration, seed, bucket privat, dan vertical slice laporan sudah diverifikasi pada project Supabase lokal-demo.

- [x] `GET /api/health` mengembalikan status API/database (`database: up`).
- [x] Login Superadmin berhasil dan cookie session bersifat HttpOnly.
- [x] Login Pegawai berhasil; kredensial salah memakai pesan umum dan status 401.
- [x] Pegawai tidak dapat membuka route Superadmin (status 403).
- [ ] Superadmin dapat membaca dan soft-disable Desa, RW, dan Tahapan.
- [x] Dropdown RW tetap disabled sebelum Desa dipilih dan reset saat Desa berubah (automated UI test).
- [x] Tahapan yang memerlukan perangkat menampilkan field Nomor Perangkat (automated UI test).
- [x] Pegawai mengirim satu laporan dengan satu foto valid ke remote Supabase.
- [x] Foto tersimpan di bucket privat dan detail memakai signed URL 600 detik.
- [x] Upload atau transaksi gagal membersihkan object Storage yang sudah ter-upload (automated service test).
- [x] Histori Pegawai hanya menampilkan laporan miliknya.
- [x] Dashboard memisahkan sudah/belum melapor dari jumlah baris laporan.
- [x] Submit ulang tidak membuat laporan kedua ketika tombol sedang disabled (automated UI test).

Smoke tambahan: ekspor Excel Superadmin berhasil (HTTP 200, workbook 6.626 byte). Data bukti remote memakai keterangan `Smoke test laporan end-to-end`.

Automated verification terakhir (2026-08-22): backend 16 suite/39 test dan frontend 15 suite/18 test lulus; lint tanpa error; `npm run build` dan validasi skema Prisma lulus. Smoke browser remote belum diulang setelah penambahan fitur edit laporan dan CRUD Pegawai.

Smoke UI lokal terakhir: halaman login lolos pada desktop dan viewport 390×844 tanpa error konsol atau overflow horizontal. Area terautentikasi belum diulang melalui browser agar kredensial tidak dimasukkan tanpa konfirmasi khusus.
