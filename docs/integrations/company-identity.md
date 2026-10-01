# Identitas perusahaan tanpa pemetaan lokal

Jika FTTH_AUTH_SOURCE=ftth dan keempat FTTH_MIGRATION_*_SOURCE (MASTER, USERS,
REPORTS, DOCUMENTATION) bernilai ftth, login memakai ID perusahaan langsung.
Tidak ada query akun lokal atau ftthIdentity pada login dan validasi sesi.
Role administrator menjadi SUPERADMIN; user menjadi PEGAWAI. Akun nonaktif
atau role lain ditolak. Status sesi diperiksa melalui /auth/me resmi.

Restart backend dan login ulang untuk memakai mode ini. Semua session lama
berakhir saat restart. Bila ada sumber yang masih local, login FTTH tetap
memakai pemetaan lokal untuk kompatibilitas. Rollback penuh: kembalikan flag
login dan sumber ke local, restart, lalu login dengan akun lokal.

Laporan baru memakai ID perusahaan sebagai user_id; hak pengiriman mengikuti
penugasan cluster resmi. Halaman pemetaan disembunyikan pada mode identitas
perusahaan; jurnal lampiran belum terkonfirmasi tetap tersedia bagi admin.
Endpoint laporan/master lokal lama menolak identitas perusahaan supaya ID
dari dua database tidak tercampur. Akses arsip menggunakan mode lokal.

Ini belum melepas database lokal seluruhnya: jurnal upload dan arsip laporan/
foto masih dipertahankan. Jangan menghapus Supabase sebelum penanganan arsip,
jurnal, backup dan rollback selesai. Sesi masih di memori satu proses.
