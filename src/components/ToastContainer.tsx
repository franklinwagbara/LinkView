"use client";

import React, { memo, useEffect } from "react";
import { useUIStore, Toast } from "@/stores/ui-store";
import { cn } from "@/lib/utils";
import { X, Info, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

const icons: Record<Toast["type"], React.ReactNode> = {
  info: <Info className="w-4 h-4 text-blue-400" />,
  success: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-400" />,
  error: <XCircle className="w-4 h-4 text-red-400" />,
};

const bgColors: Record<Toast["type"], string> = {
  info: "bg-blue-500/10 border-blue-500/30",
  success: "bg-emerald-500/10 border-emerald-500/30",
  warning: "bg-amber-500/10 border-amber-500/30",
  error: "bg-red-500/10 border-red-500/30",
};

export const ToastContainer = memo(function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
      ))}
    </div>
  );
});

const ToastItem = memo(function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    if (toast.duration) {
      const timer = setTimeout(() => {
        onDismiss(toast.id);
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-xl animate-slide-up",
        bgColors[toast.type],
      )}
    >
      <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>
      <p className="text-sm text-slate-200 flex-1">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 text-slate-500 hover:text-slate-300 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
});
