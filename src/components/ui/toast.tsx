"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { X } from "lucide-react";

type Toast = {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "success" | "error";
  duration?: number;
};

type ToastContextValue = {
  show: (t: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((t: Omit<Toast, "id">) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const toast: Toast = { id, duration: 3000, ...t };
    setToasts((s) => [toast, ...s]);
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((s) => s.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), toast.duration || 3000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  const bg = toast.variant === "success" ? "bg-green-600" : toast.variant === "error" ? "bg-destructive" : "bg-card";
  const fg = toast.variant ? "text-white" : "text-white";

  return (
    <div className={`max-w-sm w-full ${bg} ${fg} rounded-lg shadow-lg p-3 pr-2 transform transition-all duration-200 animate-in slide-in-from-bottom-2`}>
      <div className="flex items-start gap-3">
        <div className="flex-1">
          {toast.title && <div className="font-semibold">{toast.title}</div>}
          {toast.description && <div className="text-sm opacity-90">{toast.description}</div>}
        </div>
        <button onClick={onClose} className="ml-2 opacity-80 hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export default ToastProvider;
