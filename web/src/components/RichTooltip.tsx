import { useState, type ReactNode } from "react";

export interface TooltipRow {
  label: string;
  value: ReactNode;
  emphasis?: boolean;
  color?: string;
}

interface Props {
  title?: string;
  rows: TooltipRow[];
  children: ReactNode;
  /** Posiciona acima (default) ou abaixo do elemento alvo */
  placement?: "top" | "bottom";
  /** Classes extras pro wrap (pra mesclar com layouts existentes) */
  className?: string;
}

/**
 * Tooltip rico com multiplas linhas label-valor. Aparece quando o filho recebe
 * mouseenter. Usa posicionamento absoluto relativo ao wrap.
 */
export function RichTooltip({ title, rows, children, placement = "top", className }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`rich-tooltip-wrap${className ? ` ${className}` : ""}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}
      {open && (
        <div className={`rich-tooltip rich-tooltip-${placement}`} role="tooltip">
          {title && <div className="rich-tooltip-title">{title}</div>}
          <div className="rich-tooltip-rows">
            {rows.map((r, i) => (
              <div
                key={i}
                className={`rich-tooltip-row${r.emphasis ? " emphasis" : ""}`}
              >
                <span className="rich-tooltip-label">
                  {r.color && (
                    <span
                      className="rich-tooltip-dot"
                      style={{ background: r.color }}
                    />
                  )}
                  {r.label}
                </span>
                <span className="rich-tooltip-value">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
