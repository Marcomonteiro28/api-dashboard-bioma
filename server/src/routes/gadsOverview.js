import { Router } from "express";
import { runQuery, cached } from "../bq.js";
import { makeCacheKey } from "../lib/cacheKey.js";
import { parseDateRange, parseEmpsFilter } from "../lib/parseFilters.js";
import {
  buildGadsOverviewQuery,
  buildGadsByEmpQuery,
  buildMediaPagaByEmpQuery,
} from "../queries/gadsOverview.js";

export const gadsOverviewRouter = Router();

/**
 * Helper que executa query Google Ads e retorna [] se a tabela ainda não existe
 * (caso comum antes da primeira sync). Loga warning mas não quebra a UI.
 */
async function safeGadsQuery(builderFn, args) {
  try {
    const { sql, params, types } = builderFn(args);
    return await runQuery(sql, params, types);
  } catch (err) {
    const msg = err.message || "";
    if (msg.includes("not found") || msg.includes("Not found") || msg.includes("does not exist")) {
      console.warn(JSON.stringify({
        ts: new Date().toISOString(),
        kind: "gads.table_missing",
        message: "Tabela/view gads_* ainda não foi criada — rode npm run sync:gads",
      }));
      return [];
    }
    throw err;
  }
}

gadsOverviewRouter.get("/api/gads/overview", async (req, res, next) => {
  try {
    const { from, to } = parseDateRange(req);
    const emps = parseEmpsFilter(req);
    const key = makeCacheKey("gads_overview", { from, to, emps });
    const data = await cached(key, () =>
      safeGadsQuery(buildGadsOverviewQuery, { from, to, emps })
    );
    res.json({ data, meta: { from, to, count: data.length } });
  } catch (err) {
    next(err);
  }
});

gadsOverviewRouter.get("/api/gads/by-emp", async (req, res, next) => {
  try {
    const { from, to } = parseDateRange(req);
    const emps = parseEmpsFilter(req);
    const key = makeCacheKey("gads_by_emp", { from, to, emps });
    const data = await cached(key, () =>
      safeGadsQuery(buildGadsByEmpQuery, { from, to, emps })
    );
    res.json({ data, meta: { from, to, count: data.length } });
  } catch (err) {
    next(err);
  }
});

/**
 * Visão UNIFICADA mídia paga (Meta + Google somados) por empreendimento.
 * Endpoint chave da aba "Mídia paga completa".
 */
gadsOverviewRouter.get("/api/media-paga/by-emp", async (req, res, next) => {
  try {
    const { from, to } = parseDateRange(req);
    const emps = parseEmpsFilter(req);
    const key = makeCacheKey("media_paga_by_emp", { from, to, emps });
    const data = await cached(key, () =>
      safeGadsQuery(buildMediaPagaByEmpQuery, { from, to, emps })
    );
    res.json({ data, meta: { from, to, count: data.length } });
  } catch (err) {
    next(err);
  }
});
