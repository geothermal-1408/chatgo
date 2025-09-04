import { useState, useEffect } from "react";
import { X, Check, AlertCircle, Info, AlertTriangle } from "lucide-react";

export interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

export function ToastComponent({ toast, onRemove }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        handleRemove();
      }, toast.duration);

      return () => clearTimeout(timer);
    }
  }, [toast.duration]);

  const handleRemove = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return <Check className="w-5 h-5 text-green-400" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case "info":
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case "success":
        return "border-green-500/30";
      case "error":
        return "border-red-500/30";
      case "warning":
        return "border-yellow-500/30";
      case "info":
        return "border-blue-500/30";
    }
  };

  const getBgColor = () => {
    switch (toast.type) {
      case "success":
        return "bg-green-900/20 backdrop-blur-md";
      case "error":
        return "bg-red-900/20 backdrop-blur-md";
      case "warning":
        return "bg-yellow-900/20 backdrop-blur-md";
      case "info":
        return "bg-blue-900/20 backdrop-blur-md";
    }
  };

  return (
    <div
      className={`
        flex items-start space-x-3 p-4 rounded-lg border transition-all duration-300 min-w-80 max-w-md
        ${getBgColor()} ${getBorderColor()}
        ${
          isExiting
            ? "opacity-0 transform translate-x-full"
            : "opacity-100 transform translate-x-0"
        }
      `}
    >
      <div className="flex-shrink-0">{getIcon()}</div>

      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-white">{toast.title}</h4>
        {toast.message && (
          <p className="text-sm text-gray-300 mt-1">{toast.message}</p>
        )}
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="mt-2 text-sm text-blue-400 hover:text-blue-300 font-medium"
          >
            {toast.action.label}
          </button>
        )}
      </div>

      <button
        onClick={handleRemove}
        className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: Toast[];
  onRemove: (id: string) => void;
}) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <ToastComponent key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}
