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

function extractYouTubeVideoId(url: string): string {
  try {
    if (url.includes("youtu.be/")) return url.split("youtu.be/")[1]?.split("?")[0] ?? "";
    if (url.includes("v=")) return url.split("v=")[1]?.split("&")[0] ?? "";
    if (url.includes("/shorts/")) return url.split("/shorts/")[1]?.split("?")[0] ?? "";
    return "";
  } catch {
    return "";
  }
}

function iso8601DurationToSeconds(iso: string): number | null {
  // Example: PT1M2S, PT59S, PT2H3M
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

    const { url, source_type } = await req.json();
    console.log("Fetching metadata for:", url, source_type, "user:", user.id);

    const metadata: any = {
      source_type,
      title: "",
      description: "",
      tags: [],
      thumbnail_url: "",
      duration_seconds: null,
      is_short: false,
      source_url: url,
    };

    if (source_type === "youtube") {
      const videoId = extractYouTubeVideoId(url);
      if (!videoId) throw new Error("Could not extract YouTube video id");

      // Use the connected channel token to call YouTube Data API
      const { data: channel, error: channelError } = await supabase
        .from("youtube_channels")
        .select("id, access_token, refresh_token, token_expires_at")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (channelError || !channel) {
        throw new Error("No active YouTube channel connected");
      }

      let accessToken = channel.access_token as string;
      const expiresAt = new Date(channel.token_expires_at as string).getTime();
      const now = Date.now();

      if (!Number.isFinite(expiresAt) || expiresAt - now < 60_000) {
        console.log("Refreshing YouTube access token...");
        const refreshed = await refreshGoogleAccessToken(channel.refresh_token as string);
        accessToken = refreshed.access_token;
        const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

        const { error: updErr } = await supabase
          .from("youtube_channels")
          .update({ access_token: accessToken, token_expires_at: newExpiresAt })
          .eq("id", channel.id);

        if (updErr) console.warn("Failed updating refreshed token:", updErr);
      }

      const apiUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
      apiUrl.searchParams.set("part", "snippet,contentDetails");
      apiUrl.searchParams.set("id", videoId);

      const ytResp = await fetch(apiUrl.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      if (!ytResp.ok) {
        const txt = await ytResp.text();
        throw new Error(`YouTube API error: ${ytResp.status} ${txt}`);
      }

      const ytData = await ytResp.json();
      const item = ytData?.items?.[0];
      if (!item) throw new Error("YouTube API returned no video data");

      const snippet = item.snippet ?? {};
      const contentDetails = item.contentDetails ?? {};

      metadata.title = snippet.title ?? "";
      metadata.description = snippet.description ?? "";
      metadata.tags = Array.isArray(snippet.tags) ? snippet.tags : [];

      const thumbs = snippet.thumbnails ?? {};
      metadata.thumbnail_url =
        thumbs.maxres?.url ??
        thumbs.standard?.url ??
        thumbs.high?.url ??
        thumbs.medium?.url ??
        thumbs.default?.url ??
        `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

      const durationIso = contentDetails.duration as string | undefined;
      const durationSeconds = durationIso ? iso8601DurationToSeconds(durationIso) : null;
      metadata.duration_seconds = durationSeconds;

      metadata.is_short = url.includes("/shorts/") || (durationSeconds !== null && durationSeconds <= 60);
      metadata.video_id = videoId;
    } else if (source_type === "instagram") {
      // Instagram metadata extraction reliably requires a dedicated scraper/service.
      // Keep a minimal fallback for now.
      metadata.title = "Instagram Reel";
      metadata.description = "Imported from Instagram";
      metadata.is_short = true;
    } else {
      throw new Error("Unsupported source_type");
    }

    console.log("Metadata fetched ok:", {
      source_type: metadata.source_type,
      title: metadata.title,
      has_thumb: Boolean(metadata.thumbnail_url),
      duration_seconds: metadata.duration_seconds,
      is_short: metadata.is_short,
    });

    return new Response(JSON.stringify(metadata), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Fetch metadata error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
