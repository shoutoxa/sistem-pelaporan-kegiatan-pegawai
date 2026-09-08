# Uji penerimaan migrasi FTTH

Keputusan pengguna: data laporan/foto lama Supabase tidak dibutuhkan dan tidak
perlu dimigrasikan. Penghapusan fisik belum dilakukan. Deployment menunggu
instruksi; commit/push dilakukan di akhir setelah verifikasi.

Pemeriksaan 8 September 2026:
- Backend dan frontend lokal berhasil dijalankan.
- Halaman login dibuka melalui Chrome pada localhost:5173.
- Jurnal ftthUpload lokal: 4 catatan, seluruhnya SYNCED; tidak ada pending.
- Uji browser admin berhasil: dashboard memuat 6 laporan; pencarian `RW 09`
  menghasilkan 2 laporan; Master Data memuat 1 project, 2 cluster, 3 kategori,
  dan 19 pekerjaan; Dokumentasi memuat 6 foto, filter Project/Cluster/Pekerjaan
  bekerja, dan satu lampiran berhasil diunduh.
- Uji browser pegawai berhasil: login sebagai `nopan` menampilkan project
  perusahaan dan hanya cluster RW 09 yang tersedia; RW 05 tidak muncul.
  Kategori Sitac menampilkan pekerjaan Sitac, histori menampilkan 5 laporan
  milik akun tersebut, dan halaman FTTH memuat form serta histori tanpa error
  aplikasi lokal.

Belum diverifikasi pada sesi browser ini: pengiriman laporan/lampiran, verifikasi
admin, dan cetak PDF. Download dan preview lampiran sudah berhasil pada sesi
admin. Tombol verifikasi/hapus tidak ditekan
karena mengubah data perusahaan.
Hasil test otomatis sebelumnya tidak menggantikan pemeriksaan alur nyata ini.

Menu FTTH (Dev) sudah dihapus dari navigasi setelah uji langsung selesai.
Halaman utama Laporan, Histori, Dashboard, Dokumentasi, Pegawai, dan Master Data
tetap memakai sumber FTTH. Jurnal merekam hasil pengiriman, bukan salinan laporan
lama; saat ini pemeriksaan menunjukkan seluruh 4 catatan berstatus `SYNCED`.
Jalur FTTH tidak lagi membuat signed URL Supabase untuk lampiran; download
melewati endpoint perusahaan yang sudah dilindungi sesi.
Pemeriksaan dekomisioning lokal menghasilkan: 5 user, 4 desa, 8 cluster,
11 pekerjaan, 1 laporan lama, 1 dokumentasi lama, 2 pemetaan identitas, dan
4 jurnal upload. Seluruh jurnal `SYNCED`, tetapi record lama masih ada sehingga
database lokal belum dihapus. Gunakan `npm run ftth:decommission:check` untuk
mengulang pemeriksaan tanpa menghapus apa pun.
