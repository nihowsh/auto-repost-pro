import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, source_type } = await req.json();
    console.log('Fetching metadata for:', url, source_type);

    let metadata: any = {
      source_type,
      title: '',
      description: '',
      tags: [],
      thumbnail_url: '',
      duration_seconds: null,
      is_short: false,
    };

    if (source_type === 'youtube') {
      // Extract video ID from YouTube URL
      let videoId = '';
      if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1].split('?')[0];
      } else if (url.includes('v=')) {
        videoId = url.split('v=')[1].split('&')[0];
      } else if (url.includes('/shorts/')) {
        videoId = url.split('/shorts/')[1].split('?')[0];
        metadata.is_short = true;
      }

      if (videoId) {
        // Use oEmbed API (no API key needed)
        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        const response = await fetch(oembedUrl);
        
        if (response.ok) {
          const data = await response.json();
          metadata.title = data.title || '';
          metadata.thumbnail_url = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        }
      }
    } else if (source_type === 'instagram') {
      // For Instagram, we'll extract basic info from URL
      metadata.title = 'Instagram Reel';
      metadata.description = 'Imported from Instagram';
      metadata.is_short = true; // Instagram Reels are typically short-form
    }

    console.log('Metadata fetched:', metadata);
    return new Response(JSON.stringify(metadata), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Fetch metadata error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
