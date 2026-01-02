import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Scheduled Publisher - runs every 5 minutes via CRON
 * 
 * Finds videos that:
 * 1. Have status = 'scheduled'
 * 2. Have scheduled_publish_at <= NOW
 * 3. Have video_file_path (file uploaded by local runner)
 * 
 * Then triggers video-worker for each (respecting per-channel limits)
 */

async function publishDueVideos() {
  const now = new Date().toISOString();
  console.log(`[scheduled-publisher] Running at ${now}`);

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
    return { processed: 0, error: queryError.message };
  }

  if (!dueVideos || dueVideos.length === 0) {
    console.log("[scheduled-publisher] No due videos found");
    return { processed: 0 };
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

      // Trigger video-worker
      const workerUrl = `${SUPABASE_URL}/functions/v1/video-worker`;
      const response = await fetch(workerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
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
  return { processed, errors: errors.length > 0 ? errors : undefined };
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
