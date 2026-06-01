import { Router } from "express";
import { runQuery, cached } from "../bq.js";
import { makeCacheKey } from "../lib/cacheKey.js";
import {
  parseDateRange,
  parseEmpsFilter,
  parseStatusFilter,
  parseSubOrigensFilter,
  parseLimit,
} from "../lib/parseFilters.js";
import { buildDealsQuery, isValidEstagio, isValidFonte } from "../queries/deals.js";

export const dealsRouter = Router();

dealsRouter.get("/api/deals", async (req, res, next) => {
  try {
    const { from, to } = parseDateRange(req);
    const emps = parseEmpsFilter(req);
    const statuses = parseStatusFilter(req);
    const subOrigens = parseSubOrigensFilter(req);
    const estagio = (req.query.estagio || "").toLowerCase();
    if (!isValidEstagio(estagio)) {
      const e = new Error(`Estágio inválido: ${estagio}`);
      e.statusCode = 400;
      throw e;
    }
    const fonte = (req.query.fonte || "").toLowerCase();
    if (!isValidFonte(fonte)) {
      const e = new Error(`Fonte inválida: ${fonte}`);
      e.statusCode = 400;
      throw e;
    }
    const limit = parseLimit(req, 1000, 5000);

    const key = makeCacheKey("deals", {
      from,
      to,
      emps,
      statuses,
      estagio,
      fonte,
      limit,
      subOrigens,
    });
    const data = await cached(key, async () => {
      const { sql, params, types } = buildDealsQuery({
        from,
        to,
        emps,
        statuses,
        subOrigens,
        estagio,
        fonte: fonte || undefined,
        limit,
      });
      return runQuery(sql, params, types);
    });

    res.json({
      data,
      meta: {
        from,
        to,
        count: data.length,
        limit,
        estagio: estagio || "todos",
        fonte: fonte || "todas",
      },
    });
  } catch (err) {
    next(err);
  }
});
