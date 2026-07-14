export type Category = "system" | "app" | "dev" | "other";

export interface PortEntry {
  pid: number;
  port: number;
  protocol: string;
  address: string;
  process_name: string;
  executable_path: string;
  command_line: string;
  user: string;
  started_at: string;
  category: Category;
  parent_pid: number;
  parent_name: string;
  cwd: string;
  app_path: string;
}

export interface Block {
  port: number;
  protocol: string;
  inbound: boolean;
  outbound: boolean;
}
