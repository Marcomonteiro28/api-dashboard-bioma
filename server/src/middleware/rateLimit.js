export function rateLimit({ windowMs, max }) {
  const buckets = new Map();

  return (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    const now = Date.now();
    let bucket = buckets.get(ip);
    if (!bucket || now - bucket.start > windowMs) {
      bucket = { start: now, count: 0 };
      buckets.set(ip, bucket);
    }
    bucket.count++;
    if (bucket.count > max) {
      res.setHeader("Retry-After", Math.ceil((bucket.start + windowMs - now) / 1000));
      return res.status(429).json({ error: "Rate limit excedido. Tente em alguns segundos." });
    }
    next();
  };
}
