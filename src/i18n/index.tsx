import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { setEnabled } from "cuelume";
import { pt, en, type Locale, type Messages } from "./messages";

export type { Locale, Messages };

export interface Settings {
  locale: Locale;
  sounds: boolean;
  refreshMs: number;
}

const DEFAULTS: Settings = {
  locale: navigator.language?.toLowerCase().startsWith("pt") ? "pt" : "en",
  sounds: true,
  refreshMs: 4000,
};

function loadSettings(): Settings {
  try {
    const stored = JSON.parse(localStorage.getItem("portero:settings") ?? "{}");
    return { ...DEFAULTS, ...stored };
  } catch {
    return DEFAULTS;
  }
}

interface SettingsCtx {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}

const Ctx = createContext<SettingsCtx>({ settings: DEFAULTS, update: () => {} });

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);

  useEffect(() => {
    localStorage.setItem("portero:settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    setEnabled(settings.sounds);
  }, [settings.sounds]);

  const value = useMemo<SettingsCtx>(
    () => ({ settings, update: (patch) => setSettings((s) => ({ ...s, ...patch })) }),
    [settings],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings(): SettingsCtx {
  return useContext(Ctx);
}

export function useMessages(): Messages {
  const { settings } = useSettings();
  return settings.locale === "pt" ? pt : en;
}
