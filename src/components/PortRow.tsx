import { Fragment, memo, useEffect, useRef, useState } from "react";
import { play } from "cuelume";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  IconChevronRight,
  IconAlertTriangle,
  IconCpu,
  IconTerminal2,
  IconApps,
  IconCircleDot,
  IconTrash,
  IconStar,
  IconStarFilled,
  IconCopy,
  IconCheck,
  IconSquare,
  IconSquareCheckFilled,
  IconLock,
  IconLockOpen,
  IconWorld,
} from "@tabler/icons-react";
import type { PortEntry, Category } from "@/types";
import { Badge, Button } from "@/components/ui";
import { describeEntry, describePort } from "@/lib/describe";
import { useAppIcon } from "@/lib/appIcon";
import { useHttpProbe, browserUrl } from "@/lib/httpProbe";
import { formatStartedShort, formatStartedLong } from "@/lib/time";
import { useMessages, useSettings, type Messages } from "@/i18n";
import { cn } from "@/lib/utils";

function categoryMeta(m: Messages): Record<Category, { label: string; icon: React.ReactNode; cls: string; hint: string }> {
  return {
    system: {
      label: m.catSystem,
      icon: <IconCpu size={11} />,
      cls: "bg-sys-soft text-sys",
      hint: m.catSystemHint,
    },
    app: {
      label: m.catApp,
      icon: <IconApps size={11} />,
      cls: "bg-app-soft text-app",
      hint: m.catAppHint,
    },
    dev: {
      label: m.catDev,
      icon: <IconTerminal2 size={11} />,
      cls: "bg-accent text-ok",
      hint: m.catDevHint,
    },
    other: {
      label: m.catOther,
      icon: <IconCircleDot size={11} />,
      cls: "bg-accent text-muted-foreground",
      hint: m.catOtherHint,
    },
  };
}

/** Stable identity for favorites, survives restarts (PIDs don't). */
export function favKey(e: PortEntry) {
  return `${e.process_name}:${e.port}`;
}

function CopyableValue({ value, muted }: { value: string; muted?: boolean }) {
  const m = useMessages();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  if (!value) return <dd>-</dd>;

  const copy = () => {
    navigator.clipboard.writeText(value).then(
      () => {
        play("tick");
        setCopied(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 1400);
      },
      () => play("droplet"),
    );
  };

  return (
    <dd className={cn("group flex items-start gap-1 break-all", muted && "text-muted-foreground")}>
      <span className="min-w-0">{value}</span>
      <button
        onClick={copy}
        aria-label={copied ? m.copiedAria : m.copy}
        title={copied ? m.copied : m.copy}
        className={cn(
          "mt-px shrink-0 cursor-pointer rounded p-0.5 transition-opacity duration-100",
          copied
            ? "text-ok opacity-100"
            : "text-muted-foreground opacity-0 hover:bg-accent hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100",
        )}
      >
        {copied ? (
          <IconCheck size={12} className="animate-[pop_260ms_ease-out]" />
        ) : (
          <IconCopy size={12} />
        )}
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? m.copiedSr : ""}
      </span>
    </dd>
  );
}

