import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface OcrResult {
  medications: Array<{
    name: string;
    dose: string;
    frequency: string;
  }>;
  rawText: string;
  source: "openai" | "mock";
}

// Parse medications from OpenAI response text
function parseMedications(text: string) {
  const lines = text.split("\n").filter((l) => l.trim());
  const meds: Array<{ name: string; dose: string; frequency: string }> = [];
  for (const line of lines) {
    const match = line.match(/^[-・]?\s*(.+?)\s*[:|：]\s*(.+?)\s*[,、,]\s*(.+)$/);
    if (match) {
      meds.push({ name: match[1].trim(), dose: match[2].trim(), frequency: match[3].trim() });
    } else {
      const parts = line.split(/\s{2,}|\t/);
      if (parts.length >= 2) {
        meds.push({ name: parts[0].trim(), dose: parts[1]?.trim() ?? "", frequency: parts[2]?.trim() ?? "" });
      }
    }
  }
  return meds;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Verify caller is authenticated and get their pharmacy_id
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const imageBase64: string = body.imageBase64; // data URL or base64

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "imageBase64 required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    let result: OcrResult;

    if (openaiKey) {
      // Real OCR via OpenAI Vision
      const base64Data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
      const ocrRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `この処方箋画像から薬剤情報を抽出してください。
以下の形式で各薬剤を1行ずつ出力してください（必ず日本語で）:
薬剤名: 用量, 用法

例:
- アモキシシリン細粒10%: 0.5g, 1日3回 食後
- アセトアミノフェン細粒: 200mg, 発熱時 頓服

薬剤情報のみを出力し、それ以外の情報（患者名・医師名・保険番号等）は含めないでください。`,
                },
                {
                  type: "image_url",
                  image_url: { url: `data:image/jpeg;base64,${base64Data}` },
                },
              ],
            },
          ],
        }),
      });

      if (!ocrRes.ok) {
        throw new Error(`OpenAI API error: ${ocrRes.status}`);
      }

      const ocrData = await ocrRes.json();
      const rawText: string = ocrData.choices?.[0]?.message?.content ?? "";
      result = {
        medications: parseMedications(rawText),
        rawText,
        source: "openai",
      };
    } else {
      // Mock fallback when no API key configured
      result = {
        medications: [
          { name: "（OCR未設定）APIキーを登録してください", dose: "—", frequency: "—" },
        ],
        rawText: "",
        source: "mock",
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
