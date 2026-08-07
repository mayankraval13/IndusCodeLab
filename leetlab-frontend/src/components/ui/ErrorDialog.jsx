import { X } from "lucide-react";

/**
 * Modal-style error window for longer API messages (e.g. Judge0 create failures).
 * Stays open until the user clicks the close (X) button or the backdrop.
 */
export default function ErrorDialog({
  open,
  title = "Error",
  message,
  onClose,
}) {
  if (!open || !message) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="error-dialog-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label="Dismiss error"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-xl border border-ll-border bg-ll-surface shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-ll-border shrink-0">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-ll-error font-semibold mb-0.5">
              Failed
            </p>
            <h2
              id="error-dialog-title"
              className="text-sm font-semibold text-ll-text"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-ll-muted hover:text-ll-text hover:bg-ll-surface-2 transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-4 flex-1 min-h-0">
          <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-ll-text/90 bg-ll-bg border border-ll-border rounded-lg p-3">
            {message}
          </pre>
        </div>
        <div className="px-4 py-3 border-t border-ll-border flex justify-end shrink-0">
          <button type="button" onClick={onClose} className="ll-btn-ghost">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
