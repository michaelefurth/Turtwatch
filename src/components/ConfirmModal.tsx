import { useEffect, useRef, type ReactNode } from "react";
import { motion } from "framer-motion";
import { PillButton } from "./common";

interface Props {
  open: boolean;
  title: string;
  emoji?: string;
  children?: ReactNode;
  confirmLabel?: string;
  confirmDisabled?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export function ConfirmModal({
  open, title, emoji, children, confirmLabel = "Confirm", confirmDisabled, busy, onConfirm, onCancel, danger,
}: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // move focus into the dialog
    const focusables = () =>
      Array.from(sheetRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])") ?? []);
    focusables()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
        return;
      }
      if (e.key === "Tab") {
        const items = focusables();
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="scrim" onClick={onCancel}>
      <motion.div
        ref={sheetRef}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-busy={busy || undefined}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
      >
        <div className="center" style={{ fontSize: 40 }} aria-hidden>{emoji}</div>
        <h2 className="center" id="modal-title" style={{ marginTop: 6 }}>{title}</h2>
        <div className="stack" style={{ marginTop: 6 }}>{children}</div>
        <div className="stack mt">
          <PillButton variant={danger ? "danger" : "primary"} onClick={onConfirm} disabled={confirmDisabled}>
            {confirmLabel}
          </PillButton>
          <PillButton variant="ghost" onClick={onCancel}>Maybe later</PillButton>
        </div>
      </motion.div>
    </div>
  );
}
