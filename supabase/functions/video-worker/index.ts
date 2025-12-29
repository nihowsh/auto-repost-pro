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

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ───────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────

async function updateVideoStatus(
  videoId: string,
  status: string,
  extra: Record<string, unknown> = {}
) {
  const { error } = await supabase
    .from("videos")
    .update({ status, ...extra })
    .eq("id", videoId);
  if (error) console.warn("updateVideoStatus error:", error);
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
    throw new Error(`Token refresh failed: ${resp.status} ${txt}`);
  }
  const data = await resp.json();
  return {
    access_token: String(data.access_token),
    expires_in: Number(data.expires_in ?? 3600),
  };
}

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

// ───────────────────────────────────────────────────────────────────────────
// Download video bytes using Cobalt API (free public API for downloading)
// ───────────────────────────────────────────────────────────────────────────

async function downloadVideoBytes(sourceUrl: string): Promise<{ buffer: ArrayBuffer; filename: string }> {
  console.log("Requesting download link from Cobalt...");

  // Cobalt free instance – we POST to get a download URL
  const cobaltUrl = "https://api.cobalt.tools/api/json";
  const resp = await fetch(cobaltUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ url: sourceUrl, vCodec: "h264", vQuality: "720", isAudioOnly: false }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Cobalt API error ${resp.status}: ${txt}`);
  }

  const json = await resp.json();
  console.log("Cobalt response:", JSON.stringify(json).slice(0, 500));

  // Cobalt returns { status: "stream"|"redirect", url: "..." } or { status: "picker", picker: [...] }
  let downloadUrl = "";
  if (json.status === "redirect" || json.status === "stream") {
    downloadUrl = json.url;
  } else if (json.status === "picker" && Array.isArray(json.picker) && json.picker.length) {
    downloadUrl = json.picker[0].url;
  } else if (json.url) {
    downloadUrl = json.url;
  }

  if (!downloadUrl) throw new Error("No download URL from Cobalt");

  console.log("Downloading file from:", downloadUrl.slice(0, 100));

  const fileResp = await fetch(downloadUrl);
  if (!fileResp.ok) throw new Error(`Failed to download file: ${fileResp.status}`);

  const contentDisp = fileResp.headers.get("Content-Disposition") ?? "";
  const match = contentDisp.match(/filename="?([^"]+)"?/i);
  const filename = match?.[1] ?? `video_${Date.now()}.mp4`;

  const buffer = await fileResp.arrayBuffer();
  console.log("Downloaded", buffer.byteLength, "bytes");
  return { buffer, filename };
}

// ───────────────────────────────────────────────────────────────────────────
// Upload video to YouTube (resumable upload)
// ───────────────────────────────────────────────────────────────────────────

async function uploadToYouTube(
  accessToken: string,
  videoBuffer: ArrayBuffer,
  metadata: { title: string; description: string; tags: string[]; categoryId?: string; isShort?: boolean }
): Promise<string> {
  const { title, description, tags, categoryId = "22", isShort } = metadata;
  console.log("Starting YouTube resumable upload for:", title);

  // Step 1: Initiate resumable upload
  const initUrl = new URL("https://www.googleapis.com/upload/youtube/v3/videos");
  initUrl.searchParams.set("uploadType", "resumable");
  initUrl.searchParams.set("part", "snippet,status");

  const initBody = {
    snippet: {
      title: isShort ? `${title} #Shorts` : title,
      description,
      tags,
      categoryId,
    },
    status: {
      privacyStatus: "public",
      selfDeclaredMadeForKids: false,
    },
  };

  const initResp = await fetch(initUrl.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Length": String(videoBuffer.byteLength),
      "X-Upload-Content-Type": "video/mp4",
    },
    body: JSON.stringify(initBody),
  });

  if (!initResp.ok) {
    const txt = await initResp.text();
    throw new Error(`YouTube upload init error ${initResp.status}: ${txt}`);
  }

  const uploadUrl = initResp.headers.get("Location");
  if (!uploadUrl) throw new Error("No resumable upload location returned");

  console.log("Resumable upload URL obtained, uploading bytes...");

  // Step 2: PUT the file bytes
  const uploadResp = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(videoBuffer.byteLength),
    },
    body: videoBuffer,
  });

  if (!uploadResp.ok) {
    const txt = await uploadResp.text();
    throw new Error(`YouTube upload failed ${uploadResp.status}: ${txt}`);
  }

  const result = await uploadResp.json();
  const youtubeVideoId = result?.id;
  if (!youtubeVideoId) throw new Error("YouTube upload succeeded but no video ID returned");

  console.log("YouTube upload complete, video ID:", youtubeVideoId);
  return youtubeVideoId;
}

