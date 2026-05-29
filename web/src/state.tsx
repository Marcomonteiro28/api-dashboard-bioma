import { createContext, useContext, useReducer, type ReactNode, type Dispatch } from "react";
import type { RangeKey } from "./types";

export interface AppState {
  range: RangeKey;
  customFrom: string | null;
  customTo: string | null;
  allEmps: string[];
  selectedEmps: string[];
  selectedStatus: number[];
  allSubOrigens: string[];
  selectedSubOrigens: string[];
}

export type AppAction =
  | { type: "SET_RANGE"; range: RangeKey }
  | { type: "SET_CUSTOM"; from: string; to: string }
  | { type: "SET_ALL_EMPS"; emps: string[] }
  | { type: "TOGGLE_EMP"; emp: string }
  | { type: "SET_EMPS"; emps: string[] }
  | { type: "TOGGLE_STATUS"; status: number }
  | { type: "SET_STATUS"; status: number[] }
  | { type: "SET_ALL_SUB_ORIGENS"; subOrigens: string[] }
  | { type: "TOGGLE_SUB_ORIGEM"; subOrigem: string }
  | { type: "SET_SUB_ORIGENS"; subOrigens: string[] };

export const initialState: AppState = {
  range: "30d",
  customFrom: null,
  customTo: null,
  allEmps: [],
  selectedEmps: [],
  selectedStatus: [0, 1, 2],
  allSubOrigens: [],
  selectedSubOrigens: [],
};

export function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_RANGE":
      return { ...state, range: action.range, customFrom: null, customTo: null };
    case "SET_CUSTOM":
      return { ...state, range: "custom", customFrom: action.from, customTo: action.to };
    case "SET_ALL_EMPS":
      return { ...state, allEmps: action.emps, selectedEmps: [...action.emps] };
    case "TOGGLE_EMP":
      return {
        ...state,
        selectedEmps: state.selectedEmps.includes(action.emp)
          ? state.selectedEmps.filter((e) => e !== action.emp)
          : [...state.selectedEmps, action.emp],
      };
    case "SET_EMPS":
      return { ...state, selectedEmps: action.emps };
    case "TOGGLE_STATUS":
      if (state.selectedStatus.includes(action.status)) {
        if (state.selectedStatus.length === 1) return state;
        return { ...state, selectedStatus: state.selectedStatus.filter((s) => s !== action.status) };
      }
      return { ...state, selectedStatus: [...state.selectedStatus, action.status] };
    case "SET_STATUS":
      return { ...state, selectedStatus: action.status };
    case "SET_ALL_SUB_ORIGENS":
      return { ...state, allSubOrigens: action.subOrigens, selectedSubOrigens: [...action.subOrigens] };
    case "TOGGLE_SUB_ORIGEM":
      return {
        ...state,
        selectedSubOrigens: state.selectedSubOrigens.includes(action.subOrigem)
          ? state.selectedSubOrigens.filter((s) => s !== action.subOrigem)
          : [...state.selectedSubOrigens, action.subOrigem],
      };
    case "SET_SUB_ORIGENS":
      return { ...state, selectedSubOrigens: action.subOrigens };
    default:
      return state;
  }
}

const StateCtx = createContext<AppState | null>(null);
const DispatchCtx = createContext<Dispatch<AppAction> | null>(null);

export function StateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <StateCtx.Provider value={state}>
      <DispatchCtx.Provider value={dispatch}>{children}</DispatchCtx.Provider>
    </StateCtx.Provider>
  );
}

export function useAppState(): AppState {
  const ctx = useContext(StateCtx);
  if (!ctx) throw new Error("useAppState fora do StateProvider");
  return ctx;
}

export function useAppDispatch(): Dispatch<AppAction> {
  const ctx = useContext(DispatchCtx);
  if (!ctx) throw new Error("useAppDispatch fora do StateProvider");
  return ctx;
}
