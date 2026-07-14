import type { PortEntry } from "@/types";
import type { Locale } from "@/i18n/messages";

type L = { pt: string; en: string };

// Known macOS daemons / apps, what that process actually is, in plain words.
const PROCESS_HINTS: Record<string, L> = {
  launchd: { pt: "Gerenciador de processos do macOS", en: "macOS process manager" },
  mDNSResponder: {
    pt: "Bonjour, descoberta de dispositivos na rede",
    en: "Bonjour, network device discovery",
  },
  rapportd: {
    pt: "Continuidade / Handoff entre seus dispositivos Apple",
    en: "Continuity / Handoff between your Apple devices",
  },
  sharingd: { pt: "AirDrop e compartilhamento do macOS", en: "macOS AirDrop and sharing" },
  ControlCenter: { pt: "Central de Controle, receptor AirPlay", en: "Control Center, AirPlay receiver" },
  AirPlayXPCHelper: { pt: "Receptor AirPlay do macOS", en: "macOS AirPlay receiver" },
  identityservicesd: {
    pt: "iMessage / FaceTime, serviços de identidade Apple",
    en: "iMessage / FaceTime, Apple identity services",
  },
  netbiosd: {
    pt: "Compartilhamento de arquivos com Windows (SMB)",
    en: "File sharing with Windows (SMB)",
  },
  cupsd: { pt: "Serviço de impressão (CUPS)", en: "Printing service (CUPS)" },
  sshd: { pt: "Servidor SSH, acesso remoto a este Mac", en: "SSH server, remote access to this Mac" },
  bluetoothd: { pt: "Serviço de Bluetooth do macOS", en: "macOS Bluetooth service" },
  remoted: {
    pt: "Comunicação com dispositivos Apple conectados",
    en: "Communication with connected Apple devices",
  },
  assistantd: { pt: "Siri / ditado do macOS", en: "macOS Siri / dictation" },
  screensharingd: { pt: "Compartilhamento de Tela do macOS", en: "macOS Screen Sharing" },
  rpcbind: { pt: "Serviço RPC do sistema", en: "System RPC service" },
  "com.docker.backend": {
    pt: "Docker Desktop, backend de containers",
    en: "Docker Desktop, container backend",
  },
  "docker-proxy": {
    pt: "Docker, encaminhamento de porta de container",
    en: "Docker, container port forwarding",
  },
  OrbStack: { pt: "OrbStack, containers e VMs", en: "OrbStack, containers and VMs" },
  colima: { pt: "Colima, runtime Docker", en: "Colima, Docker runtime" },
  adb: {
    pt: "Android Debug Bridge, depuração de dispositivo Android",
    en: "Android Debug Bridge, Android device debugging",
  },
  Figma: {
    pt: "Aplicativo Figma, plugins e comunicação local",
    en: "Figma app, plugins and local communication",
  },
  "Figma Helper": { pt: "Aplicativo Figma, processo auxiliar", en: "Figma app, helper process" },
  Discord: { pt: "Discord, Rich Presence / RPC local", en: "Discord, Rich Presence / local RPC" },
  Spotify: { pt: "Spotify, Connect e streaming local", en: "Spotify, Connect and local streaming" },
  Dropbox: { pt: "Dropbox, sincronização LAN", en: "Dropbox, LAN sync" },
  OneDrive: { pt: "OneDrive, sincronização", en: "OneDrive, sync" },
  "Google Chrome Helper": { pt: "Google Chrome, processo auxiliar", en: "Google Chrome, helper process" },
  "Google Chrome": { pt: "Navegador Google Chrome", en: "Google Chrome browser" },
  Arc: { pt: "Navegador Arc", en: "Arc browser" },
  Safari: { pt: "Navegador Safari", en: "Safari browser" },
  firefox: { pt: "Navegador Firefox", en: "Firefox browser" },
  Raycast: { pt: "Raycast, extensões locais", en: "Raycast, local extensions" },
  ollama: { pt: "Ollama, servidor local de LLMs", en: "Ollama, local LLM server" },
  postgres: { pt: "Banco de dados PostgreSQL", en: "PostgreSQL database" },
  mysqld: { pt: "Banco de dados MySQL", en: "MySQL database" },
  "redis-server": { pt: "Banco de dados Redis", en: "Redis database" },
  mongod: { pt: "Banco de dados MongoDB", en: "MongoDB database" },
  nginx: { pt: "Servidor web nginx", en: "nginx web server" },
  httpd: { pt: "Servidor web Apache", en: "Apache web server" },
  java: { pt: "Aplicação Java (JVM)", en: "Java application (JVM)" },
  Postman: { pt: "Postman, proxy/agent local", en: "Postman, local proxy/agent" },
  "Code Helper": { pt: "VS Code, processo auxiliar", en: "VS Code, helper process" },
  "Code Helper (Plugin)": { pt: "VS Code, extensões", en: "VS Code, extensions" },
};

