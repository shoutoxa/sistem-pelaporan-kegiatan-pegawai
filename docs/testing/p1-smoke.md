# P1 smoke checklist

Tanggal checklist: 2026-08-22. Status remote Supabase: belum dijalankan karena kredensial `.env` belum tersedia di workspace ini.

- [ ] `GET /api/health` mengembalikan status API/database.
- [ ] Login Superadmin berhasil dan cookie session bersifat HttpOnly.
- [ ] Login Pegawai berhasil; kredensial salah memakai pesan umum.
- [ ] Pegawai tidak dapat membuka route Superadmin.
- [ ] Superadmin dapat membaca dan soft-disable Desa, RW, dan Tahapan.
- [ ] Dropdown RW tetap disabled sebelum Desa dipilih dan reset saat Desa berubah.
- [ ] Tahapan yang memerlukan perangkat menampilkan field Nomor Perangkat.
- [ ] Pegawai mengirim satu laporan dengan 1–5 foto yang valid.
- [ ] Foto tersimpan di bucket privat dan detail memakai signed URL 600 detik.
- [ ] Upload atau transaksi gagal membersihkan object Storage yang sudah ter-upload.
- [ ] Histori Pegawai hanya menampilkan laporan miliknya.
- [ ] Dashboard memisahkan sudah/belum melapor dari jumlah baris laporan.
- [ ] Submit ulang tidak membuat laporan kedua ketika tombol sedang disabled.

Automated verification terakhir: backend 14 suite/26 test dan frontend 12 suite/13 test lulus; `npm run build` lulus.
