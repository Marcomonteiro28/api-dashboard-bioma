import { Router } from "express";
import { runQuery, cached } from "../bq.js";
import { makeCacheKey } from "../lib/cacheKey.js";
import { parseEmpsFilter } from "../lib/parseFilters.js";
import { buildStatusQuery } from "../queries/status.js";

export const statusRouter = Router();

statusRouter.get("/api/status-atual", async (req, res, next) => {
  try {
    const emps = parseEmpsFilter(req);
    const key = makeCacheKey("status", { emps });
    const data = await cached(key, async () => {
      const { sql, params, types } = buildStatusQuery({ emps });
      return runQuery(sql, params, types);
    });
    res.json({ data });
  } catch (err) {
    next(err);
  }
});
