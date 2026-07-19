export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { topics, stages } = req.body;
  if (!topics || !stages) {
    return res.status(400).json({ error: "Missing topics or stages" });
  }

  const topicsText = topics.map((t) => `- ${t.topic}: ${t.angle}`).join("\n");
  const stagesText = stages.join(" and ");

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const prompt = `You are a content strategist for Finny, an AI-first personal finance app for young Indians (20s-30s) focused on FIRE (Financial Independence, Retire Early).

Based on these trending topics:
${topicsText}

Create 6 Instagram Reels/video content ideas targeting the ${stagesText} awareness stage(s).

Each idea must be highly specific to the topic, not generic finance advice. Make hooks attention-grabbing and scripts conversational.

Return ONLY a JSON array, no markdown fences:
[{"awareness_stage":"awareness or consideration or conversion","format":"Reel or Carousel or Story","hook":"opening line to stop the scroll","script":"60-90 second spoken script","on_screen_text":["text overlay 1","text overlay 2","text overlay 3"],"shot_list":["shot description 1","shot description 2","shot description 3"],"cta":"call to action"}]

Return exactly 6 ideas.`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini error ${response.status}: ${errText.slice(0, 300)}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    let jsonText = rawText.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      const match = jsonText.match(/\[[\s\S]*\]/);
      if (match) parsed = JSON.parse(match[0]);
      else throw new Error("Could not parse JSON: " + rawText.slice(0, 200));
    }

    if (!Array.isArray(parsed)) throw new Error("Expected array of ideas");

    return res.status(200).json({ ideas: parsed });
  } catch (err) {
    console.error("Ideas error:", err);
    return res.status(500).json({ error: err.message || "Idea generation failed" });
  }
}
