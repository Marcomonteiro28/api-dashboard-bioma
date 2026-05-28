import { useEffect, useMemo, useState } from "react";
import { useAppState, useAppDispatch } from "./state";
import { api } from "./api";
import {
  getCurrentRangeDates,
  getPreviousRangeDates,
  getRangeDays,
} from "./utils/format";
import type {
  PerformanceEmp,
  StatusRow,
  AttributionEmp,
  AttributionCreative,
  CreativeFunnelRow,
  Estagio,
  TabKey,
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

  const [bootLoading, setBootLoading] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);
  const [statusData, setStatusData] = useState<StatusRow[]>([]);
  const [perf, setPerf] = useState<PerformanceEmp[]>([]);
  const [perfPrev, setPerfPrev] = useState<PerformanceEmp[]>([]);
  const [attrib, setAttrib] = useState<AttributionEmp[]>([]);
  const [creative, setCreative] = useState<AttributionCreative[]>([]);
  const [creativeFunnel, setCreativeFunnel] = useState<CreativeFunnelRow[]>([]);
  const MIN_LEADS = 5;
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState<DealsModalProps | null>(null);
  const [leadModalId, setLeadModalId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("funil");

  // Bootstrap: empreendimentos + status atual
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [emps, st] = await Promise.all([api.empreendimentos(), api.statusAtual()]);
        if (cancelled) return;
        dispatch({ type: "SET_ALL_EMPS", emps: emps.data });
        setStatusData(st.data);
        setBootLoading(false);
      } catch (e) {
        if (cancelled) return;
        setBootError((e as Error).message);
        setBootLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

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
      const emptyFunnel = { data: [], meta: { from, to, count: 0, min_leads: MIN_LEADS } };
      const [cur, prv, attribR, creativeR, funnelR] = await Promise.all([
        safeFetch(api.performanceEmp(params), empty),
        safeFetch(api.performanceEmp(prevParams), empty),
        safeFetch(api.attributionEmp(params), empty),
        safeFetch(api.attributionCreative(params), empty),
        safeFetch(api.creativeFunnel({ ...params, min_leads: MIN_LEADS }), emptyFunnel),
      ]);
      if (cancelled) return;
      setPerf(cur.data);
      setPerfPrev(prv.data);
      setAttrib(attribR.data);
      setCreative(creativeR.data);
      setCreativeFunnel(funnelR.data);
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
    state.allEmps,
  ]);

  const cur = useMemo(() => sumEmpData(perf), [perf]);
  const prev = useMemo(() => sumEmpData(perfPrev), [perfPrev]);
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
      onClose: () => setModal(null),
      onOpenLead,
    });
  };

  return (
    <div className="container">
      <Header />

      {bootLoading && <div className="loading">Carregando dados do BigQuery...</div>}

      {bootError && (
        <div className="error">
          <p>
            <strong>Não foi possível conectar à API.</strong>
          </p>
          <p>
            Confirme que o servidor está rodando em <code>http://localhost:3001</code>.
          </p>
          <p>
            No PowerShell da pasta do projeto, rode <code>npm start</code> e tente de novo.
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
              <div className="row two-col">
                <Funnel stages={funnelStages} periodLabel={periodLabel} />
                <StatusBars rows={statusData} />
              </div>
              <EmpTable rows={empRows} periodLabel={periodLabel} onOpenCell={openModalCell} />
            </>
          )}

          {perf.length > 0 && tab === "marketing" && (
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

      <footer>
        Dashboard local · dados via <code>http://localhost:3001</code> · ambiente de validação
      </footer>

      {modal && <DealsModal {...modal} />}
      {leadModalId && (
        <LeadCreativeModal dealId={leadModalId} onClose={() => setLeadModalId(null)} />
      )}
    </div>
  );
}
