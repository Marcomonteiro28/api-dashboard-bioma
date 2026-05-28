export const fmtNum = (v: number | null | undefined): string =>
  v == null ? "—" : Math.round(v).toLocaleString("pt-BR");

export const fmtBRL = (v: number | null | undefined): string =>
  v == null ? "—" : "R$ " + Math.round(v).toLocaleString("pt-BR");

export const fmtPct = (v: number | null | undefined): string =>
  v == null ? "—" : v.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%";

export function delta(cur: number, prev: number): number | null {
  if (!prev || prev === 0) return null;
  return ((cur - prev) / prev) * 100;
}

export function getRangeDays(range: string): number {
  return ({ "7d": 7, "30d": 30, "90d": 90, "365d": 365 } as Record<string, number>)[range] || 30;
}

export function getCurrentRangeDates(
  range: string,
  customFrom: string | null,
  customTo: string | null
): { from: string; to: string } {
  if (range === "custom" && customFrom && customTo) return { from: customFrom, to: customTo };
  const days = getRangeDays(range);
  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - days);
  return {
    from: cutoff.toISOString().slice(0, 10),
    to: today.toISOString().slice(0, 10),
  };
}

export function getPreviousRangeDates(from: string, to: string): { from: string; to: string } {
  const fromD = new Date(from);
  const toD = new Date(to);
  const rangeMs = toD.getTime() - fromD.getTime();
  const prevTo = new Date(fromD.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - rangeMs);
  return {
    from: prevFrom.toISOString().slice(0, 10),
    to: prevTo.toISOString().slice(0, 10),
  };
}
