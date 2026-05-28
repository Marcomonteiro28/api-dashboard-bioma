import { Router } from "express";
import { runQuery, cached } from "../bq.js";
import { makeCacheKey } from "../lib/cacheKey.js";
import { parseDateRange, parseEmpsFilter } from "../lib/parseFilters.js";
import { buildCreativeFunnelQuery } from "../queries/creativeFunnel.js";

export const creativeFunnelRouter = Router();

creativeFunnelRouter.get("/api/creative-funnel", async (req, res, next) => {
  try {
    const { from, to } = parseDateRange(req, 365);
    const emps = parseEmpsFilter(req);
    const minLeads = Math.max(1, Math.min(50, parseInt(req.query.min_leads || "5", 10) || 5));
    const key = makeCacheKey("creative_funnel", { from, to, emps, minLeads });
    const data = await cached(key, async () => {
      const { sql, params, types } = buildCreativeFunnelQuery({ from, to, emps, minLeads });
      return runQuery(sql, params, types);
    });
    res.json({ data, meta: { from, to, count: data.length, min_leads: minLeads } });
  } catch (err) {
    next(err);
  }
});
