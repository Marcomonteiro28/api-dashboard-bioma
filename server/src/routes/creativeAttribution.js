import { Router } from "express";
import { runQuery, cached } from "../bq.js";
import { makeCacheKey } from "../lib/cacheKey.js";
import { parseDateRange, parseEmpsFilter } from "../lib/parseFilters.js";
import { buildCreativeAttributionQuery } from "../queries/creativeAttribution.js";

export const creativeAttributionRouter = Router();

creativeAttributionRouter.get("/api/attribution-creative", async (req, res, next) => {
  try {
    const { from, to } = parseDateRange(req, 365);
    const emps = parseEmpsFilter(req);
    const key = makeCacheKey("attrib_creative", { from, to, emps });
    const data = await cached(key, async () => {
      const { sql, params, types } = buildCreativeAttributionQuery({ from, to, emps });
      return runQuery(sql, params, types);
    });
    res.json({ data, meta: { from, to, count: data.length } });
  } catch (err) {
    next(err);
  }
});
