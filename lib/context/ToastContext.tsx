"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

const TOAST_CONFIG: Record<ToastType, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  success: { icon: CheckCircle, color: "#22C55E", bg: "#0d1f13", border: "#22C55E40" },
  error:   { icon: XCircle,     color: "#f87171", bg: "#1f0d0d", border: "#ef444440" },
  info:    { icon: Info,        color: "#60a5fa", bg: "#0d1423", border: "#3b82f640" },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const cfg = TOAST_CONFIG[toast.type];
  const Icon = cfg.icon;

  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 3500);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "12px 16px",
        borderRadius: 12,
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        minWidth: 260,
        maxWidth: 360,
        animation: "ms-toast-in 0.2s ease-out both",
        pointerEvents: "auto",
      }}
    >
      <Icon style={{ color: cfg.color, width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
      <span style={{ flex: 1, color: "#f1f5f9", fontSize: 13, lineHeight: 1.5 }}>{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 0, flexShrink: 0 }}
      >
        <X style={{ width: 14, height: 14 }} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  // Inject keyframe once into <head> so it's always available
  useEffect(() => {
    setMounted(true);
    if (document.getElementById("ms-toast-style")) return;
    const el = document.createElement("style");
    el.id = "ms-toast-style";
    el.textContent = `
      @keyframes ms-toast-in {
        from { opacity: 0; transform: translateY(-6px); }
        to   { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(el);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {mounted && createPortal(
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 999999,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            pointerEvents: "none",
          }}
          aria-live="polite"
        >
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
