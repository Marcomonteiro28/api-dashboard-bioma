import { fmtNum } from "../utils/format";
import type { StatusRow } from "../types";

export function StatusBars({ rows }: { rows: StatusRow[] }) {
  const max = Math.max(1, ...rows.map((s) => Number(s.qtd)));
  return (
    <div className="card">
      <h3 className="card-title">Onde estão os deals abertos agora</h3>
      <p className="card-subtitle">
        Fila de trabalho atual · snapshot ao vivo (última sync AC) · ignora filtros de período ·{" "}
        <span style={{ color: "var(--primary-light)" }}>●</span> Bioma Vendas ·{" "}
        <span style={{ color: "var(--accent)" }}>●</span> Bozza Nova
      </p>
      {rows.length === 0 && <p className="card-subtitle">Sem dados de status disponíveis.</p>}
      {rows.map((s, i) => {
        const qtd = Number(s.qtd);
        const cls = s.funil && s.funil.indexOf("bozza") >= 0 ? "vendas" : "pre";
        return (
          <div key={i} className="status-row">
            <span className={`status-dot ${cls}`} />
            <span className="status-name">{s.status}</span>
            <div className="status-bar-bg">
              <div className={`status-bar ${cls}`} style={{ width: `${(qtd / max) * 100}%` }} />
            </div>
            <span className="status-count">{fmtNum(qtd)}</span>
          </div>
        );
      })}
    </div>
  );
}
