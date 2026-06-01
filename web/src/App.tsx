import { useEffect, useMemo, useState } from "react";
import { useAppState, useAppDispatch } from "./state";
import { api, authStore, AuthError } from "./api";
import { Login } from "./components/Login";
import {
  getCurrentRangeDates,
  getPreviousRangeDates,
  getRangeDays,
} from "./utils/format";
import type {
  PerformanceEmp,
  PerformanceTotals,
  StatusRow,
  AttributionEmp,
  AttributionCreative,
  CreativeFunnelRow,
  WeeklyLeadsRow,
  Estagio,
  TabKey,
  MarketingView,
  MetaCampaignRow,
  MetaByEmpRow,
  TrackingCoverageRow,
  GadsCampaignRow,
  GadsByEmpRow,
  MediaPagaByEmpRow,
  SourceBreakdownRow,
  SourceByEmpRow,
} from "./types";
import { Header } from "./components/Header";
import { Tabs } from "./components/Tabs";
import { Filters } from "./components/Filters";
import { KpiGrid } from "./components/KpiGrid";
import { Funnel } from "./components/Funnel";
import { StatusBars } from "./components/StatusBars";
import { buildPorEmp, Diagnostics } from "./components/Diagnostics";
import { EmpTable, buildEmpRows } from "./components/EmpTable";
import { AttributionEmpBlock } from "./components/AttributionEmp";
import { CreativeAttributionBlock } from "./components/CreativeAttribution";
import { CreativeFunnelDash } from "./components/CreativeFunnelDash";
import { MarketingSubTabs } from "./components/MarketingSubTabs";
import { MetaPuroView } from "./components/MetaPuroView";
import { GoogleAdsView } from "./components/GoogleAdsView";
import { MediaPagaCompletaView } from "./components/MediaPagaCompletaView";
import { SourceView } from "./components/SourceView";
import { WeeklyLeadsChart } from "./components/WeeklyLeadsChart";
import { DealsModal, type DealsModalProps } from "./components/DealsModal";
import { LeadCreativeModal } from "./components/LeadCreativeModal";

interface Sums {
  leads: number;
  aguardando_retorno: number;
  qualificados: number;
  agendamentos: number;
  transferidos: number;
  visitas_confirmadas: number;
  visitas: number;
  negociacoes: number;
  propostas: number;
  ganhos: number;
}

function mapTotals(t: PerformanceTotals): Sums {
  return {
    leads: Number(t.leads) || 0,
    aguardando_retorno: Number(t.aguardando_retorno) || 0,
    qualificados: Number(t.qualificados) || 0,
    agendamentos: Number(t.agendamentos) || 0,
    transferidos: Number(t.transferidos) || 0,
    visitas_confirmadas: Number(t.visitas_confirmadas) || 0,
    visitas: Number(t.visitas) || 0,
    negociacoes: Number(t.negociacoes) || 0,
    propostas: Number(t.propostas) || 0,
    ganhos: Number(t.ganhos) || 0,
  };
}

function sumEmpData(arr: PerformanceEmp[]): Sums {
  const acc: Sums = {
    leads: 0,
    aguardando_retorno: 0,
    qualificados: 0,
    agendamentos: 0,
    transferidos: 0,
    visitas_confirmadas: 0,
    visitas: 0,
    negociacoes: 0,
    propostas: 0,
    ganhos: 0,
  };
  for (const e of arr) {
    acc.leads += Number(e.leads) || 0;
    acc.aguardando_retorno += Number(e.aguardando_retorno) || 0;
    acc.qualificados += Number(e.qualificados) || 0;
    acc.agendamentos += Number(e.agendamentos) || 0;
    acc.transferidos += Number(e.transferidos) || 0;
    acc.visitas_confirmadas += Number(e.visitas_confirmadas) || 0;
    acc.visitas += Number(e.visitas) || 0;
    acc.negociacoes += Number(e.negociacoes) || 0;
    acc.propostas += Number(e.propostas) || 0;
    acc.ganhos += Number(e.ganhos) || 0;
  }
  return acc;
}

