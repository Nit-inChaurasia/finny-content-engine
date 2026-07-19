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
              const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

            const prompt = `You are a content strategist for Finny, an AI-first personal finance app for young Indians (20s-30s) focused on FIRE.

            BRAND VOICE: Direct, plain language, occasionally cheeky, never preachy. Sound like a sharp friend, not a brand.

            HARD RULE: No em dashes anywhere. Use periods or commas instead.

            TRENDING TOPICS:
            ${topicsText}

            AWARENESS STAGES:
            - Unaware: Hook sparks pure curiosity.
            - Problem-Aware: Hook names their exact pain.
            - Solution-Aware: Hook sells the outcome.
            - Product-Aware: Hook builds proof and credibility.
            - Most-Aware: Hook makes the direct offer.

            FORMATS: Demonstration, Testimonial, Education, Story, Faceless

            Generate exactly 2 content ideas targeting the ${stagesText} stage(s).

            Return ONLY a JSON array, no markdown fences:
            [{"awareness_stage":"...","format":"...","hook":"...","script":"...","on_screen_text":["..."],"shot_list":["..."],"cta":"..."}]`;

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
