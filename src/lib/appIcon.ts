import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

// Module-level cache: one backend round-trip per .app bundle, ever.
const cache = new Map<string, string | null>();
const pending = new Map<string, Promise<string | null>>();

export function useAppIcon(exePath: string): string | null {
  const [icon, setIcon] = useState<string | null>(() => cache.get(exePath) ?? null);

  useEffect(() => {
    if (!exePath.includes(".app/")) return;
    if (cache.has(exePath)) {
      setIcon(cache.get(exePath)!);
      return;
    }
    let alive = true;
    let p = pending.get(exePath);
    if (!p) {
      p = invoke<string | null>("app_icon", { exePath }).catch(() => null);
      pending.set(exePath, p);
    }
    p.then((v) => {
      cache.set(exePath, v);
      pending.delete(exePath);
      if (alive) setIcon(v);
    });
    return () => {
      alive = false;
    };
  }, [exePath]);

  return exePath.includes(".app/") ? icon : null;
}
