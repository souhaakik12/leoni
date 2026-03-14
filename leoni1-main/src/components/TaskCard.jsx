import { useState } from "react";

const statusConfig = {
  Active:    { bg: "rgba(52,211,153,0.1)",  text: "#34d399", dot: "#34d399"  },
  Pending:   { bg: "rgba(96,165,250,0.1)",  text: "#60a5fa", dot: "#60a5fa"  },
  Completed: { bg: "rgba(255,209,0,0.12)",  text: "#FFD100", dot: "#FFD100"  },
  "On Hold": { bg: "rgba(248,113,113,0.1)", text: "#f87171", dot: "#f87171"  },
};

const priorityDot = { High: "#f87171", Medium: "#60a5fa", Low: "#34d399" };

function Badge({ status }) {
  const c = statusConfig[status] || {};
  return (
    <span style={{
      background: c.bg, color: c.text,
      borderRadius: 4, padding: "3px 9px",
      fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
      display: "inline-flex", alignItems: "center", gap: 5,
      border: `1px solid ${c.dot}30`,
      whiteSpace: "nowrap",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.dot }} />
      {status}
    </span>
  );
}

function ProgressBar({ value }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 2, height: 5, overflow: "hidden" }}>
      <div style={{
        width: `${value}%`, height: "100%", borderRadius: 2,
        background: value === 100 ? "#FFD100" : "linear-gradient(90deg, #FFD100cc, #FFD100)",
        transition: "width 0.6s cubic-bezier(.4,0,.2,1)",
      }} />
    </div>
  );
}

export default function TaskCard({ item }) {
  const [hovered, setHovered] = useState(false);
  const initials = item.assignee.split(" ").map(n => n[0]).join("").toUpperCase();

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "rgba(255,209,0,0.04)" : "var(--bg-surface)",
        border: `1px solid ${hovered ? "rgba(255,209,0,0.25)" : "var(--border)"}`,
        borderRadius: 10,
        padding: "16px 18px",
        transition: "all 0.2s ease",
        cursor: "pointer",
        transform: hovered ? "translateY(-2px)" : "none",
        boxShadow: hovered ? "0 6px 24px rgba(255,209,0,0.08)" : "none",
      }}
    >
      {/* Title + badge */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, gap: 10 }}>
        <span style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 14, lineHeight: 1.4 }}>
          {item.title}
        </span>
        <Badge status={item.status} />
      </div>

      {/* Category tag */}
      {item.category && (
        <div style={{ marginBottom: 10 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
            color: "#FFD100", background: "rgba(255,209,0,0.08)",
            borderRadius: 4, padding: "2px 8px",
            border: "1px solid rgba(255,209,0,0.15)",
          }}>
            {item.category}
          </span>
        </div>
      )}

      {/* Progress */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Progress</span>
          <span style={{ color: item.progress === 100 ? "#FFD100" : "var(--text-secondary)", fontSize: 12, fontWeight: 700 }}>
            {item.progress}%
          </span>
        </div>
        <ProgressBar value={item.progress} />
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{
            width: 24, height: 24, borderRadius: 4,
            background: "#FFD100",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 9, fontWeight: 800, color: "#0a0c10",
          }}>
            {initials}
          </div>
          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{item.assignee}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: priorityDot[item.priority], display: "inline-block" }} />
          <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{item.due}</span>
        </div>
      </div>
    </div>
  );
}