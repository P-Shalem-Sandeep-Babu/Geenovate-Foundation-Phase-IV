import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

// ── Standalone component ──────────────────────────────────────────
interface ConfirmDialogProps extends ConfirmOptions {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", destructive = false, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title ?? (destructive ? "⚠️ Are you sure?" : "Confirm Action")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="flex gap-2 mt-2">
          <Button variant="outline" className="flex-1" onClick={onCancel}>{cancelLabel}</Button>
          <Button
            className={`flex-1 ${destructive ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : ""}`}
            onClick={onConfirm}
          >{confirmLabel}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Hook-based confirm (imperative) ──────────────────────────────
export function useConfirm() {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions>({ message: "" });
  const resolveRef = useRef<(v: boolean) => void>(() => {});

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    setOpts(options);
    setOpen(true);
    return new Promise(resolve => { resolveRef.current = resolve; });
  }, []);

  const handleConfirm = () => { setOpen(false); resolveRef.current(true); };
  const handleCancel  = () => { setOpen(false); resolveRef.current(false); };

  const ConfirmNode = (
    <ConfirmDialog
      open={open}
      {...opts}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return { confirm, ConfirmNode };
}
