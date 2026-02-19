import { useMemo, useState } from "react";
import "./App.css";

type Verdict = "scam" | "likely_scam" | "unsure" | "likely_legit";

type AnalyzeResponse = {
  verdict: Verdict;
  confidence: number;
  summary: string;
  why: string[];
  red_flags: string[];
  safe_next_steps: string[];
  entities?: {
    phones: string[];
    emails: string[];
    urls: string[];
    requested_action: string;
  };
};

function verdictLabel(v: Verdict) {
  switch (v) {
    case "scam":
      return "SCAM";
    case "likely_scam":
      return "LIKELY SCAM";
    case "unsure":
      return "UNSURE";
    case "likely_legit":
      return "LIKELY LEGIT";
  }
}

export default function App() {
  const [inputType, setInputType] = useState<"text" | "email">("text");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<AnalyzeResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const canAnalyze = useMemo(() => text.trim().length > 0 && !loading, [text, loading]);

  async function analyze() {
    setErr(null);
    setRes(null);
    const trimmed = text.trim();
    if (!trimmed) return;

    setLoading(true);
    try {
      const r = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ inputType, text: trimmed }),
      });

      if (!r.ok) {
        const msg = await r.text();
        throw new Error(msg || "Request failed");
      }

      const data = (await r.json()) as AnalyzeResponse;
      setRes(data);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to analyze");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "32px auto", padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ marginBottom: 6 }}>Is This a Scam?</h1>
      <div style={{ color: "#555", marginBottom: 16 }}>Paste a text message or email. Get a verdict + reasons.</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={() => setInputType("text")} disabled={inputType === "text"}>
          Text
        </button>
        <button onClick={() => setInputType("email")} disabled={inputType === "email"}>
          Email
        </button>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste the message here…"
        style={{
          width: "100%",
          minHeight: 220,
          padding: 12,
          borderRadius: 10,
          border: "1px solid #ddd",
          lineHeight: 1.4,
        }}
      />

      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <button onClick={analyze} disabled={!canAnalyze}>
          {loading ? "Analyzing…" : "Analyze"}
        </button>
        <button
          onClick={() => {
            setText("");
            setRes(null);
            setErr(null);
          }}
          disabled={loading}
        >
          Clear
        </button>
      </div>

      {err && <p style={{ color: "crimson", marginTop: 12 }}>{err}</p>}

      {res && (
        <div style={{ marginTop: 18, padding: 14, border: "1px solid #ddd", borderRadius: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0 }}>
              Verdict: {verdictLabel(res.verdict)} ({res.confidence}%)
            </h2>
            <button
              onClick={() => {
                const shareText =
                  `ScamChecker result: ${verdictLabel(res.verdict)} (${res.confidence}%)\n` +
                  `${res.summary}\n\nTop reasons:\n- ${res.why.slice(0, 3).join("\n- ")}`;
                navigator.clipboard.writeText(shareText);
                alert("Copied summary to clipboard!");
              }}
            >
              Copy Summary
            </button>
          </div>

          <p style={{ marginTop: 10 }}>{res.summary}</p>

          <h3>Why</h3>
          <ul>{res.why.map((x) => <li key={x}>{x}</li>)}</ul>

          <h3>Red Flags</h3>
          {res.red_flags.length ? (
            <ul>{res.red_flags.map((x) => <li key={x}>⚠️ {x}</li>)}</ul>
          ) : (
            <div>None detected.</div>
          )}

          <h3>Safe Next Steps</h3>
          <ul>{res.safe_next_steps.map((x) => <li key={x}>✅ {x}</li>)}</ul>

          <hr style={{ margin: "16px 0" }} />

          <h3>Protection Tools (Affiliate)</h3>
          <ul>
            <li>
              <a href="#" onClick={(e) => e.preventDefault()}>
                Password manager
              </a>{" "}
              <small>(affiliate)</small>
            </li>
            <li>
              <a href="#" onClick={(e) => e.preventDefault()}>
                Identity monitoring
              </a>{" "}
              <small>(affiliate)</small>
            </li>
          </ul>
          <small style={{ color: "#666" }}>Affiliate disclosure: links may earn a commission.</small>
        </div>
      )}
    </div>
  );
}
