# Verifikasi UI/UX

Perubahan UI/UX pada branch pengembangan ini mencakup Dashboard, Laporan, Dokumentasi, Pegawai, Master Data, Buat laporan, dan Histori laporan.

## Pola tampilan

- Warna dan tipografi mengikuti `DESIGN.md`; layout tetap menggunakan navigasi hijau yang sama.
- Desktop memakai ruang kerja yang lebih rapat dan tabel tetap dapat digulir secara horizontal bila diperlukan.
- Layar kecil mengubah tabel operasional menjadi record card dengan label kolom, sehingga lokasi, status, dan aksi tetap terbaca tanpa melebar keluar layar.
- Form pegawai memakai tiga tahap yang jelas, status penugasan dibuka melalui disclosure, dan lampiran hanya memiliki satu area upload.
- Master Data memakai tab Project, Cluster, Kategori, dan Pekerjaan. Data FTTH tetap read-only dari aplikasi.
- Dokumentasi menampilkan satu halaman PDF pada layar untuk mengurangi scroll panjang. Seluruh halaman tetap dirender saat mode print agar ekspor PDF lengkap.

## Pemeriksaan

Smoke test terisolasi di `.tmp/ui-polish-smoke.cjs` memakai API mock dan tidak menulis ke API perusahaan. Pemeriksaan tersebut mencakup:

- tujuh rute admin/pegawai pada viewport 1440px dan 375px;
- tidak ada horizontal overflow;
- draft, pemilihan lampiran, dan status cluster pada form pegawai;
- perpindahan resource Master Data;
- pagination pratinjau dokumentasi dan kesiapan cetak semua halaman.

Hasil terakhir: `npm test`, build frontend, dan smoke test UI lulus. Lint tetap lulus dengan warning React yang sudah ada terkait state di effect/Fast Refresh.

## Penyempurnaan 10 September 2026

- Detail histori dibuka langsung dalam dialog responsif, layar penuh pada HP.
- Pratinjau lampiran tetap dalam dialog yang sama; tutup mengembalikan fokus tanpa memindahkan scroll daftar.
- Token jarak 4pt diterapkan pada style bersama. Isi memakai 12–16px, kelompok memakai 24–32px; aturan geometri PDF tetap terpisah.
- Frontend: 48 tes lulus; backend: 136 tes lulus. Build frontend berhasil.
- Popup dan pratinjau diperiksa melalui akun pegawai pada desktop serta viewport 375×812, tanpa menulis data perusahaan. Ini pengujian viewport browser, bukan perangkat HP fisik.
