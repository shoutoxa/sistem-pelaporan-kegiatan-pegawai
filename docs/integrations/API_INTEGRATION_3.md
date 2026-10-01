# API Integrasi FTTH

Dokumen ini menjelaskan cara menghubungkan aplikasi lain (misal **Aplikasi Pegawai**) dengan database
FTTH melalui REST API, sehingga data master dan user bisa dibaca, dan data master process bisa dibuat /
diubah / dihapus oleh aplikasi lain.

---

## 0. Informasi Koneksi

| Item | Nilai |
|------|-------|
| Base URL | `https://ftth.digitak.id/ftth_api` |
| API Key | `ftth-integration-mtl6caaf-prod` |
| Header | `x-api-key: ftth-integration-mtl6caaf-prod` |
| Format data | JSON (`Content-Type: application/json`) |

> Cukup gunakan informasi di atas untuk menghubungkan aplikasi pegawai dengan FTTH.
> Sisanya di bawah ini adalah referensi lengkap.
>
> File ini juga tersedia di server: `/opt/ftth-core/API_INTEGRATION.md`

---

## 1. Tutorial Cara Menggunakan API

### 1.1 Base URL

Semua request diawali dengan base URL di atas. Contoh path lengkap:

```
https://ftth.digitak.id/ftth_api/integration/master-processes
```

### 1.2 Autentikasi (API Key)

Setiap request WAJIB membawa API Key pada header:

| Header     | Nilai |
|------------|-------|
| `x-api-key` | `ftth-integration-mtl6caaf-prod` |

- Tanpa key, salah, atau kosong → response **`401`** `{ "message": "Invalid or missing API key" }`.
- Key didapat dari admin FTTH (variabel `INTEGRATION_API_KEY` di backend).

Contoh header lengkap:

```http
GET /ftth_api/integration/master-categories
Host: ftth.digitak.id
x-api-key: ftth-integration-mtl6caaf-prod
```

### 1.3 Cara memanggil

Menggunakan `curl`:

```
curl -H "x-api-key: ftth-integration-mtl6caaf-prod" \
     https://ftth.digitak.id/ftth_api/integration/master-categories
```

Menggunakan `fetch` (JavaScript / Node):

```js
const res = await fetch("https://ftth.digitak.id/ftth_api/integration/master-categories", {
  headers: { "x-api-key": "ftth-integration-mtl6caaf-prod" },
});
const data = await res.json();
```

> Catatan: untuk semua endpoint yang TIDAK disebut "hanya data external", hasil GET bersifat read-only
> dan tidak mengubah data apa pun di FTTH.

---

## 2. Daftar Endpoint

### 2.1 Root (daftar endpoint)

| Method | Path | Fungsi |
|--------|------|--------|
| GET | `/ftth_api/integration` | Menampilkan daftar endpoint yang tersedia |

### 2.2 Master Processes (baca)

| Method | Path | Fungsi |
|--------|------|--------|
| GET | `/ftth_api/integration/master-processes` | Semua master process (+ kategori, form, `source`) urut sort_order |
| GET | `/ftth_api/integration/master-processes/:id` | Detail satu master process |

### 2.3 Master Processes (tulis)

| Method | Path | Fungsi |
|--------|------|--------|
| POST | `/ftth_api/integration/master-processes` | Buat master process baru (`source=external`), otomatis terpasang ke semua cluster aktif, `sort_order` = angka terakhir + 1 |
| PUT | `/ftth_api/integration/master-processes/:id` | Ubah master process — HANYA jika `source=external` |
| DELETE | `/ftth_api/integration/master-processes/:id` | Hapus master process — HANYA jika `source=external` |

> **Aturan `source`:** Master process yang dibuat langsung oleh aplikasi FTTH (bawaan) ber `source=app`
> dan TIDAK bisa diubah/dihapus lewat API (response **`403`**). Hanya master process yang dibuat dari
> aplikasi lain ber `source=external` yang bisa diubah/dihapus.

### 2.4 Form Master Process (baca)

| Method | Path | Fungsi |
|--------|------|--------|
| GET | `/ftth_api/integration/master-process-forms` | Semua form input master process |
| GET | `/ftth_api/integration/master-process-forms?processId=:id` | Form dari satu master process |

### 2.5 Data Master Lainnya (baca)

