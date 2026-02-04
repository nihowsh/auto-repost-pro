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

    const body = await req.json();
    const { action, code, login_hint, prompt_type } = body;
    const redirectUri = `${req.headers.get('origin')}/auth/callback`;

    if (action === 'get_auth_url') {
      const scopes = [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/yt-analytics.readonly',
        'https://www.googleapis.com/auth/userinfo.email', // Added to get user email
      ].join(' ');

      // Use select_account to add new channels, consent for re-auth
      const promptValue = prompt_type === 'select_account' ? 'select_account consent' : 'consent';

      let authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${GOOGLE_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&access_type=offline` +
        `&prompt=${encodeURIComponent(promptValue)}`;

      // Add login_hint if provided - this pre-selects the Google account
      if (login_hint) {
        authUrl += `&login_hint=${encodeURIComponent(login_hint)}`;
        console.log('Generated auth URL with login_hint:', login_hint);
      }

      console.log('Generated auth URL for user:', user.id, 'prompt:', promptValue);
      return new Response(JSON.stringify({ url: authUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'exchange_code') {
      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokens = await tokenResponse.json();
      if (tokens.error) {
        throw new Error(tokens.error_description || tokens.error);
      }

      // Fetch user email from Google userinfo endpoint
      let googleEmail: string | null = null;
      try {
        const userInfoResponse = await fetch(
          'https://www.googleapis.com/oauth2/v3/userinfo',
          { headers: { Authorization: `Bearer ${tokens.access_token}` } }
        );
        if (userInfoResponse.ok) {
          const userInfo = await userInfoResponse.json();
          googleEmail = userInfo.email || null;
          console.log('Fetched Google email:', googleEmail);
        }
      } catch (emailErr) {
        console.warn('Failed to fetch Google email:', emailErr);
      }

      // Get channel info
      const channelResponse = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
        { headers: { Authorization: `Bearer ${tokens.access_token}` } }
      );
      const channelData = await channelResponse.json();

      if (!channelData.items?.length) {
        throw new Error('No YouTube channel found for this account');
      }

      const channel = channelData.items[0];
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      // Save channel to database (upsert on user_id + channel_id combo)
      const { error: insertError } = await supabase
        .from('youtube_channels')
        .upsert({
          user_id: user.id,
          channel_id: channel.id,
          channel_title: channel.snippet.title,
          channel_thumbnail: channel.snippet.thumbnails?.default?.url,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt.toISOString(),
          is_active: true,
          google_email: googleEmail, // Store the Google email for login_hint
        }, { onConflict: 'user_id,channel_id' });

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error('Failed to save channel');
      }

      console.log('Channel connected:', channel.snippet.title, 'with email:', googleEmail);
      return new Response(JSON.stringify({ 
        success: true, 
        channel_title: channel.snippet.title 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action');
  } catch (error) {
    console.error('YouTube auth error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
