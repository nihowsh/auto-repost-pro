import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Lovable AI Gateway for free AI generation
const LOVABLE_AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, target_duration_seconds, brief_description, reference_urls, custom_api_key } = await req.json();

    if (!topic) {
      return new Response(
        JSON.stringify({ error: "Topic is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate target word count (~150 words per minute for natural speech)
    const targetMinutes = target_duration_seconds / 60;
    const targetWordCount = Math.round(targetMinutes * 150);

    const systemPrompt = `You are a professional video scriptwriter. Your task is to write engaging, well-structured video scripts that are easy to narrate.

Guidelines:
- Write in a conversational, engaging tone
- Include clear section breaks/chapters
- Aim for exactly ${targetWordCount} words (${targetMinutes} minutes at speaking pace)
- Structure the script with an intro, main content sections, and conclusion
- Make it suitable for voiceover narration
- Do NOT include visual directions or timestamps in the script text
- Just write the words that will be spoken`;

    const userPrompt = `Write a video script about: "${topic}"

${brief_description ? `Additional context: ${brief_description}` : ""}

${reference_urls && reference_urls.length > 0 ? `This video will use clips from these reference videos: ${reference_urls.join(", ")}` : ""}

Please write a ${targetMinutes}-minute script (approximately ${targetWordCount} words).

After the script, provide:
1. A list of suggested chapters with their approximate start times
2. The actual word count of your script

Format your response as:
---SCRIPT---
[Your script here]
---CHAPTERS---
[List of chapters in format: "Chapter Title - 0:00"]
---WORD_COUNT---
[Number]`;

    console.log(`Generating script for topic: "${topic}", target: ${targetMinutes} minutes`);

    // Use Lovable AI Gateway (free) or custom API key
    let response;
    
    if (custom_api_key) {
      // User provided their own OpenAI API key
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${custom_api_key}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 4000,
          temperature: 0.7,
        }),
      });
    } else {
      // Use Lovable AI Gateway (free tier)
      const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
      
      if (!lovableApiKey) {
        return new Response(
          JSON.stringify({ error: "Lovable AI not configured. Please provide a custom API key." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      response = await fetch(LOVABLE_AI_GATEWAY, {
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
          max_tokens: 4000,
          temperature: 0.7,
        }),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate script", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await response.json();
    const fullResponse = aiResult.choices?.[0]?.message?.content || "";

    // Parse the response
    const scriptMatch = fullResponse.match(/---SCRIPT---\s*([\s\S]*?)---CHAPTERS---/);
    const chaptersMatch = fullResponse.match(/---CHAPTERS---\s*([\s\S]*?)---WORD_COUNT---/);
    const wordCountMatch = fullResponse.match(/---WORD_COUNT---\s*(\d+)/);

    const script = scriptMatch ? scriptMatch[1].trim() : fullResponse;
    const chaptersRaw = chaptersMatch ? chaptersMatch[1].trim() : "";
    const wordCount = wordCountMatch ? parseInt(wordCountMatch[1]) : script.split(/\s+/).length;

    // Parse chapters into structured format
    const chapters = chaptersRaw
      .split("\n")
      .filter((line: string) => line.trim())
      .map((line: string) => {
        const match = line.match(/(.+?)\s*-\s*(\d+:\d+)/);
        if (match) {
          const [, title, time] = match;
          const [mins, secs] = time.split(":").map(Number);
          return {
            title: title.trim().replace(/^\d+\.\s*/, ""),
            start_seconds: mins * 60 + secs,
          };
        }
        return null;
      })
      .filter(Boolean);

    // Estimate duration based on word count
    const estimatedDurationSeconds = Math.round((wordCount / 150) * 60);

    console.log(`Script generated: ${wordCount} words, ~${Math.round(estimatedDurationSeconds / 60)} minutes`);

    return new Response(
      JSON.stringify({
        script,
        word_count: wordCount,
        estimated_duration_seconds: estimatedDurationSeconds,
        chapters,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-script:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
