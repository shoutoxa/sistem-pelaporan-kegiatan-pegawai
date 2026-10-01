-- Normalize legacy/demo labels while preserving custom cluster names.
-- When both labels exist, move reports to the RW row and remove only the
-- unused duplicate master row created by the earlier seed.
DO $$
DECLARE
  legacy RECORD;
  target_id UUID;
  target_name TEXT;
BEGIN
  FOR legacy IN
    SELECT id, desa_id, cluster_name
    FROM public.cluster
    WHERE cluster_name ~ '^Cluster [0-9]+$'
  LOOP
    target_name := regexp_replace(legacy.cluster_name, '^Cluster ', 'RW ');
    SELECT id INTO target_id
    FROM public.cluster
    WHERE desa_id = legacy.desa_id
      AND cluster_name = target_name
      AND id <> legacy.id;

    IF target_id IS NULL THEN
      UPDATE public.cluster SET cluster_name = target_name WHERE id = legacy.id;
    ELSE
      UPDATE public.laporan SET cluster_id = target_id WHERE cluster_id = legacy.id;
      DELETE FROM public.cluster WHERE id = legacy.id;
    END IF;
  END LOOP;
END $$;