| Method | Path | Fungsi |
|--------|------|--------|
| GET | `/ftth_api/integration/master-categories` | Kategori master |
| GET | `/ftth_api/integration/master-provinces` | Provinsi |
| GET | `/ftth_api/integration/master-regencies` | Kabupaten/Kota |
| GET | `/ftth_api/integration/master-districts` | Kecamatan |
| GET | `/ftth_api/integration/master-villages` | Kelurahan/Desa |
| GET | `/ftth_api/integration/master-documents` | Dokumen induk |

### 2.6 Users (baca)

| Method | Path | Fungsi |
|--------|------|--------|
| GET | `/ftth_api/integration/users` | Semua user (kata sandi TIDAK disertakan) |
| GET | `/ftth_api/integration/users/:id` | Detail satu user |
| GET | `/ftth_api/integration/users/:id/foto` | **Preview/download foto profil** (`?mode=download` untuk force download) |
| POST | `/ftth_api/integration/users/:id/foto` | **Upload foto profil** (multipart/form-data, field `file`) |
| GET | `/ftth_api/integration/users/:id/clusters` | **Cluster yang ditangani user** (dengan project info + progress) |
| GET | `/ftth_api/integration/users/:id/laporan-status` | **Status laporan harian** per cluster (untuk user `wajib_lapor: true`) |

> Field `wajib_lapor` (boolean) pada user menunjukkan apakah user wajib mengisi laporan kegiatan **harian per cluster** yang dia PIC-nya.

### 2.7 Semua Tabel Database (baca)

Endpoint di bawah ini membaca isi SEMUA tabel yang ada di database FTTH. Semua read-only.

> Semua endpoint mendukung parameter paginasi:
> - `limit` — jumlah baris per halaman (default 100, maks 1000)
> - `offset` — lompati N baris pertama (untuk halaman selanjutnya)
> - `orderBy=kolom` & `orderDir=asc|desc` — urutkan berdasarkan kolom (opsional)

| Method | Path | Fungsi |
|--------|------|--------|
| GET | `/ftth_api/integration/projects` | Projek / SPK |
| GET | `/ftth_api/integration/projects/:id` | Detail satu projek |
| GET | `/ftth_api/integration/clusters` | Cluster / area kerja per projek |
| GET | `/ftth_api/integration/clusters/:id` | Detail satu cluster |
| PUT | `/ftth_api/integration/clusters/:id` | **Update cluster** (termasuk `pic_id` — auto-sync ke processes) |
| GET | `/ftth_api/integration/cluster-processes` | Proses per cluster |
| GET | `/ftth_api/integration/cluster-processes/:id` | Detail satu cluster process |
| GET | `/ftth_api/integration/documents` | Dokumen per proses (file/teks/link) |
| GET | `/ftth_api/integration/documents/:id` | Detail satu dokumen |
| GET | `/ftth_api/integration/boq-items` | Item BOQ (Bill of Quantity) |
| GET | `/ftth_api/integration/boq-items/:id` | Detail satu item BOQ |
| GET | `/ftth_api/integration/materials` | Master material/barang |
| GET | `/ftth_api/integration/materials/:id` | Detail satu material |
| GET | `/ftth_api/integration/warehouse-transactions` | Transaksi gudang (masuk/keluar) |
| GET | `/ftth_api/integration/warehouse-transactions/:id` | Detail satu transaksi gudang |
| GET | `/ftth_api/integration/surat-jalan` | Surat jalan |
| GET | `/ftth_api/integration/surat-jalan/:id` | Detail satu surat jalan |
| GET | `/ftth_api/integration/surat-jalan-items` | Item surat jalan |
| GET | `/ftth_api/integration/surat-jalan-items/:id` | Detail satu item surat jalan |
| GET | `/ftth_api/integration/audit-logs` | Log aktivitas / audit |
| GET | `/ftth_api/integration/audit-logs/:id` | Detail satu log audit |
| GET | `/ftth_api/integration/notifications` | Notifikasi |
| GET | `/ftth_api/integration/notifications/:id` | Detail satu notifikasi |
| GET | `/ftth_api/integration/approval-requests` | Pengajuan approval |
| GET | `/ftth_api/integration/approval-requests/:id` | Detail satu pengajuan approval |
| GET | `/ftth_api/integration/document-number-logs` | Log nomor dokumen (invoice/kuitansi) |
| GET | `/ftth_api/integration/document-number-logs/:id` | Detail satu log nomor dokumen |

