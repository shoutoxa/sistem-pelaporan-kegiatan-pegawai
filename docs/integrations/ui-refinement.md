# Penyempurnaan UI transisi FTTH

## Acuan

Konsep: `C:/Users/ASUS/.codex/generated_images/01a0442a-462d-7833-9907-486a294701f6/exec-08db679e-ee68-4014-8556-2bb605cdb5eb.png`.
Fokus implementasi: form/histori pegawai, daftar/detail laporan admin, serta
kejelasan informasi transisi. Shell, dashboard tanpa filter, kontrak API,
otorisasi, dan dokumen cetak tidak diganti.

## Spesifikasi sebelum implementasi

- Pertahankan token kanonis DESIGN.md/index.css, Aptos/Segoe UI, permukaan putih,
  kanvas abu-hijau, navigasi gelap dan aksi hijau. Perbedaan warna kecil dari
  konsep disengaja untuk konsistensi aplikasi; tanpa gradient atau aset dekoratif.
- Form: header dan tautan histori, disclosure Informasi penyimpanan, tiga kelompok
  Lokasi kegiatan / Rincian pekerjaan / Lampiran. Label data/API tidak berubah.
- Cluster nonaktif sebelum Project dipilih; Pekerjaan nonaktif sebelum Kategori
  dipilih. Lampiran tetap 1–5 berkas, maksimum 10 MB, JPG/PNG/WEBP/PDF.
- Detail: header + tutup, lokasi/status, definisi metadata, keterangan, daftar
  lampiran, verifikasi, koreksi dan hapus terpisah. ID teknis bukan judul utama.
- Kontrol minimal 44 px, border radius 8 px, panel 12 px; gap 16/24 px;
  satu kolom pada ponsel; status selalu memiliki teks, tidak hanya warna.
- Histori tetap daftar bukan tabel melebar; admin tetap tabel. Semua data nyata
  berasal dari API. Contoh pada konsep tidak dimasukkan ke aplikasi.
- Gunakan ikon SVG lokal; tidak perlu aset raster dalam UI.
- Bahasa tambahan yang disengaja: helper dependent select, validasi berkas,
  keterangan kosong/no-results, dan status pemrosesan.

## Batas verifikasi

Uji tampilan/form memakai test mock; tindakan perusahaan tidak dijalankan untuk
QA visual. Pemeriksaan browser dan hasil build/test dicatat setelah implementasi.

## Hasil pemeriksaan

- Chrome: daftar laporan perusahaan berhasil memuat enam laporan; detail dibuka
  read-only, tanpa perubahan status, upload, atau penghapusan perusahaan.
- Form pegawai memakai harness sementara dengan fetch mock. Project/Kategori
  mengaktifkan Cluster/Pekerjaan; tidak ada permintaan keluar ke FTTH.
- Desktop diperiksa pada viewport browser yang tersedia, mobile pada override
  375x812. Tidak ada overflow horizontal pada pengukuran DOM mobile (365/365).
  Percobaan 768px belum terverifikasi; koneksi Chrome hilang saat melanjutkan.
- Acuan dan screenshot diperiksa dengan view_image. Perbandingan: urutan tiga
  kelompok sesuai; kontrol berlabel dan radius konsisten; panel putih/kanvas
  hijau-abu mengikuti token aplikasi; ukuran huruf mengikuti Aptos; gutter mobile
  diperbaiki menjadi 16px; navigasi bawah tiga item kini satu baris.
- Deviasi disengaja: shell lama dipertahankan, metadata admin dua kolom di
  desktop, tombol upload tetap native, judul Data kegiatan dan helper tambahan
  dipertahankan. Tidak ada ilustrasi atau data contoh konsep di aplikasi nyata.
- Pesan sumber data Laporan/Master diperbaiki; bidang search diperlebar setelah
  screenshot menunjukkan placeholder terpotong. Label keluar mobile diperbaiki.
- 35 test frontend lulus setelah perubahan. Ini bukan uji E2E perusahaan penuh
  maupun klaim kesamaan pixel-perfect seluruh permukaan admin/pegawai.
- Harness sementara ui-review.html/ui-review.jsx dihapus setelah pemeriksaan.
