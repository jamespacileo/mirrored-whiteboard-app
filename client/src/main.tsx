import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css"; // Keep existing global styles (or modify later)
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
