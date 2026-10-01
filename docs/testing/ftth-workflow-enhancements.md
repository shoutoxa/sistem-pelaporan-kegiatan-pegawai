# Peningkatan alur FTTH

Implementasi selektif berdasarkan ide dari branch `feat/dashboard-laporan-dokumentasi`
(snapshot `94e310c251b2a8becf64645f1da8c9cf88cb6b35`). Tidak melakukan merge
arsitektur, autentikasi, atau penghapusan database dari branch tersebut.

## Fitur

- Form pegawai menyimpan draf teks per identitas akun di browser. Draf dipulihkan
  saat membuka kembali form, dihapus setelah pengiriman berhasil, dan dapat dihapus manual.
  Lampiran tidak disimpan; pengguna harus memilihnya kembali. Draf bukan backup server.
  Pada perangkat bersama, hapus draf yang tidak diperlukan.
- Pilih lampiran melalui drag/drop, pemilih berkas, atau kamera jika perangkat mendukung.
  Foto memiliki thumbnail dan setiap berkas dapat dihapus dari pilihan.
  Batas tetap 5 berkas, 10.000.000 byte per berkas; JPG/PNG/WEBP/PDF saja.
- Status harian per cluster memakai endpoint penugasan dan laporan-status resmi.
  Status berlaku untuk hari ini (WIB), bukan tanggal historis pada formulir.
  Kegagalan status tidak ditampilkan sebagai belum lapor. Pemilihan cluster tetap
  dibatasi referensi yang diizinkan; backend tetap memvalidasi ulang saat mengirim.
- Panduan pekerjaan menampilkan `input_instruction` sebagai teks biasa.
- Preview lampiran memakai dialog, Escape, pengembalian fokus, dan navigasi foto.
  Semua tautan memakai endpoint download backend; API key tidak diberikan ke browser.
- Dokumentasi tetap default PDF, dengan pilihan folder Project → Cluster → Pekerjaan.
  Pengelompokan berdasarkan ID, bukan nama. Beralih kembali ke PDF menunggu foto termuat.
- Admin dapat melihat penugasan dan status harian akun melalui tombol Lihat cluster.
  Pengaturan penugasan tetap di sistem perusahaan.

## Verifikasi 9 September 2026

- Backend: 136 test lulus (25 file).
- Frontend: 45 test lulus (22 file), termasuk isolasi draf antar-akun, draf setelah
  gagal/berhasil kirim, batas upload, pencabutan blob URL, preview, status gagal,
  pengelompokan ID, dan kesiapan cetak setelah beralih tampilan.
- Production build berhasil. Lint tidak menemukan error; masih terdapat warning React.
- Browser Chrome, API simulasi: viewport mobile 375×812 dan desktop 1440×1000.
  Draf pulih setelah reload, file bisa dipilih/dihapus, tidak ada overflow horizontal
  pada form mobile, dialog Escape mengembalikan fokus, PDF menunggu gambar, folder
  membuka preview, dan modal cluster admin menampilkan status.
- Pemeriksaan browser mengikuti pola isolasi konteks dan locator pengguna dari
  skill browser-automation. Tidak mengirim data atau mengubah status di API perusahaan.

## Batas perubahan

Tidak mengubah autentikasi, izin pegawai, kontrak backend, jurnal upload, atau
feature flag sumber data. Tidak melakukan commit, push, merge, atau deployment.
Pengujian ulang dengan akun perusahaan tetap diperlukan sebelum rilis.
