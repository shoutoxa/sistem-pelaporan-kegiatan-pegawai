-- Preserve all existing local upload receipts and files.
ALTER TABLE public.ftth_upload ADD COLUMN remote_path TEXT;