// ───────────────────────────────────────────────────────────────────────────
// Main worker logic
// ───────────────────────────────────────────────────────────────────────────

async function processVideo(videoId: string) {
  console.log("=== processVideo start ===", videoId);

  // Fetch video row
  const { data: video, error: vErr } = await supabase
    .from("videos")
    .select("*")
    .eq("id", videoId)
    .single();

  if (vErr || !video) {
    console.error("Video not found", vErr);
    return;
  }

  const userId = video.user_id as string;
  const sourceUrl = video.source_url as string;
  const sourceType = video.source_type as string;

  // Fetch channel tokens
  const { data: channel, error: chErr } = await supabase
    .from("youtube_channels")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();

  if (chErr || !channel) {
    console.error("No active channel for user", chErr);
    await updateVideoStatus(videoId, "failed", { error_message: "No connected YouTube channel" });
    return;
  }

  let accessToken = channel.access_token as string;
  const refreshToken = channel.refresh_token as string;
  const expiresAt = new Date(channel.token_expires_at as string).getTime();
  const now = Date.now();

  // Refresh token if needed
  if (!Number.isFinite(expiresAt) || expiresAt - now < 120_000) {
    console.log("Refreshing Google token...");
    const refreshed = await refreshGoogleAccessToken(refreshToken);
    accessToken = refreshed.access_token;
    const newExpiresAt = new Date(now + refreshed.expires_in * 1000).toISOString();
    await supabase
      .from("youtube_channels")
      .update({ access_token: accessToken, token_expires_at: newExpiresAt })
      .eq("id", channel.id);
  }

  // 1. Downloading
  await updateVideoStatus(videoId, "downloading");
  let videoBuffer: ArrayBuffer;
  let storagePath: string;
  try {
    const { buffer, filename } = await downloadVideoBytes(sourceUrl);
    videoBuffer = buffer;

    // Save to Supabase storage
    storagePath = `${userId}/${videoId}/${filename}`;
    console.log("Uploading to storage:", storagePath);

    const { error: upErr } = await supabase.storage
      .from("videos")
      .upload(storagePath, videoBuffer, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (upErr) {
      console.warn("Storage upload warning:", upErr);
      // Non-fatal: YouTube upload can still proceed
    } else {
      await supabase.from("videos").update({ video_file_path: storagePath }).eq("id", videoId);
    }
  } catch (err) {
    console.error("Download failed:", err);
    await updateVideoStatus(videoId, "failed", { error_message: `Download failed: ${(err as Error).message}` });
    return;
  }

  // 2. Uploading to YouTube
  await updateVideoStatus(videoId, "uploading");
  try {
    const youtubeVideoId = await uploadToYouTube(accessToken, videoBuffer, {
      title: (video.title as string) || "Untitled",
      description: (video.description as string) || "",
      tags: (video.tags as string[]) || [],
      isShort: Boolean(video.is_short),
    });

    await updateVideoStatus(videoId, "published", {
      youtube_video_id: youtubeVideoId,
      published_at: new Date().toISOString(),
    });

    console.log("Video published successfully:", youtubeVideoId);
  } catch (err) {
    console.error("YouTube upload failed:", err);
    await updateVideoStatus(videoId, "failed", { error_message: `YouTube upload failed: ${(err as Error).message}` });
  }
}

// ───────────────────────────────────────────────────────────────────────────
// HTTP handler
// ───────────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const videoId = body.video_id as string | undefined;

    if (!videoId) {
      return new Response(JSON.stringify({ error: "Missing video_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Run processing as a background task so we can respond immediately
    (globalThis as any).EdgeRuntime?.waitUntil?.(processVideo(videoId)) ?? processVideo(videoId).catch(console.error);

    return new Response(JSON.stringify({ success: true, message: "Processing started" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("video-worker error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
