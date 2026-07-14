import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { play } from "cuelume";
import {
  IconX,
  IconLanguage,
  IconVolume,
  IconVolumeOff,
  IconRefresh,
  IconLock,
  IconAlertTriangle,
} from "@tabler/icons-react";
import type { Block } from "@/types";
import { Button } from "@/components/ui";
import { useMessages, useSettings, type Locale } from "@/i18n";
import { cn } from "@/lib/utils";

const LOCALES: { value: Locale; label: string }[] = [
  { value: "pt", label: "Português" },
  { value: "en", label: "English" },
];

const REFRESH_OPTIONS = [2000, 4000, 8000];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 first:mt-0">
      <h3 className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-border p-0.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          onClick={() => {
            if (o.value !== value) {
              play("toggle");
              onChange(o.value);
            }
          }}
          aria-pressed={o.value === value}
          className={cn(
            "cursor-pointer rounded px-2.5 py-1 text-xs transition-[background-color,color] duration-150",
            o.value === value
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsDialog({
  blocks,
  onClose,
  onBlocksChange,
  onError,
}: {
  blocks: Block[];
  onClose: () => void;
  onBlocksChange: (blocks: Block[]) => void;
  onError: (message: string) => void;
}) {
  const m = useMessages();
  const { settings, update } = useSettings();
  const [reapplying, setReapplying] = useState(false);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const reapply = async () => {
    setReapplying(true);
    try {
      const updated = await invoke<Block[]>("reapply_blocks");
      onBlocksChange(updated);
      play("success");
    } catch (err) {
      if (String(err) !== "cancelled") {
        play("droplet");
        onError(String(err));
      }
    } finally {
      setReapplying(false);
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
        aria-labelledby="settings-title"
        className="w-105 max-w-[calc(100vw-48px)] rounded-lg border border-border bg-background p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="settings-title" className="text-sm font-semibold">
            {m.settingsTitle}
          </h2>
          <button
            onClick={onClose}
            aria-label={m.close}
            className="cursor-pointer rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <IconX size={15} />
          </button>
        </div>

        <div className="mt-3">
          <Section title={m.languageSection}>
            <div className="flex items-center gap-2.5">
              <IconLanguage size={15} className="text-muted-foreground" />
              <Segmented
                options={LOCALES}
                value={settings.locale}
                onChange={(locale) => update({ locale })}
              />
            </div>
          </Section>

          <Section title={m.soundsSection}>
            <button
              role="switch"
              aria-checked={settings.sounds}
              onClick={() => {
                update({ sounds: !settings.sounds });
                if (!settings.sounds) play("toggle");
              }}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-md border border-border px-3 py-2.5 text-left transition-colors duration-100 hover:bg-muted"
            >
              <span className="text-muted-foreground">
                {settings.sounds ? <IconVolume size={15} /> : <IconVolumeOff size={15} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-medium text-foreground">{m.soundsLabel}</span>
                <span className="block text-[11px] leading-4 text-muted-foreground">
                  {m.soundsHint}
                </span>
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "relative h-4.5 w-8 shrink-0 rounded-full transition-colors duration-150",
                  settings.sounds ? "bg-foreground" : "bg-border",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-3.5 w-3.5 rounded-full bg-background transition-[left] duration-150",
                    settings.sounds ? "left-4" : "left-0.5",
                  )}
                />
              </span>
            </button>
          </Section>

          <Section title={m.refreshSection}>
            <div className="flex items-center gap-2.5">
              <IconRefresh size={15} className="text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-medium text-foreground">{m.refreshLabel}</span>
                <span className="block text-[11px] leading-4 text-muted-foreground">
                  {m.refreshHint}
                </span>
              </span>
              <Segmented
                options={REFRESH_OPTIONS.map((ms) => ({
                  value: ms,
                  label: m.refreshOption(ms / 1000),
                }))}
                value={settings.refreshMs}
                onChange={(refreshMs) => update({ refreshMs })}
              />
            </div>
          </Section>

          <Section title={m.blocksSection}>
            <div className="flex items-center gap-2.5">
              <IconLock size={15} className="text-muted-foreground" />
              <span className="min-w-0 flex-1 text-xs text-foreground">
                {m.blocksCount(blocks.length)}
              </span>
              <Button
                variant="outline"
                data-cuelume-press
                onClick={reapply}
                disabled={reapplying || blocks.length === 0}
              >
                {reapplying ? m.reapplying : m.reapplyBlocks}
              </Button>
            </div>
            {blocks.length > 0 && (
              <p className="mt-2 flex items-start gap-1.5 rounded-md bg-muted px-3 py-2 text-[11px] leading-4 text-muted-foreground">
                <IconAlertTriangle size={13} className="mt-px shrink-0 text-warn" />
                {m.reapplyHint}
              </p>
            )}
          </Section>
        </div>

        <div className="mt-5 flex justify-end">
          <Button variant="default" data-cuelume-press onClick={onClose}>
            {m.close}
          </Button>
        </div>
      </div>
    </div>
  );
}
