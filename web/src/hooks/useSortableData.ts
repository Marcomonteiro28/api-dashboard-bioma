import { useMemo, useState } from "react";

export type SortDirection = "asc" | "desc" | null;

export interface SortConfig<T> {
  key: keyof T | null;
  direction: SortDirection;
}

/**
 * Hook generico de ordenacao pra tabelas. Cicla null -> desc -> asc -> null no
 * mesmo header. Trata null/undefined consistentemente (sempre no fim).
 *
 * Uso:
 *   const { sorted, sortConfig, requestSort } = useSortableData(rows, {
 *     key: "leads", direction: "desc"
 *   });
 */
export function useSortableData<T>(
  items: T[],
  initial: SortConfig<T> = { key: null, direction: null }
) {
  const [sortConfig, setSortConfig] = useState<SortConfig<T>>(initial);

  const sorted = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return items;
    const key = sortConfig.key;
    const dir = sortConfig.direction === "asc" ? 1 : -1;
    const copy = [...items];
    copy.sort((a, b) => {
      const va = a[key];
      const vb = b[key];
      // nulls/undefined sempre no fim
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "number" && typeof vb === "number") {
        return (va - vb) * dir;
      }
      const sa = String(va).toLowerCase();
      const sb = String(vb).toLowerCase();
      if (sa < sb) return -1 * dir;
      if (sa > sb) return 1 * dir;
      return 0;
    });
    return copy;
  }, [items, sortConfig]);

  const requestSort = (key: keyof T) => {
    setSortConfig((prev) => {
      if (prev.key !== key) return { key, direction: "desc" };
      if (prev.direction === "desc") return { key, direction: "asc" };
      if (prev.direction === "asc") return { key: null, direction: null };
      return { key, direction: "desc" };
    });
  };

  return { sorted, sortConfig, requestSort };
}
