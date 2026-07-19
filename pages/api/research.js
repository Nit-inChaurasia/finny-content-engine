export const config = { maxDuration: 60 };

export default async function handler(req, res) {
        if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
            const apiKey = process.env.GEMINI_API_KEY;
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

          const prompt = `You are a content researcher for Finny, an AI-first personal finance app for young Indians (20s-30s) focused on FIRE.

          Identify 6 specific, relevant topics actively discussed on Reddit (r/IndiaInvestments, r/FIREIndia), Twitter/X, and Indian finance news. Each must be timely and specific, not generic advice.

          Return ONLY a JSON object, no markdown fences:
          {"topics":[{"topic":"short topic name","angle":"one sentence on why this is relevant now"}]}

          Return exactly 6 topics.`;

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
                        const match = jsonText.match(/\{[\s\S]*"topics"[\s\S]*\}/);
                        if (match) parsed = JSON.parse(match[0]);
                        else throw new Error("Could not parse JSON: " + rawText.slice(0, 200));
            }

          if (!parsed.topics || !Array.isArray(parsed.topics)) {
                      throw new Error("Invalid response: missing topics array");
          }

          return res.status(200).json(parsed);
  } catch (err) {
            console.error("Research error:", err);
            return res.status(500).json({ error: err.message || "Research step failed" });
  }
}
