-- Create API keys table for local runner authentication
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'My Runner',
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  revoked_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Users can only view their own API keys
CREATE POLICY "Users can view their own API keys"
ON public.api_keys
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own API keys
CREATE POLICY "Users can insert their own API keys"
ON public.api_keys
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own API keys (for revoking)
CREATE POLICY "Users can update their own API keys"
ON public.api_keys
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own API keys
CREATE POLICY "Users can delete their own API keys"
ON public.api_keys
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster key lookups by prefix
CREATE INDEX idx_api_keys_prefix ON public.api_keys(key_prefix);

-- Create index for user lookups
CREATE INDEX idx_api_keys_user_id ON public.api_keys(user_id);