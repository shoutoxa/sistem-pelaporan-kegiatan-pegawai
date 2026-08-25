---
version: alpha
name: "Sistem Pelaporan Kegiatan Pegawai"
description: "Buku kerja lapangan digital yang tegas, membumi, dan mudah dipindai untuk pelaporan kegiatan harian."
colors:
  primary: "#1C7A43"
  ink: "#10272C"
  ink-strong: "#08191D"
  brand: "#1C7A43"
  brand-hover: "#145F34"
  signal: "#F26A21"
  canvas: "#F7F9F8"
  surface: "#FFFFFF"
  surface-muted: "#F1F5F2"
  text: "#13211C"
  text-muted: "#607068"
  border: "#D7E0DA"
  success: "#147A43"
  warning: "#A85A12"
  danger: "#B42318"
  focus: "#2A7FDB"
typography:
  display:
    fontFamily: "Aptos Display, Trebuchet MS, Segoe UI, sans-serif"
    lineHeight: "1.08"
  body:
    fontFamily: "Aptos, Segoe UI, system-ui, sans-serif"
    lineHeight: "1.55"
  data:
    fontFamily: "Cascadia Code, Consolas, monospace"
    lineHeight: "1.35"
rounded:
  sm: "0.375rem"
  DEFAULT: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
spacing:
  control: "2.75rem"
  gutter: "1.5rem"
  page-max: "82rem"
  sidebar: "15rem"
components:
  app-shell: { }
  button: { }
  field: { }
  notice: { }
  data-table: { }
  upload-zone: { }
---

# Sistem Pelaporan Kegiatan Pegawai Design System

## Overview

### Creative North Star

Antarmuka mengikuti dunia buku kerja survey lapangan: tinta gelap, garis pencatatan yang rapi, dan satu aksen oranye keselamatan untuk menandai progres atau perhatian. Referensi visual berada di `docs/design/concepts/admin-dashboard-field-ledger.png` dan `docs/design/concepts/employee-report-field-ledger.png`.

### Product context and register

- **Audience and primary job:** Pegawai lapangan mengirim laporan harian dengan cepat; Superadmin memantau kepatuhan, data, dan aktivitas terbaru.
- **Target market and evidence:** Operasional internal Indonesia berdasarkan spesifikasi `docs/superpowers/specs/2026-08-21-sistem-pelaporan-kegiatan-pegawai-design.md`.
- **Locale and language policy:** Antarmuka berbahasa Indonesia; format tanggal bisnis menggunakan zona `Asia/Jakarta`.
- **Usage scene:** Pegawai terutama memakai ponsel di lapangan dengan satu tangan; Superadmin terutama memakai laptop kantor. Keduanya dipakai berulang setiap hari dengan kepadatan informasi menengah.
- **Register:** Product. Kejelasan tugas, aksesibilitas, dan konsistensi lebih penting daripada dekorasi.
- **Memorable signature:** Rel aktivitas oranye vertikal yang menghubungkan bagian penting pada dashboard dan formulir.
- **Restraint:** Tabel, input, dan area baca menggunakan permukaan putih, aturan garis, dan sedikit bayangan. Aksen oranye hanya untuk progres atau perhatian.
- **Anti-references:** Dashboard SaaS dengan kartu membulat di semua tempat, glassmorphism, gradien ungu, ikon dekoratif, dan halaman kosong yang terasa seperti template AI.
- **Token ownership/runtime mapping:** CSS variables di `frontend/src/index.css` adalah sumber runtime kanonis. Dokumen ini mencerminkan nilai yang sama; komponen bersama mengonsumsi token semantik tersebut.

## Colors

`ink` dan `ink-strong` membentuk navigasi. `brand` dipakai untuk aksi aman dan status positif. `signal` menandai progres/atensi tanpa menggantikan teks. `canvas` menjadi latar aplikasi, sedangkan semua area data utama menggunakan `surface`. `danger` hanya untuk kegagalan atau aksi berisiko. Fokus selalu memakai `focus` yang kontras dan tidak bergantung pada warna merek.

## Typography

