import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { PortEntry } from "@/types";

// Wildcard binds also listen on loopback, so probe those via 127.0.0.1.
const WILDCARDS = new Set(["", "*", "0.0.0.0", "::", "[::]"]);

function probeHost(address: string): string {
  const bare = address.replace(/^\[|\]$/g, "");
  return WILDCARDS.has(bare) || WILDCARDS.has(address) ? "127.0.0.1" : bare;
}

/** URL opened in the browser for this entry. */
export function browserUrl(e: PortEntry): string {
  const host = probeHost(e.address);
  const shown =
    host === "127.0.0.1" || host === "::1"
      ? "localhost"
      : host.includes(":")
        ? `[${host}]`
        : host;
  return `http://${shown}:${e.port}`;
}

/** Only TCP, non-system entries are worth probing for an HTTP frontend. */
function isCandidate(e: PortEntry): boolean {
  return e.protocol === "TCP" && e.category !== "system";
}

// Shared promise cache: one probe per (pid, port, address) across all rows.
// Successes stay cached for the process's lifetime; failures retry after a while.
const probes = new Map<string, Promise<boolean>>();
const FAIL_RETRY_MS = 60_000;

function probe(e: PortEntry): Promise<boolean> {
  const key = `${e.pid}:${e.port}:${e.address}`;
  let p = probes.get(key);
  if (!p) {
    p = invoke<boolean>("http_probe", { host: probeHost(e.address), port: e.port }).catch(
      () => false,
    );
    probes.set(key, p);
    p.then((ok) => {
      if (!ok) setTimeout(() => probes.delete(key), FAIL_RETRY_MS);
    });
  }
  return p;
}

/** True when the entry answers HTTP on its port (i.e. a frontend/web server is running). */
export function useHttpProbe(e: PortEntry): boolean {
  const candidate = isCandidate(e);
  const key = `${e.pid}:${e.port}:${e.address}`;
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!candidate) return;
    let alive = true;
    probe(e).then((v) => {
      if (alive) setOk(v);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, candidate]);

  return candidate && ok;
}
