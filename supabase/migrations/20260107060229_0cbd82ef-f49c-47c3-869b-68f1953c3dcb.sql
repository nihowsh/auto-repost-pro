-- Add video_filter column for storing selected filter/template
ALTER TABLE public.long_form_projects 
ADD COLUMN IF NOT EXISTS video_filter TEXT DEFAULT 'none';