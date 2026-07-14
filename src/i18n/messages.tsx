export type Locale = "pt" | "en";

export const pt = {
  // header
  listeningPorts: (n: number) => (n === 1 ? "1 porta em escuta" : `${n} portas em escuta`),
  conflictBadge: (n: number) => (n === 1 ? "1 porta em conflito" : `${n} portas em conflito`),
  viewConflicts: "Ver conflitos",
  searchPlaceholder: "Buscar porta, processo, caminho…",
  search: "Buscar",
  clearSearch: "Limpar busca",
  refresh: "Atualizar",
  settings: "Ajustes",
  closeError: "Fechar erro",

  // filters
  filterAll: "Todas",
  filterSystem: "Sistema",
  filterApps: "Apps",
  filterDev: "Terminal",
  filterOther: "Outros",
  filterFavs: "Favoritos",
  filterConflicts: "Conflitos",

  // columns
  colPort: "Porta",
  colProtocol: "Proto",
  colProcess: "Processo",
  colPid: "PID",
  colCategory: "Categoria",
  colAddress: "Endereço",
  colStarted: "Iniciado",
  sortBy: (col: string) => `Ordenar por ${col}`,

  // selection toolbar
  selectedCount: (n: number) => (n === 1 ? "1 selecionado" : `${n} selecionados`),
  favSelectedAria: "Favoritar selecionados",
  favSelectedTitle: "Favoritar/desfavoritar selecionados",
  killSelectedAria: (n: number) => `Encerrar ${n} selecionados`,
  killSelectedTitle: (n: number) => `Encerrar ${n} processo${n > 1 ? "s" : ""}…`,
  allProtected: "Todos os selecionados estão protegidos pelos favoritos",
  clearSelection: "Desmarcar tudo",

  // empty states
  emptyNoPorts: "Nenhuma porta em escuta.",
  emptyNoFavs: "Nenhum favorito, clique na estrela de um processo para protegê-lo.",
  emptyNoMatch: "Nada encontrado, ajuste busca ou filtro.",

  // categories
  catSystem: "Sistema",
  catSystemHint: "Processo do macOS, encerrar pode afetar funções do sistema",
  catApp: "App",
  catAppHint: "Aplicativo instalado",
  catDev: "Terminal",
  catDevHint: "Processo de desenvolvimento iniciado no terminal",
  catOther: "Outro",
  catOtherHint: "Processo do usuário",

  // row
  selectRow: (name: string, port: number) => `Selecionar ${name} (porta ${port})`,
  conflictPort: "Porta em conflito",
  blockedPort: "Porta bloqueada",
  openInBrowser: "Abrir no navegador",
  favAdd: "Favoritar, protege contra encerramento",
  favRemove: "Remover dos favoritos",
  blockAria: (port: number) => `Bloquear porta ${port}`,
  blockEditAria: (port: number) => `Editar bloqueio da porta ${port}`,
  blockedTitle: "Porta bloqueada, clique para editar",
  blockTitle: "Bloquear porta…",
  killProtectedAria: (name: string) => `${name} está protegido pelos favoritos`,
  killAria: (name: string, pid: number) => `Encerrar ${name} (PID ${pid})`,
  killProtectedTitle: "Protegido, remova a estrela para poder encerrar",
  killActionTitle: "Encerrar processo…",
  kill: "Encerrar",
  copy: "Copiar",
  copied: "Copiado!",
  copiedAria: "Copiado",
  copiedSr: "Copiado para a área de transferência",

  // expanded details
  whatIs: "O que é",
  path: "Caminho",
  fullCommand: "Comando completo",
  workingDir: "Pasta de trabalho",
  user: "Usuário",
  startedAt: "Iniciado em",
  parentProcess: "Processo pai",
  address: "Endereço",
  conflict: "Conflito",
  conflictDetail: (port: number) =>
    `Mais de um processo escutando na porta ${port}, isso costuma causar erro “address already in use”.`,

  // kill dialog
  killDialogTitle: (name: string) => `Encerrar “${name}”?`,
  killDialogTitleMulti: (n: number) => `Encerrar ${n} processos?`,
  close: "Fechar",
  port: "Porta",
  portAtPid: (port: number, pid: number) => `porta ${port} · PID ${pid}`,
  andMore: (n: number) => `e mais ${n} processo${n > 1 ? "s" : ""}`,
  killWarning: (single: boolean) => (
    <>
      <strong className="text-foreground">Encerrar</strong> pede para{" "}
      {single ? "o processo" : "os processos"} finalizar com segurança.{" "}
      <strong className="text-foreground">Forçar</strong> mata na hora, use só se não responder.
      Trabalho não salvo pode ser perdido.
    </>
  ),
  cancel: "Cancelar",
  force: "Forçar",
  forcing: "Forçando…",
  killConfirm: "Encerrar processo",
  killConfirmMulti: (n: number) => `Encerrar ${n} processos`,
  killing: "Encerrando…",

  // block dialog
  blockDialogTitle: (port: number) => `Bloquear porta ${port}`,
  blockDialogTitleEdit: (port: number) => `Editar bloqueio da porta ${port}`,
  blockDialogDesc: (port: number, proto: string) =>
    `Escolha o que bloquear na porta ${port}/${proto}. As regras usam o firewall do macOS (pf).`,
  blockInbound: "Bloquear entradas",
  blockInboundHint: "Conexões de fora chegando nesta porta",
  blockOutbound: "Bloquear saídas",
  blockOutboundHint: "Conexões saindo desta máquina por esta porta",
  adminWarning: "O macOS vai pedir sua senha de administrador para alterar o firewall.",
  unblock: "Desbloquear",
  unblocking: "Desbloqueando…",
  block: "Bloquear",
  blocking: "Bloqueando…",

  // settings dialog
  settingsTitle: "Ajustes",
  languageSection: "Idioma",
  soundsSection: "Sons",
  soundsLabel: "Sons da interface",
  soundsHint: "Pequenos efeitos sonoros ao interagir",
  refreshSection: "Atualização",
  refreshLabel: "Intervalo de atualização",
  refreshHint: "Frequência com que a lista de portas é atualizada",
  refreshOption: (s: number) => `${s} s`,
  blocksSection: "Bloqueios",
  blocksCount: (n: number) =>
    n === 0
      ? "Nenhuma porta bloqueada"
      : n === 1
        ? "1 porta bloqueada"
        : `${n} portas bloqueadas`,
  reapplyBlocks: "Reaplicar regras",
  reapplying: "Reaplicando…",
  reapplyHint:
    "As regras do firewall não sobrevivem à reinicialização do Mac. Reaplique aqui depois de reiniciar.",
};