Judul memakai keluarga humanis `Aptos Display` dengan fallback Windows yang stabil. Isi dan kontrol memakai `Aptos`/`Segoe UI`; angka ringkasan memakai angka tabular dan dapat memakai stack `data`. Judul tidak semuanya tebal; hirarki dibentuk lewat ukuran, bobot, dan aturan garis. Teks badan minimal 16px di ponsel.

## Layout

Desktop memakai sidebar tetap selebar `sidebar` dan kanvas terbuka maksimal `page-max`. Pada area Pegawai, mobile memakai header identitas ringkas dan navigasi bawah dua tujuan yang mengikuti safe area perangkat; area Superadmin tetap mengubah sidebar menjadi navigasi horizontal. Formulir mengalir satu kolom dengan kelompok bertahap dan aksi kirim yang mudah dijangkau. Histori Pegawai berubah menjadi kartu berlabel, bukan tabel yang harus digeser. Ritme utama menggunakan gutter 24px dan jarak vertikal 16/24/32px. Kontrol penting minimal 44px.

## Elevation & Depth

Hirarki utama berasal dari warna permukaan, garis, dan ruang. Sidebar memiliki bayangan lembut untuk memisahkannya dari kanvas. Panel statis tidak memakai bayangan besar; hanya login dan permukaan yang perlu mengambang boleh memakai elevasi halus.

## Shapes

Kontrol memakai radius 8px, panel 12px, dan login maksimum 16px. Badge status boleh berbentuk kapsul karena menyatakan metadata; navigasi dan tombol utama tidak berbentuk pil. Ikon memakai stroke 1.8px dan sudut membulat.

## Components

### Foundational visual states

Semua target interaktif memiliki default, hover, focus-visible, active, disabled, dan busy. Loading memakai indikator berukuran stabil. Empty, no-results, error, serta success menggunakan pesan yang memberi arah berikutnya.

### Buttons and actions

Tombol solid hijau adalah aksi aman utama; outline untuk aksi sekunder; ghost untuk utilitas; merah hanya untuk bahaya. Label memakai kata kerja spesifik. Ikon dapat mendampingi label, tetapi tidak menggantikannya pada aksi utama.

### Navigation and data display

Sidebar adalah pemilik navigasi desktop. Item aktif memakai blok hijau tegas. Tabel semantik memakai header tetap terbaca, aturan baris tipis, angka tabular, dan overflow horizontal pada layar sempit. Ringkasan dashboard berupa satu band terstruktur, bukan empat kartu terpisah.

### Forms and overlays

Field memiliki label eksplisit, helper/error terasosiasi, tinggi minimal 44px, dan `noValidate`. Native select dan date diterima untuk prototipe karena popup platform-owned dianggap cukup. Textarea tidak dapat di-resize dan memiliki tinggi memadai. Upload memakai zona berpagar putus-putus dengan jalur kamera belakang dan galeri yang terpisah di ponsel. Isian laporan non-sensitif disimpan sebagai draf lokal per pengguna; foto tidak disimpan ke penyimpanan browser dan harus dipilih kembali.

### Iconography

Ikon menggunakan komponen SVG lokal bergaya outline konsisten, `24x24`, `currentColor`, stroke 1.8px. Emoji tidak dipakai sebagai ikon. Aksi yang tidak universal selalu memiliki label teks.

### Motion

Transisi warna dan elevasi 160–220ms. Satu reveal ringan dapat dipakai saat halaman tampil; tidak ada animasi dekoratif berulang. `prefers-reduced-motion` menghapus transform dan memendekkan durasi.

### Content and data visualization

Bahasa aktif, singkat, dan operasional: “Kirim laporan”, “Muat ulang”, “Lihat detail”. Pesan gagal menyebut apa yang gagal dan tindakan pemulihan. Distribusi menggunakan daftar/tabel sebelum grafik agar data tetap mudah diakses.

## Do's and Don'ts

- **Do:** Gunakan rel oranye hanya untuk menghubungkan progres atau aktivitas penting.
- **Do:** Pakai komponen bersama untuk shell, ikon, status, field, dan tabel.
- **Don't:** Membungkus setiap bagian dalam kartu membulat dan bayangan besar.
- **Don't:** Menambahkan gradien, glow, metrik palsu, atau teks pemasaran ke layar operasional.
