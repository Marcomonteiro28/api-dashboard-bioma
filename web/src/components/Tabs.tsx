import type { TabKey } from "../types";

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "funil", label: "Funil", icon: "📊" },
  { key: "marketing", label: "Marketing", icon: "📣" },
];

export function Tabs({ active, onChange }: { active: TabKey; onChange: (k: TabKey) => void }) {
  return (
    <nav className="tabs">
      {TABS.map((t) => (
        <button
          key={t.key}
          className={`tab${active === t.key ? " active" : ""}`}
          onClick={() => onChange(t.key)}
        >
          <span className="tab-icon">{t.icon}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
