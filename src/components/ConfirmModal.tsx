import { useEffect, type ReactNode } from "react";
import { motion } from "framer-motion";
import { PillButton } from "./common";

interface Props {
  open: boolean;
  title: string;
  emoji?: string;
  children?: ReactNode;
  confirmLabel?: string;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export function ConfirmModal({
  open, title, emoji, children, confirmLabel = "Confirm", confirmDisabled, onConfirm, onCancel, danger,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="scrim" onClick={onCancel}>
      <motion.div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
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
