# Revisi pegawai FTTH

Basis: `origin/feat/dashboard-laporan-dokumentasi` pada commit `8bf558e`, di branch `feat/pegawai-ftth-revision`. Acuan kebutuhan: workbook Sistem Analis FTTH - Web & Mobile dan konfirmasi pengguna.

## Perilaku yang diterapkan

- Aplikasi hanya menyediakan UI pegawai: Dashboard, Management Project, dan Laporan Harian. URL admin menampilkan tautan ke portal FTTH; backend admin lama dipertahankan untuk kompatibilitas, bukan akses pegawai.
- Akses project/cluster dan rincian pekerjaan dibatasi di backend: penugasan cluster resmi **dan** `cluster_processes.pic_id` cocok dengan identitas FTTH. Tidak ada fallback ke seluruh master jika penugasan kosong atau API gagal.
- Pekerjaan selesai mengikuti status `completed`/`selesai` di cluster_processes. Tidak ditawarkan di formulir, ditolak server jika dikirim secara manual, dan dikecualikan dari kewajiban pelaporan. Persetujuan laporan bukan penyelesaian pekerjaan.
- Tautan dari rincian pekerjaan mengisi project/cluster/kategori/pekerjaan hanya jika masih termasuk penugasan aktif. Pergantian cluster menghapus pekerjaan yang tidak sesuai.
- Pilihan status On Progress, Selesai, Kendala; kendala opsional, tetapi wajib minimal 5 karakter untuk Kendala. Draf teks dibatasi panjangnya; lampiran tidak disimpan dalam draf.
- Warna utama #564a45, tanpa angka homepass/progres palsu atau poligon simulasi. Peta menampilkan titik koordinat aktual saja. Kontrol status/unggah KMZ yang belum tersambung diganti informasi baca-saja.
- Respons create dengan identitas/status tidak sesuai dianggap belum terkonfirmasi; tidak diulang otomatis dan tidak diklaim berhasil. Pengelola harus memeriksa FTTH sebelum mencoba ulang.

## Kontrak yang masih diperlukan sebelum digunakan/deploy

1. **SSO:** metode handoff/shared session dari portal FTTH ke aplikasi pegawai, validasi sesi, kedaluwarsa dan logout. Login dengan username/password FTTH saat ini adalah akses pengembangan sementara, bukan SSO. Jangan kirim JWT lewat URL.
2. **Penulisan laporan revisi:** pastikan FTTH menerima `status` On Progress/Selesai/Kendala dan `kendala_lapangan`; bedakan status pekerjaan dengan status persetujuan. API dokumentasi lama hanya memastikan PENDING/APPROVED/REJECTED.
3. **Penyelesaian pekerjaan:** kontrak atomik/idempotent agar laporan Selesai memperbarui cluster_process yang tepat dan progres cluster/project. FTTH juga harus menegakkan PIC/status dalam transaksi penulisan untuk menghindari pergantian penugasan di antara pemeriksaan aplikasi dan write. Tidak ada PUT atau sinkronisasi endpoint tebakan.
4. **Geotag dan hasil fisik:** nama field, izin lokasi, format koordinat/waktu/akurasi, serta satuan/validasi target pulling-splicing. Belum dikirim atau diklaim tersimpan.

`FTTH_WORK_REPORTS_ENABLED=false` adalah default backend. Formulir dapat dicoba sebagai draf; API menolak pengiriman revisi dengan HTTP 503 sebelum write. Jangan mengaktifkan flag hanya agar tombol aktif: flag merupakan persetujuan operator atas kontrak penulisan yang sudah diverifikasi, bukan bukti bahwa FTTH mendukungnya. Pengujian dengan flag true menggunakan mock, bukan write perusahaan.

Deployment, migrasi data, dan penghapusan database/Docker tidak dilakukan pada revisi ini. Jurnal upload tetap mengikuti konfigurasi lama; mode memori tidak tahan restart sehingga perlu keputusan penyimpanan sebelum deploy.

## Verifikasi lokal

- Test backend: 144 lulus; `npm run test -w frontend -- --run`: 63 lulus (termasuk menu mobile dan status navigasi Project pada halaman cluster).
- `npm run build`: lulus.
- `npx oxlint frontend/src backend/src`: 0 error, 28 warning; belum bebas warning.
- `git diff --check`: lulus.
- Playwright pada 1440×1000 dan 375×812: navigasi, pekerjaan PIC, tautan formulir, pekerjaan selesai tanpa input, kendala wajib, flag pengiriman nonaktif, popup/Escape, dan UI tanpa overflow horizontal lulus. API dan peta menggunakan fixture; tidak ada write ke FTTH dan bukan bukti SSO/integrasi live.
- Audit dependency menunjukkan 12 advisory (8 high, 4 moderate). Perlu ditangani dan diuji sebelum deploy; tidak dilakukan upgrade otomatis dalam revisi ini.

## Penyempurnaan mobile (1 Oktober 2026)

- Header tunggal dan menu seluruh halaman pegawai, termasuk Clusters/Homepass yang tidak memiliki slot sendiri di navigasi bawah. Bagian Project tetap ditandai aktif ketika membuka cluster atau homepass.
- Menggunakan token spacing 4pt yang sudah ada, kontrol sentuh minimal 44 px, input formulir 16 px, dan padding safe-area untuk header, navigasi bawah, serta popup. Perubahan layout hanya untuk layar; geometri A4/PDF tidak diubah.
- Ringkasan dashboard/homepass dua kolom pada mobile; ukuran peta menyesuaikan layar. Tabel Project dan Homepass diringkas tanpa menutup akses informasi: rincian Project ada di popup, progres/status Homepass ada di baris cluster.
- Padding ganda pada Histori/popup dibersihkan; pratinjau, nama berkas panjang, dan tombol lampiran menyesuaikan lebar ponsel. Informasi kontrak pengiriman dapat dibuka dari pemberitahuan ringkas; flag pengiriman tetap nonaktif.
- Playwright Chromium: 7 halaman × 6 viewport (320×740, 375×812, 390×844, 812×375, 768×1024, 1440×1000) lulus pemeriksaan identitas halaman, konten, overlay, console, overflow horizontal, dan tinggi kontrol. Interaksi menu, map expand, Kendala, pemilihan/hapus berkas, detail/pratinjau/paginasi lampiran, Escape dan pengembalian fokus lulus.
- Pemeriksaan tambahan ukuran teks 200% dan reduced motion pada Project/menu lulus. Browser plugin tidak tersedia, sehingga menggunakan Playwright bawaan tanpa menambah dependency. Screenshot dan skrip QA disimpan di direktori temporer di luar repo.
- Data API/peta/lampiran pada QA adalah fixture; tidak ada write perusahaan. Belum diuji pada perangkat fisik, Safari/iOS, keyboard virtual, atau SSO live.
