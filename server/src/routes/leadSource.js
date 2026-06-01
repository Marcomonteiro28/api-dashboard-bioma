import { Router } from "express";
import { runQuery, cached } from "../bq.js";
import { makeCacheKey } from "../lib/cacheKey.js";
import {
  parseDateRange,
  parseEmpsFilter,
  parseStatusFilter,
  parseSubOrigensFilter,
} from "../lib/parseFilters.js";
import { buildSourceBreakdownQuery, buildSourceByEmpQuery } from "../queries/leadSource.js";

export const leadSourceRouter = Router();

leadSourceRouter.get("/api/source/breakdown", async (req, res, next) => {
  try {
    const { from, to } = parseDateRange(req);
    const emps = parseEmpsFilter(req);
    const statuses = parseStatusFilter(req);
    const subOrigens = parseSubOrigensFilter(req);
    const key = makeCacheKey("source_breakdown", { from, to, emps, statuses, subOrigens });
    const data = await cached(key, async () => {
      const { sql, params, types } = buildSourceBreakdownQuery({
        from,
        to,
        emps,
        statuses,
        subOrigens,
      });
      return runQuery(sql, params, types);
    });
    res.json({ data, meta: { from, to, count: data.length } });
  } catch (err) {
    next(err);
  }
});

leadSourceRouter.get("/api/source/by-emp", async (req, res, next) => {
  try {
    const { from, to } = parseDateRange(req);
    const emps = parseEmpsFilter(req);
    const statuses = parseStatusFilter(req);
    const subOrigens = parseSubOrigensFilter(req);
    const key = makeCacheKey("source_by_emp", { from, to, emps, statuses, subOrigens });
    const data = await cached(key, async () => {
      const { sql, params, types } = buildSourceByEmpQuery({
        from,
        to,
        emps,
        statuses,
        subOrigens,
      });
      return runQuery(sql, params, types);
    });
    res.json({ data, meta: { from, to, count: data.length } });
  } catch (err) {
    next(err);
  }
});
