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
// Constants for rate-limiting / sequential upload
// ───────────────────────────────────────────────────────────────────────────
const MIN_DELAY_MINUTES = 7;
const MAX_DELAY_MINUTES = 15;

function randomDelayMs(): number {
  const minMs = MIN_DELAY_MINUTES * 60 * 1000;
  const maxMs = MAX_DELAY_MINUTES * 60 * 1000;
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

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

// ───────────────────────────────────────────────────────────────────────────
// Per-channel locking helpers
// ───────────────────────────────────────────────────────────────────────────

interface LockRecord {
  channel_id: string;
  locked_by_video_id: string | null;
  lock_acquired_at: string;
  locked_until: string;
  next_allowed_upload_at: string;
}

/**
 * Attempts to acquire an exclusive upload lock for a channel.
 * Returns true if lock acquired (this video may proceed).
 * Returns false if another upload is in progress or next_allowed_upload_at is in the future.
 */
async function tryAcquireLock(channelId: string, videoId: string): Promise<boolean> {
  const now = new Date();
  const lockDurationMs = 30 * 60 * 1000; // 30 min max lock (safety)
  const lockedUntil = new Date(now.getTime() + lockDurationMs);

  // Check current lock state
  const { data: existing } = await supabase
    .from("channel_upload_locks")
    .select("*")
    .eq("channel_id", channelId)
    .maybeSingle();

  if (existing) {
    const lock = existing as LockRecord;
    const nextAllowed = new Date(lock.next_allowed_upload_at);
    const currentLockUntil = new Date(lock.locked_until);

    // Check if we need to wait for rate-limit cooldown
    if (nextAllowed > now) {
      console.log(`Channel ${channelId} rate-limited until ${nextAllowed.toISOString()}`);
      return false;
    }

    // Check if another video holds the lock
    if (lock.locked_by_video_id && lock.locked_by_video_id !== videoId && currentLockUntil > now) {
      console.log(`Channel ${channelId} locked by video ${lock.locked_by_video_id} until ${currentLockUntil.toISOString()}`);
      return false;
    }

    // Lock available - acquire it
    const { error } = await supabase
      .from("channel_upload_locks")
      .update({
        locked_by_video_id: videoId,
        lock_acquired_at: now.toISOString(),
        locked_until: lockedUntil.toISOString(),
      })
      .eq("channel_id", channelId);

    if (error) {
      console.error("Failed to update lock:", error);
      return false;
    }
    return true;
  }

  // No existing lock - create one
  const { error } = await supabase
    .from("channel_upload_locks")
    .insert({
      channel_id: channelId,
      locked_by_video_id: videoId,
      lock_acquired_at: now.toISOString(),
      locked_until: lockedUntil.toISOString(),
      next_allowed_upload_at: now.toISOString(),
    });

  if (error) {
    console.error("Failed to insert lock:", error);
    return false;
  }
  return true;
}

/**
 * Releases the lock and sets next_allowed_upload_at to a specific time.
 */
async function releaseLockWithNextAllowed(
  channelId: string,
  videoId: string,
  nextAllowed: Date
): Promise<void> {
  const now = new Date();

  console.log(
    `Releasing lock for channel ${channelId}, next upload allowed at ${nextAllowed.toISOString()}`
  );

  const { error } = await supabase
    .from("channel_upload_locks")
    .update({
      locked_by_video_id: null,
      locked_until: now.toISOString(),
      next_allowed_upload_at: nextAllowed.toISOString(),
    })
    .eq("channel_id", channelId)
    .eq("locked_by_video_id", videoId);

  if (error) {
    console.warn("Failed to release lock:", error);
  }
}

/**
 * Releases the lock and sets next_allowed_upload_at with random delay (7-15 min)
 */
async function releaseLock(channelId: string, videoId: string): Promise<void> {
  const delayMs = randomDelayMs();
  const nextAllowed = new Date(Date.now() + delayMs);

  console.log(
    `Applying normal cooldown: ${Math.round(delayMs / 60000)} min delay`
  );

  await releaseLockWithNextAllowed(channelId, videoId, nextAllowed);
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
// Upload thumbnail to YouTube
// ───────────────────────────────────────────────────────────────────────────

async function uploadThumbnail(
  accessToken: string,
  youtubeVideoId: string,
  thumbnailUrl: string
): Promise<boolean> {
  try {
    console.log("Fetching thumbnail from:", thumbnailUrl);
    
    const imgResp = await fetch(thumbnailUrl);
    if (!imgResp.ok) {
      console.warn("Failed to fetch thumbnail:", imgResp.status);
      return false;
    }
    
    const imgBuffer = await imgResp.arrayBuffer();
    const contentType = imgResp.headers.get("Content-Type") || "image/jpeg";
    
    console.log("Uploading thumbnail to YouTube, size:", imgBuffer.byteLength);
    
    const uploadUrl = new URL("https://www.googleapis.com/upload/youtube/v3/thumbnails/set");
    uploadUrl.searchParams.set("videoId", youtubeVideoId);
    uploadUrl.searchParams.set("uploadType", "media");
    
    const uploadResp = await fetch(uploadUrl.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": contentType,
        "Content-Length": String(imgBuffer.byteLength),
      },
      body: imgBuffer,
    });
    
    if (!uploadResp.ok) {
      const txt = await uploadResp.text();
      console.warn("Thumbnail upload failed:", uploadResp.status, txt);
      return false;
    }
    
    console.log("Thumbnail uploaded successfully");
    return true;
  } catch (err) {
    console.warn("Thumbnail upload error:", err);
    return false;
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Main worker logic
// Sequential per-channel: only one upload at a time per channel with 7-15 min delay
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
  const videoFilePath = video.video_file_path as string | null;
  const scheduledAt = (video.scheduled_publish_at as string | null) ?? null;

  // Check if this video is scheduled for the future
  const scheduledTime = scheduledAt ? new Date(scheduledAt).getTime() : null;
  const now = Date.now();
  const isScheduledForFuture = scheduledTime && scheduledTime > now + 60_000;

  if (isScheduledForFuture) {
    // Video is scheduled for the future - don't upload yet, mark as 'scheduled'
    console.log(`Video ${videoId} is scheduled for ${scheduledAt} (future), marking as 'scheduled' for CRON pickup`);
    await updateVideoStatus(videoId, "scheduled");
    return;
  }

  // Check if video file exists in storage
  if (!videoFilePath) {
    console.error("No video file path - desktop app must download and upload video first");
    await updateVideoStatus(videoId, "pending_download", {
      error_message: "Waiting for desktop app to download video via yt-dlp",
    });
    return;
  }

  // Get channel
  const channelId = video.channel_id as string | null;
  let channelQuery = supabase.from("youtube_channels").select("*");
  
  if (channelId) {
    channelQuery = channelQuery.eq("id", channelId);
  } else {
    channelQuery = channelQuery.eq("user_id", userId).eq("is_active", true);
  }
  
  const { data: channel, error: chErr } = await channelQuery.maybeSingle();

  if (chErr || !channel) {
    console.error("No channel found for video", chErr);
    await updateVideoStatus(videoId, "failed", { error_message: "No connected YouTube channel" });
    return;
  }

  const resolvedChannelId = channel.id as string;

  // ─────────────────────────────────────────────────────────────────────────
  // RATE LIMITING: Try to acquire lock for this channel
  // If locked or rate-limited, requeue the video for later
  // ─────────────────────────────────────────────────────────────────────────
  const lockAcquired = await tryAcquireLock(resolvedChannelId, videoId);
  
  if (!lockAcquired) {
    console.log(`Cannot process video ${videoId} now - channel ${resolvedChannelId} is rate-limited or locked. Reverting to 'scheduled' for CRON retry.`);
    // Revert to 'scheduled' status so CRON will pick it up again later
    await updateVideoStatus(videoId, "scheduled");
    return;
  }

  console.log(`Lock acquired for channel ${resolvedChannelId}, proceeding with upload...`);

  let accessToken = channel.access_token as string;
  const refreshToken = channel.refresh_token as string;
  const expiresAt = new Date(channel.token_expires_at as string).getTime();

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

  // Download video from storage
  await updateVideoStatus(videoId, "uploading");
  
  let videoBuffer: ArrayBuffer;
  try {
    console.log("Downloading video from storage:", videoFilePath);
    const { data: fileData, error: dlErr } = await supabase.storage
      .from("videos")
      .download(videoFilePath);
    
    if (dlErr || !fileData) {
      throw new Error(`Failed to download from storage: ${dlErr?.message || "No data"}`);
    }
    
    videoBuffer = await fileData.arrayBuffer();
    console.log("Downloaded", videoBuffer.byteLength, "bytes from storage");
  } catch (err) {
    console.error("Storage download failed:", err);
    await updateVideoStatus(videoId, "failed", {
      error_message: `Storage download failed: ${(err as Error).message}`,
    });
    await releaseLock(resolvedChannelId, videoId);
    return;
  }

  // Upload to YouTube
  let uploadHitLimitExceeded = false;

  try {
    // Robust title sanitization
    let rawTitle = ((video.title as string) || "").trim();
    rawTitle = rawTitle.replace(/[\u200B-\u200D\uFEFF\u0000-\u001F\u007F-\u009F]/g, "");
    let sanitizedTitle = rawTitle.length > 0 ? rawTitle : `Video ${videoId.substring(0, 8)}`;

    const maxLength = Boolean(video.is_short) ? 91 : 100;
    if (sanitizedTitle.length > maxLength) {
      sanitizedTitle = sanitizedTitle.substring(0, maxLength - 3) + "...";
    }

    console.log("Final title for YouTube:", sanitizedTitle, "Length:", sanitizedTitle.length);
    console.log("Scheduled publish at:", scheduledAt || "immediate");

    const youtubeVideoId = await uploadToYouTube(accessToken, videoBuffer, {
      title: sanitizedTitle,
      description: (video.description as string) || "",
      tags: (video.tags as string[]) || [],
      isShort: Boolean(video.is_short),
      publishAt: scheduledAt,
    });

    // Upload thumbnail if available
    const thumbnailUrl = video.thumbnail_url as string | null;
    if (thumbnailUrl) {
      console.log("Uploading thumbnail for video:", youtubeVideoId);
      await uploadThumbnail(accessToken, youtubeVideoId, thumbnailUrl);
    }

    // Set final status
    if (isScheduledForFuture) {
      await updateVideoStatus(videoId, "scheduled", {
        youtube_video_id: youtubeVideoId,
      });
      console.log("Video uploaded and scheduled for:", scheduledAt, "YouTube ID:", youtubeVideoId);
    } else {
      await updateVideoStatus(videoId, "published", {
        youtube_video_id: youtubeVideoId,
        published_at: new Date().toISOString(),
      });
      console.log("Video published immediately:", youtubeVideoId);
    }
  } catch (err) {
    const msg = (err as Error)?.message || String(err);

    uploadHitLimitExceeded =
      msg.includes("uploadLimitExceeded") ||
      msg.includes("exceeded the number of videos") ||
      msg.includes("The user has exceeded the number of videos");

    console.error("YouTube upload failed:", err);
    await updateVideoStatus(videoId, "failed", {
      error_message: `YouTube upload failed: ${msg}`,
    });
  } finally {
    // Always release lock.
    // If YouTube says uploadLimitExceeded, it's an account/platform limit (not speed).
    // We pause the entire channel longer to prevent endless retries.
    if (uploadHitLimitExceeded) {
      const cooldownHours = 24;
      const nextAllowed = new Date(Date.now() + cooldownHours * 60 * 60 * 1000);
      console.log(
        `uploadLimitExceeded detected; applying extended cooldown: ${cooldownHours}h`
      );
      await releaseLockWithNextAllowed(resolvedChannelId, videoId, nextAllowed);
    } else {
      await releaseLock(resolvedChannelId, videoId);
    }
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
