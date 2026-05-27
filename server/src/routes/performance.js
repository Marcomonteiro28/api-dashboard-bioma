import { Router } from "express";
import { runQuery, cached } from "../bq.js";
import { makeCacheKey } from "../lib/cacheKey.js";
import { parseDateRange, parseEmpsFilter, parseStatusFilter } from "../lib/parseFilters.js";
import { buildPerformanceQuery } from "../queries/performance.js";

export const performanceRouter = Router();

performanceRouter.get("/api/performance-emp", async (req, res, next) => {
  try {
    const { from, to } = parseDateRange(req);
    const emps = parseEmpsFilter(req);
    const statuses = parseStatusFilter(req);
    const key = makeCacheKey("perfemp", { from, to, emps, statuses });
    const data = await cached(key, async () => {
      const { sql, params, types } = buildPerformanceQuery({ from, to, emps, statuses });
      return runQuery(sql, params, types);
    });
    res.json({ data, meta: { from, to, count: data.length } });
  } catch (err) {
    next(err);
  }
});
