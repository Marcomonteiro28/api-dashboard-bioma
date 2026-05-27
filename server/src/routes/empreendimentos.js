import { Router } from "express";
import { runQuery, cached } from "../bq.js";
import { buildEmpreendimentosQuery } from "../queries/empreendimentos.js";

export const empreendimentosRouter = Router();

empreendimentosRouter.get("/api/empreendimentos", async (_req, res, next) => {
  try {
    const data = await cached("emps:list", async () => {
      const { sql } = buildEmpreendimentosQuery();
      const rows = await runQuery(sql);
      return rows.map((r) => r.empreendimento);
    });
    res.json({ data });
  } catch (err) {
    next(err);
  }
});
