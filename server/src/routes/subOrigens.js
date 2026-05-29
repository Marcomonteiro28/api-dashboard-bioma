import { Router } from "express";
import { runQuery, cached } from "../bq.js";
import { buildSubOrigensQuery } from "../queries/subOrigens.js";
import { NULL_SUB_ORIGEM_TOKEN } from "../queries/performance.js";

export const subOrigensRouter = Router();

subOrigensRouter.get("/api/sub-origens", async (_req, res, next) => {
  try {
    const data = await cached("sub_origens:list_v2", async () => {
      const { sql } = buildSubOrigensQuery();
      const rows = await runQuery(sql);
      const concretos = rows.map((r) => r.sub_origem);
      // Token sintetico no topo representa deals SEM sub_origem preenchida
      // (a maior parte dos leads digitais cai aqui)
      return [NULL_SUB_ORIGEM_TOKEN, ...concretos];
    });
    res.json({ data });
  } catch (err) {
    next(err);
  }
});
