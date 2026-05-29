import { Router } from "express";
import { runQuery, cached } from "../bq.js";
import { makeCacheKey } from "../lib/cacheKey.js";
import {
  parseDateRange,
  parseEmpsFilter,
  parseStatusFilter,
  parseSubOrigensFilter,
} from "../lib/parseFilters.js";
import {
  buildPerformanceQuery,
  buildPerformanceTotalsQuery,
} from "../queries/performance.js";

export const performanceRouter = Router();

performanceRouter.get("/api/performance-emp", async (req, res, next) => {
  try {
    const { from, to } = parseDateRange(req);
    const emps = parseEmpsFilter(req);
    const statuses = parseStatusFilter(req);
    const subOrigens = parseSubOrigensFilter(req);
    const key = makeCacheKey("perfemp_v2", { from, to, emps, statuses, subOrigens });
    const result = await cached(key, async () => {
      const q1 = buildPerformanceQuery({ from, to, emps, statuses, subOrigens });
      const q2 = buildPerformanceTotalsQuery({ from, to, emps, statuses, subOrigens });
      const [data, totalsRows] = await Promise.all([
        runQuery(q1.sql, q1.params, q1.types),
        runQuery(q2.sql, q2.params, q2.types),
      ]);
      return { data, totals: totalsRows[0] || null };
    });
    res.json({
      data: result.data,
      meta: { from, to, count: result.data.length, totals: result.totals },
    });
  } catch (err) {
    next(err);
  }
});
