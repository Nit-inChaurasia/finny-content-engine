import { useState, useCallback } from "react";

const STAGE_PAIRS = [
  ["Problem-Aware", "Solution-Aware"],
  ["Solution-Aware", "Product-Aware"],
  ["Unaware", "Problem-Aware"],
];

const BADGE_CLASS = {
  "Unaware": "badge-unaware",
  "Problem-Aware": "badge-problem",
  "Solution-Aware": "badge-solution",
  "Product-Aware": "badge-product",
  "Most-Aware": "badge-most",
};

function Skeleton() {
  return (
    <div className="skeleton-card">
      <div className="sk sk-num" />
      <div className="sk-content">
        <div className="sk sk-badge" />
        <div className="sk sk-line1" />
        <div className="sk sk-line2" />
      </div>
    </div>
  );
}

function IdeaCard({ idea, index }) {
  const [open, setOpen] = useState(false);
  const badgeClass = BADGE_CLASS[idea.awareness_stage] || "badge-format";

  return (
    <div className="idea-card">
      <div className="idea-header" onClick={() => setOpen((o) => !o)}>
        <div className="idea-num">{String(index).padStart(3, "0")}</div>
        <div className="idea-meta">
          <div className="idea-badges">
            <span className={`badge ${badgeClass}`}>{idea.awareness_stage}</span>
            <span className="badge badge-format">{idea.format}</span>
          </div>
          <div className="idea-hook">{idea.hook}</div>
        </div>
        <div className={`idea-chevron${open ? " open" : ""}`}>&#8964;</div>
      </div>
      {open && (
        <div className="idea-body">
          <div className="idea-section">
            <label>Script</label>
            <p className="script-text">{idea.script}</p>
          </div>
          <div className="idea-section">
            <label>On-screen text</label>
            <ul>
              {(idea.on_screen_text || []).map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>
          <div className="idea-section">
            <label>Shot list</label>
            <ul>
              {(idea.shot_list || []).map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
          <div className="idea-section">
            <label>Call to action</label>
            <div className="cta-box">{idea.cta}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("");
  const [topics, setTopics] = useState(null);
  const [ideas, setIdeas] = useState([]);
  const [skeletons, setSkeletons] = useState(0);
  const [errors, setErrors] = useState([]);

  const run = useCallback(async () => {
    setRunning(true);
    setStatus("Researching trending topics in Indian personal finance...");
    setTopics(null);
    setIdeas([]);
    setErrors([]);
    setSkeletons(0);

    // Step 1: Research
    let researchData;
    try {
      const res = await fetch("/api/research", { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Research step failed");
      }
      researchData = await res.json();
      setTopics(researchData.topics);
    } catch (err) {
      setErrors((e) => [...e, { step: "Research", message: err.message }]);
      setStatus("");
      setRunning(false);
      return;
    }

    // Step 2: Idea generation in 3 batches
    for (let i = 0; i < STAGE_PAIRS.length; i++) {
      const pair = STAGE_PAIRS[i];
      setStatus(
        `Writing ideas ${i * 2 + 1}-${i * 2 + 2} of 6 (${pair.join(" + ")})...`
      );
      setSkeletons(2);

      try {
        const res = await fetch("/api/ideas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topics: researchData.topics, stages: pair }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || `Idea batch ${i + 1} failed`);
        }
        const data = await res.json();
        setSkeletons(0);
        setIdeas((prev) => [...prev, ...data.ideas]);
      } catch (err) {
        setSkeletons(0);
        setErrors((e) => [
          ...e,
          { step: `Ideas batch ${i + 1}`, message: err.message, retry: { topics: researchData.topics, stages: pair, batchIndex: i } },
        ]);
      }
    }

    setStatus("");
    setRunning(false);
  }, []);

  const retryBatch = useCallback(async ({ topics: t, stages, batchIndex }) => {
    setErrors((e) => e.filter((err) => err.retry?.batchIndex !== batchIndex));
    setSkeletons(2);
    setStatus(`Retrying ideas ${batchIndex * 2 + 1}-${batchIndex * 2 + 2}...`);

    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topics: t, stages }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Retry failed");
      }
      const data = await res.json();
      setSkeletons(0);
      setIdeas((prev) => [...prev, ...data.ideas]);
    } catch (err) {
      setSkeletons(0);
      setErrors((e) => [
        ...e,
        { step: `Ideas batch ${batchIndex + 1}`, message: err.message, retry: { topics: t, stages, batchIndex } },
      ]);
    }
    setStatus("");
  }, []);

  return (
    <div className="container">
      <div className="header">
        <h1>Finny Content Engine</h1>
        <p>One click. Six ready-to-shoot Instagram ideas, grounded in what's trending now.</p>
      </div>

      <button className="run-btn" onClick={run} disabled={running}>
        {running ? "Running..." : "Run this week's batch"}
      </button>

      <div className="status">{status}</div>

      {topics && topics.length > 0 && (
        <div className="topics-section">
          <h2>Trending topics found</h2>
          {topics.map((t, i) => (
            <div key={i} className="topic-pill">
              {t.topic}
              <span>{t.angle}</span>
            </div>
          ))}
        </div>
      )}

      {errors.map((err, i) => (
        <div key={i} className="error-box" style={{ marginBottom: 16 }}>
          <span><strong>{err.step}:</strong> {err.message}</span>
          {err.retry ? (
            <button className="retry-btn" onClick={() => retryBatch(err.retry)}>
              Retry
            </button>
          ) : (
            <button className="retry-btn" onClick={run}>
              Start over
            </button>
          )}
        </div>
      ))}

      <div className="ideas-grid">
        {ideas.map((idea, i) => (
          <IdeaCard key={i} idea={idea} index={i + 1} />
        ))}
        {Array.from({ length: skeletons }, (_, i) => (
          <Skeleton key={`sk-${i}`} />
        ))}
      </div>
    </div>
  );
}
