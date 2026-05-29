const MAX_EMPS = 50;
const MAX_EMP_LEN = 120;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_STATUS = new Set([0, 1, 2]);

const httpError = (message, statusCode = 400) => {
  const e = new Error(message);
  e.statusCode = statusCode;
  return e;
};

export function parseDateRange(req, defaultDays = 90) {
  const to = req.query.to || new Date().toISOString().slice(0, 10);
  const fromDefault = (() => {
    const d = new Date(to);
    d.setDate(d.getDate() - defaultDays);
    return d.toISOString().slice(0, 10);
  })();
  const from = req.query.from || fromDefault;
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
    throw httpError("Datas devem estar no formato YYYY-MM-DD");
  }
  if (from > to) {
    throw httpError("Data 'from' não pode ser maior que 'to'");
  }
  return { from, to };
}

export function parseEmpsFilter(req) {
  if (!req.query.empreendimentos) return null;
  const arr = req.query.empreendimentos
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (arr.length === 0) return null;
  if (arr.length > MAX_EMPS) {
    throw httpError(`Máximo ${MAX_EMPS} empreendimentos por requisição`);
  }
  for (const e of arr) {
    if (e.length > MAX_EMP_LEN) {
      throw httpError("Empreendimento com nome inválido (muito longo)");
    }
  }
  return arr;
}

export function parseSubOrigensFilter(req) {
  if (!req.query.sub_origens) return null;
  const arr = req.query.sub_origens
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (arr.length === 0) return null;
  if (arr.length > 30) {
    throw httpError("Máximo 30 sub-origens por requisição");
  }
  for (const e of arr) {
    if (e.length > 100) {
      throw httpError("Sub-origem com valor inválido (muito longo)");
    }
  }
  return arr;
}

export function parseStatusFilter(req) {
  if (!req.query.status) return null;
  const valid = req.query.status
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((s) => VALID_STATUS.has(s));
  return valid.length > 0 ? valid : null;
}

export function parseLimit(req, defaultLimit = 1000, maxLimit = 5000) {
  const raw = parseInt(req.query.limit || String(defaultLimit), 10);
  if (Number.isNaN(raw)) return defaultLimit;
  return Math.min(Math.max(raw, 1), maxLimit);
}
