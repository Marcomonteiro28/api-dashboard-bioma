import type {
  PerformanceEmp,
  PerformanceTotals,
  StatusRow,
  AttributionEmp,
  AttributionCreative,
  Deal,
  DealsMeta,
  LeadDetailResponse,
  CreativeFunnelRow,
  WeeklyLeadsRow,
  MetaCampaignRow,
  MetaByEmpRow,
  TrackingCoverageRow,
} from "./types";

// Em prod (Vercel) define VITE_API_BASE_URL pro Cloud Run.
// Em dev local fica vazio e o proxy do vite.config.ts redireciona /api -> :3001.
const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

const TOKEN_KEY = "bioma_auth_token";

export const authStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class AuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function get<T>(path: string): Promise<T> {
  const token = authStore.get();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  // sem credentials: 'include' — usamos Bearer header, nao cookies. Inclui-lo
  // conflita com Access-Control-Allow-Origin: * no preflight CORS
  const r = await fetch(API_BASE + path, { headers });
  if (r.status === 401 || r.status === 403) {
    let detail = "";
    try {
      const body = await r.json();
      detail = body?.error || body?.detail || "";
    } catch {
      // ignora parse error
    }
    throw new AuthError(r.status, detail || `Auth ${r.status}`);
  }
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
  subOrigens?: string[];
  allSubOrigens?: string[];
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
  if (
    params.subOrigens &&
    params.allSubOrigens &&
    params.subOrigens.length < params.allSubOrigens.length
  ) {
    p.set("sub_origens", params.subOrigens.join(","));
  }
  if (params.estagio && params.estagio !== "leads") p.set("estagio", params.estagio);
  if (params.limit) p.set("limit", String(params.limit));
  return p.toString();
}

export const api = {
  empreendimentos: () => get<{ data: string[] }>("/api/empreendimentos"),
  subOrigens: () => get<{ data: string[] }>("/api/sub-origens"),
  statusAtual: () => get<{ data: StatusRow[] }>("/api/status-atual"),
  leadsWeekly: (p: Params) =>
    get<{
      data: WeeklyLeadsRow[];
      meta: { from: string; to: string; count: number };
    }>(`/api/leads-weekly?${build(p)}`),
  performanceEmp: (p: Params) =>
    get<{
      data: PerformanceEmp[];
      meta: { from: string; to: string; count: number; totals: PerformanceTotals | null };
    }>(`/api/performance-emp?${build(p)}`),
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
  creativeFunnel: (p: Params & { min_leads?: number }) => {
    const qs = build(p);
    const min = p.min_leads ? `&min_leads=${p.min_leads}` : "";
    return get<{
      data: CreativeFunnelRow[];
      meta: { from: string; to: string; count: number; min_leads: number };
    }>(`/api/creative-funnel?${qs}${min}`);
  },
  metaOverview: (p: Params) =>
    get<{ data: MetaCampaignRow[]; meta: { from: string; to: string; count: number } }>(
      `/api/meta/overview?${build(p)}`
    ),
  metaByEmp: (p: Params) =>
    get<{ data: MetaByEmpRow[]; meta: { from: string; to: string; count: number } }>(
      `/api/meta/by-emp?${build(p)}`
    ),
  trackingCoverage: (p: Params) =>
    get<{ data: TrackingCoverageRow[]; meta: { from: string; to: string; count: number } }>(
      `/api/meta/tracking-coverage?${build(p)}`
    ),
};
