import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { bind, play } from "cuelume";
import {
  IconReload,
  IconSearch,
  IconChevronRight,
  IconChevronUp,
  IconChevronDown,
  IconSelector,
  IconAlertTriangle,
  IconCpu,
  IconTerminal2,
  IconApps,
  IconStack2,
  IconStar,
  IconCircleDot,
  IconX,
  IconTrash,
  IconSquareXFilled,
  IconSettings,
} from "@tabler/icons-react";
import type { PortEntry, Category, Block } from "@/types";
import { Button, Input, Badge } from "@/components/ui";
import { PortRow, favKey } from "@/components/PortRow";
import { KillDialog } from "@/components/KillDialog";
import { BlockDialog } from "@/components/BlockDialog";
import { SettingsDialog } from "@/components/SettingsDialog";
import { useMessages, useSettings } from "@/i18n";
import { cn } from "@/lib/utils";
import { parseStarted } from "@/lib/time";

const blockKey = (port: number, protocol: string) => `${port}:${protocol.toLowerCase()}`;

type Filter = "all" | Category | "conflicts" | "favs";
type SortKey = "port" | "protocol" | "process" | "pid" | "category" | "address" | "started";

function sortValue(e: PortEntry, key: SortKey): string | number {
  switch (key) {
    case "port": return e.port;
    case "protocol": return e.protocol;
    case "process": return e.process_name.toLowerCase();
    case "pid": return e.pid;
    case "category": return e.category;
    case "address": return e.address;
    case "started": return parseStarted(e.started_at);
  }
}

function dragWindow(ev: React.MouseEvent) {
  if (ev.button !== 0) return;
  const target = ev.target as HTMLElement;
  if (target.closest("button, input, a, [role='button']")) return;
  // Rust-side commands: immune to webview permission quirks around
  // data-tauri-drag-region / window.startDragging.
  if (ev.detail === 2) {
    invoke("toggle_maximize");
  } else {
    invoke("start_drag");
  }
}

function loadFavs(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem("portero:favs") ?? "[]"));
  } catch {
    return new Set();
  }
}

