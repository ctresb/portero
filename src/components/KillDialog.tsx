import { useEffect, useRef, useState } from "react";
import { IconAlertTriangle, IconX } from "@tabler/icons-react";
import type { PortEntry } from "@/types";
import { Button } from "@/components/ui";
import { describeEntry } from "@/lib/describe";
import { useMessages, useSettings } from "@/i18n";

export function KillDialog({
  entries,
  onClose,
  onKill,
}: {
  entries: PortEntry[];
  onClose: () => void;
  onKill: (pids: number[], force: boolean) => Promise<void>;
}) {
  const m = useMessages();
  const { settings } = useSettings();
  const [busy, setBusy] = useState<"term" | "force" | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const single = entries.length === 1 ? entries[0] : null;
  const hint = single ? describeEntry(single, settings.locale) : null;

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const run = async (force: boolean) => {
    setBusy(force ? "force" : "term");
    try {
      await onKill(entries.map((e) => e.pid), force);
    } finally {
      setBusy(null);
    }
  };

  const shown = entries.slice(0, 6);
  const rest = entries.length - shown.length;

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
        aria-labelledby="kill-title"
        className="w-105 max-w-[calc(100vw-48px)] rounded-lg border border-border bg-background p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="kill-title" className="text-sm font-semibold">
            {single
              ? m.killDialogTitle(single.process_name)
              : m.killDialogTitleMulti(entries.length)}
          </h2>
          <button
            onClick={onClose}
            aria-label={m.close}
            className="cursor-pointer rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <IconX size={15} />
          </button>
        </div>

        {single ? (
          <dl className="mt-3 grid grid-cols-[90px_1fr] gap-x-3 gap-y-1 text-xs">
            {hint && (
              <>
                <dt className="text-muted-foreground">{m.whatIs}</dt>
                <dd>{hint}</dd>
              </>
            )}
            <dt className="text-muted-foreground">{m.port}</dt>
            <dd className="tabular-nums">
              {single.address}:{single.port} · {single.protocol}
            </dd>
            <dt className="text-muted-foreground">PID</dt>
            <dd className="tabular-nums">{single.pid}</dd>
            <dt className="text-muted-foreground">{m.path}</dt>
            <dd className="break-all text-muted-foreground">{single.executable_path || "-"}</dd>
          </dl>
        ) : (
          <ul className="mt-3 space-y-1 text-xs">
            {shown.map((e) => (
              <li key={`${e.pid}-${e.port}-${e.protocol}-${e.address}`} className="flex items-baseline gap-2">
                <span className="font-medium">{e.process_name}</span>
                <span className="tabular-nums text-muted-foreground">
                  {m.portAtPid(e.port, e.pid)}
                </span>
              </li>
            ))}
            {rest > 0 && <li className="text-muted-foreground">{m.andMore(rest)}</li>}
          </ul>
        )}

        <p className="mt-4 flex items-start gap-1.5 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          <IconAlertTriangle size={14} className="mt-px shrink-0 text-warn" />
          <span>{m.killWarning(!!single)}</span>
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" data-cuelume-press onClick={onClose} disabled={busy !== null}>
            {m.cancel}
          </Button>
          <Button
            variant="outline"
            data-cuelume-press
            className="text-danger hover:bg-danger-soft"
            onClick={() => run(true)}
            disabled={busy !== null}
          >
            {busy === "force" ? m.forcing : m.force}
          </Button>
          <Button
            ref={confirmRef}
            variant="danger"
            data-cuelume-press
            onClick={() => run(false)}
            disabled={busy !== null}
          >
            {busy === "term"
              ? m.killing
              : single
                ? m.killConfirm
                : m.killConfirmMulti(entries.length)}
          </Button>
        </div>
      </div>
    </div>
  );
}
