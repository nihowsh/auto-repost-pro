import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple hash function for API key validation
// In production, you'd use bcrypt, but for edge functions we use SHA-256
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { api_key, action } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Action: Generate new API key (requires auth)
    if (action === "generate") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Authorization header required" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify the user's JWT
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Invalid token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate a new API key
      const rawKey = crypto.randomUUID() + "-" + crypto.randomUUID();
      const keyPrefix = rawKey.substring(0, 8);
      const keyHash = await hashApiKey(rawKey);

      const { name } = await req.json().catch(() => ({ name: "My Runner" }));

      // Store the hashed key
      const { data: apiKey, error: insertError } = await supabase
        .from("api_keys")
        .insert({
          user_id: user.id,
          key_hash: keyHash,
          key_prefix: keyPrefix,
          name: name || "My Runner",
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating API key:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to create API key" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Return the raw key (only shown once)
      return new Response(
        JSON.stringify({
          api_key: rawKey,
          id: apiKey.id,
          prefix: keyPrefix,
          name: apiKey.name,
          created_at: apiKey.created_at,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Authenticate with API key (for local runner)
    if (!api_key) {
      return new Response(
        JSON.stringify({ error: "API key required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const keyPrefix = api_key.substring(0, 8);
    const keyHash = await hashApiKey(api_key);

    // Find matching API key
    const { data: apiKeyRecord, error: lookupError } = await supabase
      .from("api_keys")
      .select("*")
      .eq("key_prefix", keyPrefix)
      .eq("key_hash", keyHash)
      .is("revoked_at", null)
      .single();

    if (lookupError || !apiKeyRecord) {
      console.error("API key lookup failed:", lookupError);
      return new Response(
        JSON.stringify({ error: "Invalid or revoked API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update last_used_at
    await supabase
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", apiKeyRecord.id);

    // Generate a short-lived access token for the runner
    // We'll return the user_id and project details for the runner to use
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    console.log(`API key authenticated for user ${apiKeyRecord.user_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        user_id: apiKeyRecord.user_id,
        supabase_url: supabaseUrl,
        supabase_anon_key: supabaseAnonKey,
        // The runner will use the service role key for operations
        // This is secure because the API key is validated
        service_role_key: supabaseServiceKey,
        message: "Authenticated successfully",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in runner-auth:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