export type Messages = typeof pt;

export const en: Messages = {
  // header
  listeningPorts: (n) => (n === 1 ? "1 listening port" : `${n} listening ports`),
  conflictBadge: (n) => (n === 1 ? "1 port in conflict" : `${n} ports in conflict`),
  viewConflicts: "View conflicts",
  searchPlaceholder: "Search port, process, path…",
  search: "Search",
  clearSearch: "Clear search",
  refresh: "Refresh",
  settings: "Settings",
  closeError: "Dismiss error",

  // filters
  filterAll: "All",
  filterSystem: "System",
  filterApps: "Apps",
  filterDev: "Terminal",
  filterOther: "Other",
  filterFavs: "Favorites",
  filterConflicts: "Conflicts",

  // columns
  colPort: "Port",
  colProtocol: "Proto",
  colProcess: "Process",
  colPid: "PID",
  colCategory: "Category",
  colAddress: "Address",
  colStarted: "Started",
  sortBy: (col) => `Sort by ${col}`,

  // selection toolbar
  selectedCount: (n) => (n === 1 ? "1 selected" : `${n} selected`),
  favSelectedAria: "Favorite selected",
  favSelectedTitle: "Favorite/unfavorite selected",
  killSelectedAria: (n) => `Kill ${n} selected`,
  killSelectedTitle: (n) => `Kill ${n} process${n > 1 ? "es" : ""}…`,
  allProtected: "All selected processes are protected by favorites",
  clearSelection: "Deselect all",

  // empty states
  emptyNoPorts: "No listening ports.",
  emptyNoFavs: "No favorites yet, click a process's star to protect it.",
  emptyNoMatch: "Nothing found, adjust your search or filter.",

  // categories
  catSystem: "System",
  catSystemHint: "macOS process, killing it may affect system features",
  catApp: "App",
  catAppHint: "Installed application",
  catDev: "Terminal",
  catDevHint: "Development process started from the terminal",
  catOther: "Other",
  catOtherHint: "User process",

  // row
  selectRow: (name, port) => `Select ${name} (port ${port})`,
  conflictPort: "Port in conflict",
  blockedPort: "Port blocked",
  openInBrowser: "Open in browser",
  favAdd: "Favorite, protects against killing",
  favRemove: "Remove from favorites",
  blockAria: (port) => `Block port ${port}`,
  blockEditAria: (port) => `Edit block for port ${port}`,
  blockedTitle: "Port blocked, click to edit",
  blockTitle: "Block port…",
  killProtectedAria: (name) => `${name} is protected by favorites`,
  killAria: (name, pid) => `Kill ${name} (PID ${pid})`,
  killProtectedTitle: "Protected, remove the star to allow killing",
  killActionTitle: "Kill process…",
  kill: "Kill",
  copy: "Copy",
  copied: "Copied!",
  copiedAria: "Copied",
  copiedSr: "Copied to clipboard",

  // expanded details
  whatIs: "What it is",
  path: "Path",
  fullCommand: "Full command",
  workingDir: "Working directory",
  user: "User",
  startedAt: "Started at",
  parentProcess: "Parent process",
  address: "Address",
  conflict: "Conflict",
  conflictDetail: (port) =>
    `More than one process is listening on port ${port}, this usually causes “address already in use” errors.`,

  // kill dialog
  killDialogTitle: (name) => `Kill “${name}”?`,
  killDialogTitleMulti: (n) => `Kill ${n} processes?`,
  close: "Close",
  port: "Port",
  portAtPid: (port, pid) => `port ${port} · PID ${pid}`,
  andMore: (n) => `and ${n} more process${n > 1 ? "es" : ""}`,
  killWarning: (single) => (
    <>
      <strong className="text-foreground">Kill</strong> asks{" "}
      {single ? "the process" : "the processes"} to shut down safely.{" "}
      <strong className="text-foreground">Force</strong> kills immediately, use it only if it
      doesn't respond. Unsaved work may be lost.
    </>
  ),
  cancel: "Cancel",
  force: "Force",
  forcing: "Forcing…",
  killConfirm: "Kill process",
  killConfirmMulti: (n) => `Kill ${n} processes`,
  killing: "Killing…",

  // block dialog
  blockDialogTitle: (port) => `Block port ${port}`,
  blockDialogTitleEdit: (port) => `Edit block for port ${port}`,
  blockDialogDesc: (port, proto) =>
    `Choose what to block on port ${port}/${proto}. Rules use the macOS firewall (pf).`,
  blockInbound: "Block inbound",
  blockInboundHint: "Connections from outside reaching this port",
  blockOutbound: "Block outbound",
  blockOutboundHint: "Connections leaving this machine through this port",
  adminWarning: "macOS will ask for your administrator password to change the firewall.",
  unblock: "Unblock",
  unblocking: "Unblocking…",
  block: "Block",
  blocking: "Blocking…",

  // settings dialog
  settingsTitle: "Settings",
  languageSection: "Language",
  soundsSection: "Sounds",
  soundsLabel: "Interface sounds",
  soundsHint: "Small sound effects when interacting",
  refreshSection: "Refresh",
  refreshLabel: "Refresh interval",
  refreshHint: "How often the port list is refreshed",
  refreshOption: (s) => `${s} s`,
  blocksSection: "Blocks",
  blocksCount: (n) =>
    n === 0 ? "No blocked ports" : n === 1 ? "1 blocked port" : `${n} blocked ports`,
  reapplyBlocks: "Reapply rules",
  reapplying: "Reapplying…",
  reapplyHint:
    "Firewall rules do not survive a Mac restart. Reapply them here after rebooting.",
};
