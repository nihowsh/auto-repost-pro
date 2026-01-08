import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    const data = await response.json();
    if (data.error) return null;
    return data;
  } catch {
    return null;
  }
}

async function getValidAccessToken(supabase: any, channelDbId: string): Promise<string | null> {
  const { data: channel, error } = await supabase
    .from('youtube_channels')
    .select('access_token, refresh_token, token_expires_at')
    .eq('id', channelDbId)
    .single();

  if (error || !channel) return null;

  const expiresAt = new Date(channel.token_expires_at);
  const now = new Date();

  // If token expires in less than 5 minutes, refresh it
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    const refreshed = await refreshAccessToken(channel.refresh_token);
    if (!refreshed) return null;

    const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000);
    await supabase
      .from('youtube_channels')
      .update({
        access_token: refreshed.access_token,
        token_expires_at: newExpiresAt.toISOString(),
      })
      .eq('id', channelDbId);

    return refreshed.access_token;
  }

  return channel.access_token;
}

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

    const { action, channel_db_id, start_date, end_date, video_ids, metrics, dimensions } = await req.json();

    // Get access token for the channel
    const accessToken = await getValidAccessToken(supabase, channel_db_id);
    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Failed to get valid access token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get channel info to get the YouTube channel ID
    const { data: channelData } = await supabase
      .from('youtube_channels')
      .select('channel_id')
      .eq('id', channel_db_id)
      .single();

    if (!channelData) {
      return new Response(JSON.stringify({ error: 'Channel not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const channelId = channelData.channel_id;

    if (action === 'channel_stats') {
      // Fetch basic channel statistics from YouTube Data API
      const channelResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const channelStats = await channelResponse.json();

      if (!channelStats.items?.length) {
        return new Response(JSON.stringify({ error: 'Channel not found on YouTube' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const stats = channelStats.items[0].statistics;
      return new Response(JSON.stringify({
        subscriberCount: parseInt(stats.subscriberCount || '0'),
        viewCount: parseInt(stats.viewCount || '0'),
        videoCount: parseInt(stats.videoCount || '0'),
        hiddenSubscriberCount: stats.hiddenSubscriberCount || false,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'analytics_report') {
      // Fetch analytics from YouTube Analytics API
      const metricsStr = metrics?.join(',') || 'views,estimatedMinutesWatched,subscribersGained,subscribersLost';
      const dimensionsStr = dimensions?.join(',') || 'day';
      
      const analyticsUrl = new URL('https://youtubeanalytics.googleapis.com/v2/reports');
      analyticsUrl.searchParams.set('ids', `channel==${channelId}`);
      analyticsUrl.searchParams.set('startDate', start_date);
      analyticsUrl.searchParams.set('endDate', end_date);
      analyticsUrl.searchParams.set('metrics', metricsStr);
      analyticsUrl.searchParams.set('dimensions', dimensionsStr);
      analyticsUrl.searchParams.set('sort', dimensionsStr === 'day' ? 'day' : '-views');

      const analyticsResponse = await fetch(analyticsUrl.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const analyticsData = await analyticsResponse.json();

      if (analyticsData.error) {
        console.error('YouTube Analytics API error:', analyticsData.error);
        return new Response(JSON.stringify({ error: analyticsData.error.message || 'Analytics API error' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(analyticsData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'video_analytics') {
      // Fetch video-specific analytics
      if (!video_ids || video_ids.length === 0) {
        return new Response(JSON.stringify({ error: 'video_ids required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const metricsStr = metrics?.join(',') || 'views,estimatedMinutesWatched,averageViewDuration,likes,comments,shares,subscribersGained';
      
      const analyticsUrl = new URL('https://youtubeanalytics.googleapis.com/v2/reports');
      analyticsUrl.searchParams.set('ids', `channel==${channelId}`);
      analyticsUrl.searchParams.set('startDate', start_date);
      analyticsUrl.searchParams.set('endDate', end_date);
      analyticsUrl.searchParams.set('metrics', metricsStr);
      analyticsUrl.searchParams.set('dimensions', 'video');
      analyticsUrl.searchParams.set('filters', `video==${video_ids.join(',')}`);
      analyticsUrl.searchParams.set('sort', '-views');

      const analyticsResponse = await fetch(analyticsUrl.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const analyticsData = await analyticsResponse.json();

      if (analyticsData.error) {
        console.error('YouTube Video Analytics error:', analyticsData.error);
        return new Response(JSON.stringify({ error: analyticsData.error.message || 'Video Analytics error' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(analyticsData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'top_videos') {
      // Fetch top performing videos in the period
      const metricsStr = 'views,estimatedMinutesWatched,averageViewDuration,likes,comments,shares,subscribersGained';
      
      const analyticsUrl = new URL('https://youtubeanalytics.googleapis.com/v2/reports');
      analyticsUrl.searchParams.set('ids', `channel==${channelId}`);
      analyticsUrl.searchParams.set('startDate', start_date);
      analyticsUrl.searchParams.set('endDate', end_date);
      analyticsUrl.searchParams.set('metrics', metricsStr);
      analyticsUrl.searchParams.set('dimensions', 'video');
      analyticsUrl.searchParams.set('sort', '-views');
      analyticsUrl.searchParams.set('maxResults', '10');

      const analyticsResponse = await fetch(analyticsUrl.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const analyticsData = await analyticsResponse.json();

      if (analyticsData.error) {
        return new Response(JSON.stringify({ error: analyticsData.error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fetch video details (titles, thumbnails) for the top videos
      if (analyticsData.rows && analyticsData.rows.length > 0) {
        const videoIds = analyticsData.rows.map((row: any[]) => row[0]).join(',');
        const videosResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const videosData = await videosResponse.json();

        // Merge video details with analytics
        const enrichedRows = analyticsData.rows.map((row: any[]) => {
          const videoId = row[0];
          const videoInfo = videosData.items?.find((v: any) => v.id === videoId);
          return {
            videoId,
            title: videoInfo?.snippet?.title || 'Unknown',
            thumbnail: videoInfo?.snippet?.thumbnails?.medium?.url || null,
            publishedAt: videoInfo?.snippet?.publishedAt || null,
            duration: videoInfo?.contentDetails?.duration || null,
            views: row[1],
            watchTimeMinutes: row[2],
            avgViewDuration: row[3],
            likes: row[4],
            comments: row[5],
            shares: row[6],
            subscribersGained: row[7],
          };
        });

        return new Response(JSON.stringify({ videos: enrichedRows }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ videos: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Analytics error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
