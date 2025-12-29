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
// Download video bytes using yt_download (Deno-native library)
// ───────────────────────────────────────────────────────────────────────────

async function downloadYouTubeVideo(sourceUrl: string): Promise<{ buffer: ArrayBuffer; filename: string }> {
  const videoId = extractYouTubeVideoId(sourceUrl);
  if (!videoId) {
    throw new Error("Could not extract YouTube video ID from URL");
  }

  console.log("Downloading YouTube video:", videoId);

  // Dynamic import of yt_download - uses ytDownload and getVideoInfo
  const { ytDownload, getVideoInfo } = await import("https://deno.land/x/yt_download@1.5/src/mod.ts");

  // Get video info first for logging
  const info = await getVideoInfo(videoId);
  if (info) {
    console.log("Video info retrieved:", info.videoDetails?.title || videoId);
  }

  // Download the video - get format with both audio and video
  const stream = await ytDownload(videoId, {
    hasAudio: true,
    hasVideo: true,
  });

  // Collect chunks from the readable stream
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  // Combine chunks into a single buffer
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  const filename = `youtube_${videoId}_${Date.now()}.mp4`;
  console.log("Downloaded", combined.byteLength, "bytes for video:", videoId);

  return { buffer: combined.buffer, filename };
}

// ───────────────────────────────────────────────────────────────────────────
// Fallback: Download using Cobalt if available
// ───────────────────────────────────────────────────────────────────────────

type CobaltResponse =
  | { status: "tunnel" | "redirect"; url: string; filename?: string }
  | { status: "local-processing"; tunnel: string[]; output?: { filename?: string } }
  | { status: "picker"; picker: Array<{ url: string; filename?: string }> }
  | { status: "error"; error?: { code?: string }; text?: string }
  | Record<string, unknown>;

