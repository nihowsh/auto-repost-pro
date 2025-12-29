-- Ensure youtube_channels upsert works by adding a uniqueness constraint on user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'youtube_channels_user_id_key'
  ) THEN
    ALTER TABLE public.youtube_channels
    ADD CONSTRAINT youtube_channels_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Optional: prevent duplicate channel_id rows across users (safe even if one channel used by one user)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'youtube_channels_channel_id_key'
  ) THEN
    ALTER TABLE public.youtube_channels
    ADD CONSTRAINT youtube_channels_channel_id_key UNIQUE (channel_id);
  END IF;
END $$;