-- Remove the unique constraint on user_id to allow multiple channels per user
ALTER TABLE public.youtube_channels DROP CONSTRAINT IF EXISTS youtube_channels_user_id_key;

-- Add a unique constraint on user_id + channel_id instead (prevent same channel twice)
ALTER TABLE public.youtube_channels ADD CONSTRAINT youtube_channels_user_channel_unique UNIQUE (user_id, channel_id);