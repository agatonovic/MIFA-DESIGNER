import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MifaDesigner } from "../src/mifa-designer";
import "./app.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MifaDesigner />
  </StrictMode>,
);
