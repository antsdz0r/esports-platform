import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./contexts/auth/AuthContext";
import App from "./App";
import { TracingCursor } from "./components/ui/TracingCursor";
import { ConfirmProvider } from "./components/ui/ConfirmDialog";
import "./index.css";

const savedTheme = localStorage.getItem("theme") === "light" ? "light" : "dark";
document.documentElement.setAttribute("data-theme", savedTheme);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ConfirmProvider>
          <TracingCursor />
          <App />
        </ConfirmProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
