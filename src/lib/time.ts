import type { Locale } from "@/i18n/messages";

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

const MONTHS_SHORT: Record<Locale, string[]> = {
  pt: ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};

const MONTHS_FULL: Record<Locale, string[]> = {
  pt: [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ],
  en: [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ],
};

/** "Mon Jul 13 21:48:00 2026" -> epoch ms (Date.parse chokes on this in WebKit). */
export function parseStarted(lstart: string): number {
  const p = lstart.split(" ");
  if (p.length !== 5) return 0;
  const [h, m, s] = p[3].split(":").map(Number);
  return new Date(Number(p[4]), MONTHS[p[1]] ?? 0, Number(p[2]), h, m, s).getTime();
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Compact column format: "hoje 21:48" / "ontem 15:57" / "13 jul 21:48" / "29 jun 2025". */
export function formatStartedShort(lstart: string, locale: Locale): string {
  const ts = parseStarted(lstart);
  if (!ts) return lstart;
  const d = new Date(ts);
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const today = locale === "pt" ? "hoje" : "today";
  const yday = locale === "pt" ? "ontem" : "yesterday";
  const mon = MONTHS_SHORT[locale][d.getMonth()];
  if (sameDay(d, now)) return `${today} ${hhmm(d)}`;
  if (sameDay(d, yesterday)) return `${yday} ${hhmm(d)}`;
  if (locale === "pt") {
    if (d.getFullYear() === now.getFullYear()) return `${d.getDate()} ${mon} ${hhmm(d)}`;
    return `${d.getDate()} ${mon} ${d.getFullYear()}`;
  }
  if (d.getFullYear() === now.getFullYear()) return `${mon} ${d.getDate()} ${hhmm(d)}`;
  return `${mon} ${d.getDate()} ${d.getFullYear()}`;
}

function relative(ts: number, locale: Locale): string {
  const mins = Math.floor((Date.now() - ts) / 60_000);
  if (locale === "pt") {
    if (mins < 1) return "agora mesmo";
    if (mins < 60) return `há ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `há ${hours} h`;
    const days = Math.floor(hours / 24);
    return days === 1 ? "há 1 dia" : `há ${days} dias`;
  }
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

/** Full detail format: "13 de julho de 2026 às 21:48 (há 2 h)" / "July 13, 2026 at 21:48 (2 h ago)". */
export function formatStartedLong(lstart: string, locale: Locale): string {
  const ts = parseStarted(lstart);
  if (!ts) return lstart || "-";
  const d = new Date(ts);
  const rel = relative(ts, locale);
  if (locale === "pt") {
    return `${d.getDate()} de ${MONTHS_FULL.pt[d.getMonth()]} de ${d.getFullYear()} às ${hhmm(d)} (${rel})`;
  }
  return `${MONTHS_FULL.en[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} at ${hhmm(d)} (${rel})`;
}
