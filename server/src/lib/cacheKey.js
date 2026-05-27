function normalize(v) {
  if (v == null) return "all";
  if (Array.isArray(v)) return [...v].sort().join(",") || "all";
  return String(v);
}

export function makeCacheKey(prefix, parts) {
  const segs = Object.keys(parts)
    .sort()
    .map((k) => k + "=" + normalize(parts[k]));
  return prefix + ":" + segs.join("|");
}
