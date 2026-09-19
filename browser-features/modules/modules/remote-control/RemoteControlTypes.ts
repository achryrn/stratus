/* MPL-2.0 */

export interface TabInfo {
  index: number;
  selected: boolean;
  pinned: boolean;
  pending: boolean;
  audible: boolean;
  private: boolean;
  url: string;
  title: string;
}

export interface WindowInfo {
  id: number;
  private: boolean;
  screenX: number;
  screenY: number;
  width: number;
  height: number;
  tabs: TabInfo[];
}

export interface StatusResponse {
  ok: true;
  app: string;
  runtime: string;
  version: string;
  platform: string;
  pid: number;
  port: number;
  tokenSet: boolean;
  windows: WindowInfo[];
}

export interface EvalRequest {
  expression: string;
  context?: "content" | "chrome";
}

export interface EvalResponse {
  ok: boolean;
  value?: unknown;
  error?: string;
}

export interface NavigateRequest {
  url: string;
  index?: number;
  newTab?: boolean;
}

export interface TabsRequest {
  action: "open" | "close" | "activate";
  url?: string;
  index?: number;
}

export interface InputRequest {
  type: "move" | "down" | "up" | "click" | "dblclick" | "wheel" | "key" | "type";
  selector?: string;
  x?: number;
  y?: number;
  dx?: number;
  dy?: number;
  dz?: number;
  button?: "left" | "middle" | "right";
  key?: string;
  text?: string;
  modifiers?: number;
  windowIndex?: number;
}

export interface SettingsRequest {
  name: string;
  type: "bool" | "int" | "string";
  value: boolean | number | string;
}

export interface PrivateOpenRequest {
  url?: string;
}