> Semua tabel read-only — tidak bisa diubah/ditambah lewat API. Hanya untuk keperluan baca data
> oleh aplikasi lain (misal dashboard, pelaporan, sinkronisasi).

### 2.8 Laporan Kegiatan & Dokumentasi (FULL CRUD)

Dua tabel ini **bisa dibuat / dibaca / diubah / dihapus sepenuhnya** dari aplikasi lain (misal Aplikasi
Pegawai). Tidak ada batasan `source` seperti master process.

**Laporan Kegiatan** — menyimpan laporan (user, project, cluster, process, tanggal, nomor perangkat,
keterangan, status, catatan revisi, verifikasi):

| Method | Path | Fungsi |
|--------|------|--------|
| GET | `/ftth_api/integration/laporan-kegiatan` | Semua laporan (+ user/project/cluster/process/dokumentasi) |
| GET | `/ftth_api/integration/laporan-kegiatan/:id` | Detail satu laporan |
| POST | `/ftth_api/integration/laporan-kegiatan` | Buat laporan baru |
| PUT | `/ftth_api/integration/laporan-kegiatan/:id` | Ubah laporan |
| DELETE | `/ftth_api/integration/laporan-kegiatan/:id` | Hapus laporan (dokumentasi ikut terhapus) |

Field saat membuat `laporan-kegiatan`:

| Field | Tipe | Keterangan |
|-------|------|------------|
| `user_id` | uuid (wajib) | ID user pelapor (lihat `/users`) |
| `project_id` | uuid (wajib) | ID project (lihat `/projects`) |
| `cluster_id` | uuid (wajib) | ID cluster (lihat `/clusters`) |
| `process_id` | uuid (wajib) | ID master process (lihat `/master-processes`) |
| `tanggal_kegiatan` | date (wajib) | Tanggal kegiatan `YYYY-MM-DD` |
| `nomor_perangkat` | string | Opsional: nomor ODP/tiang/WO/PO |
| `keterangan` | text | Keterangan laporan |
| `status` | string | `PENDING` (default), `APPROVED`, `REJECTED` |
| `catatan_revisi` | text | Catatan revisi (opsional) |
| `verified_by` | uuid | ID user verifikator (opsional) |
| `verified_at` | datetime | Waktu verifikasi (opsional) |

List mendukung filter & paginasi:
`?user_id=`, `?project_id=`, `?cluster_id=`, `?process_id=`, `?status=`, `?limit=`, `?offset=`

**Dokumentasi Laporan** — menyimpan lampiran (foto/dokumen) untuk satu laporan:

| Method | Path | Fungsi |
|--------|------|--------|
| GET | `/ftth_api/integration/dokumentasi-laporan` | Semua lampiran (filter `?laporanId=`) |
| GET | `/ftth_api/integration/dokumentasi-laporan/:id` | Detail satu lampiran |
| GET | `/ftth_api/integration/dokumentasi-laporan/:id/download` | **Download/preview file** (`?mode=download` untuk force download) |
| POST | `/ftth_api/integration/dokumentasi-laporan/upload` | **Upload file** (multipart/form-data) — kembalikan `file_url` |
| POST | `/ftth_api/integration/dokumentasi-laporan` | Tambah lampiran (JSON, pakai `file_url` dari upload) |
| PUT | `/ftth_api/integration/dokumentasi-laporan/:id` | Ubah lampiran |
| DELETE | `/ftth_api/integration/dokumentasi-laporan/:id` | Hapus lampiran |

Field saat membuat `dokumentasi-laporan`:

| Field | Tipe | Keterangan |
|-------|------|------------|
| `laporan_id` | uuid (wajib) | ID laporan (lihat `/laporan-kegiatan`) |
| `file_url` | text (wajib) | Path file hasil upload (dari `POST /dokumentasi-laporan/upload`) |
| `original_name` | string | Nama file asli |
| `mime_type` | string | jpg, png, pdf, kmz, xlsx, dll |
| `file_size` | integer | Ukuran file (byte) |
| `tipe_berkas` | string | `foto` (default) atau `dokumen` |

---

## 3. Penjelasan Field Master Process & Arti `source`

