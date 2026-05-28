import type {
  PerformanceEmp,
  StatusRow,
  AttributionEmp,
  AttributionCreative,
  Deal,
  DealsMeta,
  LeadDetailResponse,
} from "./types";

async function get<T>(path: string): Promise<T> {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`API ${r.status}: ${path}`);
  return r.json();
}

interface Params {
  from: string;
  to: string;
  empreendimentos?: string[];
  allEmps?: string[];
  status?: number[];
  estagio?: string;
  limit?: number;
}

function build(params: Params): string {
  const p = new URLSearchParams();
  p.set("from", params.from);
  p.set("to", params.to);
  if (params.empreendimentos && params.allEmps && params.empreendimentos.length < params.allEmps.length) {
    p.set("empreendimentos", params.empreendimentos.join(","));
  }
  if (params.status && params.status.length < 3) {
    p.set("status", params.status.join(","));
  }
  if (params.estagio && params.estagio !== "leads") p.set("estagio", params.estagio);
  if (params.limit) p.set("limit", String(params.limit));
  return p.toString();
}

export const api = {
  empreendimentos: () => get<{ data: string[] }>("/api/empreendimentos"),
  statusAtual: () => get<{ data: StatusRow[] }>("/api/status-atual"),
  performanceEmp: (p: Params) =>
    get<{ data: PerformanceEmp[]; meta: { from: string; to: string; count: number } }>(
      `/api/performance-emp?${build(p)}`
    ),
  attributionEmp: (p: Params) =>
    get<{ data: AttributionEmp[]; meta: { from: string; to: string; count: number } }>(
      `/api/attribution-emp?${build(p)}`
    ),
  attributionCreative: (p: Params) =>
    get<{ data: AttributionCreative[]; meta: { from: string; to: string; count: number } }>(
      `/api/attribution-creative?${build(p)}`
    ),
  deals: (p: Params) => get<{ data: Deal[]; meta: DealsMeta }>(`/api/deals?${build(p)}`),
  leadDetail: (dealId: string) =>
    get<LeadDetailResponse>(`/api/leads/${encodeURIComponent(dealId)}`),
};