export const PortRow = memo(function PortRow({
  entry: e,
  rowKey,
  conflict,
  expanded,
  fav,
  selected,
  blocked,
  onToggle,
  onToggleFav,
  onToggleSelect,
  onRequestKill,
  onRequestBlock,
}: {
  entry: PortEntry;
  rowKey: string;
  conflict: boolean;
  expanded: boolean;
  fav: boolean;
  selected: boolean;
  blocked: boolean;
  onToggle: (key: string) => void;
  onToggleFav: (entry: PortEntry) => void;
  onToggleSelect: (key: string, shift: boolean) => void;
  onRequestKill: (entry: PortEntry) => void;
  onRequestBlock: (entry: PortEntry) => void;
}) {
  const m = useMessages();
  const { settings } = useSettings();
  const locale = settings.locale;
  const meta = categoryMeta(m)[e.category] ?? categoryMeta(m).other;
  const hint = describeEntry(e, locale);
  const portHint = describePort(e.port, locale);
  const appIcon = useAppIcon(e.app_path);
  const isWeb = useHttpProbe(e);

  const openBrowser = () => {
    play("press");
    openUrl(browserUrl(e)).catch(() => play("droplet"));
  };

  return (
    <Fragment>
      <tr
        onClick={() => onToggle(rowKey)}
        className={cn(
          "cursor-pointer border-b border-border transition-colors duration-100 hover:bg-muted",
          expanded && "bg-muted",
        )}
      >
        <td className="py-0 pl-1" onClick={(ev) => ev.stopPropagation()}>
          <button
            role="checkbox"
            aria-checked={selected}
            aria-label={m.selectRow(e.process_name, e.port)}
            onClick={(ev) => onToggleSelect(rowKey, ev.shiftKey)}
            className={cn(
              "flex cursor-pointer items-center justify-center p-2.5 transition-transform duration-100 active:scale-90",
              selected ? "text-foreground" : "text-muted-foreground/60 hover:text-muted-foreground",
            )}
          >
            {selected ? (
              <IconSquareCheckFilled size={15} className="animate-[pop_200ms_ease-out]" />
            ) : (
              <IconSquare size={15} />
            )}
          </button>
        </td>
        <td className="px-2 py-2 text-muted-foreground">
          <IconChevronRight
            size={12}
            className={cn("transition-transform duration-150", expanded && "rotate-90")}
          />
        </td>
        <td className="px-2 py-2 font-semibold tabular-nums">
          <span className="inline-flex items-center gap-1">
            {e.port}
            {conflict && (
              <IconAlertTriangle size={12} className="text-warn" aria-label={m.conflictPort} />
            )}
            {blocked && (
              <IconLock size={12} className="text-danger" aria-label={m.blockedPort} />
            )}
          </span>
        </td>
        <td className="px-2 py-2 text-muted-foreground">{e.protocol}</td>
        <td className="max-w-64 px-2 py-2">
          <div className="flex items-center gap-1.5">
            {appIcon && (
              <img
                src={appIcon}
                alt=""
                aria-hidden="true"
                className="h-4 w-4 shrink-0 rounded-[3px]"
              />
            )}
            <span className="truncate font-medium">{e.process_name}</span>
          </div>
          {hint && (
            <div className="truncate text-[11px] leading-4 text-muted-foreground">{hint}</div>
          )}
        </td>
        <td className="px-2 py-2 tabular-nums text-muted-foreground">{e.pid}</td>
        <td className="px-2 py-2">
          <Badge className={meta.cls} title={meta.hint}>
            {meta.icon}
            {meta.label}
          </Badge>
        </td>
        <td className="max-w-32 truncate px-2 py-2 text-muted-foreground">{e.address}</td>
        <td className="whitespace-nowrap px-2 py-2 tabular-nums text-muted-foreground">
          {formatStartedShort(e.started_at, locale)}
        </td>
        <td className="px-2 py-2">
          <div
            className="flex items-center justify-end gap-0.5"
            onClick={(ev) => ev.stopPropagation()}
          >
            {isWeb && (
              <Button
                variant="ghost"
                size="icon"
                onClick={openBrowser}
                aria-label={m.openInBrowser}
                title={m.openInBrowser}
                className="text-muted-foreground hover:text-app"
              >
                <IconWorld size={13} />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggleFav(e)}
              aria-label={fav ? m.favRemove : m.favAdd}
              aria-pressed={fav}
              title={fav ? m.favRemove : m.favAdd}
              className={cn(!fav && "text-muted-foreground hover:text-warn")}
            >
              {fav ? (
                <IconStarFilled size={13} className="animate-[pop_260ms_ease-out] text-warn" />
              ) : (
                <IconStar size={13} />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRequestBlock(e)}
              aria-label={blocked ? m.blockEditAria(e.port) : m.blockAria(e.port)}
              aria-pressed={blocked}
              title={blocked ? m.blockedTitle : m.blockTitle}
              className={cn(
                blocked ? "text-danger" : "text-muted-foreground hover:text-danger",
              )}
            >
              {blocked ? <IconLock size={13} /> : <IconLockOpen size={13} />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              data-cuelume-press
              className="text-muted-foreground hover:bg-danger-soft hover:text-danger"
              onClick={() => onRequestKill(e)}
              disabled={fav}
              aria-label={
                fav ? m.killProtectedAria(e.process_name) : m.killAria(e.process_name, e.pid)
              }
              title={fav ? m.killProtectedTitle : m.killActionTitle}
            >
              <IconTrash size={13} />
              {m.kill}
            </Button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-border bg-muted/50">
          <td colSpan={10} className="px-9 py-3">
            <dl className="grid grid-cols-[130px_1fr] gap-x-4 gap-y-1.5 text-xs">
              {hint && (
                <>
                  <dt className="text-muted-foreground">{m.whatIs}</dt>
                  <dd>{hint}</dd>
                </>
              )}
              <dt className="text-muted-foreground">{m.path}</dt>
              <CopyableValue value={e.executable_path} />
              <dt className="text-muted-foreground">{m.fullCommand}</dt>
              <CopyableValue value={e.command_line} muted />
              <dt className="text-muted-foreground">{m.workingDir}</dt>
              <CopyableValue value={e.cwd} />
              <dt className="text-muted-foreground">{m.user}</dt>
              <dd>{e.user || "-"}</dd>
              <dt className="text-muted-foreground">{m.startedAt}</dt>
              <dd className="tabular-nums">{formatStartedLong(e.started_at, locale)}</dd>
              <dt className="text-muted-foreground">{m.parentProcess}</dt>
              <dd className="tabular-nums">
                {e.parent_name ? `${e.parent_name} (${e.parent_pid})` : e.parent_pid || "-"}
              </dd>
              <dt className="text-muted-foreground">{m.address}</dt>
              <dd className="tabular-nums">
                {e.address}:{e.port} · {e.protocol}
                {portHint && <span className="text-muted-foreground">, {portHint}</span>}
              </dd>
              {isWeb && (
                <>
                  <dt className="text-muted-foreground">URL</dt>
                  <dd>
                    <button
                      onClick={openBrowser}
                      title={m.openInBrowser}
                      className="inline-flex cursor-pointer items-center gap-1 text-app hover:underline"
                    >
                      <IconWorld size={12} />
                      {browserUrl(e)}
                    </button>
                  </dd>
                </>
              )}
              {conflict && (
                <>
                  <dt className="text-warn">{m.conflict}</dt>
                  <dd className="text-warn">{m.conflictDetail(e.port)}</dd>
                </>
              )}
            </dl>
          </td>
        </tr>
      )}
    </Fragment>
  );
});
