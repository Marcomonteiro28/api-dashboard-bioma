import { Router } from "express";
import { runQuery, cached } from "../bq.js";
import { buildSubOrigensQuery } from "../queries/subOrigens.js";

export const subOrigensRouter = Router();

subOrigensRouter.get("/api/sub-origens", async (_req, res, next) => {
  try {
    const data = await cached("sub_origens:list", async () => {
      const { sql } = buildSubOrigensQuery();
      const rows = await runQuery(sql);
      return rows.map((r) => r.sub_origem);
    });
    res.json({ data });
  } catch (err) {
    next(err);
  }
});
