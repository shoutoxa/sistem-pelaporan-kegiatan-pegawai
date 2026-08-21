# Sistem Pelaporan Kegiatan Pegawai

Prototype lokal untuk pelaporan kegiatan harian pegawai dan pemantauan Superadmin.

## Status implementasi

Task 1 selesai: workspace npm, frontend Vite/React, backend Express, dan health slice sudah tersedia. Fitur berikutnya mengikuti rencana di `docs/superpowers/plans/2026-08-22-sistem-pelaporan-mvp-implementation.md`.

## Menjalankan health slice

Gunakan Node.js 22 atau lebih baru.

```powershell
npm install
npm run dev
```

Frontend tersedia di `http://localhost:5173` dan backend di `http://localhost:3000`.

Salin `.env.example` menjadi `.env` sebelum mengaktifkan fitur database dan Supabase. Jangan menaruh service key di frontend atau meng-commit `.env`.