export function App() {
  const state = useAppState();
  const dispatch = useAppDispatch();

  const [authToken, setAuthToken] = useState<string | null>(() => authStore.get());
  const [authError, setAuthError] = useState<string | null>(null);
  const [bootLoading, setBootLoading] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);
  const [statusData, setStatusData] = useState<StatusRow[]>([]);
  const [perf, setPerf] = useState<PerformanceEmp[]>([]);
  const [perfPrev, setPerfPrev] = useState<PerformanceEmp[]>([]);
  const [totals, setTotals] = useState<PerformanceTotals | null>(null);
  const [totalsPrev, setTotalsPrev] = useState<PerformanceTotals | null>(null);
  const [attrib, setAttrib] = useState<AttributionEmp[]>([]);
  const [creative, setCreative] = useState<AttributionCreative[]>([]);
  const [creativeFunnel, setCreativeFunnel] = useState<CreativeFunnelRow[]>([]);
  const [weekly, setWeekly] = useState<WeeklyLeadsRow[]>([]);
  const MIN_LEADS = 5;
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState<DealsModalProps | null>(null);
  const [leadModalId, setLeadModalId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("funil");
  const [mkView, setMkView] = useState<MarketingView>("completa");
  const [metaCampaigns, setMetaCampaigns] = useState<MetaCampaignRow[]>([]);
  const [metaByEmp, setMetaByEmp] = useState<MetaByEmpRow[]>([]);
  const [coverage, setCoverage] = useState<TrackingCoverageRow[]>([]);
  const [gadsCampaigns, setGadsCampaigns] = useState<GadsCampaignRow[]>([]);
  const [gadsByEmp, setGadsByEmp] = useState<GadsByEmpRow[]>([]);
  const [mediaPagaByEmp, setMediaPagaByEmp] = useState<MediaPagaByEmpRow[]>([]);
  const [sourceBreakdown, setSourceBreakdown] = useState<SourceBreakdownRow[]>([]);
  const [sourceByEmp, setSourceByEmp] = useState<SourceByEmpRow[]>([]);

  // Bootstrap: empreendimentos + sub-origens + status atual
  // Disparado apenas apos auth (authToken nao-null)
  useEffect(() => {
    if (!authToken) return;
    let cancelled = false;
    setBootLoading(true);
    (async () => {
      try {
        const [emps, subs, st] = await Promise.all([
          api.empreendimentos(),
          api.subOrigens(),
          api.statusAtual(),
        ]);
        if (cancelled) return;
        dispatch({ type: "SET_ALL_EMPS", emps: emps.data });
        dispatch({ type: "SET_ALL_SUB_ORIGENS", subOrigens: subs.data });
        setStatusData(st.data);
        setBootLoading(false);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof AuthError) {
          authStore.clear();
          setAuthError(e.message);
          setAuthToken(null);
          setBootLoading(false);
          return;
        }
        setBootError((e as Error).message);
        setBootLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authToken, dispatch]);

  // Refresh dos dados que dependem dos filtros
  useEffect(() => {
    if (state.allEmps.length === 0) return;
    let cancelled = false;
    setRefreshing(true);
    const { from, to } = getCurrentRangeDates(state.range, state.customFrom, state.customTo);
    const prev = getPreviousRangeDates(from, to);
    const params = {
      from,
      to,
      empreendimentos: state.selectedEmps,
      allEmps: state.allEmps,
      status: state.selectedStatus,
      subOrigens: state.selectedSubOrigens,
      allSubOrigens: state.allSubOrigens,
    };
    const prevParams = { ...params, from: prev.from, to: prev.to };

    (async () => {
      const safeFetch = async <T,>(p: Promise<T>, fallback: T): Promise<T> => {
        try {
          return await p;
        } catch (e) {
          console.error("API fetch falhou:", e);
          return fallback;
        }
      };
      const empty = { data: [], meta: { from, to, count: 0 } };
      const emptyPerf = { data: [], meta: { from, to, count: 0, totals: null } };
      const emptyFunnel = { data: [], meta: { from, to, count: 0, min_leads: MIN_LEADS } };
      const [
        cur,
        prv,
        attribR,
        creativeR,
        funnelR,
        weeklyR,
        metaOvR,
        metaByEmpR,
        coverageR,
        gadsOvR,
        gadsByEmpR,
        mediaPagaR,
        srcBreakR,
        srcByEmpR,
      ] = await Promise.all([
        safeFetch(api.performanceEmp(params), emptyPerf),
        safeFetch(api.performanceEmp(prevParams), emptyPerf),
        safeFetch(api.attributionEmp(params), empty),
        safeFetch(api.attributionCreative(params), empty),
        safeFetch(api.creativeFunnel({ ...params, min_leads: MIN_LEADS }), emptyFunnel),
        safeFetch(api.leadsWeekly(params), empty),
        safeFetch(api.metaOverview(params), empty),
        safeFetch(api.metaByEmp(params), empty),
        safeFetch(api.trackingCoverage(params), empty),
        safeFetch(api.gadsOverview(params), empty),
        safeFetch(api.gadsByEmp(params), empty),
        safeFetch(api.mediaPagaByEmp(params), empty),
        safeFetch(api.sourceBreakdown(params), empty),
        safeFetch(api.sourceByEmp(params), empty),
      ]);
      if (cancelled) return;
      setPerf(cur.data);
      setPerfPrev(prv.data);
      setTotals(cur.meta?.totals ?? null);
      setTotalsPrev(prv.meta?.totals ?? null);
      setAttrib(attribR.data);
      setCreative(creativeR.data);
      setCreativeFunnel(funnelR.data);
      setWeekly(weeklyR.data);
      setMetaCampaigns(metaOvR.data as MetaCampaignRow[]);
      setMetaByEmp(metaByEmpR.data as MetaByEmpRow[]);
      setCoverage(coverageR.data as TrackingCoverageRow[]);
      setGadsCampaigns(gadsOvR.data as GadsCampaignRow[]);
      setGadsByEmp(gadsByEmpR.data as GadsByEmpRow[]);
      setMediaPagaByEmp(mediaPagaR.data as MediaPagaByEmpRow[]);
      setSourceBreakdown(srcBreakR.data as SourceBreakdownRow[]);
      setSourceByEmp(srcByEmpR.data as SourceByEmpRow[]);
      setRefreshing(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    state.range,
    state.customFrom,
    state.customTo,
    state.selectedEmps,
    state.selectedStatus,
    state.selectedSubOrigens,
    state.allEmps,
    state.allSubOrigens,
  ]);

  // Prefere totals (COUNT DISTINCT no nivel da janela inteira) quando disponivel.
  // Fallback pra sumEmpData (soma per empreendimento) so se o backend nao retornou totals.
  // Necessario porque stg_crm_deals tem deals com interesse em multiplos empreendimentos,
  // entao SUM per emp infla o numero (244) em relacao ao distinct real (234).
  const cur = useMemo(
    () =>
      totals
        ? { ...sumEmpData(perf), ...mapTotals(totals) }
        : sumEmpData(perf),
    [perf, totals]
  );
  const prev = useMemo(
    () =>
      totalsPrev
        ? { ...sumEmpData(perfPrev), ...mapTotals(totalsPrev) }
        : sumEmpData(perfPrev),
    [perfPrev, totalsPrev]
  );
  const porEmpDiag = useMemo(() => buildPorEmp(perf), [perf]);
  const empRows = useMemo(() => buildEmpRows(perf), [perf]);

  const { from, to } = getCurrentRangeDates(state.range, state.customFrom, state.customTo);
  const periodLabel =
    state.range === "custom"
      ? `${state.customFrom} a ${state.customTo}`
      : `${getRangeDays(state.range)} dias`;

  const funnelStages = [
    { name: "Leads (Entrada)", count: cur.leads },
    { name: "Aguardando retorno", count: cur.aguardando_retorno },
    { name: "Qualificados", count: cur.qualificados },
    { name: "Visita Agendada", count: cur.agendamentos },
    { name: "Transferido (Vendas)", count: cur.transferidos },
    { name: "Visita Confirmada", count: cur.visitas_confirmadas },
    { name: "Visita Realizada", count: cur.visitas },
    { name: "Negociação", count: cur.negociacoes },
    { name: "Proposta", count: cur.propostas },
  ];

  const onOpenLead = (dealId: string) => setLeadModalId(dealId);

  const openModalEstagio = (estagio: Estagio) => {
    setModal({
      title: estagio === "leads" ? "Todos os leads" : `Deals em ${estagio}`,
      subtitle: `${from} → ${to}`,
      from,
      to,
      empreendimentos: state.selectedEmps,
      allEmps: state.allEmps,
      status: state.selectedStatus,
      subOrigens: state.selectedSubOrigens,
      allSubOrigens: state.allSubOrigens,
      estagio: estagio !== "leads" ? estagio : undefined,
      onClose: () => setModal(null),
      onOpenLead,
    });
  };

  const openModalCell = (empreendimento: string, estagio: Estagio) => {
    setModal({
      title: `${empreendimento} — ${estagio === "leads" ? "todos os deals" : estagio}`,
      subtitle: `${from} → ${to}`,
      from,
      to,
      empreendimentos: [empreendimento],
      allEmps: state.allEmps,
      status: state.selectedStatus,
      estagio: estagio !== "leads" ? estagio : undefined,
      onClose: () => setModal(null),
      onOpenLead,
    });
  };

  const openModalFiltros = () => {
    setModal({
      title: "Todos os deals — filtros ativos",
      subtitle: `${from} → ${to}`,
      from,
      to,
      empreendimentos: state.selectedEmps,
      allEmps: state.allEmps,
      status: state.selectedStatus,
      subOrigens: state.selectedSubOrigens,
      allSubOrigens: state.allSubOrigens,
      onClose: () => setModal(null),
      onOpenLead,
    });
  };

  if (!authToken) {
    return (
      <Login
        onSuccess={(idToken) => {
          authStore.set(idToken);
          setAuthError(null);
          setAuthToken(idToken);
        }}
        initialError={authError}
      />
    );
  }

  return (
    <div className="container">
      <Header />

      {bootLoading && <div className="loading">Carregando dados do BigQuery...</div>}

      {bootError && (
        <div className="error">
          <p>
            <strong>Não foi possível carregar os dados.</strong>
          </p>
          <p>
            Verifique sua conexão e tente recarregar a página.
          </p>
          <p style={{ marginTop: 20, color: "#999" }}>Detalhe técnico: {bootError}</p>
        </div>
      )}

      {!bootLoading && !bootError && (
        <>
          <Tabs active={tab} onChange={setTab} />
          <Filters onViewData={openModalFiltros} />

          {refreshing && perf.length === 0 && (
            <div className="loading">Atualizando dados...</div>
          )}

          {perf.length > 0 && tab === "funil" && (
            <>
              <KpiGrid cur={cur} prev={prev} onOpenStage={openModalEstagio} />
              <Diagnostics porEmp={porEmpDiag} />
              <WeeklyLeadsChart data={weekly} periodLabel={periodLabel} />
              <div className="row two-col">
                <Funnel stages={funnelStages} periodLabel={periodLabel} />
                <StatusBars rows={statusData} />
              </div>
              <EmpTable rows={empRows} periodLabel={periodLabel} onOpenCell={openModalCell} />
            </>
          )}

          {perf.length > 0 && tab === "marketing" && (
            <>
              <MarketingSubTabs active={mkView} onChange={setMkView} />
              {mkView === "completa" && (
                <MediaPagaCompletaView byEmp={mediaPagaByEmp} periodLabel={periodLabel} />
              )}
              {mkView === "meta_puro" && (
                <MetaPuroView
                  campaigns={metaCampaigns}
                  byEmp={metaByEmp}
                  coverage={coverage}
                  periodLabel={periodLabel}
                />
              )}
              {mkView === "google_puro" && (
                <GoogleAdsView
                  campaigns={gadsCampaigns}
                  byEmp={gadsByEmp}
                  periodLabel={periodLabel}
                />
              )}
              {mkView === "origem" && (
                <SourceView
                  breakdown={sourceBreakdown}
                  byEmp={sourceByEmp}
                  periodLabel={periodLabel}
                />
              )}
              {mkView === "cross" && (
                <>
                  <AttributionEmpBlock data={attrib} periodLabel={periodLabel} />
                  <CreativeFunnelDash
                    data={creativeFunnel}
                    periodLabel={periodLabel}
                    minLeads={MIN_LEADS}
                  />
                  <CreativeAttributionBlock data={creative} periodLabel={periodLabel} />
                </>
              )}
            </>
          )}
        </>
      )}

      <footer>
        Bioma Dashboard · Casa Vertical · gerenciado por <code>RazConsulting</code>
      </footer>

      {modal && <DealsModal {...modal} />}
      {leadModalId && (
        <LeadCreativeModal dealId={leadModalId} onClose={() => setLeadModalId(null)} />
      )}
    </div>
  );
}