Field utama saat membuat / membaca master process:

| Field | Tipe | Keterangan |
|-------|------|------------|
| `name` | string (wajib) | Nama master process |
| `description` | string | Deskripsi / keterangan |
| `master_category_id` | uuid | ID kategori (lihat `/master-categories`) |
| `sort_order` | integer | Urutan tampil (OTOMATIS = terakhir + 1 saat POST) |
| `allow_file` | boolean | Apakah menerima upload file |
| `allow_text` | boolean | Apakah menerima input teks |
| `allow_link` | boolean | Apakah menerima link |
| `input_instruction` | string | Petunjuk pengisian |
| `is_active` | boolean | Aktif/tidak |
| `source` | string | Asal data: `app` (dibuat FTTH) atau `external` (dibuat aplikasi lain) |

---

## 4. Status / Error Code

| Kode | Arti |
|------|------|
| `200` | Berhasil |
| `201` | Berhasil dibuat |
| `400` | Request salah / field wajib kurang |
| `401` | API key salah atau tidak ada |
| `403` | Tidak diizinkan (misal edit/hapus master process `source=app`) |
| `404` | Data tidak ditemukan |
| `409` | Konflik (misal nama sudah ada) |
| `503` | API integrasi belum dikonfigurasi |

---

## 5. Contoh Penggunaan (curl)

Contoh-contoh berikut menggunakan placeholder `ftth-integration-mtl6caaf-prod`.

### 5.1 Lihat daftar endpoint

```
curl -H "x-api-key: ftth-integration-mtl6caaf-prod" \
     https://ftth.digitak.id/ftth_api/integration
```

### 5.2 Ambil semua master process

```
curl -H "x-api-key: ftth-integration-mtl6caaf-prod" \
     https://ftth.digitak.id/ftth_api/integration/master-processes
```

### 5.3 Ambil satu master process

```
curl -H "x-api-key: ftth-integration-mtl6caaf-prod" \
     https://ftth.digitak.id/ftth_api/integration/master-processes/c2f9a1e6-4119-4d3e-9a5d-8b1e2f3a4b5c
```

### 5.4 Ambil semua kategori master

```
curl -H "x-api-key: ftth-integration-mtl6caaf-prod" \
     https://ftth.digitak.id/ftth_api/integration/master-categories
```

### 5.5 Ambil semua user

```
curl -H "x-api-key: ftth-integration-mtl6caaf-prod" \
     https://ftth.digitak.id/ftth_api/integration/users
```

### 5.6 Ambil form dari satu master process

```
curl -H "x-api-key: ftth-integration-mtl6caaf-prod" \
     "https://ftth.digitak.id/ftth_api/integration/master-process-forms?processId=c2f9a1e6-4119-4d3e-9a5d-8b1e2f3a4b5c"
```

### 5.7 Buat master process baru (POST)

`sort_order` otomatis menjadi angka terakhir + 1, dan otomatis terpasang ke semua cluster aktif.

```
curl -X POST -H "x-api-key: ftth-integration-mtl6caaf-prod" \
     -H "Content-Type: application/json" \
     -d '{
           "name": "Laporan Implementasi",
           "description": "Laporan hasil implementasi dari aplikasi pegawai",
           "master_category_id": "c2f9a1e6-4119-4d3e-9a5d-8b1e2f3a4b5c",
           "allow_text": true,
           "input_instruction": "Isi laporan implementasi"
         }' \
     https://ftth.digitak.id/ftth_api/integration/master-processes
```

Response `201` contoh:

```json
{
  "id": "9d3f7a2b-...",
  "name": "Laporan Implementasi",
  "description": "Laporan hasil implementasi dari aplikasi pegawai",
  "sort_order": 15,
  "master_category_id": "c2f9a1e6-...",
  "source": "external",
  "attached_clusters": 12,
  "is_active": true
}
```

### 5.8 Ubah master process (PUT)

Hanya berhasil jika `source=external`. Bila `source=app` → `403`.

```
curl -X PUT -H "x-api-key: ftth-integration-mtl6caaf-prod" \
     -H "Content-Type: application/json" \
     -d '{
           "description": "Laporan hasil implementasi - diperbarui",
           "is_active": true
         }' \
     https://ftth.digitak.id/ftth_api/integration/master-processes/9d3f7a2b-c7a1-4b3e-9f2a-1c2e3d4f5a6b
```

