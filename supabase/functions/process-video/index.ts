import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid user token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { source_url, source_type, title, description, tags, thumbnail_url, channel_id, manual_schedule_time, video_id, retry } = body;

    // Handle retry
    if (retry && video_id) {
      const { error } = await supabase
        .from('videos')
        .update({ status: 'pending', error_message: null })
        .eq('id', video_id)
        .eq('user_id', user.id);
      
      if (error) throw error;
      console.log('Video queued for retry:', video_id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate scheduled time using automatic scheduling logic
    let scheduledPublishAt: string | null = null;
    
    if (manual_schedule_time) {
      scheduledPublishAt = manual_schedule_time;
    } else {
      // Check for existing scheduled videos
      const { data: scheduledVideos } = await supabase
        .from('videos')
        .select('scheduled_publish_at')
        .eq('user_id', user.id)
        .eq('status', 'scheduled')
        .order('scheduled_publish_at', { ascending: false })
        .limit(1);

      if (scheduledVideos && scheduledVideos.length > 0 && scheduledVideos[0].scheduled_publish_at) {
        // Schedule 4 hours after the latest scheduled video
        const latestTime = new Date(scheduledVideos[0].scheduled_publish_at);
        scheduledPublishAt = new Date(latestTime.getTime() + 4 * 60 * 60 * 1000).toISOString();
        console.log('Auto-scheduling 4 hours after:', latestTime.toISOString());
      }
      // If no scheduled videos exist, scheduledPublishAt stays null (publish immediately)
    }

    // Detect if it's a YouTube Short
    const isShort = source_url.includes('/shorts/') || 
                    source_type === 'instagram' ||
                    (body.duration_seconds && body.duration_seconds <= 60);

    // Create video record
    const { data: video, error: insertError } = await supabase
      .from('videos')
      .insert({
        user_id: user.id,
        channel_id,
        source_url,
        source_type,
        title: title || 'Untitled',
        description: description || '',
        tags: tags || [],
        thumbnail_url,
        is_short: isShort,
        status: 'pending',
        scheduled_publish_at: scheduledPublishAt,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw new Error('Failed to create video record');
    }

    console.log('Video created:', video.id, 'Scheduled for:', scheduledPublishAt || 'immediate');
    
    return new Response(JSON.stringify({ 
      success: true, 
      video_id: video.id,
      scheduled_at: scheduledPublishAt,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Process video error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
