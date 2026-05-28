import type { PerformanceEmp } from "../types";

interface EmpDerived {
  empreendimento: string;
  leads: number;
  qualificados: number;
  agendamentos: number;
  visitas: number;
  pct_qualif_agend: number;
  pct_agend_visit: number;
  contatos_unicos: number;
  dups: number;
}

export function buildPorEmp(data: PerformanceEmp[]): EmpDerived[] {
  return data
    .map((e) => {
      const leads = Number(e.leads) || 0;
      const qualif = Number(e.qualificados) || 0;
      const agend = Number(e.agendamentos) || 0;
      const visit = Number(e.visitas) || 0;
      return {
        empreendimento: e.empreendimento,
        leads,
        qualificados: qualif,
        agendamentos: agend,
        visitas: visit,
        contatos_unicos: Number(e.contatos_unicos) || 0,
        pct_qualif_agend: qualif ? (agend / qualif) * 100 : 0,
        pct_agend_visit: agend ? (visit / agend) * 100 : 0,
        dups: leads - (Number(e.contatos_unicos) || 0),
      };
    })
    .sort((a, b) => b.leads - a.leads);
}

export function Diagnostics({ porEmp }: { porEmp: EmpDerived[] }) {
  const alerts: string[] = [];
  const empsComLeads = porEmp.filter((e) => e.leads >= 30);
  if (empsComLeads.length === 0) return null;

  const avgQualifAgend =
    empsComLeads.reduce((s, e) => s + e.pct_qualif_agend, 0) / empsComLeads.length;
  if (avgQualifAgend < 15) {
    alerts.push(
      `<strong>Gargalo crítico Qualificação → Agendamento:</strong> média da carteira é ${avgQualifAgend.toFixed(
        1
      )}%. Discutir critério de qualificação e cadência de SDR.`
    );
  }

  const piorVisita = empsComLeads
    .filter((e) => e.agendamentos >= 5)
    .sort((a, b) => a.pct_agend_visit - b.pct_agend_visit)[0];
  if (piorVisita && piorVisita.pct_agend_visit < 30) {
    alerts.push(
      `<strong>${piorVisita.empreendimento}</strong>: ${piorVisita.pct_agend_visit.toFixed(
        0
      )}% dos agendamentos viram visita realizada. Taxa de no-show alta — revisar fluxo de confirmação.`
    );
  }

  const melhor = empsComLeads
    .filter((e) => e.qualificados >= 10)
    .sort((a, b) => b.pct_qualif_agend - a.pct_qualif_agend)[0];
  if (melhor && avgQualifAgend > 0 && melhor.pct_qualif_agend > avgQualifAgend * 1.5) {
    alerts.push(
      `<strong>${melhor.empreendimento}</strong> tem performance acima da carteira: ${melhor.pct_qualif_agend.toFixed(
        0
      )}% qualif→agend (${(melhor.pct_qualif_agend / avgQualifAgend).toFixed(
        1
      )}× a média). Vale investigar o que está sendo feito de diferente.`
    );
  }

  const sem = porEmp.find((e) => e.empreendimento === "Sem Empreendimento");
  if (sem && sem.leads > 0) {
    const total = porEmp.reduce((s, e) => s + e.leads, 0);
    const pct = (sem.leads / total) * 100;
    if (pct > 15) {
      alerts.push(
        `<strong>Higiene de dados:</strong> ${pct.toFixed(0)}% dos leads no período estão sem empreendimento preenchido (${
          sem.leads
        } de ${total}). Sugere processo automatizado de tagueamento na entrada do lead.`
      );
    }
  }

  if (alerts.length === 0) return null;

  return (
    <div className="diag">
      <div className="diag-title">⚠️ Diagnóstico — pontos para conversa com o time</div>
      <ul className="diag-list">
        {alerts.map((a, i) => (
          <li key={i} dangerouslySetInnerHTML={{ __html: a }} />
        ))}
      </ul>
    </div>
  );
}
