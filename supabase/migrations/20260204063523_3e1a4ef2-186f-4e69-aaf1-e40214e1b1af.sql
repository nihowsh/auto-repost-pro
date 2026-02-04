-- Add google_email column to store the Google account email for login_hint optimization
ALTER TABLE public.youtube_channels ADD COLUMN IF NOT EXISTS google_email TEXT;