export interface PerformanceEmp {
  empreendimento: string;
  leads: number;
  contatos_unicos: number;
  aguardando_retorno: number;
  qualificados: number;
  agendamentos: number;
  transferidos: number;
  visitas_confirmadas: number;
  visitas: number;
  negociacoes: number;
  propostas: number;
  ganhos: number;
  receita_ganha: number;
}

export interface PerformanceTotals {
  leads: number;
  contatos_unicos: number;
  aguardando_retorno: number;
  qualificados: number;
  agendamentos: number;
  transferidos: number;
  visitas_confirmadas: number;
  visitas: number;
  negociacoes: number;
  propostas: number;
  ganhos: number;
  receita_ganha: number;
}

export interface StatusRow {
  status: string;
  stage_rank: number;
  funil: "pre" | "vendas" | string;
  pipeline: string;
  qtd: number | string;
}

export interface AttributionEmp {
  empreendimento: string;
  leads: number;
  qualificados: number;
  agendamentos: number;
  visitas: number;
  negociacoes: number;
  ganhos: number;
  receita_brl: number;
  gasto_meta_brl: number;
  impressoes: number;
  cliques: number;
  dias_ativos: number;
  cpl_brl: number | null;
  cpq_brl: number | null;
  cpv_brl: number | null;
  ctr_pct: number | null;
  cpc_brl: number | null;
}

export type MatchType = "AD_NAME" | "CAMPAIGN_NAME" | "NO_MATCH";

export interface AttributionCreative {
  criativo: string;
  empreendimento: string | null;
  match_type: MatchType;
  ad_id: string | null;
  campaign_id: string | null;
  leads: number;
  qualificados: number;
  agendamentos: number;
  visitas: number;
  ganhos: number;
  gasto_brl: number;
  impressoes: number;
  cliques: number;
  cpl_brl: number | null;
  cpq_brl: number | null;
  ctr_pct: number | null;
}

export interface Deal {
  deal_id: string;
  contact_id: string;
  contact_email: string | null;
  contact_nome: string | null;
  contact_phone: string | null;
  empreendimento: string;
  linha_empreendimento: string | null;
  metragem_m2: string | null;
  prioridade: string | null;
  origem: string | null;
  sub_origem: string | null;
  gatilho_mql: string | null;
  sdr_responsavel: string | null;
  valor_deal: number | null;
  valor_esperado: number | null;
  stage_titulo_atual: string;
  pipeline_atual: string;
  deal_status: number;
  deal_created_at: string;
  dt_entrada: string | null;
  dt_qualificado: string | null;
  dt_visita_agendada: string | null;
  dt_visita_confirmada: string | null;
  dt_visita_realizada: string | null;
  dt_negociacao: string | null;
  dt_proposta: string | null;
  dt_fechamento: string | null;
}

export interface DealsMeta {
  from: string;
  to: string;
  count: number;
  limit: number;
  estagio: string;
}

export type RangeKey = "7d" | "30d" | "90d" | "365d" | "custom";

export interface LeadDetailLead {
  deal_id: string;
  contact_id: string;
  contact_email: string | null;
  contact_nome: string | null;
  contact_phone: string | null;
  empreendimento: string;
  linha_empreendimento: string | null;
  metragem_m2: string | null;
  prioridade: string | null;
  origem: string | null;
  sub_origem: string | null;
  gatilho_mql: string | null;
  sdr_responsavel: string | null;
  valor_deal: number | null;
  valor_esperado: number | null;
  stage_titulo_atual: string;
  pipeline_atual: string;
  deal_status: number;
  deal_created_at: string | null;
  dt_entrada: string | null;
  dt_qualificado: string | null;
  dt_visita_agendada: string | null;
  dt_visita_confirmada: string | null;
  dt_visita_realizada: string | null;
  dt_negociacao: string | null;
  dt_proposta: string | null;
  dt_fechamento: string | null;
}

export interface LeadDetailCreative {
  criativo_deal: string | null;
  campanha_deal: string | null;
  match_type: MatchType | null;
  matched_ad_id: string | null;
  matched_campaign_id: string | null;
  matched_campaign_name: string | null;
  ad_name: string | null;
  ad_status: string | null;
  creative_name: string | null;
  creative_title: string | null;
  creative_body: string | null;
  creative_image_url: string | null;
  creative_thumbnail_url: string | null;
  creative_link_url: string | null;
  creative_video_id: string | null;
  creative_cta: string | null;
}

export interface LeadDetailResponse {
  lead: LeadDetailLead;
  creative: LeadDetailCreative | null;
  ac_deal_url: string | null;
}

export interface WeeklyLeadsRow {
  semana: string;
  leads: number;
  qualificados: number;
  visitas: number;
  ganhos: number;
}

export type TabKey = "funil" | "marketing";

export interface CreativeFunnelRow {
  criativo: string;
  empreendimento: string | null;
  match_type: MatchType;
  ad_id: string | null;
  campaign_id: string | null;
  leads: number;
  qualificados: number;
  agendamentos: number;
  visitas: number;
  ganhos: number;
  pct_qualif: number;
  pct_qualif_agend: number;
  pct_agend_visit: number;
  pct_ganho: number;
  progression_score: number;
  gasto_brl: number;
  impressoes: number;
  cliques: number;
  custo_por_visita_brl: number | null;
  custo_por_agend_brl: number | null;
}

export type Estagio =
  | "leads"
  | "aguardando_retorno"
  | "qualificados"
  | "agendamentos"
  | "transferidos"
  | "visitas_confirmadas"
  | "visitas"
  | "negociacoes"
  | "propostas"
  | "ganhos";
