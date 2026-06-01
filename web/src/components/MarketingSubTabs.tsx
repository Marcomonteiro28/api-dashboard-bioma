import type { MarketingView } from "../types";

const SUBTABS: { key: MarketingView; label: string; description: string }[] = [
  {
    key: "meta_puro",
    label: "Meta puro",
    description: "Dados direto do Meta sem cruzar com CRM",
  },
  {
    key: "cross",
    label: "Cross com CRM",
    description: "Meta × ActiveCampaign (depende do tracking)",
  },
];

export function MarketingSubTabs({
  active,
  onChange,
}: {
  active: MarketingView;
  onChange: (k: MarketingView) => void;
}) {
  return (
    <div className="mk-subtabs">
      {SUBTABS.map((t) => (
        <button
          key={t.key}
          className={`mk-subtab${active === t.key ? " active" : ""}`}
          onClick={() => onChange(t.key)}
          title={t.description}
        >
          <span className="mk-subtab-label">{t.label}</span>
          <span className="mk-subtab-desc">{t.description}</span>
        </button>
      ))}
    </div>
  );
}
