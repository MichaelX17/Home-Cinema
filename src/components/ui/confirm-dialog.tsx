"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Focus the confirm button when the dialog opens for keyboard accessibility
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => confirmButtonRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  // Handle Escape / Enter keys while the dialog is open
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      } else if (e.key === "Enter" && e.target === confirmButtonRef.current) {
        e.preventDefault();
        onConfirm();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onConfirm, onCancel]);

  if (!open) return null;

  const isDestructive = variant === "destructive";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-100 transition-opacity"
        onClick={onCancel}
      />
      <Card className="relative z-10 w-full max-w-sm mx-4 transition-all duration-300 scale-100 opacity-100">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-950/90 via-slate-900 to-sky-950/80 opacity-90 rounded-xl" />
        <div className="relative z-10">
          <CardHeader className="flex flex-row items-start gap-3 pb-2">
            <div className={`rounded-full p-2 ${isDestructive ? "bg-destructive/20" : "bg-primary/20"}`}>
              <AlertTriangle className={`h-5 w-5 ${isDestructive ? "text-destructive" : "text-primary"}`} />
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{description}</p>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button variant="ghost" onClick={onCancel} type="button">
              {cancelLabel}
            </Button>
            <Button
              ref={confirmButtonRef}
              variant={isDestructive ? "destructive" : "default"}
              onClick={onConfirm}
              type="button"
            >
              {confirmLabel}
            </Button>
          </CardFooter>
        </div>
      </Card>
    </div>
  );
}