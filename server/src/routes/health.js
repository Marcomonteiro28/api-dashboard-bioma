import { Router } from "express";
import { pingBq } from "../bq.js";
import { config } from "../config.js";

export const healthRouter = Router();

healthRouter.get("/health", async (_req, res) => {
  const base = { project: config.project, dataset: config.dataset, location: config.location };
  try {
    await pingBq();
    res.json({ status: "ok", bq: "connected", ...base });
  } catch (err) {
    res.status(503).json({ status: "degraded", bq: "error", error: err.message, ...base });
  }
});