async function downloadWithCobalt(sourceUrl: string): Promise<{ buffer: ArrayBuffer; filename: string }> {
  const baseUrl = Deno.env.get("COBALT_BASE_URL");
  if (!baseUrl) {
    throw new Error("COBALT_BASE_URL not configured");
  }

  const apiKey = Deno.env.get("COBALT_API_KEY") || "";
  console.log("Requesting download link from Cobalt:", baseUrl);

  const resp = await fetch(`${baseUrl.replace(/\/$/, "")}/`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Api-Key ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      url: sourceUrl,
      videoQuality: "720",
      youtubeVideoCodec: "h264",
      youtubeVideoContainer: "mp4",
      downloadMode: "auto",
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Cobalt API error ${resp.status}: ${txt}`);
  }

  const json = (await resp.json()) as CobaltResponse;
  console.log("Cobalt response:", JSON.stringify(json).slice(0, 500));

  let downloadUrl = "";
  let filename = `video_${Date.now()}.mp4`;

  if (typeof (json as Record<string, unknown>)?.filename === "string") {
    filename = (json as Record<string, unknown>).filename as string;
  }

  if (json?.status === "redirect" || json?.status === "tunnel") {
    downloadUrl = String((json as { url?: string }).url || "");
  } else if (json?.status === "local-processing") {
    const tunnels = Array.isArray((json as { tunnel?: string[] }).tunnel) ? (json as { tunnel: string[] }).tunnel : [];
    downloadUrl = tunnels[0] ? String(tunnels[0]) : "";
  } else if (json?.status === "picker") {
    const pick = Array.isArray((json as { picker?: Array<{ url: string }> }).picker) ? (json as { picker: Array<{ url: string }> }).picker : [];
    downloadUrl = pick[0]?.url ? String(pick[0].url) : "";
  } else if ((json as { url?: string })?.url) {
    downloadUrl = String((json as { url: string }).url);
  }

  if (!downloadUrl) {
    const msg = (json as { text?: string })?.text || (json as { error?: { code?: string } })?.error?.code || "No download URL from Cobalt";
    throw new Error(String(msg));
  }

  console.log("Downloading file from:", downloadUrl.slice(0, 120));

  const fileResp = await fetch(downloadUrl);
  if (!fileResp.ok) throw new Error(`Failed to download file: ${fileResp.status}`);

  const buffer = await fileResp.arrayBuffer();
  console.log("Downloaded", buffer.byteLength, "bytes");
  return { buffer, filename };
}

// ───────────────────────────────────────────────────────────────────────────
// Main download function with fallback
// ───────────────────────────────────────────────────────────────────────────

async function downloadVideoBytes(sourceUrl: string, sourceType: string): Promise<{ buffer: ArrayBuffer; filename: string }> {
  const errors: string[] = [];

  // For YouTube, try yt_download first (free, no external service needed)
  if (sourceType === "youtube") {
    try {
      console.log("Attempting download with yt_download library...");
      return await downloadYouTubeVideo(sourceUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("yt_download failed:", msg);
      errors.push(`yt_download: ${msg}`);
    }
  }

  // Fallback to Cobalt if configured
  if (Deno.env.get("COBALT_BASE_URL")) {
    try {
      console.log("Attempting download with Cobalt...");
      return await downloadWithCobalt(sourceUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("Cobalt failed:", msg);
      errors.push(`Cobalt: ${msg}`);
    }
  }

  throw new Error(`All download methods failed: ${errors.join("; ")}`);
}

// ───────────────────────────────────────────────────────────────────────────
// Upload video to YouTube (resumable upload)
// ───────────────────────────────────────────────────────────────────────────

async function uploadToYouTube(
  accessToken: string,
  videoBuffer: ArrayBuffer,
  metadata: {
    title: string;
    description: string;
    tags: string[];
    categoryId?: string;
    isShort?: boolean;
    publishAt?: string | null;
  }
): Promise<string> {
  const { title, description, tags, categoryId = "22", isShort, publishAt } = metadata;
  console.log("Starting YouTube resumable upload for:", title);

  const initUrl = new URL("https://www.googleapis.com/upload/youtube/v3/videos");
  initUrl.searchParams.set("uploadType", "resumable");
  initUrl.searchParams.set("part", "snippet,status");

  const scheduled = Boolean(publishAt && new Date(publishAt).getTime() > Date.now() + 30_000);

  const initBody = {
    snippet: {
      title: isShort ? `${title} #Shorts` : title,
      description,
      tags,
      categoryId,
    },
    status: {
      privacyStatus: scheduled ? "private" : "public",
      ...(scheduled ? { publishAt } : {}),
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
  try {
    const { buffer, filename } = await downloadVideoBytes(sourceUrl, sourceType);
    videoBuffer = buffer;

    const storagePath = `${userId}/${videoId}/${filename}`;
    console.log("Uploading to storage:", storagePath);

    const { error: upErr } = await supabase.storage
      .from("videos")
      .upload(storagePath, videoBuffer, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (upErr) {
      console.warn("Storage upload warning:", upErr);
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
      publishAt: (video.scheduled_publish_at as string | null) ?? null,
    });

    const scheduledAt = (video.scheduled_publish_at as string | null) ?? null;
    const isScheduled = Boolean(scheduledAt && new Date(scheduledAt).getTime() > Date.now() + 30_000);

    await updateVideoStatus(videoId, isScheduled ? "scheduled" : "published", {
      youtube_video_id: youtubeVideoId,
      ...(isScheduled ? {} : { published_at: new Date().toISOString() }),
    });

    console.log(isScheduled ? "Video uploaded and scheduled:" : "Video published successfully:", youtubeVideoId);
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

    // deno-lint-ignore no-explicit-any
    const EdgeRuntime = (globalThis as any).EdgeRuntime;
    if (EdgeRuntime?.waitUntil) {
      EdgeRuntime.waitUntil(processVideo(videoId));
    } else {
      processVideo(videoId).catch(console.error);
    }

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
