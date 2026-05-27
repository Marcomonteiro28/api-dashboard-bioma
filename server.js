import express from "express";
import cors from "cors";
import { BigQuery } from "@google-cloud/bigquery";
import "dotenv/config";

const PORT     = process.env.PORT || 3001;
const PROJECT  = process.env.GCP_PROJECT_ID;
const DATASET  = process.env.BQ_DATASET || "crm_marts";
const LOCATION = process.env.BQ_LOCATION || "southamerica-east1";
const ORIGIN   = process.env.ALLOWED_ORIGIN || "*";

if (!PROJECT) {
  console.error("ERRO: GCP_PROJECT_ID nao definido no .env");
  process.exit(1);
}

const TBL = (name) => "`" + PROJECT + "." + DATASET + "." + name + "`";
const bq = new BigQuery({ projectId: PROJECT });

async function runQuery(sql, params = {}) {
  try {
    const [rows] = await bq.query({ query: sql, params, location: LOCATION });
    return rows;
  } catch (err) {
    console.error("[BQ error]", err.message);
    const e = new Error("BigQuery falhou: " + err.message);
    e.statusCode = 500;
    throw e;
  }
}

const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000;

async function cached(key, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < CACHE_TTL) return hit.v;
  const v = await fn();
  cache.set(key, { v, t: Date.now() });
  return v;
}

function parseDateRange(req, defaultDays = 90) {
  const to = req.query.to || new Date().toISOString().slice(0, 10);
  const fromDefault = (() => {
    const d = new Date(to);
    d.setDate(d.getDate() - defaultDays);
    return d.toISOString().slice(0, 10);
  })();
  const from = req.query.from || fromDefault;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    const e = new Error("Datas devem estar no formato YYYY-MM-DD");
    e.statusCode = 400;
    throw e;
  }
  return { from, to };
}

function parseEmpsFilter(req) {
  if (!req.query.empreendimentos) return null;
  return req.query.empreendimentos.split(",").map(s => s.trim()).filter(Boolean);
}

function parseStatusFilter(req) {
  if (!req.query.status) return null;
  const valid = req.query.status.split(",")
    .map(s => parseInt(s.trim(), 10))
    .filter(s => [0, 1, 2].includes(s));
  return valid.length > 0 ? valid : null;
}

const app = express();
app.use(cors({ origin: ORIGIN }));
app.use(express.json());

app.use((req, _res, next) => {
  console.log("[" + new Date().toISOString() + "] " + req.method + " " + req.url);
  next();
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", project: PROJECT, dataset: DATASET });
});

app.get("/api/performance-emp", async (req, res, next) => {
  try {
    const { from, to } = parseDateRange(req);
    const emps = parseEmpsFilter(req);
    const statuses = parseStatusFilter(req);
    const key = "perfemp:" + from + ":" + to + ":" + (emps ? emps.join(",") : "all") + ":" + (statuses ? statuses.join(",") : "all");
    const data = await cached(key, async () => {
      const conds = ["DATE(deal_created_at) BETWEEN @from AND @to"];
      if (emps) conds.push("empreendimento IN UNNEST(@emps)");
      if (statuses) conds.push("deal_status IN (" + statuses.join(",") + ")");

      const sql = `
        SELECT
          empreendimento,
          COUNT(DISTINCT deal_id)        AS leads,
          COUNT(DISTINCT contact_id)     AS contatos_unicos,
          SUM(is_aguardando_retorno)     AS aguardando_retorno,
          SUM(is_qualificado)            AS qualificados,
          SUM(is_agendamento)            AS agendamentos,
          SUM(is_transferido)            AS transferidos,
          SUM(is_visita_confirmada)      AS visitas_confirmadas,
          SUM(is_visita)                 AS visitas,
          SUM(is_negociacao)             AS negociacoes,
          SUM(is_proposta)               AS propostas,
          SUM(is_ganho)                  AS ganhos,
          SUM(IF(is_ganho = 1, valor_deal, 0)) AS receita_ganha
        FROM ${TBL("stg_crm_deals")}
        WHERE ${conds.join(" AND ")}
        GROUP BY empreendimento
        ORDER BY leads DESC
      `;
      const params = { from, to };
      if (emps) params.emps = emps;
      return runQuery(sql, params);
    });
    res.json({ data, meta: { from, to, count: data.length } });
  } catch (err) { next(err); }
});

