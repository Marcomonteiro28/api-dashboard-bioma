import { Router } from "express";
import { runQuery, cached } from "../bq.js";
import { buildStatusQuery } from "../queries/status.js";

export const statusRouter = Router();

statusRouter.get("/api/status-atual", async (_req, res, next) => {
  try {
    const data = await cached("status:live", async () => {
      const { sql, params, types } = buildStatusQuery();
      return runQuery(sql, params, types);
    });
    res.json({ data });
  } catch (err) {
    next(err);
  }
});
