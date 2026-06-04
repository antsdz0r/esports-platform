import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./contexts/auth/AuthContext";
import App from "./App";
import { TracingCursor } from "./components/ui/TracingCursor";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <TracingCursor />
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
