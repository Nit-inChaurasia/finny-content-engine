export const config = { maxDuration: 60 };

export default async function handler(req, res) {
      if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
          const apiKey = process.env.GEMINI_API_KEY;
          const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                              contents: [
                                  {
                                                  parts: [
                                                      {
                                                                          text: `You are a content researcher for Finny, an AI-first personal finance app for young Indians (20s-30s) focused on FIRE (Financial Independence, Retire Early).

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
                                  },
                                          ],
                  }),
        });

        if (!response.ok) {
                  const errText = await response.text();
                  throw new Error(`Gemini error ${response.status}: ${errText.slice(0, 300)}`);
        }

        const data = await response.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

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
