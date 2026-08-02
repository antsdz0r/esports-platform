import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { PgBtn } from "./UI";

export interface ConfirmOptions {
  title?: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  /** "danger" za destruktivne akcije (briši), "primary" za ostalo. */
  variant?: "danger" | "primary" | "cyan";
  icon?: string;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Globalni stilizovani confirm dijalog (zamena za window.confirm).
 * Koristi: const confirm = useConfirm(); if (await confirm({ message: "..." })) { ... }
 */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm mora biti unutar <ConfirmProvider>");
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    setOpts(options);
    return new Promise<boolean>((resolve) => { resolver.current = resolve; });
  }, []);

  const close = useCallback((result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setOpts(null);
  }, []);

  const variant = opts?.variant ?? "primary";
  const accent = variant === "danger" ? "var(--pink)" : variant === "cyan" ? "var(--cyan)" : "var(--violet)";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {createPortal(
        <AnimatePresence>
          {opts && (
            <motion.div
              key="confirm-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => close(false)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.74)", backdropFilter: "blur(6px)", zIndex: 100000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 10 }}
                transition={{ type: "spring", stiffness: 360, damping: 28 }}
                onClick={(e) => e.stopPropagation()}
                className="pg-glass"
                style={{ width: "100%", maxWidth: 380, borderRadius: 16, padding: 28, border: `1px solid ${accent}55`, textAlign: "center", boxShadow: `0 0 50px ${accent}22` }}
              >
                <p style={{ fontSize: 30, marginBottom: 12 }}>{opts.icon ?? (variant === "danger" ? "⚠️" : "❓")}</p>
                {opts.title && (
                  <p style={{ fontFamily: "var(--font-head)", fontSize: 17, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>{opts.title}</p>
                )}
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--text-muted)", marginBottom: 24, lineHeight: 1.55 }}>{opts.message}</div>
                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                  <PgBtn variant="ghost" size="sm" onClick={() => close(false)}>{opts.cancelText ?? "Cancel"}</PgBtn>
                  <PgBtn variant={variant === "cyan" ? "cyan" : variant === "danger" ? "danger" : "primary"} size="sm" onClick={() => close(true)}>
                    {opts.confirmText ?? "Confirm"}
                  </PgBtn>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </ConfirmContext.Provider>
  );
}
