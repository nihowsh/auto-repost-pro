-- Background music uploads
CREATE TABLE IF NOT EXISTS public.background_music_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.background_music_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own background music tracks"
ON public.background_music_tracks
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own background music tracks"
ON public.background_music_tracks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own background music tracks"
ON public.background_music_tracks
FOR DELETE
USING (auth.uid() = user_id);

-- Storage bucket for background music
INSERT INTO storage.buckets (id, name, public)
VALUES ('background-music', 'background-music', true)
ON CONFLICT (id) DO NOTHING;

-- Public can read background music (needed for local runner fetch)
CREATE POLICY "Background music is publicly readable"
ON storage.objects
FOR SELECT
USING (bucket_id = 'background-music');

-- Users can manage files in their own folder: {user_id}/...
CREATE POLICY "Users can upload their own background music"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'background-music'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own background music"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'background-music'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own background music"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'background-music'
  AND auth.uid()::text = (storage.foldername(name))[1]
);