import { useEffect, useRef, useState } from "react";
import {
  IconAlertTriangle,
  IconX,
  IconSquare,
  IconSquareCheckFilled,
  IconArrowDownLeft,
  IconArrowUpRight,
} from "@tabler/icons-react";
import type { PortEntry, Block } from "@/types";
import { Button } from "@/components/ui";
import { useMessages } from "@/i18n";

function Check({
  checked,
  onChange,
  icon,
  label,
  hint,
}: {
  checked: boolean;
  onChange: () => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      className="flex w-full cursor-pointer items-center gap-2.5 rounded-md border border-border px-3 py-2.5 text-left transition-colors duration-100 hover:bg-muted"
    >
      <span className={checked ? "text-foreground" : "text-muted-foreground/60"}>
        {checked ? (
          <IconSquareCheckFilled size={17} className="animate-[pop_200ms_ease-out]" />
        ) : (
          <IconSquare size={17} />
        )}
      </span>
      <span className="text-muted-foreground">{icon}</span>
      <span className="min-w-0">
        <span className="block text-xs font-medium text-foreground">{label}</span>
        <span className="block text-[11px] leading-4 text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}

export function BlockDialog({
  entry,
  current,
  onClose,
  onApply,
  onUnblock,
}: {
  entry: PortEntry;
  current: Block | null;
  onClose: () => void;
  onApply: (inbound: boolean, outbound: boolean) => Promise<void>;
  onUnblock: () => Promise<void>;
}) {
  const m = useMessages();
  const [inbound, setInbound] = useState(current ? current.inbound : true);
  const [outbound, setOutbound] = useState(current ? current.outbound : true);
  const [busy, setBusy] = useState<"apply" | "unblock" | null>(null);
  const applyRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    applyRef.current?.focus();
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const apply = async () => {
    setBusy("apply");
    try {
      await onApply(inbound, outbound);
    } finally {
      setBusy(null);
    }
  };

  const unblock = async () => {
    setBusy("unblock");
    try {
      await onUnblock();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 motion-safe:animate-[fade_150ms_ease-out]"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="block-title"
        className="w-105 max-w-[calc(100vw-48px)] rounded-lg border border-border bg-background p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="block-title" className="text-sm font-semibold">
            {current ? m.blockDialogTitleEdit(entry.port) : m.blockDialogTitle(entry.port)}
          </h2>
          <button
            onClick={onClose}
            aria-label={m.close}
            className="cursor-pointer rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <IconX size={15} />
          </button>
        </div>

        <p className="mt-1 text-xs text-muted-foreground">
          {m.blockDialogDesc(entry.port, entry.protocol.toLowerCase())}
        </p>

        <div className="mt-3 space-y-2">
          <Check
            checked={inbound}
            onChange={() => setInbound((v) => !v)}
            icon={<IconArrowDownLeft size={15} />}
            label={m.blockInbound}
            hint={m.blockInboundHint}
          />
          <Check
            checked={outbound}
            onChange={() => setOutbound((v) => !v)}
            icon={<IconArrowUpRight size={15} />}
            label={m.blockOutbound}
            hint={m.blockOutboundHint}
          />
        </div>

        <p className="mt-3 flex items-start gap-1.5 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          <IconAlertTriangle size={14} className="mt-px shrink-0 text-warn" />
          <span>{m.adminWarning}</span>
        </p>

        <div className="mt-4 flex items-center justify-end gap-2">
          {current && (
            <Button
              variant="outline"
              data-cuelume-press
              onClick={unblock}
              disabled={busy !== null}
              className="mr-auto"
            >
              {busy === "unblock" ? m.unblocking : m.unblock}
            </Button>
          )}
          <Button variant="ghost" data-cuelume-press onClick={onClose} disabled={busy !== null}>
            {m.cancel}
          </Button>
          <Button
            ref={applyRef}
            variant="default"
            data-cuelume-press
            onClick={apply}
            disabled={busy !== null || (!inbound && !outbound)}
          >
            {busy === "apply" ? m.blocking : m.block}
          </Button>
        </div>
      </div>
    </div>
  );
}
