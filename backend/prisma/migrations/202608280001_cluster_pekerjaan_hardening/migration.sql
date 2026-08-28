-- Forward-compatible migration for the RW/Tahapan -> Cluster/Pekerjaan rename.
-- The conditional blocks also make this safe for the existing Supabase database,
-- which was already converted outside Prisma migration history.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS nomor_hp VARCHAR(20),
  ADD COLUMN IF NOT EXISTS foto_profil TEXT;

DO $$
BEGIN
  IF to_regclass('public.rw') IS NOT NULL AND to_regclass('public.cluster') IS NULL THEN
    ALTER TABLE public.rw RENAME TO cluster;
    ALTER TABLE public.cluster RENAME COLUMN nomor_rw TO cluster_name;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rw_pkey') THEN
      ALTER TABLE public.cluster RENAME CONSTRAINT rw_pkey TO cluster_pkey;
    END IF;
  END IF;

  IF to_regclass('public.tahapan') IS NOT NULL AND to_regclass('public.pekerjaan') IS NULL THEN
    ALTER TABLE public.tahapan RENAME TO pekerjaan;
    ALTER TABLE public.pekerjaan RENAME COLUMN nama_tahapan TO nama_pekerjaan;
    ALTER TABLE public.pekerjaan DROP COLUMN IF EXISTS requires_nomor_perangkat;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tahapan_pkey') THEN
      ALTER TABLE public.pekerjaan RENAME CONSTRAINT tahapan_pkey TO pekerjaan_pkey;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.laporan') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'laporan' AND column_name = 'rw_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'laporan' AND column_name = 'cluster_id') THEN
    ALTER TABLE public.laporan RENAME COLUMN rw_id TO cluster_id;
  END IF;

  IF to_regclass('public.laporan') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'laporan' AND column_name = 'tahapan_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'laporan' AND column_name = 'pekerjaan_id') THEN
    ALTER TABLE public.laporan RENAME COLUMN tahapan_id TO pekerjaan_id;
  END IF;
END $$;

ALTER TABLE public.laporan
  ADD COLUMN IF NOT EXISTS diterima BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  IF to_regclass('public.laporan') IS NOT NULL AND to_regclass('public.cluster') IS NOT NULL THEN
    ALTER TABLE public.laporan DROP CONSTRAINT IF EXISTS laporan_rw_id_fkey;
    ALTER TABLE public.laporan DROP CONSTRAINT IF EXISTS laporan_cluster_id_fkey;
    ALTER TABLE public.laporan ADD CONSTRAINT laporan_cluster_id_fkey FOREIGN KEY (cluster_id) REFERENCES public.cluster(id) ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF to_regclass('public.laporan') IS NOT NULL AND to_regclass('public.pekerjaan') IS NOT NULL THEN
    ALTER TABLE public.laporan DROP CONSTRAINT IF EXISTS laporan_tahapan_id_fkey;
    ALTER TABLE public.laporan DROP CONSTRAINT IF EXISTS laporan_pekerjaan_id_fkey;
    ALTER TABLE public.laporan ADD CONSTRAINT laporan_pekerjaan_id_fkey FOREIGN KEY (pekerjaan_id) REFERENCES public.pekerjaan(id) ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS cluster_desa_id_cluster_name_key
  ON public.cluster(desa_id, cluster_name);
CREATE INDEX IF NOT EXISTS cluster_desa_id_is_active_idx
  ON public.cluster(desa_id, is_active);
CREATE UNIQUE INDEX IF NOT EXISTS pekerjaan_nama_pekerjaan_key
  ON public.pekerjaan(nama_pekerjaan);
CREATE INDEX IF NOT EXISTS pekerjaan_is_active_idx
  ON public.pekerjaan(is_active);
CREATE INDEX IF NOT EXISTS laporan_cluster_id_idx
  ON public.laporan(cluster_id);
CREATE INDEX IF NOT EXISTS laporan_pekerjaan_id_idx
  ON public.laporan(pekerjaan_id);

-- The backend uses a direct PostgreSQL connection and Supabase Storage service key.
-- Keep the Data API closed to anon/authenticated roles.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['users', 'desa', 'cluster', 'pekerjaan', 'laporan', 'dokumentasi'] LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', table_name);
    END IF;
  END LOOP;
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON TABLE public._prisma_migrations FROM anon, authenticated;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'prevent_non_superadmin_profile_change'
  ) THEN
    ALTER FUNCTION public.prevent_non_superadmin_profile_change() SET search_path = public, pg_temp;
  END IF;
END $$;