app.get("/api/status-atual", async (req, res, next) => {
  try {
    const emps = parseEmpsFilter(req);
    const key = "status:" + (emps ? emps.join(",") : "all");
    const data = await cached(key, async () => {
      const sql = `
        SELECT
          status, stage_rank, funil, pipeline,
          SUM(qtd) AS qtd
        FROM ${TBL("vw_status_atual")}
        ${emps ? "WHERE empreendimento IN UNNEST(@emps)" : ""}
        GROUP BY status, stage_rank, funil, pipeline
        ORDER BY stage_rank ASC
      `;
      const params = {};
      if (emps) params.emps = emps;
      return runQuery(sql, params);
    });
    res.json({ data });
  } catch (err) { next(err); }
});

app.get("/api/empreendimentos", async (_req, res, next) => {
  try {
    const data = await cached("emps:list", async () => {
      const sql = `
        SELECT DISTINCT empreendimento
        FROM ${TBL("stg_crm_deals")}
        WHERE empreendimento IS NOT NULL
        ORDER BY empreendimento ASC
      `;
      const rows = await runQuery(sql);
      return rows.map(r => r.empreendimento);
    });
    res.json({ data });
  } catch (err) { next(err); }
});

app.get("/api/deals", async (req, res, next) => {
  try {
    const { from, to } = parseDateRange(req);
    const emps = parseEmpsFilter(req);
    const statuses = parseStatusFilter(req);
    const estagio = (req.query.estagio || "").toLowerCase();
    const limitRaw = parseInt(req.query.limit || "1000", 10);
    const limit = Math.min(Math.max(limitRaw, 1), 5000);

    const flagMap = {
      leads: null,
      aguardando_retorno: "is_aguardando_retorno = 1",
      qualificados: "is_qualificado = 1",
      agendamentos: "is_agendamento = 1",
      transferidos: "is_transferido = 1",
      visitas_confirmadas: "is_visita_confirmada = 1",
      visitas: "is_visita = 1",
      negociacoes: "is_negociacao = 1",
      propostas: "is_proposta = 1",
      ganhos: "is_ganho = 1"
    };
    const estagioCondition = flagMap[estagio];

    const key = "deals:" + from + ":" + to + ":" + (emps ? emps.join(",") : "all") + ":" + (statuses ? statuses.join(",") : "all") + ":" + estagio + ":" + limit;
    const data = await cached(key, async () => {
      const conds = ["DATE(deal_created_at) BETWEEN @from AND @to"];
      if (emps)             conds.push("empreendimento IN UNNEST(@emps)");
      if (statuses)         conds.push("deal_status IN (" + statuses.join(",") + ")");
      if (estagioCondition) conds.push(estagioCondition);

      const sql = `
        SELECT
          CAST(deal_id AS STRING) AS deal_id,
          CAST(contact_id AS STRING) AS contact_id,
          contact_email, contact_nome, contact_phone,
          empreendimento, linha_empreendimento,
          metragem_m2, prioridade,
          origem, sub_origem, gatilho_mql, sdr_responsavel,
          valor_deal, valor_esperado,
          stage_titulo_atual, pipeline_atual, deal_status,
          FORMAT_TIMESTAMP("%Y-%m-%d", deal_created_at) AS deal_created_at,
          FORMAT_TIMESTAMP("%Y-%m-%d", dt_entrada) AS dt_entrada,
          FORMAT_TIMESTAMP("%Y-%m-%d", dt_qualificado) AS dt_qualificado,
          FORMAT_TIMESTAMP("%Y-%m-%d", dt_visita_agendada) AS dt_visita_agendada,
          FORMAT_TIMESTAMP("%Y-%m-%d", dt_visita_confirmada) AS dt_visita_confirmada,
          FORMAT_TIMESTAMP("%Y-%m-%d", dt_visita_realizada) AS dt_visita_realizada,
          FORMAT_TIMESTAMP("%Y-%m-%d", dt_negociacao) AS dt_negociacao,
          FORMAT_TIMESTAMP("%Y-%m-%d", dt_proposta) AS dt_proposta,
          FORMAT_TIMESTAMP("%Y-%m-%d", dt_fechamento) AS dt_fechamento,
          is_aguardando_retorno, is_qualificado, is_agendamento, is_transferido,
          is_visita_confirmada, is_visita, is_negociacao, is_proposta, is_ganho
        FROM ${TBL("stg_crm_deals")}
        WHERE ${conds.join(" AND ")}
        ORDER BY deal_created_at DESC, deal_id DESC
        LIMIT @limit
      `;
      const params = { from, to, limit };
      if (emps) params.emps = emps;
      return runQuery(sql, params);
    });

    res.json({ data, meta: { from, to, count: data.length, limit, estagio: estagio || "todos" } });
  } catch (err) { next(err); }
});

app.use((err, _req, res, _next) => {
  console.error("[ERROR]", err.message);
  res.status(err.statusCode || 500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log("API rodando em http://localhost:" + PORT);
  console.log("Projeto: " + PROJECT + " | Dataset: " + DATASET + " | Location: " + LOCATION);
});
