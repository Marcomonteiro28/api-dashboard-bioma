import { randomUUID } from "node:crypto";

export function requestLogger(req, res, next) {
  const requestId = randomUUID();
  const start = Date.now();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  res.on("finish", () => {
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      kind: "http",
      requestId,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - start,
    }));
  });
  next();
}
