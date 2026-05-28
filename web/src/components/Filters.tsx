import { useState } from "react";
import { useAppState, useAppDispatch } from "../state";
import { Dropdown, type DropdownOption } from "./Dropdown";
import type { RangeKey } from "../types";

const STATUS_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Aberto" },
  { value: 1, label: "Ganho" },
  { value: 2, label: "Perdido" },
];

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "90d", label: "90 dias" },
  { key: "365d", label: "12 meses" },
];

export function Filters({ onViewData }: { onViewData: () => void }) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const applyCustom = () => {
    if (!dateFrom || !dateTo) {
      alert("Selecione data inicial e final.");
      return;
    }
    if (dateFrom > dateTo) {
      alert("Data inicial não pode ser maior que a final.");
      return;
    }
    dispatch({ type: "SET_CUSTOM", from: dateFrom, to: dateTo });
  };

  const statusItems: DropdownOption<number>[] = STATUS_OPTIONS.map((s) => ({
    value: s.value,
    label: s.label,
    extra: <span className={`status-pill s${s.value}`} />,
  }));
  const empItems: DropdownOption<string>[] = state.allEmps.map((e) => ({ value: e, label: e }));

  const statusTrigger = (() => {
    if (state.selectedStatus.length === STATUS_OPTIONS.length)
      return (
        <>
          <span className="count">{STATUS_OPTIONS.length}</span> status
        </>
      );
    if (state.selectedStatus.length <= 2)
      return STATUS_OPTIONS.filter((s) => state.selectedStatus.includes(s.value))
        .map((s) => s.label)
        .join(", ");
    return (
      <>
        <span className="count">{state.selectedStatus.length}</span> status
      </>
    );
  })();

  const empsTrigger = (() => {
    if (state.allEmps.length === 0) return "carregando…";
    if (state.selectedEmps.length === state.allEmps.length)
      return (
        <>
          <span className="count">{state.allEmps.length}</span> empreendimentos
        </>
      );
    if (state.selectedEmps.length === 0) return <><span className="count">0</span> empreendimentos</>;
    if (state.selectedEmps.length <= 2) return state.selectedEmps.join(", ");
    return (
      <>
        <span className="count">{state.selectedEmps.length}</span> empreendimentos
      </>
    );
  })();

  return (
    <div className="filters">
      <div className="filter-group">
        <span className="filter-label">Período:</span>
        {RANGES.map((r) => (
          <button
            key={r.key}
            className={`btn-range${state.range === r.key ? " active" : ""}`}
            onClick={() => dispatch({ type: "SET_RANGE", range: r.key })}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="divider" />
      <div className="filter-group date-range-custom">
        <span className="filter-label">Custom:</span>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>até</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        <button className="btn-apply" onClick={applyCustom}>
          Aplicar
        </button>
      </div>
      <div className="divider" />
      <div className="filter-group">
        <span className="filter-label">Status:</span>
        <Dropdown
          items={statusItems}
          isSelected={(o) => state.selectedStatus.includes(o.value)}
          onToggle={(v) => dispatch({ type: "TOGGLE_STATUS", status: v })}
          onAll={() =>
            dispatch({ type: "SET_STATUS", status: STATUS_OPTIONS.map((s) => s.value) })
          }
          triggerText={statusTrigger}
        />
      </div>
      <div className="divider" />
      <div className="filter-group">
        <span className="filter-label">Empreendimentos:</span>
        <Dropdown
          items={empItems}
          isSelected={(o) => state.selectedEmps.includes(o.value)}
          onToggle={(v) => dispatch({ type: "TOGGLE_EMP", emp: v })}
          onAll={() => dispatch({ type: "SET_EMPS", emps: [...state.allEmps] })}
          onNone={() => dispatch({ type: "SET_EMPS", emps: [] })}
          triggerText={empsTrigger}
        />
      </div>
      <button className="btn-view-data" onClick={onViewData}>
        📋 Ver dados filtrados
      </button>
    </div>
  );
}
