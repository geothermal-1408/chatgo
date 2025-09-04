import { useState, useCallback } from "react";
import type { Toast } from "@/components/ui/toast";

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 15);
    const newToast: Toast = {
      id,
      duration: toast.duration ?? 5000, // Default 5 seconds
      ...toast,
    };

    setToasts((prev) => [...prev, newToast]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const toastMethods = {
    success: useCallback(
      (title: string, message?: string, action?: Toast["action"]) =>
        addToast({ type: "success", title, message, action }),
      [addToast]
    ),

    error: useCallback(
      (title: string, message?: string, action?: Toast["action"]) =>
        addToast({ type: "error", title, message, action }),
      [addToast]
    ),

    warning: useCallback(
      (title: string, message?: string, action?: Toast["action"]) =>
        addToast({ type: "warning", title, message, action }),
      [addToast]
    ),

    info: useCallback(
      (title: string, message?: string, action?: Toast["action"]) =>
        addToast({ type: "info", title, message, action }),
      [addToast]
    ),

    friendRequest: useCallback(
      (senderUsername: string, onViewRequests: () => void) =>
        addToast({
          type: "info",
          title: "Friend Request",
          message: `${senderUsername} sent you a friend request`,
          duration: 0, // Don't auto-dismiss
          action: {
            label: "View Requests",
            onClick: onViewRequests,
          },
        }),
      [addToast]
    ),
  };

  return {
    toasts,
    addToast,
    removeToast,
    toast: toastMethods,
  };
}
