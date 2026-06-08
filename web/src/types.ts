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
  fonte: string | null;
  campanha_deal: string | null;
  criativo_deal: string | null;
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
  creative_image_hash: string | null;
  creative_image_url_hd: string | null;
  creative_image_width: number | null;
  creative_image_height: number | null;
  creative_link_url: string | null;
  creative_video_id: string | null;
  creative_cta: string | null;
}

export interface OtherDealRow {
  deal_id: string;
  empreendimento: string;
  pipeline_atual: string;
  stage_titulo_atual: string;
  deal_status: number;
  deal_created_at: string;
  valor_deal: number | null;
  is_qualificado: number;
  is_visita: number;
  is_ganho: number;
  fonte: string | null;
}

export interface LeadDetailResponse {
  lead: LeadDetailLead;
  creative: LeadDetailCreative | null;
  other_deals: OtherDealRow[];
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

export type MarketingView = "completa" | "meta_puro" | "google_puro" | "origem" | "cross";

export type LeadFonte =
  | "meta"
  | "google"
  | "google_proxy"
  | "externo_placa"
  | "externo_telefone"
  | "externo_passagem";

export interface SourceBreakdownRow {
  fonte: LeadFonte;
  leads: number;
  contatos_unicos: number;
  qualificados: number;
  agendamentos: number;
  visitas: number;
  ganhos: number;
  confianca_alta: number;
  confianca_media: number;
  confianca_baixa: number;
  pct_qualif: number | null;
  pct_visita: number | null;
}

export interface SourceByEmpRow {
  empreendimento: string;
  fonte: LeadFonte;
  leads: number;
  contatos_unicos: number;
  qualificados: number;
  visitas: number;
  ganhos: number;
}

/** Linha da view "Meta puro" — campanha agregada no período sem cross com CRM */
export interface MetaCampaignRow {
  campaign_id: string;
  campaign_name: string;
  effective_status: string | null;
  objective_raw: string | null;
  empreendimento: string | null;
  objetivo_parsed: string | null;
  gasto_brl: number;
  impressoes: number;
  cliques: number;
  reach: number;
  conversoes: number | null;
  dias_ativos: number;
  primeira_data: string | null;
  ultima_data: string | null;
  cpc_brl: number | null;
  ctr_pct: number | null;
  cpm_brl: number | null;
  frequencia: number | null;
  cost_per_conv_brl: number | null;
}

/** Linha do resumo Meta por empreendimento (raw, sem cross) */
export interface MetaByEmpRow {
  empreendimento: string | null;
  campanhas_ativas: number;
  gasto_brl: number;
  impressoes: number;
  cliques: number;
  reach: number;
  conversoes: number | null;
  dias_ativos: number;
  cpc_brl: number | null;
  ctr_pct: number | null;
  cpm_brl: number | null;
  cost_per_conv_brl: number | null;
}

/** Coverage do tracking AC por empreendimento (quantos leads tem campos preenchidos) */
export interface TrackingCoverageRow {
  empreendimento: string;
  leads_total: number;
  com_criativo: number;
  com_campanha: number;
  com_sub_origem: number;
  com_utm: number;
}

/** Linha de campanha Google Ads agregada no período */
export interface GadsCampaignRow {
  campaign_id: string;
  customer_id: string;
  campaign_name: string;
  status: string | null;
  channel: string | null;
  empreendimento: string | null;
  gasto_brl: number;
  impressoes: number;
  cliques: number;
  conversoes: number;
  conversion_value_brl: number;
  dias_ativos: number;
  primeira_data: string | null;
  ultima_data: string | null;
  cpc_brl: number | null;
  ctr_pct: number | null;
  cpm_brl: number | null;
  cpa_brl: number | null;
}

/** Resumo Google Ads por empreendimento */
export interface GadsByEmpRow {
  empreendimento: string | null;
  campanhas_ativas: number;
  gasto_brl: number;
  impressoes: number;
  cliques: number;
  conversoes: number;
  conversion_value_brl: number;
  dias_ativos: number;
  cpc_brl: number | null;
  ctr_pct: number | null;
  cpm_brl: number | null;
  cpa_brl: number | null;
}

/** Resumo unificado Meta + Google por empreendimento */
export interface MediaPagaByEmpRow {
  empreendimento: string;
  gasto_meta_brl: number;
  gasto_gads_brl: number;
  gasto_total_brl: number;
  impr_meta: number;
  impr_gads: number;
  impr_total: number;
  cliques_meta: number;
  cliques_gads: number;
  cliques_total: number;
  conv_meta: number;
  conv_gads: number;
  conv_total: number;
  cpc_total_brl: number | null;
  ctr_total_pct: number | null;
  cost_per_conv_total_brl: number | null;
}
