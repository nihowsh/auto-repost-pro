import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Scheduled Publisher - runs every 5 minutes via CRON
 * 
 * Finds videos that:
 * 1. Have status = 'scheduled'
 * 2. Have scheduled_publish_at <= NOW
 * 3. Have video_file_path (file uploaded by local runner)
 * 
 * Also proactively refreshes tokens before they expire to prevent disconnects.
 */

// ───────────────────────────────────────────────────────────────────────────
// Proactive Token Refresh - prevents channels from disconnecting
// ───────────────────────────────────────────────────────────────────────────

async function proactiveTokenRefresh() {
  console.log("[scheduled-publisher] Running proactive token refresh...");
  
  // Find channels with tokens expiring in the next 30 minutes
  const expiryThreshold = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  
  const { data: expiringChannels, error } = await supabase
    .from("youtube_channels")
    .select("id, channel_title, refresh_token, token_expires_at")
    .eq("is_active", true)
    .lt("token_expires_at", expiryThreshold);
  
  if (error) {
    console.warn("[scheduled-publisher] Failed to query expiring channels:", error);
    return { refreshed: 0, failed: 0 };
  }
  
  if (!expiringChannels || expiringChannels.length === 0) {
    console.log("[scheduled-publisher] No channels need token refresh");
    return { refreshed: 0, failed: 0 };
  }
  
  console.log(`[scheduled-publisher] Found ${expiringChannels.length} channels with expiring tokens`);
  
  let refreshed = 0;
  let failed = 0;
  
  for (const channel of expiringChannels) {
    try {
      console.log(`[scheduled-publisher] Refreshing token for channel: ${channel.channel_title}`);
      
      const resp = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: channel.refresh_token,
          grant_type: "refresh_token",
        }),
      });
      
      if (!resp.ok) {
        const txt = await resp.text();
        const isInvalidGrant = txt.includes("invalid_grant");
        
        if (isInvalidGrant) {
          console.error(`[scheduled-publisher] Channel ${channel.channel_title} has invalid_grant - marking inactive`);
          await supabase
            .from("youtube_channels")
            .update({ is_active: false })
            .eq("id", channel.id);
        } else {
          console.warn(`[scheduled-publisher] Token refresh failed for ${channel.channel_title}: ${txt}`);
        }
        failed++;
        continue;
      }
      
      const data = await resp.json();
      const newExpiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();
      
      await supabase
        .from("youtube_channels")
        .update({
          access_token: data.access_token,
          token_expires_at: newExpiresAt,
        })
        .eq("id", channel.id);
      
      console.log(`[scheduled-publisher] Successfully refreshed token for ${channel.channel_title}, expires at ${newExpiresAt}`);
      refreshed++;
    } catch (err) {
      console.error(`[scheduled-publisher] Error refreshing token for ${channel.channel_title}:`, err);
      failed++;
    }
  }
  
  console.log(`[scheduled-publisher] Token refresh complete. Refreshed: ${refreshed}, Failed: ${failed}`);
  return { refreshed, failed };
}

// ───────────────────────────────────────────────────────────────────────────
// Main publishing logic
// ───────────────────────────────────────────────────────────────────────────

