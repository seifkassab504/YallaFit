import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required parameter: imageUrl" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ocrApiKey = Deno.env.get("INBODY_OCR_API_KEY");
    const ocrProvider = Deno.env.get("INBODY_OCR_PROVIDER") || "mindee";

    // If OCR provider credentials are not yet configured on the server,
    // return an explicit configuration error with actionable instructions
    if (!ocrApiKey) {
      return new Response(
        JSON.stringify({
          error: "Extraction service not configured: INBODY_OCR_API_KEY is missing on the server. Please provide manual verification or configure Edge Function secrets.",
          configured: false,
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call OCR Provider (Mindee / Google Document AI / OpenAI Vision API)
    // Example: Calling Vision API with structured schema extraction
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ocrApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert OCR parser for InBody result sheets. Extract all printed values accurately. Output ONLY valid JSON matching this schema:
{
  "deviceModel": string or null,
  "assessmentDate": string (ISO),
  "heightCm": number or null,
  "age": number or null,
  "sex": string or null,
  "totalBodyScore": number or null,
  "weightKg": number or null,
  "skeletalMuscleMassKg": number or null,
  "bodyFatMassKg": number or null,
  "totalBodyWaterL": number or null,
  "proteinKg": number or null,
  "mineralsKg": number or null,
  "bmi": number or null,
  "percentBodyFat": number or null,
  "waistHipRatio": number or null,
  "visceralFatLevel": number or null,
  "bmrKcal": number or null,
  "segmental": [
    {
      "region": "left_arm" | "right_arm" | "trunk" | "left_leg" | "right_leg",
      "analysisType": "lean" | "fat",
      "massKg": number or null,
      "reportedPercentage": number or null,
      "classification": string or null,
      "confidence": number
    }
  ],
  "warnings": string[]
}`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract InBody data from this document image." },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(
        JSON.stringify({ error: `OCR Provider error: ${errText}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const completion = await response.json();
    const rawContent = completion.choices?.[0]?.message?.content;
    const extractedData = JSON.parse(rawContent);

    return new Response(JSON.stringify(extractedData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Failed to process InBody OCR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
