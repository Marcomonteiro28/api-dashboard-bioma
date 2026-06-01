/**
 * Converte array de objetos em CSV e dispara download no navegador.
 * Usa BOM UTF-8 pra Excel abrir com acentos corretamente.
 */

type CsvValue = string | number | boolean | null | undefined;

export interface CsvColumn<T> {
  /** Chave no objeto */
  key: keyof T | string;
  /** Header no CSV (default = key) */
  label?: string;
  /** Transformacao customizada (ex: format numero, mapeia enum) */
  format?: (value: unknown, row: T) => CsvValue;
}

function escapeCell(v: CsvValue): string {
  if (v == null) return "";
  const s = String(v);
  // Se contem virgula, aspas, quebra de linha ou ponto e virgula -> escapa com aspas
  if (/[",;\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function arrayToCsv<T>(
  rows: T[],
  columns?: CsvColumn<T>[]
): string {
  if (rows.length === 0) return "";

  const cols: CsvColumn<T>[] =
    columns ||
    Object.keys(rows[0] as object).map((k) => ({ key: k as keyof T }));

  const header = cols.map((c) => escapeCell(c.label || String(c.key))).join(";");
  const body = rows
    .map((row) =>
      cols
        .map((c) => {
          const raw = (row as Record<string, unknown>)[String(c.key)];
          const value = c.format ? c.format(raw, row) : (raw as CsvValue);
          return escapeCell(value);
        })
        .join(";")
    )
    .join("\n");

  return header + "\n" + body;
}

export function downloadCsv<T>(
  rows: T[],
  filenameBase: string,
  columns?: CsvColumn<T>[]
): void {
  if (rows.length === 0) {
    alert("Nada pra exportar nessa tabela.");
    return;
  }

  const csv = arrayToCsv(rows, columns);
  // BOM UTF-8 ajuda o Excel a detectar encoding e mostrar acentos certos
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const filename = `${filenameBase}-${date}.csv`;

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Libera memoria
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