### 5.9 Hapus master process (DELETE)

Hanya berhasil jika `source=external`. Bila `source=app` → `403`.

```
curl -X DELETE -H "x-api-key: ftth-integration-mtl6caaf-prod" \
     https://ftth.digitak.id/ftth_api/integration/master-processes/9d3f7a2b-c7a1-4b3e-9f2a-1c2e3d4f5a6b
```

### 5.10 Ambil data wilayah (contoh provinsi)

```
curl -H "x-api-key: ftth-integration-mtl6caaf-prod" \
     https://ftth.digitak.id/ftth_api/integration/master-provinces
```

### 5.11 Ambil semua tabel database

Ambil semua projek:

```
curl -H "x-api-key: ftth-integration-mtl6caaf-prod" \
     https://ftth.digitak.id/ftth_api/integration/projects
```

Ambil semua cluster (dengan paginasi & urutan):

```
curl -H "x-api-key: ftth-integration-mtl6caaf-prod" \
     "https://ftth.digitak.id/ftth_api/integration/clusters?limit=50&offset=0&orderBy=name&orderDir=asc"
```

### 5.12 Laporan Kegiatan (CRUD)

Buat laporan baru:

```
curl -X POST -H "x-api-key: ftth-integration-mtl6caaf-prod" \
     -H "Content-Type: application/json" \
     -d '{
           "user_id": "e251e505-c7e0-411d-aff7-1107c69ed2b2",
           "project_id": "33d4a70f-6bb0-4d32-8787-fa4e750de052",
           "cluster_id": "4d1f2eb5-8f94-4c46-a6b6-8e8ceba24de4",
           "process_id": "d176e3c9-3068-4cc8-a97b-d24ab7fe1814",
           "tanggal_kegiatan": "2026-09-06",
           "nomor_perangkat": "ODP-001",
           "keterangan": "Pemasangan ODP selesai",
           "status": "PENDING"
         }' \
     https://ftth.digitak.id/ftth_api/integration/laporan-kegiatan
```

Ambil semua laporan (dengan relasi & filter status):

```
curl -H "x-api-key: ftth-integration-mtl6caaf-prod" \
     "https://ftth.digitak.id/ftth_api/integration/laporan-kegiatan?status=PENDING&limit=50"
```

Ubah laporan (misal approve):

```
curl -X PUT -H "x-api-key: ftth-integration-mtl6caaf-prod" \
     -H "Content-Type: application/json" \
     -d '{
           "status": "APPROVED",
           "catatan_revisi": "Disetujui",
           "verified_by": "e251e505-c7e0-411d-aff7-1107c69ed2b2",
           "verified_at": "2026-09-06T09:00:00.000Z"
         }' \
     https://ftth.digitak.id/ftth_api/integration/laporan-kegiatan/<laporan_id>
```

Hapus laporan (dokumentasi ikut terhapus otomatis):

```
curl -X DELETE -H "x-api-key: ftth-integration-mtl6caaf-prod" \
     https://ftth.digitak.id/ftth_api/integration/laporan-kegiatan/<laporan_id>
```

### 5.13 Dokumentasi Laporan (Upload + CRUD)

**Langkah 1** — Upload file (foto/dokumen):

```
curl -X POST -H "x-api-key: ftth-integration-mtl6caaf-prod" \
     -F "file=@/path/to/foto.jpg" \
     https://ftth.digitak.id/ftth_api/integration/dokumentasi-laporan/upload
```

Response:

```json
{
  "file_url": "/uploads/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
  "original_name": "foto.jpg",
  "mime_type": "image/jpeg",
  "file_size": 245678
}
```

**Langkah 2** — Simpan metadata lampiran ke laporan (pakai `file_url` dari langkah 1):

```
curl -X POST -H "x-api-key: ftth-integration-mtl6caaf-prod" \
     -H "Content-Type: application/json" \
     -d '{
           "laporan_id": "<laporan_id>",
           "file_url": "/uploads/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
           "original_name": "foto.jpg",
           "mime_type": "image/jpeg",
           "file_size": 245678,
           "tipe_berkas": "foto"
         }' \
     https://ftth.digitak.id/ftth_api/integration/dokumentasi-laporan
```

