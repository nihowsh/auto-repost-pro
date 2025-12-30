-- Drop the existing check constraint and recreate with pending_download status
ALTER TABLE public.videos DROP CONSTRAINT IF EXISTS videos_status_check;

ALTER TABLE public.videos ADD CONSTRAINT videos_status_check 
CHECK (status IN ('pending', 'pending_download', 'downloading', 'processing', 'uploading', 'scheduled', 'published', 'failed'));