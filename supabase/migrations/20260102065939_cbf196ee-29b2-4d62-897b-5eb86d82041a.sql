-- Per-channel upload locking / throttling (used by backend worker)
CREATE TABLE IF NOT EXISTS public.channel_upload_locks (
  channel_id uuid PRIMARY KEY,
  locked_by_video_id uuid NULL,
  lock_acquired_at timestamp with time zone NOT NULL DEFAULT now(),
  locked_until timestamp with time zone NOT NULL DEFAULT now(),
  next_allowed_upload_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS so only backend (service role) can access by default
ALTER TABLE public.channel_upload_locks ENABLE ROW LEVEL SECURITY;

-- Keep updated_at fresh
CREATE TRIGGER channel_upload_locks_set_updated_at
BEFORE UPDATE ON public.channel_upload_locks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Helpful index for querying eligibility (not strictly needed but cheap)
CREATE INDEX IF NOT EXISTS idx_channel_upload_locks_next_allowed
ON public.channel_upload_locks (next_allowed_upload_at);
