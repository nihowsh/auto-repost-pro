import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Use Lovable AI Gateway (same as generate-script) to avoid external API key / model issues
const LOVABLE_AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { script, topic, brief_description, chapters } = await req.json();

    if (!topic) {
      return new Response(
        JSON.stringify({ error: "Topic is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "AI not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a YouTube SEO expert. Your task is to generate optimized metadata for YouTube videos.

Guidelines:
- Title: Catchy, under 100 characters, includes main keyword
- Description: Engaging first 2 lines (shown in search), then detailed content, includes relevant links section placeholder
- Tags: 10-15 relevant tags, mix of broad and specific
- Chapters: Format as "00:00 Chapter Name" for YouTube timestamp chapters`;

    const userPrompt = `Generate YouTube metadata for a video about: "${topic}"

${brief_description ? `Video description: ${brief_description}` : ""}

${script ? `Script excerpt (first 500 chars): ${String(script).substring(0, 500)}...` : ""}

${chapters && chapters.length > 0 ? `
Existing chapters:
${chapters.map((c: { title: string; start_seconds: number }) => `${Math.floor(c.start_seconds / 60)}:${String(c.start_seconds % 60).padStart(2, '0')} ${c.title}`).join('\n')}
` : ""}

Please provide:
1. An engaging YouTube title (under 100 characters)
2. A full YouTube description (300-500 words) with:
   - Hook in first 2 lines
   - Video summary
   - Chapters/timestamps section
   - Call to action
   - Links placeholder section
3. 10-15 relevant tags
4. Formatted chapters for YouTube (if not already provided)

Format your response as JSON:
{
  "title": "Your title here",
  "description": "Full description here",
  "tags": ["tag1", "tag2", ...],
  "chapters": [{"title": "Intro", "start_seconds": 0}, ...]
}`;

    console.log(`Generating metadata for topic: "${topic}" via Lovable AI Gateway`);

    const response = await fetch(LOVABLE_AI_GATEWAY, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate metadata", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let metadata;
    try {
      const jsonMatch = String(content).match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        metadata = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      metadata = {
        title: `${topic} - Complete Guide`,
        description: `Learn everything about ${topic}.\n\n${brief_description || ""}\n\n#${String(topic).replace(/\s+/g, "")}`,
        tags: String(topic).split(" ").concat(["tutorial", "guide", "howto"]),
        chapters: chapters || [{ title: "Introduction", start_seconds: 0 }],
      };
    }

    console.log(`Metadata generated: title="${metadata.title}", ${metadata.tags?.length || 0} tags`);

    return new Response(
      JSON.stringify({
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags || [],
        chapters: metadata.chapters || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-metadata:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