File bisa diakses langsung di: `https://ftth.digitak.id/ftth/uploads/<filename>`

Ambil semua lampiran dari satu laporan:

```
curl -H "x-api-key: ftth-integration-mtl6caaf-prod" \
     "https://ftth.digitak.id/ftth_api/integration/dokumentasi-laporan?laporanId=<laporan_id>"
```

Preview/download file lampiran (gambar tampil di browser):

```
curl -H "x-api-key: ftth-integration-mtl6caaf-prod" \
     https://ftth.digitak.id/ftth_api/integration/dokumentasi-laporan/<id>/download
```

Force download:

```
curl -H "x-api-key: ftth-integration-mtl6caaf-prod" \
     -o foto.jpg \
     "https://ftth.digitak.id/ftth_api/integration/dokumentasi-laporan/<id>/download?mode=download"
```

> **Catatan**: Ekstensi file yang diizinkan: `.pdf`, `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.webp`, `.kmz`, `.kml`, `.doc`, `.docx`, `.xls`, `.xlsx`. Ukuran maksimal **10 MB**.

### 5.14 Foto Profil User (Upload + Preview)

Upload foto profil user:

```
curl -X POST -H "x-api-key: ftth-integration-mtl6caaf-prod" \
     -F "file=@/path/to/foto.jpg" \
     https://ftth.digitak.id/ftth_api/integration/users/<user_id>/foto
```

Response:

```json
{
  "foto": "/uploads/uuid-foto.jpg",
  "original_name": "foto.jpg",
  "mime_type": "image/jpeg",
  "file_size": 51200
}
```

Preview foto (gambar tampil di browser):

```
curl -H "x-api-key: ftth-integration-mtl6caaf-prod" \
     https://ftth.digitak.id/ftth_api/integration/users/<user_id>/foto
```

Download foto:

```
curl -H "x-api-key: ftth-integration-mtl6caaf-prod" \
     -o foto.jpg \
     "https://ftth.digitak.id/ftth_api/integration/users/<user_id>/foto?mode=download"
```

### 5.15 Cluster yang Ditangani User (PIC)

Ambil semua cluster yang ditangani oleh user tertentu (berdasarkan `pic_id`), termasuk info project dan progress:

```
curl -H "x-api-key: ftth-integration-mtl6caaf-prod" \
     "https://ftth.digitak.id/ftth_api/integration/users/<user_id>/clusters"
```

Response:

```json
[
  {
    "id": "uuid-cluster",
    "name": "Cluster Rancamanyar RW 09",
    "status": "on_progress",
    "pic_id": "uuid-user",
    "project_id": "uuid-project",
    "latitude": -6.95,
    "longitude": 107.65,
    "homepass_target": 100,
    "homepass_achieved": 45,
    "overall_progress": 67,
    "completed_processes": 4,
    "total_processes": 6,
    "created_at": "2026-08-01T00:00:00.000Z",
    "project": {
      "id": "uuid-project",
      "name": "FTTH Bandung Selatan"
    }
  }
]
```

> Mendukung paginasi: `?limit=10&offset=0`

### 5.16 Update Cluster (Assign PIC)

Update cluster — misal assign PIC baru. Semua `cluster_processes` di cluster tersebut otomatis ikut PIC yang sama:

```
curl -X PUT -H "x-api-key: ftth-integration-mtl6caaf-prod" \
     -H "Content-Type: application/json" \
     -d '{
           "pic_id": "bcc64975-391a-4aa9-84ba-e6b6841260d8"
         }' \
     https://ftth.digitak.id/ftth_api/integration/clusters/<cluster_id>
```

Response:

```json
{
  "id": "ece3d663-cab9-4906-87ef-cab54176b6c8",
  "name": "NET-H-004404 FTTH Open Area Rancamanyar RW 09",
  "status": "on_progress",
  "pic_id": "bcc64975-391a-4aa9-84ba-e6b6841260d8",
  "project_id": "...",
  ...
}
```

> **Auto-sync**: Saat `pic_id` di-update, semua `cluster_processes` di cluster tersebut otomatis `pic_id`-nya di-overwrite ke nilai baru. Field lain yang bisa di-update: `name`, `description`, `status`, `latitude`, `longitude`, `homepass_target`, `homepass_achieved`, `province_id`, `regency_id`, `district_id`, `village_id`.

