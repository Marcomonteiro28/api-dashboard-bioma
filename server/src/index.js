import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { requestLogger } from "./middleware/logger.js";
import { rateLimit } from "./middleware/rateLimit.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { healthRouter } from "./routes/health.js";
import { empreendimentosRouter } from "./routes/empreendimentos.js";
import { performanceRouter } from "./routes/performance.js";
import { statusRouter } from "./routes/status.js";
import { dealsRouter } from "./routes/deals.js";
import { attributionRouter } from "./routes/attribution.js";
import { creativeAttributionRouter } from "./routes/creativeAttribution.js";
import { leadDetailRouter } from "./routes/leadDetail.js";
import { creativeFunnelRouter } from "./routes/creativeFunnel.js";
import { subOrigensRouter } from "./routes/subOrigens.js";
import { leadsWeeklyRouter } from "./routes/leadsWeekly.js";
import { jobsRouter } from "./routes/jobs.js";

const app = express();

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (config.allowedOrigins.includes("*")) return cb(null, true);
    if (config.allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`Origin ${origin} não permitido por CORS`));
  },
}));
app.use(express.json());
app.use(requestLogger);
app.use(rateLimit({ windowMs: config.rateLimitWindowMs, max: config.rateLimitMax }));

app.use(healthRouter);
app.use(empreendimentosRouter);
app.use(performanceRouter);
app.use(statusRouter);
app.use(dealsRouter);
app.use(attributionRouter);
app.use(creativeAttributionRouter);
app.use(leadDetailRouter);
app.use(creativeFunnelRouter);
app.use(subOrigensRouter);
app.use(leadsWeeklyRouter);
app.use(jobsRouter);

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    kind: "boot",
    port: config.port,
    project: config.project,
    dataset: config.dataset,
    location: config.location,
    allowedOrigins: config.allowedOrigins,
  }));
  console.log(`API rodando em http://localhost:${config.port}`);
});
