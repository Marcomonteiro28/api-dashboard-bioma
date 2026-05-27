export function errorHandler(err, req, res, _next) {
  const status = err.statusCode || 500;
  console.error(JSON.stringify({
    ts: new Date().toISOString(),
    kind: "error",
    requestId: req.requestId,
    status,
    message: err.message,
  }));
  res.status(status).json({ error: err.message, requestId: req.requestId });
}
