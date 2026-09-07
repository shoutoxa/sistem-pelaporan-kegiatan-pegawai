-- Additive development mapping only. No existing users/reports/files are changed.
CREATE TABLE "ftth_identity" (
  "user_id" UUID PRIMARY KEY REFERENCES "users"("id") ON DELETE RESTRICT,
  "external_user_id" UUID NOT NULL UNIQUE,
  "allowed_cluster_ids" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "ftth_identity" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON "ftth_identity" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON "ftth_identity" FROM authenticated;
  END IF;
END $$;
CREATE TABLE "ftth_upload" (
  "id" UUID PRIMARY KEY,
  "report_id" UUID NOT NULL,
  "storage_path" TEXT NOT NULL UNIQUE,
  "original_name" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "file_size" INTEGER NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'PREPARED',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ftth_upload_report_id_idx" ON "ftth_upload" ("report_id");
ALTER TABLE "ftth_upload" ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON "ftth_upload" FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON "ftth_upload" FROM authenticated;
  END IF;
END $$;