// Dev-tool fingerprints in the full command line, checked in order.
const CMDLINE_HINTS: [RegExp, L][] = [
  [/vite/i, { pt: "Servidor de dev Vite", en: "Vite dev server" }],
  [/next[/ ]|next dev|next-server/i, { pt: "Servidor de dev Next.js", en: "Next.js dev server" }],
  [/react-scripts/i, { pt: "Create React App, dev server", en: "Create React App dev server" }],
  [/webpack/i, { pt: "Webpack dev server", en: "Webpack dev server" }],
  [/storybook/i, { pt: "Storybook", en: "Storybook" }],
  [/nodemon/i, { pt: "Nodemon, Node.js com auto-reload", en: "Nodemon, Node.js with auto-reload" }],
  [/ts-node|\btsx\b/i, { pt: "Script TypeScript (ts-node/tsx)", en: "TypeScript script (ts-node/tsx)" }],
  [/tauri/i, { pt: "Tauri, app em desenvolvimento", en: "Tauri, app in development" }],
  [/expo|metro/i, { pt: "Expo / Metro, React Native", en: "Expo / Metro, React Native" }],
  [/uvicorn|gunicorn/i, { pt: "Servidor Python (ASGI/WSGI)", en: "Python server (ASGI/WSGI)" }],
  [/flask/i, { pt: "Servidor Flask (Python)", en: "Flask server (Python)" }],
  [/manage\.py runserver|django/i, { pt: "Servidor Django (Python)", en: "Django server (Python)" }],
  [/jupyter/i, { pt: "Jupyter Notebook", en: "Jupyter Notebook" }],
  [/streamlit/i, { pt: "Streamlit (Python)", en: "Streamlit (Python)" }],
  [/rails|puma/i, { pt: "Servidor Rails/Puma (Ruby)", en: "Rails/Puma server (Ruby)" }],
  [/php artisan|artisan serve/i, { pt: "Laravel, php artisan serve", en: "Laravel, php artisan serve" }],
  [/prisma studio/i, { pt: "Prisma Studio", en: "Prisma Studio" }],
  [/firebase.*emulator/i, { pt: "Firebase Emulators", en: "Firebase Emulators" }],
  [/supabase/i, { pt: "Supabase local", en: "Local Supabase" }],
  [/wrangler/i, { pt: "Cloudflare Wrangler", en: "Cloudflare Wrangler" }],
  [/graphql/i, { pt: "Servidor GraphQL", en: "GraphQL server" }],
  [/electron/i, { pt: "App Electron em desenvolvimento", en: "Electron app in development" }],
  [/esbuild/i, { pt: "esbuild, serviço de build", en: "esbuild, build service" }],
  [/turbopack|turbo run/i, { pt: "Turborepo / Turbopack", en: "Turborepo / Turbopack" }],
  [/pnpm|npm run|yarn/i, { pt: "Script de projeto (npm/pnpm/yarn)", en: "Project script (npm/pnpm/yarn)" }],
];

