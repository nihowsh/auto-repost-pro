-- Create long_form_projects table for video generation projects
CREATE TABLE public.long_form_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  channel_id UUID REFERENCES public.youtube_channels(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 
    'generating_script', 
    'script_ready', 
    'voiceover_ready',
    'pending_processing', 
    'downloading_clips', 
    'assembling', 
    'ready_for_review', 
    'uploading', 
    'scheduled', 
    'published', 
    'failed'
  )),
  topic TEXT NOT NULL,
  target_duration_seconds INTEGER NOT NULL DEFAULT 600,
  brief_description TEXT,
  script TEXT,
  script_source TEXT DEFAULT 'manual' CHECK (script_source IN ('manual', 'ai_generated')),
  reference_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  clips_metadata JSONB,
  voiceover_path TEXT,
  background_music_url TEXT,
  background_music_source TEXT DEFAULT 'auto' CHECK (background_music_source IN ('manual', 'auto', 'pixabay', 'mixkit')),
  background_music_category TEXT,
  final_video_path TEXT,
  thumbnail_path TEXT,
  youtube_title TEXT,
  youtube_description TEXT,
  youtube_tags TEXT[],
  youtube_chapters JSONB,
  scheduled_publish_at TIMESTAMPTZ,
  scheduling_mode TEXT DEFAULT 'manual' CHECK (scheduling_mode IN ('immediate', 'manual', 'auto_hours', 'auto_days', 'auto_weeks', 'auto_month')),
  scheduling_delay INTEGER,
  youtube_video_id TEXT,
  published_at TIMESTAMPTZ,
  error_message TEXT,
  processing_progress INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.long_form_projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only manage their own projects
CREATE POLICY "Users can view their own projects"
ON public.long_form_projects
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
ON public.long_form_projects
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
ON public.long_form_projects
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
ON public.long_form_projects
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_long_form_projects_updated_at
BEFORE UPDATE ON public.long_form_projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.long_form_projects;