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
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://finny-content-engine.vercel.app",
        "X-Title": "Finny Content Engine",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-chat:free",
        messages: [
          {
            role: "user",
            content: `You are a content strategist for Finny, an AI-first personal finance app for young Indians (20s-30s) focused on FIRE (Financial Independence, Retire Early).

BRAND VOICE: Direct, plain language, occasionally cheeky, never preachy, never corporate jargon. Sound like a sharp friend explaining something, not a brand talking at someone.

HARD RULE: No em dashes (—) anywhere in your output. Use periods, commas, or separate sentences instead.

TRENDING TOPICS THIS WEEK:
${topicsText}

AWARENESS STAGES (for context):
- Unaware: Doesn't know they have a problem. Hook sparks pure curiosity.
- Problem-Aware: Senses something is wrong but no solution yet. Hook names their exact pain.
- Solution-Aware: Knows solutions exist, hasn't picked one. Hook sells the outcome/promise.
- Product-Aware: Knows about apps like Finny, unsure about us. Hook builds proof and credibility.
- Most-Aware: Already knows and trusts Finny. Hook makes the direct offer.

CONTENT FORMATS:
- Demonstration: Screen recording showing a feature/result in action
- Testimonial: Real or reenacted user talking direct to camera
- Education: Explainer style with whiteboard, on-screen text, or narration
- Story: Personal narrative, confession, scam story, founder's journey
- Faceless: No camera needed. Screenshots, text-on-screen slideshows, comparison graphics

Generate exactly 2 content ideas targeting the ${stagesText} awareness stage(s). Use the trending topics as inspiration for current, specific hooks.

Return ONLY a JSON array with no extra text or markdown fences:
[
  {
    "awareness_stage": "one of the five stages",
    "format": "one of the five formats",
    "hook": "the opening line written specifically for this awareness stage",
    "script": "full 20-45 second script in Finny's voice, no em dashes",
    "on_screen_text": ["text overlay 1", "text overlay 2"],
    "shot_list": ["shot 1 description", "shot 2 description"],
    "cta": "single clear call to action"
  }
]

Important: Every hook must clearly match the declared awareness stage. Every script must sound like Finny's voice (direct, plain, a little cheeky). No em dashes anywhere.`,
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
      const match = jsonText.match(/\[[\s\S]*\]/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error("Could not parse JSON from response: " + rawText.slice(0, 200));
      }
    }

    if (!Array.isArray(parsed)) {
      throw new Error("Invalid response shape: expected an array of ideas");
    }

    return res.status(200).json({ ideas: parsed });
  } catch (err) {
    console.error("Ideas error:", err);
    return res.status(500).json({ error: err.message || "Idea generation failed" });
  }
}
