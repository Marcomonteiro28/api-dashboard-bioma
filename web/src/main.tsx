import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { StateProvider } from "./state";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StateProvider>
      <App />
    </StateProvider>
  </StrictMode>
);
