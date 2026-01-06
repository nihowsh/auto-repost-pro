import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// This edge function is called when a long-form video is ready to be uploaded to YouTube
// It reuses the same logic as video-worker but for long-form projects

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { project_id } = await req.json();

    if (!project_id) {
      return new Response(
        JSON.stringify({ error: "project_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the project
    const { data: project, error: fetchError } = await supabase
      .from("long_form_projects")
      .select("*")
      .eq("id", project_id)
      .single();

    if (fetchError || !project) {
      console.error("Project not found:", fetchError);
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate project is ready (accept both ready_for_review and uploading since hook updates status first)
    if (project.status !== "ready_for_review" && project.status !== "uploading") {
      console.error(`Invalid project status: ${project.status}`);
      return new Response(
        JSON.stringify({ error: `Project is not ready for upload. Current status: ${project.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!project.final_video_path) {
      return new Response(
        JSON.stringify({ error: "No final video file found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!project.channel_id) {
      return new Response(
        JSON.stringify({ error: "No channel selected for upload" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update status to uploading
    await supabase
      .from("long_form_projects")
      .update({ status: "uploading" })
      .eq("id", project_id);

    // Get the channel credentials
    const { data: channel, error: channelError } = await supabase
      .from("youtube_channels")
      .select("*")
      .eq("id", project.channel_id)
      .single();

    if (channelError || !channel) {
      await supabase
        .from("long_form_projects")
        .update({ status: "failed", error_message: "Channel not found" })
        .eq("id", project_id);
      
      return new Response(
        JSON.stringify({ error: "Channel not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Refresh access token if needed
    const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

    let accessToken = channel.access_token;
    const tokenExpiresAt = new Date(channel.token_expires_at);
    
    if (tokenExpiresAt <= new Date()) {
      console.log("Refreshing access token...");
      
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: googleClientId,
          client_secret: googleClientSecret,
          refresh_token: channel.refresh_token,
          grant_type: "refresh_token",
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        await supabase
          .from("long_form_projects")
          .update({ status: "failed", error_message: "Failed to refresh token" })
          .eq("id", project_id);
        
        return new Response(
          JSON.stringify({ error: "Failed to refresh token", details: error }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const tokenData = await tokenResponse.json();
      accessToken = tokenData.access_token;

      // Update stored token
      await supabase
        .from("youtube_channels")
        .update({
          access_token: accessToken,
          token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        })
        .eq("id", channel.id);
    }

    // Create a signed URL so we can stream the file without loading it fully into memory
    const { data: signedVideo, error: signedVideoError } = await supabase.storage
      .from("videos")
      .createSignedUrl(project.final_video_path, 60 * 60);

    if (signedVideoError || !signedVideo?.signedUrl) {
      await supabase
        .from("long_form_projects")
        .update({ status: "failed", error_message: "Failed to create signed URL for video" })
        .eq("id", project_id);

      return new Response(
        JSON.stringify({ error: "Failed to create signed URL for video" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Stream the video from storage (avoids Memory limit exceeded)
    const videoResponse = await fetch(signedVideo.signedUrl);
    if (!videoResponse.ok || !videoResponse.body) {
      const details = await videoResponse.text().catch(() => "");
      await supabase
        .from("long_form_projects")
        .update({ status: "failed", error_message: "Failed to download video from storage" })
        .eq("id", project_id);

      return new Response(
        JSON.stringify({ error: "Failed to download video", details }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contentLength = videoResponse.headers.get("content-length");
    if (!contentLength) {
      await supabase
        .from("long_form_projects")
        .update({ status: "failed", error_message: "Missing Content-Length for video" })
        .eq("id", project_id);

      return new Response(
        JSON.stringify({ error: "Storage did not provide content-length for this video" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare YouTube metadata
    const metadata = {
      snippet: {
        title: project.youtube_title || project.topic,
        description: project.youtube_description || project.brief_description || "",
        tags: project.youtube_tags || [],
        categoryId: "22", // People & Blogs
      },
      status: {
        privacyStatus: project.scheduled_publish_at ? "private" : "public",
        ...(project.scheduled_publish_at && { publishAt: project.scheduled_publish_at }),
        selfDeclaredMadeForKids: false,
      },
    };

    console.log(
      `Uploading long-form video: "${metadata.snippet.title}" (${Math.round(
        Number(contentLength) / 1024 / 1024
      )}MB)`
    );

    // Initiate resumable upload
    const initResponse = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Upload-Content-Type": "video/mp4",
          "X-Upload-Content-Length": String(contentLength),
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!initResponse.ok) {
      const error = await initResponse.text();
      await supabase
        .from("long_form_projects")
        .update({ status: "failed", error_message: `YouTube upload init failed: ${error}` })
        .eq("id", project_id);
      
      return new Response(
        JSON.stringify({ error: "Failed to initiate YouTube upload", details: error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const uploadUrl = initResponse.headers.get("location");
    if (!uploadUrl) {
      await supabase
        .from("long_form_projects")
        .update({ status: "failed", error_message: "No upload URL returned" })
        .eq("id", project_id);
      
      return new Response(
        JSON.stringify({ error: "No upload URL returned from YouTube" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upload the video (streaming)
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(contentLength),
      },
      body: videoResponse.body,
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      await supabase
        .from("long_form_projects")
        .update({ status: "failed", error_message: `YouTube upload failed: ${error}` })
        .eq("id", project_id);
      
      return new Response(
        JSON.stringify({ error: "Failed to upload video to YouTube", details: error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const uploadResult = await uploadResponse.json();
    const youtubeVideoId = uploadResult.id;

    console.log(`Video uploaded successfully: ${youtubeVideoId}`);

    // Upload thumbnail if available
    if (project.thumbnail_path) {
      try {
        const { data: thumbnailData } = await supabase.storage
          .from("videos")
          .download(project.thumbnail_path);

        if (thumbnailData) {
          const thumbBuffer = await thumbnailData.arrayBuffer();
          
          const thumbResponse = await fetch(
            `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${youtubeVideoId}`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "image/jpeg",
              },
              body: thumbBuffer,
            }
          );

          if (thumbResponse.ok) {
            console.log("Thumbnail uploaded successfully");
          } else {
            console.warn("Failed to upload thumbnail:", await thumbResponse.text());
          }
        }
      } catch (thumbError) {
        console.warn("Error uploading thumbnail:", thumbError);
      }
    }

    // Update project status
    const finalStatus = project.scheduled_publish_at ? "scheduled" : "published";
    await supabase
      .from("long_form_projects")
      .update({
        status: finalStatus,
        youtube_video_id: youtubeVideoId,
        published_at: project.scheduled_publish_at ? null : new Date().toISOString(),
        processing_progress: 100,
      })
      .eq("id", project_id);

    console.log(`Long-form project ${project_id} completed with status: ${finalStatus}`);

    return new Response(
      JSON.stringify({
        success: true,
        youtube_video_id: youtubeVideoId,
        status: finalStatus,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in longform-worker:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
