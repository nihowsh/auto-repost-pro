import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

function iso8601DurationToSeconds(iso: string): number | null {
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return null;
  const h = m[1] ? Number(m[1]) : 0;
  const min = m[2] ? Number(m[2]) : 0;
  const s = m[3] ? Number(m[3]) : 0;
  return h * 3600 + min * 60 + s;
}

async function refreshGoogleAccessToken(refreshToken: string) {
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Failed to refresh Google token: ${resp.status} ${txt}`);
  }

  const data = await resp.json();
  return {
    access_token: String(data.access_token),
    expires_in: Number(data.expires_in ?? 3600),
  };
}

// Extract YouTube channel ID from various URL formats
function extractChannelId(url: string): { type: "channel" | "handle" | "user"; value: string } | null {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;

    // @handle format: youtube.com/@channelname
    const handleMatch = path.match(/^\/@([^\/]+)/);
    if (handleMatch) {
      return { type: "handle", value: handleMatch[1] };
    }

    // Channel ID format: youtube.com/channel/UCxxxxxx
    const channelMatch = path.match(/^\/channel\/([^\/]+)/);
    if (channelMatch) {
      return { type: "channel", value: channelMatch[1] };
    }

    // User format: youtube.com/user/username
    const userMatch = path.match(/^\/user\/([^\/]+)/);
    if (userMatch) {
      return { type: "user", value: userMatch[1] };
    }

    // c/ format: youtube.com/c/channelname
    const cMatch = path.match(/^\/c\/([^\/]+)/);
    if (cMatch) {
      return { type: "handle", value: cMatch[1] };
    }

    return null;
  } catch {
    return null;
  }
}

// Resolve channel handle/user to channel ID using YouTube API
async function resolveChannelId(
  accessToken: string,
  extracted: { type: "channel" | "handle" | "user"; value: string }
): Promise<string> {
  if (extracted.type === "channel") {
    return extracted.value;
  }

  // For handles and users, we need to search/lookup
  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("type", "channel");
  searchUrl.searchParams.set("q", extracted.value);
  searchUrl.searchParams.set("maxResults", "1");

  const resp = await fetch(searchUrl.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!resp.ok) {
    throw new Error(`Failed to resolve channel: ${resp.status}`);
  }

  const data = await resp.json();
  const channelId = data.items?.[0]?.snippet?.channelId;
  if (!channelId) {
    throw new Error("Could not find channel ID for the given URL");
  }

  return channelId;
}

// Get the Shorts upload playlist for a channel
async function getShortsPlaylistId(accessToken: string, channelId: string): Promise<string | null> {
  // YouTube Shorts are in the channel's uploads playlist, we filter by duration
  // Get the uploads playlist ID
  const channelUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
  channelUrl.searchParams.set("part", "contentDetails");
  channelUrl.searchParams.set("id", channelId);

  const resp = await fetch(channelUrl.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!resp.ok) return null;

  const data = await resp.json();
  return data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads ?? null;
}

// Fetch videos from a playlist and filter for Shorts
async function fetchShortsFromPlaylist(
  accessToken: string,
  playlistId: string,
  limit: number
): Promise<Array<{ videoId: string; title: string; description: string; thumbnailUrl: string }>> {
  const shorts: Array<{ videoId: string; title: string; description: string; thumbnailUrl: string }> = [];
  let pageToken: string | undefined;
  let attempts = 0;
  const maxAttempts = 10; // Limit API calls

  while (shorts.length < limit && attempts < maxAttempts) {
    attempts++;

    // Get playlist items
    const playlistUrl = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    playlistUrl.searchParams.set("part", "snippet");
    playlistUrl.searchParams.set("playlistId", playlistId);
    playlistUrl.searchParams.set("maxResults", "50");
    if (pageToken) {
      playlistUrl.searchParams.set("pageToken", pageToken);
    }

    const resp = await fetch(playlistUrl.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!resp.ok) break;

    const data = await resp.json();
    const items = data.items ?? [];
    pageToken = data.nextPageToken;

    if (items.length === 0) break;

    // Get video IDs to check duration
    const videoIds = items.map((item: any) => item.snippet?.resourceId?.videoId).filter(Boolean);
    if (videoIds.length === 0) break;

    // Fetch video details to check duration
    const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    videosUrl.searchParams.set("part", "snippet,contentDetails");
    videosUrl.searchParams.set("id", videoIds.join(","));

    const videosResp = await fetch(videosUrl.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!videosResp.ok) break;

    const videosData = await videosResp.json();
    for (const video of videosData.items ?? []) {
      const durationIso = video.contentDetails?.duration;
      const durationSeconds = durationIso ? iso8601DurationToSeconds(durationIso) : null;

      // Only include Shorts (60 seconds or less)
      if (durationSeconds !== null && durationSeconds <= 60) {
        const snippet = video.snippet ?? {};
        const thumbs = snippet.thumbnails ?? {};

        shorts.push({
          videoId: video.id,
          title: snippet.title ?? "",
          description: snippet.description ?? "",
          thumbnailUrl:
            thumbs.maxres?.url ??
            thumbs.standard?.url ??
            thumbs.high?.url ??
            thumbs.medium?.url ??
            thumbs.default?.url ??
            `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`,
        });

        if (shorts.length >= limit) break;
      }
    }

    if (!pageToken) break;
  }

  return shorts;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid user token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { channel_url, video_count, channel_id, schedule_interval_hours } = await req.json();

    if (!channel_url || !video_count || !channel_id) {
      return new Response(JSON.stringify({ error: "Missing channel_url, video_count, or channel_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const limit = Math.min(Math.max(video_count, 1), 50);
    const intervalHours = typeof schedule_interval_hours === "number" && schedule_interval_hours > 0 
      ? schedule_interval_hours 
      : 4;

    console.log("Scraping channel:", channel_url, "limit:", limit, "user:", user.id);

    // Get YouTube channel credentials
    const { data: channels, error: channelError } = await supabase
      .from("youtube_channels")
      .select("id, access_token, refresh_token, token_expires_at")
      .eq("id", channel_id)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1);

    if (channelError || !channels || channels.length === 0) {
      throw new Error("No active YouTube channel found");
    }

    const channel = channels[0];
    let accessToken = channel.access_token as string;
    const expiresAt = new Date(channel.token_expires_at as string).getTime();
    const now = Date.now();

    if (!Number.isFinite(expiresAt) || expiresAt - now < 60_000) {
      console.log("Refreshing YouTube access token...");
      const refreshed = await refreshGoogleAccessToken(channel.refresh_token as string);
      accessToken = refreshed.access_token;
      const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

      await supabase
        .from("youtube_channels")
        .update({ access_token: accessToken, token_expires_at: newExpiresAt })
        .eq("id", channel.id);
    }

    // Extract and resolve channel ID from URL
    const extracted = extractChannelId(channel_url);
    if (!extracted) {
      throw new Error("Could not parse YouTube channel URL");
    }

    const sourceChannelId = await resolveChannelId(accessToken, extracted);
    console.log("Resolved source channel ID:", sourceChannelId);

    // Get uploads playlist
    const uploadsPlaylistId = await getShortsPlaylistId(accessToken, sourceChannelId);
    if (!uploadsPlaylistId) {
      throw new Error("Could not find uploads playlist for channel");
    }

    console.log("Uploads playlist ID:", uploadsPlaylistId);

    // Fetch Shorts with metadata
    const shorts = await fetchShortsFromPlaylist(accessToken, uploadsPlaylistId, limit);
    console.log(`Found ${shorts.length} Shorts`);

    if (shorts.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        videos_queued: 0,
        message: "No Shorts found on this channel" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate scheduled times based on existing queue
    const { data: scheduledVideos } = await supabase
      .from("videos")
      .select("scheduled_publish_at")
      .eq("user_id", user.id)
      .in("status", ["scheduled", "pending_download", "downloading", "processing", "uploading"])
      .not("scheduled_publish_at", "is", null)
      .order("scheduled_publish_at", { ascending: false })
      .limit(1);

    let baseTime: Date;
    if (scheduledVideos && scheduledVideos.length > 0 && scheduledVideos[0].scheduled_publish_at) {
      baseTime = new Date(scheduledVideos[0].scheduled_publish_at);
    } else {
      baseTime = new Date();
    }

    // Create video records with unique URLs and metadata
    const videoRecords = shorts.map((short, index) => ({
      user_id: user.id,
      channel_id: channel_id,
      source_url: `https://youtube.com/shorts/${short.videoId}`,
      source_type: "youtube",
      title: short.title,
      description: short.description,
      tags: null,
      thumbnail_url: short.thumbnailUrl,
      is_short: true,
      duration_seconds: null, // Already filtered for <= 60s
      status: "pending_download",
      scheduled_publish_at: new Date(baseTime.getTime() + (index + 1) * intervalHours * 60 * 60 * 1000).toISOString(),
      error_message: "Waiting for desktop app to download video via yt-dlp",
    }));

    const { data: insertedVideos, error: insertError } = await supabase
      .from("videos")
      .insert(videoRecords)
      .select("id, source_url, scheduled_publish_at");

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to create video records");
    }

    console.log(`Created ${insertedVideos?.length ?? 0} video records`);

    return new Response(JSON.stringify({
      success: true,
      videos_queued: insertedVideos?.length ?? 0,
      videos: insertedVideos?.map(v => ({
        id: v.id,
        source_url: v.source_url,
        scheduled_at: v.scheduled_publish_at,
      })),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Scrape channel error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