### 5.17 Status Laporan Harian User

Cek apakah user (`wajib_lapor: true`) sudah mengisi laporan hari ini di setiap cluster yang dia PIC-nya:

```
curl -H "x-api-key: ftth-integration-mtl6caaf-prod" \
     "https://ftth.digitak.id/ftth_api/integration/users/<user_id>/laporan-status"
```

Response:

```json
{
  "user_id": "bcc64975-391a-4aa9-84ba-e6b6841260d8",
  "username": "pegawai.nopan",
  "wajib_lapor": true,
  "tanggal": "2026-09-08",
  "clusters": [
    {
      "cluster_id": "ece3d663-...",
      "cluster_name": "NET-H-004404 FTTH Open Area Rancamanyar RW 09",
      "project_name": "FTTH OPEN AREA RANCAMANYAR KAB. BANDUNG",
      "sudah_lapor": true,
      "laporan_id": "uuid-laporan",
      "laporan_status": "PENDING"
    },
    {
      "cluster_id": "4d1f2eb5-...",
      "cluster_name": "NET-H-004400 FTTH Open Area Rancamanyar RW 05",
      "project_name": "FTTH OPEN AREA RANCAMANYAR KAB. BANDUNG",
      "sudah_lapor": false,
      "laporan_id": null,
      "laporan_status": null
    }
  ]
}
```

> **Aturan**: Tanggal hari ini berdasarkan **WIB (UTC+7)**. Field `sudah_lapor: true` jika ada `laporan_kegiatan` dengan `tanggal_kegiatan` = hari ini untuk cluster tersebut.

Error:

| Kode | Arti |
|------|------|
| `400` | User `wajib_lapor: false` — tidak perlu cek status |
| `404` | User tidak ditemukan |

---

## 6. Autentikasi (Login / Session / Logout)

Endpoint autentikasi menggunakan **JWT** (*JSON Web Token*). Tidak perlu API key — cukup username + password FTTH.

| Method | Path | Fungsi | Auth |
|--------|------|--------|------|
| POST | `/ftth_api/auth/login` | Login → return token + data user | Tidak perlu |
| GET | `/ftth_api/auth/me` | Cek token valid + ambil user saat ini | `Bearer <token>` |
| POST | `/ftth_api/auth/logout` | Logout (client hapus token) | Tidak perlu |

### 6.1 Login

```
curl -X POST https://ftth.digitak.id/ftth_api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"pegawai.nopan","password":"..."}'
```

Response sukses:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "bcc64975-391a-4aa9-84ba-e6b6841260d8",
    "username": "pegawai.nopan",
    "email": "nopan@ftth2.com",
    "full_name": "Nopan",
    "role": "user",
    "phone": "081234567890",
    "is_active": true,
    "foto": "/uploads/uuid.jpg"
  }
}
```

Response error:

| Kode | Arti |
|------|------|
| `400` | Username atau password kosong |
| `401` | Username/password salah |
| `403` | Akun nonaktif (`is_active: false`) |

### 6.2 Cek Session / Token

Gunakan token dari response login di header `Authorization`:

```
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
     https://ftth.digitak.id/ftth_api/auth/me
```

Response sukses → data user saat ini (sama seperti objek `user` di response login).

Response error:

| Kode | Arti |
|------|------|
| `401` | Token tidak ada, salah, atau sudah expired (berlaku 7 hari) |

### 6.3 Logout

Karena JWT bersifat *stateless* (tidak ada session di server), logout dilakukan di **client** — hapus token dari local storage / memory. Endpoint ini hanya sebagai konfirmasi:

```
curl -X POST https://ftth.digitak.id/ftth_api/auth/logout
```

Response:

```json
{ "message": "Logged out" }
```

### 6.4 Alur Autentikasi untuk Aplikasi Pegawai

```
1. POST /auth/login  →  simpan token di client
2. Semua request berikutnya pakai header: Authorization: Bearer <token>
3. GET /auth/me  →  cek token masih valid (optional, bisa dipanggil saat app start)
4. POST /auth/logout  →  hapus token dari client
```

> **Catatan**: Token JWT berlaku selama **7 hari**. Setelah expired, user harus login ulang. Role `user` (Pegawai) hanya bisa baca data + operasi terbatas. Role `administrator` (Superadmin) punya akses penuh.
