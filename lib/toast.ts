/**
 * Toast notification system for the admin dashboard.
 *
 * Usage:
 *   import { toast } from "@/lib/toast";
 *   toast.success("Post published!");
 *   toast.error("Pipeline failed");
 *   toast.info("Config saved");
 */

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

type ToastListener = (toasts: Toast[]) => void;

let toasts: Toast[] = [];
let listeners: ToastListener[] = [];
let nextId = 0;

function notify() {
  for (const listener of listeners) {
    listener([...toasts]);
  }
}

function addToast(message: string, type: ToastType, duration = 5000) {
  const id = `toast-${nextId++}`;
  toasts = [...toasts, { id, message, type, duration }];
  notify();

  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }
}

function removeToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}

export const toast = {
  success: (message: string, duration?: number) =>
    addToast(message, "success", duration),
  error: (message: string, duration?: number) =>
    addToast(message, "error", duration ?? 8000),
  info: (message: string, duration?: number) =>
    addToast(message, "info", duration),
  warning: (message: string, duration?: number) =>
    addToast(message, "warning", duration ?? 6000),
  dismiss: removeToast,
};

export function subscribe(listener: ToastListener): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export type { Toast, ToastType };
