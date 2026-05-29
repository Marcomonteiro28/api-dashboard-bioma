import { Router } from "express";
import { runQuery, cached } from "../bq.js";
import { config } from "../config.js";
import { buildLeadQuery, buildCreativeMatchQuery } from "../queries/leadDetail.js";

// Deriva URL do app do AC a partir do API URL (ex: https://biomainc.api-us1.com -> https://biomainc.activehosted.com)
function acAppUrl(dealId) {
  if (!config.ac?.apiUrl) return null;
  const m = config.ac.apiUrl.match(/^https?:\/\/([^.]+)\./);
  if (!m) return null;
  return `https://${m[1]}.activehosted.com/app/deals/${dealId}`;
}

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

    res.json({ ...result, ac_deal_url: acAppUrl(dealId) });
  } catch (err) {
    next(err);
  }
});
