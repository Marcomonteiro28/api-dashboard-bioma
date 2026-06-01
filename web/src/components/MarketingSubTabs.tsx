import type { MarketingView } from "../types";

const SUBTABS: { key: MarketingView; label: string; description: string }[] = [
  {
    key: "completa",
    label: "Mídia paga (completa)",
    description: "Meta + Google somados",
  },
  {
    key: "meta_puro",
    label: "Só Meta",
    description: "Dados raw do Meta Ads",
  },
  {
    key: "google_puro",
    label: "Só Google",
    description: "Dados raw do Google Ads",
  },
  {
    key: "origem",
    label: "Origem dos leads",
    description: "Atribuição por fonte (proxy)",
  },
  {
    key: "cross",
    label: "Cross com CRM",
    description: "Meta × ActiveCampaign",
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
