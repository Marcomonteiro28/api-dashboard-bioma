import { downloadCsv, type CsvColumn } from "../utils/csvExport";

interface Props<T> {
  rows: T[];
  filename: string;
  columns?: CsvColumn<T>[];
  label?: string;
}

/**
 * Botao pequeno pra exportar uma tabela em CSV (Excel compativel).
 * Coloca no canto superior direito do card geralmente.
 */
export function ExportButton<T>({
  rows,
  filename,
  columns,
  label = "Exportar CSV",
}: Props<T>) {
  return (
    <button
      className="export-btn"
      onClick={() => downloadCsv(rows, filename, columns)}
      title={`Baixar ${rows.length} linhas em CSV`}
      disabled={rows.length === 0}
    >
      📥 {label}{" "}
      <span style={{ opacity: 0.6, fontSize: 11 }}>({rows.length})</span>
    </button>
  );
}