export default function App() {
  const m = useMessages();
  const { settings } = useSettings();
  const [entries, setEntries] = useState<PortEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [killTarget, setKillTarget] = useState<PortEntry[] | null>(null);
  const [blockTarget, setBlockTarget] = useState<PortEntry | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const lastSelectedKey = useRef<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "port", dir: 1 });
  const [favs, setFavs] = useState<Set<string>>(loadFavs);
  const [spinning, setSpinning] = useState(false);
  const inFlight = useRef(false);
  const lastPayload = useRef("");

  const FILTERS = useMemo<{ key: Filter; label: string; icon: React.ReactNode }[]>(
    () => [
      { key: "all", label: m.filterAll, icon: <IconStack2 size={14} /> },
      { key: "system", label: m.filterSystem, icon: <IconCpu size={14} /> },
      { key: "app", label: m.filterApps, icon: <IconApps size={14} /> },
      { key: "dev", label: m.filterDev, icon: <IconTerminal2 size={14} /> },
      { key: "other", label: m.filterOther, icon: <IconCircleDot size={14} /> },
      { key: "favs", label: m.filterFavs, icon: <IconStar size={14} /> },
      { key: "conflicts", label: m.filterConflicts, icon: <IconAlertTriangle size={14} /> },
    ],
    [m],
  );

  const COLUMNS = useMemo<{ key: SortKey; label: string }[]>(
    () => [
      { key: "port", label: m.colPort },
      { key: "protocol", label: m.colProtocol },
      { key: "process", label: m.colProcess },
      { key: "pid", label: m.colPid },
      { key: "category", label: m.colCategory },
      { key: "address", label: m.colAddress },
      { key: "started", label: m.colStarted },
    ],
    [m],
  );

  useEffect(() => {
    // HMR in dev re-runs module init; guard so cuelume only wires once
    // (each stray AudioContext counts against WebKit's per-page limit).
    const w = window as unknown as { __cuelumeBound?: boolean };
    if (!w.__cuelumeBound) {
      w.__cuelumeBound = true;
      bind();
    }
  }, []);

  useEffect(() => {
    const kill = (ev: Event) => {
      const t = ev.target as HTMLElement;
      if (t.closest("input, textarea")) return;
      ev.preventDefault();
    };
    document.addEventListener("contextmenu", kill);
    document.addEventListener("dragstart", kill);
    return () => {
      document.removeEventListener("contextmenu", kill);
      document.removeEventListener("dragstart", kill);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("portero:favs", JSON.stringify([...favs]));
  }, [favs]);

  useEffect(() => {
    invoke<Block[]>("list_blocks").then(setBlocks).catch(() => {});
  }, []);

  const blockedSet = useMemo(
    () => new Set(blocks.map((b) => blockKey(b.port, b.protocol))),
    [blocks],
  );

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const data = await invoke<PortEntry[]>("list_ports");
      // Most polls return identical data, skip the state update entirely so
      // nothing re-renders (also keeps entry refs stable for memoized rows).
      const payload = JSON.stringify(data);
      if (payload !== lastPayload.current) {
        lastPayload.current = payload;
        setEntries(data);
      }
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = settings.refreshMs;
    let t: ReturnType<typeof setInterval> | null = setInterval(refresh, interval);
    const onVisibility = () => {
      if (document.hidden) {
        if (t) clearInterval(t);
        t = null;
      } else if (!t) {
        refresh();
        t = setInterval(refresh, interval);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      if (t) clearInterval(t);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh, settings.refreshMs]);

  const conflictPorts = useMemo(() => {
    const byPort = new Map<number, Set<number>>();
    for (const e of entries) {
      if (!byPort.has(e.port)) byPort.set(e.port, new Set());
      byPort.get(e.port)!.add(e.pid);
    }
    return new Set([...byPort.entries()].filter(([, pids]) => pids.size > 1).map(([p]) => p));
  }, [entries]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = {
      all: entries.length,
      system: 0,
      app: 0,
      dev: 0,
      other: 0,
      favs: entries.filter((e) => favs.has(favKey(e))).length,
      conflicts: entries.filter((e) => conflictPorts.has(e.port)).length,
    };
    for (const e of entries) c[e.category]++;
    return c;
  }, [entries, conflictPorts, favs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = entries.filter((e) => {
      if (filter === "conflicts" && !conflictPorts.has(e.port)) return false;
      if (filter === "favs" && !favs.has(favKey(e))) return false;
      if (filter !== "all" && filter !== "conflicts" && filter !== "favs" && e.category !== filter)
        return false;
      if (!q) return true;
      return (
        String(e.port).includes(q) ||
        e.process_name.toLowerCase().includes(q) ||
        e.executable_path.toLowerCase().includes(q) ||
        e.command_line.toLowerCase().includes(q) ||
        String(e.pid).includes(q)
      );
    });
    return base.sort((a, b) => {
      const va = sortValue(a, sort.key);
      const vb = sortValue(b, sort.key);
      const cmp = va < vb ? -1 : va > vb ? 1 : a.port - b.port || a.pid - b.pid;
      return cmp * sort.dir;
    });
  }, [entries, query, filter, conflictPorts, favs, sort]);

  // rowKey -> entry, for resolving the current selection
  const byKey = useMemo(() => {
    const m = new Map<string, PortEntry>();
    for (const e of entries) m.set(`${e.pid}-${e.port}-${e.protocol}-${e.address}`, e);
    return m;
  }, [entries]);

  // prune selection when processes disappear
  useEffect(() => {
    setSelected((prev) => {
      const next = new Set([...prev].filter((k) => byKey.has(k)));
      return next.size === prev.size ? prev : next;
    });
  }, [byKey]);

  const selectedEntries = useMemo(
    () => [...selected].map((k) => byKey.get(k)).filter(Boolean) as PortEntry[],
    [selected, byKey],
  );
  const killableSelected = useMemo(
    () => selectedEntries.filter((e) => !favs.has(favKey(e))),
    [selectedEntries, favs],
  );

  const kill = useCallback(
    async (pids: number[], force: boolean) => {
      const errors: string[] = [];
      for (const pid of pids) {
        try {
          await invoke("kill_process", { pid, force });
        } catch (e) {
          errors.push(String(e));
        }
      }
      play(errors.length === pids.length ? "droplet" : "success");
      setKillTarget(null);
      setExpanded(null);
      setSelected(new Set());
      setError(errors.length ? errors.join(" · ") : null);
      await refresh();
    },
    [refresh],
  );

  const requestKill = useCallback((entry: PortEntry) => setKillTarget([entry]), []);

  const filteredKeys = useMemo(
    () => filtered.map((e) => `${e.pid}-${e.port}-${e.protocol}-${e.address}`),
    [filtered],
  );

  const toggleSelect = useCallback(
    (key: string, shift: boolean) => {
      play("toggle");
      setSelected((prev) => {
        const next = new Set(prev);
        // Shift+click: select the whole range between last click and this one.
        if (shift && lastSelectedKey.current) {
          const a = filteredKeys.indexOf(lastSelectedKey.current);
          const b = filteredKeys.indexOf(key);
          if (a !== -1 && b !== -1) {
            const [lo, hi] = a < b ? [a, b] : [b, a];
            for (let i = lo; i <= hi; i++) next.add(filteredKeys[i]);
            lastSelectedKey.current = key;
            return next;
          }
        }
        if (next.has(key)) next.delete(key);
        else next.add(key);
        lastSelectedKey.current = key;
        return next;
      });
    },
    [filteredKeys],
  );

  const clearSelection = useCallback(() => {
    play("droplet");
    setSelected(new Set());
  }, []);

  const favSelected = useCallback(() => {
    setFavs((prev) => {
      const keys = selectedEntries.map(favKey);
      const allFav = keys.every((k) => prev.has(k));
      const next = new Set(prev);
      if (allFav) {
        keys.forEach((k) => next.delete(k));
        play("whisper");
      } else {
        keys.forEach((k) => next.add(k));
        play("sparkle");
      }
      return next;
    });
  }, [selectedEntries]);

  const toggleFav = useCallback((e: PortEntry) => {
    setFavs((prev) => {
      const next = new Set(prev);
      const key = favKey(e);
      if (next.has(key)) {
        next.delete(key);
        play("whisper");
      } else {
        next.add(key);
        play("sparkle");
      }
      return next;
    });
  }, []);

  const requestBlock = useCallback((entry: PortEntry) => setBlockTarget(entry), []);

  const applyBlock = useCallback(
    async (entry: PortEntry, inbound: boolean, outbound: boolean) => {
      try {
        const updated = await invoke<Block[]>("set_block", {
          port: entry.port,
          protocol: entry.protocol,
          inbound,
          outbound,
        });
        setBlocks(updated);
        play("success");
        setBlockTarget(null);
      } catch (err) {
        if (String(err) !== "cancelled") {
          play("droplet");
          setError(String(err));
        }
        setBlockTarget(null);
      }
    },
    [],
  );

  const removeBlock = useCallback(async (entry: PortEntry) => {
    try {
      const updated = await invoke<Block[]>("unblock_port", {
        port: entry.port,
        protocol: entry.protocol,
      });
      setBlocks(updated);
      play("whisper");
      setBlockTarget(null);
    } catch (err) {
      if (String(err) !== "cancelled") {
        play("droplet");
        setError(String(err));
      }
      setBlockTarget(null);
    }
  }, []);

  const toggleSort = useCallback((key: SortKey) => {
    play("tick");
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 1 ? -1 : 1 } : { key, dir: 1 }));
  }, []);

  const toggleExpand = useCallback((key: string) => {
    setExpanded((prev) => {
      play(prev === key ? "press" : "whisper");
      return prev === key ? null : key;
    });
  }, []);

  const manualRefresh = useCallback(() => {
    setSpinning(true);
    refresh();
  }, [refresh]);

  return (
    <div className="flex h-full flex-col">
      <header
        data-tauri-drag-region
        onMouseDown={dragWindow}
        className="flex items-center gap-2 border-b border-border pt-7 pb-2.5 px-4"
      >
        <span className="pointer-events-none text-sm font-semibold tracking-tight">Portero</span>
        <span className="pointer-events-none text-xs text-muted-foreground">
          {m.listeningPorts(entries.length)}
        </span>
        {conflictPorts.size > 0 && (
          <button
            onClick={() => setFilter("conflicts")}
            data-cuelume-toggle
            className="cursor-pointer transition-transform duration-150 active:scale-[0.94]"
            aria-label={m.viewConflicts}
          >
            <Badge className="bg-warn-soft text-warn">
              <IconAlertTriangle size={11} />
              {m.conflictBadge(conflictPorts.size)}
            </Badge>
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <div className="relative w-56">
            <IconSearch
              size={13}
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={m.searchPlaceholder}
              className="pl-7 pr-6"
              aria-label={m.search}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label={m.clearSearch}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <IconX size={12} />
              </button>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={manualRefresh}
            data-cuelume-press
            data-cuelume-release
            aria-label={m.refresh}
          >
            <IconReload
              size={14}
              className={cn(
                loading && "animate-spin",
                spinning && !loading && "animate-[reload-turn_500ms_cubic-bezier(0.3,0,0.2,1)]",
              )}
              onAnimationEnd={() => setSpinning(false)}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            data-cuelume-press
            aria-label={m.settings}
            title={m.settings}
          >
            <IconSettings size={14} />
          </Button>
        </div>
      </header>

      <nav className="flex items-center gap-1 border-b border-border px-4 py-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            data-cuelume-toggle
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-[background-color,color,transform] duration-150 active:scale-[0.94]",
              filter === f.key
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
              f.key === "conflicts" && counts.conflicts > 0 && filter !== f.key && "text-warn",
            )}
          >
            {f.icon}
            {f.label}
            <span className="tabular-nums opacity-60">{counts[f.key]}</span>
          </button>
        ))}
      </nav>

      {error && (
        <div className="flex items-center gap-2 border-b border-border bg-danger-soft px-4 py-1.5 text-xs text-danger">
          <IconAlertTriangle size={13} />
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-auto cursor-pointer"
            aria-label={m.closeError}
          >
            <IconX size={13} />
          </button>
        </div>
      )}

      <main className="min-h-0 flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-background">
            <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="w-8 py-2 pl-3 pr-1" />
              <th className="w-6 px-2 py-2" />
              {COLUMNS.map((col) => (
                <th key={col.key} className="px-2 py-1 font-medium">
                  <button
                    onClick={() => toggleSort(col.key)}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-0.5 rounded px-1 py-1 uppercase tracking-wider transition-colors duration-150 hover:text-foreground",
                      sort.key === col.key && "text-foreground",
                    )}
                    aria-label={m.sortBy(col.label)}
                  >
                    {col.label}
                    {sort.key === col.key ? (
                      sort.dir === 1 ? (
                        <IconChevronUp size={11} />
                      ) : (
                        <IconChevronDown size={11} />
                      )
                    ) : (
                      <IconSelector size={11} className="opacity-40" />
                    )}
                  </button>
                </th>
              ))}
              <th className="relative px-2 py-1">
                {selected.size > 0 && (
                  <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 whitespace-nowrap normal-case tracking-normal">
                    <span className="mr-1 text-[11px] font-normal text-foreground">
                      {m.selectedCount(selected.size)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={favSelected}
                      aria-label={m.favSelectedAria}
                      title={m.favSelectedTitle}
                      className="text-muted-foreground hover:text-warn"
                    >
                      <IconStar size={13} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      data-cuelume-press
                      onClick={() => killableSelected.length && setKillTarget(killableSelected)}
                      disabled={killableSelected.length === 0}
                      aria-label={m.killSelectedAria(killableSelected.length)}
                      title={
                        killableSelected.length === 0
                          ? m.allProtected
                          : m.killSelectedTitle(killableSelected.length)
                      }
                      className="text-muted-foreground hover:bg-danger-soft hover:text-danger"
                    >
                      <IconTrash size={13} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={clearSelection}
                      aria-label={m.clearSelection}
                      title={m.clearSelection}
                      className="text-muted-foreground"
                    >
                      <IconSquareXFilled size={13} />
                    </Button>
                  </div>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => {
              const key = `${e.pid}-${e.port}-${e.protocol}-${e.address}`;
              return (
                <PortRow
                  key={key}
                  rowKey={key}
                  entry={e}
                  conflict={conflictPorts.has(e.port)}
                  expanded={expanded === key}
                  fav={favs.has(favKey(e))}
                  selected={selected.has(key)}
                  blocked={blockedSet.has(blockKey(e.port, e.protocol))}
                  onToggleFav={toggleFav}
                  onToggle={toggleExpand}
                  onToggleSelect={toggleSelect}
                  onRequestKill={requestKill}
                  onRequestBlock={requestBlock}
                />
              );
            })}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-1 py-16 text-muted-foreground">
            <IconChevronRight size={20} className="opacity-40" />
            <p className="text-xs">
              {entries.length === 0
                ? m.emptyNoPorts
                : filter === "favs"
                  ? m.emptyNoFavs
                  : m.emptyNoMatch}
            </p>
          </div>
        )}
      </main>

      {killTarget && (
        <KillDialog entries={killTarget} onClose={() => setKillTarget(null)} onKill={kill} />
      )}

      {blockTarget && (
        <BlockDialog
          entry={blockTarget}
          current={
            blocks.find(
              (b) => b.port === blockTarget.port && blockKey(b.port, b.protocol) === blockKey(blockTarget.port, blockTarget.protocol),
            ) ?? null
          }
          onClose={() => setBlockTarget(null)}
          onApply={(inbound, outbound) => applyBlock(blockTarget, inbound, outbound)}
          onUnblock={() => removeBlock(blockTarget)}
        />
      )}

      {settingsOpen && (
        <SettingsDialog
          blocks={blocks}
          onClose={() => setSettingsOpen(false)}
          onBlocksChange={setBlocks}
          onError={setError}
        />
      )}
    </div>
  );
}
