-- Add an idempotent local mirror for FTTH categories and processes.
-- Existing pekerjaan rows remain valid because kategori_id is nullable.

CREATE TABLE IF NOT EXISTS public.kategori_pekerjaan (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  external_id UUID,
  nama_kategori TEXT NOT NULL,
  deskripsi TEXT,
  sumber VARCHAR(30) NOT NULL DEFAULT 'LOCAL',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMP(3),
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT kategori_pekerjaan_pkey PRIMARY KEY (id)
);

ALTER TABLE public.pekerjaan
  ADD COLUMN IF NOT EXISTS kategori_id UUID,
  ADD COLUMN IF NOT EXISTS external_id UUID,
  ADD COLUMN IF NOT EXISTS sumber VARCHAR(30) NOT NULL DEFAULT 'LOCAL',
  ADD COLUMN IF NOT EXISTS sort_order INTEGER,
  ADD COLUMN IF NOT EXISTS allow_file BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_text BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_link BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS kategori_pekerjaan_external_id_key
  ON public.kategori_pekerjaan(external_id);
CREATE UNIQUE INDEX IF NOT EXISTS kategori_pekerjaan_nama_kategori_key
  ON public.kategori_pekerjaan(nama_kategori);
CREATE INDEX IF NOT EXISTS kategori_pekerjaan_is_active_idx
  ON public.kategori_pekerjaan(is_active);
CREATE UNIQUE INDEX IF NOT EXISTS pekerjaan_external_id_key
  ON public.pekerjaan(external_id);
CREATE INDEX IF NOT EXISTS pekerjaan_kategori_id_is_active_idx
  ON public.pekerjaan(kategori_id, is_active);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pekerjaan_kategori_id_fkey'
      AND conrelid = 'public.pekerjaan'::regclass
  ) THEN
    ALTER TABLE public.pekerjaan
      ADD CONSTRAINT pekerjaan_kategori_id_fkey
      FOREIGN KEY (kategori_id) REFERENCES public.kategori_pekerjaan(id)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE public.kategori_pekerjaan ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.kategori_pekerjaan FROM anon, authenticated;
