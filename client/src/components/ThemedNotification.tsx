import React from 'react';
import { AlertTriangle, CheckCircle2, Info, X, ShieldAlert } from 'lucide-react';
import { XochatLogo, XWatermark } from './CustomerPortal';

export type NotificationType = 'collision' | 'error' | 'warning' | 'success' | 'info';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  meta?: {
    actorName?: string;
    actorUsername?: string;
    actorAvatar?: string;
    lockExpiresIn?: number;
  };
  duration?: number;
}

interface ThemedToastProps {
  notification: NotificationItem | null;
  onClose: () => void;
}

export const ThemedToast: React.FC<ThemedToastProps> = ({ notification, onClose }) => {
  if (!notification) return null;

  const isCollision = notification.type === 'collision';
  const isError = notification.type === 'error';
  const isWarning = notification.type === 'warning';
  const isSuccess = notification.type === 'success';

  const borderColor = isCollision || isError
    ? 'border-[#ef4444]'
    : isWarning
    ? 'border-[#f59e0b]'
    : isSuccess
    ? 'border-[#10b981]'
    : 'border-[#0066ff]';

  return (
    <div className="fixed top-5 right-5 z-[9999] max-w-sm w-full animate-in slide-in-from-top-3 fade-in duration-200">
      <div className={`bg-white rounded-2xl border-[1.5px] ${borderColor} shadow-xl p-3.5 flex flex-col relative overflow-hidden backdrop-blur-md`}>
        {/* Header with Xochat Logo */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <XochatLogo size="sm" />
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content Box styled in authentic Xochat card aesthetic */}
        <div className={`rounded-xl p-3 text-xs ${
          isCollision || isError
            ? 'bg-red-50/90 border border-red-200 text-red-900'
            : isWarning
            ? 'bg-amber-50/90 border border-amber-200 text-amber-900'
            : isSuccess
            ? 'bg-emerald-50/90 border border-emerald-200 text-emerald-900'
            : 'bg-blue-50/90 border border-blue-200 text-blue-900'
        }`}>
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px] mb-1">
            {isCollision || isError ? (
              <ShieldAlert className="w-3.5 h-3.5 text-red-600 shrink-0" />
            ) : isWarning ? (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            ) : isSuccess ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : (
              <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            )}
            <span>{notification.title}</span>
          </div>

          <p className="font-semibold leading-relaxed text-gray-800">
            {notification.message}
          </p>

          {/* Actor Metadata if present */}
          {notification.meta?.actorUsername && (
            <div className="mt-2 pt-2 border-t border-gray-200/60 flex items-center justify-between text-[11px]">
              <span className="font-bold text-gray-700">
                {notification.meta.actorName || `@${notification.meta.actorUsername}`}
              </span>
              <span className="bg-red-100 text-red-700 font-extrabold px-1.5 py-0.5 rounded text-[10px]">
                LOCKED
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Modal Alert for high-priority interruptions (e.g. 1-reply violation or Collision Confirmation)
export interface ThemedModalProps {
  isOpen: boolean;
  type?: NotificationType;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose?: () => void;
  children?: React.ReactNode;
}

export const ThemedModal: React.FC<ThemedModalProps> = ({
  isOpen,
  type = 'warning',
  title,
  message,
  confirmLabel = 'UNDERSTOOD',
  onConfirm,
  onClose,
  children,
}) => {
  if (!isOpen) return null;

  const isCollision = type === 'collision';
  const isError = type === 'error';
  const isSuccess = type === 'success';

  const borderColor = isCollision || isError
    ? 'border-[#ef4444]'
    : isSuccess
    ? 'border-[#10b981]'
    : 'border-[#f59e0b]';

  const buttonColor = isCollision || isError
    ? 'bg-[#ef4444] hover:bg-[#dc2626]'
    : isSuccess
    ? 'bg-[#10b981] hover:bg-[#059669]'
    : 'bg-[#0052cc] hover:bg-[#003d99]';

  return (
    <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      {/* Signature Red/Themed Border Card matching exact Figma Login & Portal Design */}
      <div className={`bg-white rounded-2xl border-[1.5px] ${borderColor} shadow-2xl max-w-md w-full p-4 flex flex-col animate-in zoom-in-95 duration-200`}>
        {/* Card Header with Xochat Logo */}
        <div className="mb-3 px-2 flex items-center justify-between">
          <div className="flex flex-col items-start">
            <XochatLogo size="sm" />
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500 font-medium pl-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>System Security</span>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 p-1 rounded-md transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Matte Slate Canvas with Authentic Faint X Watermark */}
        <div className="bg-[#9faab0] rounded-xl p-6 relative overflow-hidden flex flex-col justify-between">
          <XWatermark opacity="opacity-20" size="w-64" />

          <div className="relative z-10">
            <h2 className="text-center font-bold text-gray-900 text-sm sm:text-base uppercase tracking-wider mb-4">
              {title}
            </h2>

            {/* Inner White Card for Message Content */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200/80 text-left">
              <p className="text-xs sm:text-sm font-semibold text-gray-800 leading-relaxed">
                {message}
              </p>

              {children && <div className="mt-3">{children}</div>}
            </div>

            {/* Signature Pill Button matching Login Design */}
            <div className="mt-5">
              <button
                type="button"
                onClick={onConfirm}
                className={`w-full ${buttonColor} text-white font-extrabold text-sm py-3 px-6 rounded-full shadow-md tracking-wider uppercase transition-transform active:scale-98 cursor-pointer`}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
