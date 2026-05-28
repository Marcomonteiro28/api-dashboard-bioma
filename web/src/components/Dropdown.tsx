import { useEffect, useRef, useState, type ReactNode } from "react";

export interface DropdownOption<T> {
  value: T;
  label: string;
  extra?: ReactNode;
}

export interface DropdownProps<T> {
  items: DropdownOption<T>[];
  isSelected: (item: DropdownOption<T>) => boolean;
  onToggle: (value: T, checked: boolean) => void;
  onAll: () => void;
  onNone?: () => void;
  triggerText: ReactNode;
}

export function Dropdown<T>({
  items,
  isSelected,
  onToggle,
  onAll,
  onNone,
  triggerText,
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [open]);

  return (
    <div className={`dropdown${open ? " open" : ""}`} ref={rootRef}>
      <button
        className="dropdown-trigger"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <span className="dropdown-trigger-text">{triggerText}</span>
        <span className="dropdown-chevron">▾</span>
      </button>
      {open && (
        <div className="dropdown-panel">
          <div className="dropdown-actions">
            <button className="dropdown-action" type="button" onClick={onAll}>
              Todos
            </button>
            {onNone && (
              <button className="dropdown-action" type="button" onClick={onNone}>
                Limpar
              </button>
            )}
          </div>
          <ul className="dropdown-options">
            {items.map((item, i) => (
              <li key={i} className="dropdown-option">
                <label>
                  <input
                    type="checkbox"
                    checked={isSelected(item)}
                    onChange={(e) => onToggle(item.value, e.target.checked)}
                  />
                  <span>{item.label}</span>
                  {item.extra}
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