// Well-known port numbers, used when the process itself tells us little.
const PORT_HINTS: Record<number, L> = {
  22: { pt: "SSH", en: "SSH" },
  53: { pt: "DNS", en: "DNS" },
  80: { pt: "HTTP", en: "HTTP" },
  443: { pt: "HTTPS", en: "HTTPS" },
  1420: { pt: "porta padrão do Tauri dev", en: "Tauri dev default port" },
  3000: { pt: "porta comum de dev (React/Next/Express)", en: "common dev port (React/Next/Express)" },
  3001: { pt: "porta comum de dev", en: "common dev port" },
  3306: { pt: "MySQL", en: "MySQL" },
  4200: { pt: "Angular dev server", en: "Angular dev server" },
  5000: { pt: "AirPlay do macOS / Flask", en: "macOS AirPlay / Flask" },
  5037: { pt: "servidor do ADB (Android)", en: "ADB server (Android)" },
  5173: { pt: "porta padrão do Vite", en: "Vite default port" },
  5432: { pt: "PostgreSQL", en: "PostgreSQL" },
  5555: { pt: "Prisma Studio / ADB", en: "Prisma Studio / ADB" },
  5900: { pt: "Compartilhamento de Tela (VNC)", en: "Screen Sharing (VNC)" },
  6006: { pt: "Storybook", en: "Storybook" },
  6379: { pt: "Redis", en: "Redis" },
  7000: { pt: "AirPlay do macOS", en: "macOS AirPlay" },
  8000: { pt: "porta comum de dev (Django/uvicorn)", en: "common dev port (Django/uvicorn)" },
  8080: { pt: "HTTP alternativo / proxies", en: "alternative HTTP / proxies" },
  8888: { pt: "Jupyter Notebook", en: "Jupyter Notebook" },
  9229: { pt: "debugger do Node.js", en: "Node.js debugger" },
  11434: { pt: "Ollama (LLMs locais)", en: "Ollama (local LLMs)" },
  19000: { pt: "Expo", en: "Expo" },
  27017: { pt: "MongoDB", en: "MongoDB" },
};

// Generic runtimes: only useful when nothing more specific matched.
const RUNTIME_HINTS: Record<string, string> = {
  node: "Node.js",
  bun: "Bun",
  deno: "Deno",
  python: "Python",
  python3: "Python",
  ruby: "Ruby",
};

function basename(p: string): string {
  const clean = p.replace(/\/+$/, "");
  return clean.slice(clean.lastIndexOf("/") + 1);
}

/** Entry script from the command line, e.g. "src/index.ts". */
function entryScript(cmdline: string): string | null {
  const tokens = cmdline.split(/\s+/).slice(1);
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i];
    if (/\.(ts|tsx|js|jsx|mjs|cjs|py|rb)$/.test(t) && !t.includes("node_modules")) {
      // strip absolute prefixes down to something readable
      return t.length > 40 ? basename(t) : t;
    }
  }
  return null;
}

/** Human explanation of what this port entry actually is. */
export function describeEntry(e: PortEntry, locale: Locale): string | null {
  const parts: string[] = [];

  const byProc = PROCESS_HINTS[e.process_name];
  if (byProc) {
    parts.push(byProc[locale]);
  } else {
    const byCmd = CMDLINE_HINTS.find(([re]) => re.test(e.command_line));
    if (byCmd) parts.push(byCmd[1][locale]);
    else if (RUNTIME_HINTS[e.process_name]) parts.push(RUNTIME_HINTS[e.process_name]);
  }

  if (e.category === "dev") {
    const script = entryScript(e.command_line);
    if (script) parts.push(script);
  }

  // For dev processes, the project folder is usually the most useful hint.
  if (e.category === "dev" && e.cwd && e.cwd !== "/") {
    const project = basename(e.cwd);
    if (project) {
      parts.push(locale === "pt" ? `projeto “${project}”` : `project “${project}”`);
    }
  }

  if (parts.length === 0) {
    const byPort = PORT_HINTS[e.port];
    if (byPort) parts.push(byPort[locale]);
  }

  return parts.length ? parts.join(" · ") : null;
}

/** Short hint for the port number itself (shown in details). */
export function describePort(port: number, locale: Locale): string | null {
  return PORT_HINTS[port]?.[locale] ?? null;
}
