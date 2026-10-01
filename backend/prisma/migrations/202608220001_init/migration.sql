-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPERADMIN', 'PEGAWAI');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "nama" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "wajib_lapor" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "desa" (
    "id" UUID NOT NULL,
    "nama_desa" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "desa_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rw" (
    "id" UUID NOT NULL,
    "desa_id" UUID NOT NULL,
    "nomor_rw" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rw_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tahapan" (
    "id" UUID NOT NULL,
    "nama_tahapan" TEXT NOT NULL,
    "requires_nomor_perangkat" BOOLEAN NOT NULL,
    "instruksi_dokumentasi" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tahapan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "laporan" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "rw_id" UUID NOT NULL,
    "tahapan_id" UUID NOT NULL,
    "tanggal_kegiatan" DATE NOT NULL,
    "keterangan" TEXT NOT NULL,
    "nomor_perangkat" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "laporan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dokumentasi" (
    "id" UUID NOT NULL,
    "laporan_id" UUID NOT NULL,
    "storage_path" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dokumentasi_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "desa_nama_desa_key" ON "desa"("nama_desa");
CREATE INDEX "rw_desa_id_is_active_idx" ON "rw"("desa_id", "is_active");
CREATE UNIQUE INDEX "rw_desa_id_nomor_rw_key" ON "rw"("desa_id", "nomor_rw");
CREATE UNIQUE INDEX "tahapan_nama_tahapan_key" ON "tahapan"("nama_tahapan");
CREATE INDEX "tahapan_is_active_idx" ON "tahapan"("is_active");
CREATE INDEX "laporan_user_id_tanggal_kegiatan_idx" ON "laporan"("user_id", "tanggal_kegiatan");
CREATE INDEX "laporan_tanggal_kegiatan_idx" ON "laporan"("tanggal_kegiatan");
CREATE INDEX "laporan_rw_id_idx" ON "laporan"("rw_id");
CREATE INDEX "laporan_tahapan_id_idx" ON "laporan"("tahapan_id");
CREATE UNIQUE INDEX "dokumentasi_storage_path_key" ON "dokumentasi"("storage_path");
CREATE INDEX "dokumentasi_laporan_id_idx" ON "dokumentasi"("laporan_id");

ALTER TABLE "rw" ADD CONSTRAINT "rw_desa_id_fkey" FOREIGN KEY ("desa_id") REFERENCES "desa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "laporan" ADD CONSTRAINT "laporan_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "laporan" ADD CONSTRAINT "laporan_rw_id_fkey" FOREIGN KEY ("rw_id") REFERENCES "rw"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "laporan" ADD CONSTRAINT "laporan_tahapan_id_fkey" FOREIGN KEY ("tahapan_id") REFERENCES "tahapan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dokumentasi" ADD CONSTRAINT "dokumentasi_laporan_id_fkey" FOREIGN KEY ("laporan_id") REFERENCES "laporan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Defense in depth: the app uses the backend's direct PostgreSQL connection,
-- so the Supabase Data API roles do not receive table privileges.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.desa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tahapan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laporan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dokumentasi ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.users, public.desa, public.rw, public.tahapan, public.laporan, public.dokumentasi FROM anon, authenticated;
