# Penugasan dan wajib lapor resmi FTTH

Pada mode FTTH, `GET /integration/users/:id/clusters` menjadi sumber izin pemilihan project/cluster dan validasi pengiriman laporan. Daftar diambil ulang sebelum pengiriman. Daftar kosong menolak pengiriman; kegagalan API tidak memakai izin lokal sebagai fallback. Cluster terhapus/nonaktif tidak dapat dipilih.

`allowedClusterIds` lama dipertahankan sebagai data historis, tetapi tidak memberikan izin. Pemetaan akun lokal tetap diperlukan selama transisi identitas. Pengaturan penugasan dilakukan di FTTH. Riwayat laporan milik pegawai sendiri tetap dapat dibaca setelah perpindahan tugas; riwayat tidak memberi izin mengirim ke cluster lama.

Dashboard mengambil `wajib_lapor` dari users dan status harian dari `GET /integration/users/:id/laporan-status`, hanya untuk akun aktif yang wajib lapor. Tanggal harus hari ini WIB. Pegawai dinyatakan sudah melapor jika seluruh cluster tugasnya sudah dilaporkan, termasuk laporan Menunggu. Pegawai tanpa penugasan ditandai terpisah dan tidak dianggap sudah melapor. Jumlah laporan/distribusi tetap mencakup seluruh tanggal.

Endpoint aplikasi untuk penugasan/status hanya dapat dibaca admin atau pemilik akun yang dipetakan. Respons dibatasi ke field yang diperlukan; credential dan hash password tidak diteruskan. Data tidak lengkap atau respons status gagal tidak dihitung sebagai nol laporan.