async function publishDueVideos() {
  const now = new Date().toISOString();
  console.log(`[scheduled-publisher] Running at ${now}`);

  // ─────────────────────────────────────────────────────────────────────────
  // Step 0: Proactive token refresh - prevents disconnects!
  // ─────────────────────────────────────────────────────────────────────────
  const tokenResult = await proactiveTokenRefresh();

  // ─────────────────────────────────────────────────────────────────────────
  // Self-healing: requeue stuck uploads + clear expired locks
  // This prevents videos from getting permanently stuck in 'uploading' if a
  // worker instance crashes / times out mid-run.
  // ─────────────────────────────────────────────────────────────────────────
  try {
    const stuckCutoff = new Date(Date.now() - 45 * 60 * 1000).toISOString(); // 45 minutes

    // 1) Re-queue videos that have been in 'uploading' too long.
    // NOTE: We do NOT require scheduled_publish_at <= now here.
    // If something is stuck in 'uploading' for 45+ minutes, it is safer to re-queue.
    const { error: healErr, count: healedCount } = await supabase
      .from("videos")
      .update({ status: "scheduled" }, { count: "exact" })
      .eq("status", "uploading")
      .not("video_file_path", "is", null)
      .lt("updated_at", stuckCutoff);

    if (healErr) {
      console.warn("[scheduled-publisher] Heal (requeue stuck uploads) warning:", healErr);
    } else if ((healedCount ?? 0) > 0) {
      console.log(
        `[scheduled-publisher] Re-queued ${healedCount} stuck 'uploading' videos back to 'scheduled'`
      );
    }

    // 2) Clear any expired locks that never got released.
    const lockExpiryCutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 minutes
    const { error: lockHealErr } = await supabase
      .from("channel_upload_locks")
      .update({ locked_by_video_id: null, locked_until: now, updated_at: now })
      .not("locked_by_video_id", "is", null)
      .lt("locked_until", lockExpiryCutoff);

    if (lockHealErr) {
      console.warn("[scheduled-publisher] Heal (clear expired locks) warning:", lockHealErr);
    }
  } catch (err) {
    console.warn("[scheduled-publisher] Heal step failed (continuing):", err);
  }

  // Find due videos - scheduled and ready to publish
  const { data: dueVideos, error: queryError } = await supabase
    .from("videos")
    .select("id, channel_id, scheduled_publish_at")
    .eq("status", "scheduled")
    .not("video_file_path", "is", null)
    .lte("scheduled_publish_at", now)
    .order("scheduled_publish_at", { ascending: true })
    .limit(50);

  if (queryError) {
    console.error("[scheduled-publisher] Query error:", queryError);
    return { processed: 0, error: queryError.message, tokenRefresh: tokenResult };
  }

  if (!dueVideos || dueVideos.length === 0) {
    console.log("[scheduled-publisher] No due videos found");
    return { processed: 0, tokenRefresh: tokenResult };
  }

  console.log(`[scheduled-publisher] Found ${dueVideos.length} due videos`);

  // Group by channel to respect per-channel rate limits
  const videosByChannel = new Map<string, typeof dueVideos>();
  for (const video of dueVideos) {
    const channelId = video.channel_id || "no-channel";
    if (!videosByChannel.has(channelId)) {
      videosByChannel.set(channelId, []);
    }
    videosByChannel.get(channelId)!.push(video);
  }

  let processed = 0;
  const errors: string[] = [];

  // Process one video per channel (rate limiting will handle the rest)
  for (const [channelId, videos] of videosByChannel) {
    const video = videos[0]; // Take the earliest scheduled video for this channel
    console.log(`[scheduled-publisher] Triggering video-worker for video ${video.id} (channel: ${channelId})`);

    try {
      // Update status to 'uploading' before triggering worker
      await supabase
        .from("videos")
        .update({ status: "uploading" })
        .eq("id", video.id);

      // Trigger video-worker using service role key for proper auth
      const workerUrl = `${SUPABASE_URL}/functions/v1/video-worker`;
      const response = await fetch(workerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ video_id: video.id }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`[scheduled-publisher] Worker failed for ${video.id}:`, text);
        errors.push(`${video.id}: ${text}`);
        // Revert status back to scheduled for retry
        await supabase
          .from("videos")
          .update({ status: "scheduled" })
          .eq("id", video.id);
      } else {
        console.log(`[scheduled-publisher] Successfully triggered worker for ${video.id}`);
        processed++;
      }
    } catch (err) {
      console.error(`[scheduled-publisher] Error triggering worker for ${video.id}:`, err);
      errors.push(`${video.id}: ${(err as Error).message}`);
      // Revert status back to scheduled for retry
      await supabase
        .from("videos")
        .update({ status: "scheduled" })
        .eq("id", video.id);
    }
  }

  console.log(`[scheduled-publisher] Done. Processed: ${processed}, Errors: ${errors.length}`);
  return { processed, errors: errors.length > 0 ? errors : undefined, tokenRefresh: tokenResult };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const result = await publishDueVideos();
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[scheduled-publisher] Fatal error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
