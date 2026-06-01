import type { SortConfig, SortDirection } from "../hooks/useSortableData";

interface Props<T> {
  label: string;
  sortKey: keyof T;
  config: SortConfig<T>;
  onSort: (key: keyof T) => void;
  align?: "left" | "right";
  title?: string;
}

function arrow(active: boolean, dir: SortDirection): string {
  if (!active || !dir) return "⇅";
  return dir === "asc" ? "↑" : "↓";
}

export function SortableHeader<T>({
  label,
  sortKey,
  config,
  onSort,
  align = "left",
  title,
}: Props<T>) {
  const active = config.key === sortKey;
  return (
    <th
      className={`sortable${align === "right" ? " num" : ""}${active ? " active" : ""}`}
      onClick={() => onSort(sortKey)}
      title={title || "Clique pra ordenar"}
    >
      <span className="sortable-label">{label}</span>
      <span className={`sort-arrow${active ? " active" : ""}`}>
        {arrow(active, config.direction)}
      </span>
    </th>
  );
}
