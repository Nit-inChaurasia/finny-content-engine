export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://finny-content-engine.vercel.app",
        "X-Title": "Finny Content Engine",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-exp:free",
        messages: [
          {
            role: "user",
            content: `You are a content researcher for Finny, an AI-first personal finance app for young Indians (20s-30s) focused on FIRE (Financial Independence, Retire Early).

Based on your knowledge of current trends in Indian personal finance and FIRE, identify 6 specific, relevant topics that are actively being discussed on Reddit (r/IndiaInvestments, r/FIREIndia), Twitter/X, news, and blogs.

Each topic must be specific and timely, not generic evergreen advice. Good examples: RBI rate decisions, new SEBI regulations, trending investment products, viral personal finance debates, budget changes affecting salaried Indians, specific mutual fund performance discussions.

Return ONLY a JSON object in this exact format, with no extra text or markdown fences:
{
  "topics": [
    {
      "topic": "short topic name",
      "angle": "one sentence on why this is relevant or interesting right now"
    }
  ]
}

Return exactly 6 topics.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter error ${response.status}: ${errText.slice(0, 300)}`);
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || "";

    let jsonText = rawText.trim();
    jsonText = jsonText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
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
