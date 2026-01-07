-- Add youtube_category column to long_form_projects table
ALTER TABLE public.long_form_projects 
ADD COLUMN IF NOT EXISTS youtube_category text DEFAULT 'Entertainment';

-- Add youtube_privacy column (public, unlisted, private)
ALTER TABLE public.long_form_projects 
ADD COLUMN IF NOT EXISTS youtube_privacy text DEFAULT 'public';

-- Add youtube_made_for_kids column
ALTER TABLE public.long_form_projects 
ADD COLUMN IF NOT EXISTS youtube_made_for_kids boolean DEFAULT false;

-- Add youtube_embeddable column
ALTER TABLE public.long_form_projects 
ADD COLUMN IF NOT EXISTS youtube_embeddable boolean DEFAULT true;

-- Add youtube_notify_subscribers column
ALTER TABLE public.long_form_projects 
ADD COLUMN IF NOT EXISTS youtube_notify_subscribers boolean DEFAULT true;