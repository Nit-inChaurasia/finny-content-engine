import Anthropic from "@anthropic-ai/sdk";

export const config = { maxDuration: 60 };

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [
        {
          role: "user",
          content: `You are a content researcher for Finny, an AI-first personal finance app for young Indians (20s-30s) focused on FIRE (Financial Independence, Retire Early).

Search for what's currently trending in Indian personal finance and FIRE conversations across Reddit (r/IndiaInvestments, r/FIREIndia), Twitter/X, recent news, and blogs.

Find 6 specific, current trending topics. Each topic must be something happening NOW, not generic evergreen advice. "RBI just changed X" is better than "saving money is important."

Return ONLY a JSON object in this exact format, with no extra text or markdown fences:
{
  "topics": [
    {
      "topic": "short topic name",
      "angle": "one sentence on why this is relevant or surprising right now"
    }
  ]
}

Return exactly 6 topics.`,
        },
      ],
      betas: ["web-search-2025-03-05"],
    });

    // Extract final text from response
    let rawText = "";
    for (const block of response.content) {
      if (block.type === "text") {
        rawText += block.text;
      }
    }

    // Strip markdown fences if present
    let jsonText = rawText.trim();
    jsonText = jsonText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      // Fallback: try regex extraction
      const match = jsonText.match(/\{[\s\S]*"topics"[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error("Could not parse JSON from response: " + rawText.slice(0, 200));
      }
    }

    if (!parsed.topics || !Array.isArray(parsed.topics)) {
      throw new Error("Invalid response shape: missing topics array");
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error("Research error:", err);
    return res.status(500).json({ error: err.message || "Research step failed" });
  }
}
