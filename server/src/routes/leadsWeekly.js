import { Router } from "express";
import { runQuery, cached } from "../bq.js";
import { makeCacheKey } from "../lib/cacheKey.js";
import {
  parseDateRange,
  parseEmpsFilter,
  parseStatusFilter,
  parseSubOrigensFilter,
} from "../lib/parseFilters.js";
import { buildLeadsWeeklyQuery } from "../queries/leadsWeekly.js";

export const leadsWeeklyRouter = Router();

leadsWeeklyRouter.get("/api/leads-weekly", async (req, res, next) => {
  try {
    const { from, to } = parseDateRange(req);
    const emps = parseEmpsFilter(req);
    const statuses = parseStatusFilter(req);
    const subOrigens = parseSubOrigensFilter(req);
    const key = makeCacheKey("leads_weekly", { from, to, emps, statuses, subOrigens });
    const data = await cached(key, async () => {
      const { sql, params, types } = buildLeadsWeeklyQuery({
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
