import { Router } from "express";
import { runQuery, cached } from "../bq.js";
import { buildLeadQuery, buildCreativeMatchQuery } from "../queries/leadDetail.js";

export const leadDetailRouter = Router();

leadDetailRouter.get("/api/leads/:dealId", async (req, res, next) => {
  try {
    const dealId = String(req.params.dealId).replace(/[^0-9]/g, "");
    if (!dealId) {
      const e = new Error("deal_id inválido");
      e.statusCode = 400;
      throw e;
    }

    const key = "leadDetail:" + dealId;
    const result = await cached(key, async () => {
      const leadQ = buildLeadQuery({ dealId });
      const matchQ = buildCreativeMatchQuery({ dealId });
      const [leadRows, matchRows] = await Promise.all([
        runQuery(leadQ.sql, leadQ.params, leadQ.types),
        runQuery(matchQ.sql, matchQ.params, matchQ.types),
      ]);
      return {
        lead: leadRows[0] || null,
        creative: matchRows[0] || null,
      };
    });

    if (!result.lead) {
      const e = new Error("Lead não encontrado");
      e.statusCode = 404;
      throw e;
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});
