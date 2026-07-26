import { useEffect, useState } from "react";

export default function Countdown({ target, onSetTarget }) {
  const [remaining, setRemaining] = useState(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!target) {
      setRemaining(null);
      return;
    }
    const tick = () => setRemaining(new Date(target).getTime() - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!target) {
    return (
      <div style={{ textAlign: "center", margin: "24px 0" }}>
        <p>No call scheduled yet.</p>
        <input
          type="datetime-local"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button
          onClick={() => draft && onSetTarget(new Date(draft).toISOString())}
          style={{ marginLeft: 8 }}
        >
          Schedule call
        </button>
      </div>
    );
  }

  const { d, h, m, s } = toParts(Math.max(remaining ?? 0, 0));

  return (
    <div style={{ textAlign: "center", margin: "24px 0" }}>
      <div className="countdown-number" style={{ fontSize: 48, color: "var(--color-plum)" }}>
        {d}d {h}h {m}m {s}s
      </div>
      <p style={{ opacity: 0.7 }}>until your next call</p>
    </div>
  );
}

function toParts(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  return {
    d: Math.floor(totalSeconds / 86400),
    h: Math.floor((totalSeconds % 86400) / 3600),
    m: Math.floor((totalSeconds % 3600) / 60),
    s: totalSeconds % 60,
  };
}
