import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    const body = await req.json();
    const {
      source_url,
      source_type,
      title,
      description,
      tags,
      thumbnail_url,
      channel_id,
      manual_schedule_time,
      video_id,
      retry,
      duration_seconds,
      schedule_interval_hours,
    } = body;

    if (!source_url || !source_type) {
      return new Response(JSON.stringify({ error: "Missing source_url or source_type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Schedule interval in hours (default 4 hours, can be 1, 2, 4, 6, 12, 24, 48, 168, 720)
    const intervalHours = typeof schedule_interval_hours === "number" && schedule_interval_hours > 0 
      ? schedule_interval_hours 
      : 4;

    // Calculate scheduled time using automatic scheduling logic
    let scheduledPublishAt: string | null = null;

    if (manual_schedule_time) {
      scheduledPublishAt = manual_schedule_time;
    } else {
      // Find the latest scheduled video FOR THIS CHANNEL ONLY (independent per-channel scheduling)
      let query = supabase
        .from("videos")
        .select("scheduled_publish_at")
        .eq("user_id", user.id)
        .in("status", ["scheduled", "pending_download", "downloading", "processing", "uploading"])
        .not("scheduled_publish_at", "is", null)
        .order("scheduled_publish_at", { ascending: false })
        .limit(1);

      // Filter by channel_id if provided for per-channel independent scheduling
      if (channel_id) {
        query = query.eq("channel_id", channel_id);
      }

      const { data: scheduledVideos } = await query;

      if (scheduledVideos && scheduledVideos.length > 0 && scheduledVideos[0].scheduled_publish_at) {
        const latestTime = new Date(scheduledVideos[0].scheduled_publish_at);
        scheduledPublishAt = new Date(latestTime.getTime() + intervalHours * 60 * 60 * 1000).toISOString();
        console.log(`Auto-scheduling ${intervalHours} hours after:`, latestTime.toISOString(), "for channel:", channel_id);
      } else {
        // No scheduled videos exist for this channel - schedule from NOW + interval
        scheduledPublishAt = new Date(Date.now() + intervalHours * 60 * 60 * 1000).toISOString();
        console.log(`First video for channel ${channel_id} - scheduling ${intervalHours} hours from now:`, scheduledPublishAt);
      }
    }

    const isShort =
      String(source_url).includes("/shorts/") ||
      source_type === "instagram" ||
      (duration_seconds && duration_seconds <= 60);

    // IMPORTANT (hybrid workflow): new videos must wait for the Local Runner to download + upload the file.
    // The cloud worker must NOT start until video_file_path is present.
    const initialStatus = "pending_download";
    const initialErrorMessage = "Waiting for desktop app to download video via yt-dlp";

    // Handle retry (re-queue for local runner; do NOT trigger cloud worker yet)
    if (retry && video_id) {
      const { error } = await supabase
        .from("videos")
        .update({ status: initialStatus, error_message: initialErrorMessage })
        .eq("id", video_id)
        .eq("user_id", user.id);

      if (error) throw error;

      console.log("Video re-queued for local runner:", video_id);
      return new Response(JSON.stringify({ success: true, video_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create video record
    const { data: video, error: insertError } = await supabase
      .from("videos")
      .insert({
        user_id: user.id,
        channel_id,
        source_url,
        source_type,
        title: title ?? null,
        description: description ?? null,
        tags: tags ?? null,
        thumbnail_url: thumbnail_url ?? null,
        is_short: Boolean(isShort),
        duration_seconds: duration_seconds ?? null,
        status: initialStatus,
        scheduled_publish_at: scheduledPublishAt,
        error_message: initialErrorMessage,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to create video record");
    }

    console.log("Video created:", video.id, "Scheduled for:", scheduledPublishAt || "immediate");

    // Do NOT trigger video-worker here. Local runner will:
    // 1) download
    // 2) upload to storage
    // 3) set video_file_path + status=processing
    // 4) trigger video-worker

    return new Response(
      JSON.stringify({
        success: true,
        video_id: video.id,
        scheduled_at: scheduledPublishAt,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Process video error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
