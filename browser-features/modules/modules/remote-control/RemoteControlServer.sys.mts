
/* MPL-2.0 */

/**
 * Stratus Remote-Control Server (localhost only, JSON over HTTP).
 * Lets AI agents drive the RELEASE browser WITHOUT dev mode.
 * Binds 127.0.0.1 only. SECURITY (production posture):
 *  - bearer token required by default: `stratus.remote.token` is auto-
 *    generated on first boot if empty (never silently open).
 *  - Origin header policy: cross-origin requests (e.g. from a webpage
 *    fetched by the browser) are rejected with 403 unless the origin is
 *    the server itself / null / resource://noraneko. CLI agents (no
 *    Origin) keep working.
 *  - body size capped (413) at 4 MiB; in-flight requests capped (429).
 *  - bounded audit trail of operations exposed via GET /audit.
 *
 * GET  /status   GET /tabs   GET /page   GET /audit
 * POST /navigate {url,newTab?}   POST /tabs {action:open|close|activate,...}
 * POST /eval {expression,context:content|chrome}
 * POST /input {type:move|down|up|click|dblclick|wheel|key|type, selector?/x?/y?, ...}
 * GET  /screenshot   POST /settings {name,type,value}   GET /prefs?name=
 * POST /private/open {url?}
 */

import {
  binaryStringToByteArray,
  err as logError,
  jsonResponse,
  parseRequestHead,
} from "../os-server/http/utils.sys.mts";
import { Router, type HttpMethod, type HttpResult } from "../os-server/router.sys.mts";

import type {
  EvalRequest,
  EvalResponse,
  InputRequest,
  NavigateRequest,
  PrivateOpenRequest,
  SettingsRequest,
  TabsRequest,
  TabInfo,
  WindowInfo,
} from "./RemoteControlTypes.ts";
import {
  buttonId,
  elementCenterScreen,
  elementRect,
  nativeClick,
  nativeKey,
  nativeType,
  nativeWheel,
} from "./RemoteControlInput.sys.mts";

const { setTimeout, clearTimeout } = ChromeUtils.importESModule(
  "resource://gre/modules/Timer.sys.mjs",
);

export interface AuditEntry {
  t: number;
  method: string;
  path: string;
  status: number;
  origin: string;
}

export const REMOTE_PORT_PREF = "stratus.remote.port";
export const REMOTE_ENABLED_PREF = "stratus.remote.enabled";
export const REMOTE_TOKEN_PREF = "stratus.remote.token";
export const DEFAULT_PORT = 58263;

/**
 * Production stance: never leave the control server silently open.
 * If the token pref is empty it is generated on first boot (32 hex chars)
 * and stored as a user pref, so authorization stays required by default.
 * A user-set token always wins; clearing it back to "" regenerates on next
 * boot instead of reopening the port.
 */
export function ensureRemoteToken(): string {
  const existing = Services.prefs.getStringPref(REMOTE_TOKEN_PREF, "");
  if (existing) {
    return existing;
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let token = "";
  for (const b of bytes) token += b.toString(16).padStart(2, "0");
  Services.prefs.setStringPref(REMOTE_TOKEN_PREF, token);
  return token;
}

/** Allowed request origins: none (CLI agents) / opaque / self / our chrome UI. */
function originAllowed(origin: string): boolean {
  if (!origin) return true;
  if (origin === "null") return true;
  if (origin.startsWith("resource://noraneko")) return true;
  if (origin.startsWith("http://127.0.0.1")) return true;
  if (origin.startsWith("http://localhost")) return true;
  return false;
}

// -- window helpers -----------------------------------------------------------

type BrowserWindow = {
  gBrowser: {
    tabs: Array<unknown>;
    selectedTab: unknown;
    selectedBrowser: unknown;
    addTrustedTab(url: string, opts?: unknown): unknown;
    removeTab(tab: unknown): void;
  };
  screenX: number;
  screenY: number;
  innerWidth: number;
  innerHeight: number;
  windowUtils: unknown;
  gPrivateBrowsing?: boolean;
  close(): void;
};

function allWindows(): BrowserWindow[] {
  const out: BrowserWindow[] = [];
  const wins = Services.wm.getEnumerator("navigator:browser") as unknown as {
    hasMoreElements(): boolean;
    getNext(): unknown;
  };
  while (wins.hasMoreElements()) {
    out.push(wins.getNext() as BrowserWindow);
  }
  return out;
}

function windowAt(index?: number): BrowserWindow | null {
  const all = allWindows();
  if (!all.length) return null;
  if (index === undefined || index < 0 || index >= all.length) return all[all.length - 1];
  return all[index];
}

function mainWindow(): BrowserWindow | null {
  return windowAt();
}

function tabInfoOf(window_: unknown, tab: unknown, index: number): TabInfo {
  const t = tab as {
    linkedBrowser?: { currentURI?: { spec?: string }; contentTitle?: string };
    selected?: boolean;
    pinned?: boolean;
    audible?: unknown;
    getAttribute?(name: string): string | null;
  };
  const bcPrivate = !!(t.linkedBrowser as { browsingContext?: { usePrivateBrowsing?: boolean } } | undefined)
    ?.browsingContext?.usePrivateBrowsing;
  return {
    index,
    selected: t.selected === true,
    pinned: t.pinned === true,
    pending: t.getAttribute?.("pending") === "true",
    audible: !!t.audible,
    private: bcPrivate || !!(window_ as BrowserWindow).gPrivateBrowsing,
    url: String(t.linkedBrowser?.currentURI?.spec ?? ""),
    title: String(t.linkedBrowser?.contentTitle ?? ""),
  };
}

function windowInfoOf(window_: unknown): WindowInfo | null {
  const w = window_ as BrowserWindow;
  const tabs = w.gBrowser?.tabs;
  if (!tabs) return null;
  return {
    id: (window_ as { outerWindowID?: number }).outerWindowID ?? 0,
    private: w.gPrivateBrowsing === true,
    screenX: w.screenX ?? 0,
    screenY: w.screenY ?? 0,
    width: w.innerWidth ?? 0,
    height: w.innerHeight ?? 0,
    tabs: tabs.map((t, i) => tabInfoOf(window_, t, i)),
  };
}

// -- actor (content) access ---------------------------------------------------

async function actorQuery(
  browser: unknown,
  name: string,
  data: Record<string, unknown>,
): Promise<{ ok: boolean; value?: unknown; error?: string; rect?: unknown; snapshot?: unknown }> {
  const b = browser as {
    browsingContext?: {
      currentWindowGlobal?: {
        getActor(n: string): { sendQuery(n: string, d: unknown): Promise<Record<string, unknown>> };
      } | null;
    } | null;
  };
  const wg = b.browsingContext?.currentWindowGlobal;
  if (!wg) {
    return { ok: false, error: "no current window global (page not loaded)" };
  }
  try {
    const actor = wg.getActor("RemoteControl");
    return (await actor.sendQuery(name, data)) as unknown as {
      ok: boolean;
      value?: unknown;
      error?: string;
      rect?: unknown;
      snapshot?: unknown;
    };
  } catch (error) {
    return { ok: false, error: String(error).slice(0, 300) };
  }
}

function safeResult(value: unknown): unknown {
  if (value === null || value === undefined) return value ?? null;
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean") return value;
  try {
    return JSON.parse(JSON.stringify(value, (_k, v) => (typeof v === "function" ? undefined : v)));
  } catch {
    return String(value).slice(0, 1000);
  }
}

// -- handlers ----------------------------------------------------------------

function hStatus(): HttpResult<unknown> {
  const port = Services.prefs.getIntPref(REMOTE_PORT_PREF, DEFAULT_PORT);
  const tokenSet = Services.prefs.getStringPref(REMOTE_TOKEN_PREF, "").length > 0;
  return { status: 200, body: {
    ok: true,
    app: "Stratus",
    runtime: Services.appinfo.name + " " + Services.appinfo.version,
    version: "remote-control/1.0",
    platform: Services.appinfo.OS ?? "unknown",
    pid: Services.appinfo.processID,
    port,
    tokenSet,
    windows: allWindows().map((w) => windowInfoOf(w)).filter((x): x is WindowInfo => x !== null),
  } };
}

function hTabs(): HttpResult<{ ok: true; tabs: TabInfo[] }> {
  const tabs: TabInfo[] = [];
  for (const w of allWindows()) {
    const info = windowInfoOf(w);
    if (info) tabs.push(...info.tabs);
  }
  return { status: 200, body: { ok: true, tabs } };
}

function hNavigate(req: NavigateRequest): HttpResult<{ ok: boolean; url?: string; error?: string }> {
  const url = String(req.url ?? "").trim();
  if (!url) return { status: 400, body: { ok: false, error: "url required" } };
  const w = mainWindow();
  if (!w) return { status: 400, body: { ok: false, error: "no browser window" } };
  try {
    if (req.newTab) {
      w.gBrowser.addTrustedTab(url, { relatedToCurrent: true });
      return { status: 200, body: { ok: true, url } };
    }
    (w.gBrowser.selectedBrowser as { fixupAndLoadURIString(u: string, o: unknown): void })
      .fixupAndLoadURIString(url, { triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal() });
    return { status: 200, body: { ok: true, url } };
  } catch (error) {
    return { status: 400, body: { ok: false, error: String(error).slice(0, 300) } };
  }
}

function hTabsAction(req: TabsRequest): HttpResult<{ ok: boolean; error?: string }> {
  const w = mainWindow();
  if (!w) return { status: 400, body: { ok: false, error: "no browser window" } };
  if (req.action === "open") {
    if (!req.url) return { status: 400, body: { ok: false, error: "open requires url" } };
    w.gBrowser.addTrustedTab(req.url, { relatedToCurrent: true });
    return { status: 200, body: { ok: true } };
  }
  if (req.action === "close") {
    const win = mainWindow();
    const tabs = win?.gBrowser?.tabs;
    if (!win || !tabs || tabs.length <= 1) {
      return { status: 400, body: { ok: false, error: "refusing to close the last tab of a window" } };
    }
    const idx = req.index === undefined || req.index < 0 ? tabs.length - 1 : req.index;
    win.gBrowser.removeTab(tabs[idx]);
    return { status: 200, body: { ok: true } };
  }
  if (req.action === "activate") {
    const win = mainWindow();
    const tabs = win?.gBrowser?.tabs;
    if (!win || !tabs || !tabs.length) return { status: 400, body: { ok: false, error: "no tab to activate" } };
    const idx = req.index === undefined || req.index < 0 ? tabs.length - 1 : req.index;
    win.gBrowser.selectedTab = tabs[idx];
    return { status: 200, body: { ok: true } };
  }
  return { status: 400, body: { ok: false, error: "unknown action: " + req.action } };
}

async function hPage(): Promise<HttpResult<unknown>> {
  const w = mainWindow();
  if (!w) return { status: 400, body: { ok: false, error: "no browser window" } };
  const browser = w.gBrowser.selectedBrowser as {
    currentURI?: { spec?: string };
    contentTitle?: string;
  };
  const res = await actorQuery(browser, "RCSnapshot", {});
  if (res.ok && res.snapshot) {
    return { status: 200, body: { ok: true, ...(res.snapshot as object) } };
  }
  return {
    status: 200,
    body: {
      ok: true,
      url: String(browser.currentURI?.spec ?? ""),
      title: String(browser.contentTitle ?? ""),
      text: "",
      note: String(res.error ?? ""),
    },
  };
}

async function hEval(req: EvalRequest): Promise<HttpResult<EvalResponse>> {
  const expression = String(req.expression ?? "");
  if (!expression.trim()) return { status: 400, body: { ok: false, error: "expression required" } };
  const w = mainWindow();
  if (!w) return { status: 400, body: { ok: false, error: "no browser window" } };
  try {
    if (req.context === "chrome") {
      // eval() under the system principal is hard-blocked (MOZ_CRASH) outside
      // automation; use an XPConnect sandbox with the window as prototype.
      const sb = Cu.Sandbox(Services.scriptSecurityManager.getSystemPrincipal(), {
        sandboxPrototype: w as unknown as object,
      });
      const value = Cu.evalInSandbox(expression, sb);
      return { status: 200, body: { ok: true, value: safeResult(value) } };
    }
    const res = await actorQuery(w.gBrowser.selectedBrowser, "RCEval", { expression });
    if (!res.ok) return { status: 400, body: { ok: false, error: String(res.error ?? "content eval failed") } };
    return { status: 200, body: { ok: true, value: res.value } };
  } catch (error) {
    return { status: 400, body: { ok: false, error: String(error).slice(0, 500) } };
  }
}

async function hInput(req: InputRequest): Promise<HttpResult<{ ok: boolean; error?: string; at?: string }>> {
  const win = windowAt(req.windowIndex);
  if (!win) return { status: 400, body: { ok: false, error: "no browser window" } };
  const wu = win.windowUtils as {
    sendNativeMouseEvent(x: number, y: number, msg: number, button: number, mods: number, widget: unknown): void;
    sendNativeKeyEvent(kc: number, cc: number, mods: number, name: unknown, data: unknown): void;
    sendNativeMouseScrollEvent(x: number, y: number, dx: number, dy: number, dz: number, mods: number, widget: unknown): void;
  };
  if (!wu) return { status: 400, body: { ok: false, error: "window has no windowUtils" } };

  const W = Ci.nsIDOMWindowUtils as unknown as {
    NATIVE_MOUSE_MESSAGE_MOVE: number;
    NATIVE_MOUSE_MESSAGE_BUTTON_DOWN: number;
    NATIVE_MOUSE_MESSAGE_BUTTON_UP: number;
    MOUSE_BUTTONS_NO_BUTTON: number;
    MOUSE_BUTTON_LEFT_BUTTON: number;
  };
  let x = req.x;
  let y = req.y;
  if (req.selector !== undefined) {
    const browser = win.gBrowser.selectedBrowser as {
      browsingContext?: {
        currentWindowGlobal?: {
          getActor(name: string): { sendQuery(n: string, d: unknown): Promise<Record<string, unknown>> };
        } | null;
        fullZoom?: number;
      };
      getBoundingClientRect?(): { left: number; top: number };
    };
    const rect = await elementRect(browser, req.selector);
    if (!rect) return { status: 400, body: { ok: false, error: "selector not found: " + req.selector } };
    const frame = browser.getBoundingClientRect?.() ?? { left: 0, top: 0 };
    const zoom = browser.browsingContext?.fullZoom ?? 1;
    const pt = elementCenterScreen(win, frame, rect, zoom);
    x = pt.x;
    y = pt.y;
  }
  const needsPoint = req.type !== "key" && req.type !== "type";
  if (needsPoint && (x === undefined || y === undefined)) {
    return { status: 400, body: { ok: false, error: "x/y (or selector) required" } };
  }
  const sx = x === undefined ? 0 : Math.round(x);
  const sy = y === undefined ? 0 : Math.round(y);
  const button = buttonId(req.button);
  const mods = req.modifiers ?? 0;

  switch (req.type) {
    case "move":
      wu.sendNativeMouseEvent(sx, sy, W.NATIVE_MOUSE_MESSAGE_MOVE, W.MOUSE_BUTTONS_NO_BUTTON, mods, null);
      break;
    case "down":
      wu.sendNativeMouseEvent(sx, sy, W.NATIVE_MOUSE_MESSAGE_BUTTON_DOWN, button, mods, null);
      break;
    case "up":
      wu.sendNativeMouseEvent(sx, sy, W.NATIVE_MOUSE_MESSAGE_BUTTON_UP, button, mods, null);
      break;
    case "click":
      nativeClick(win, sx, sy, button, false, mods);
      break;
    case "dblclick":
      nativeClick(win, sx, sy, button, true, mods);
      break;
    case "wheel": {
      nativeWheel(win, sx, sy, req.dx ?? 0, req.dy ?? 0, req.dz ?? 0, mods);
      // Native synthesis may not scroll on all builds; also deliver a
      // content-side wheel so pages still react.
      if (req.selector) {
        const res = await actorQuery(win.gBrowser.selectedBrowser, "RCScroll", {
          dx: req.dx ?? 0,
          dy: req.dy ?? 0,
          selector: req.selector,
        });
        if (!res.ok) {
          return { status: 200, body: { ok: false, at: sx + "," + sy, error: String(res.error ?? "wheel fallback failed") } };
        }
      }
      break;
    }
    case "key":
      if (!req.key) return { status: 400, body: { ok: false, error: "key required" } };
      nativeKey(win, req.key, mods);
      break;
    case "type":
      if (!req.text) return { status: 400, body: { ok: false, error: "text required" } };
      nativeType(win, req.text, mods);
      break;
    default:
      return { status: 400, body: { ok: false, error: "unknown input type" } };
  }
  return { status: 200, body: { ok: true, at: sx + "," + sy } };
}

function hScreenshot(): HttpResult<{ ok: boolean; image?: string; error?: string }> {
  const w = mainWindow();
  if (!w) return { status: 400, body: { ok: false, error: "no browser window" } };
  try {
    const win = w as unknown as { document: Document; innerWidth: number; innerHeight: number };
    const canvas = win.document.createElementNS(
      "http://www.w3.org/1999/xhtml",
      "canvas",
    ) as unknown as HTMLCanvasElement;
    canvas.width = win.innerWidth;
    canvas.height = win.innerHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { status: 400, body: { ok: false, error: "no 2d context" } };
    ctx.drawWindow(win as unknown as Window, 0, 0, win.innerWidth, win.innerHeight, "rgb(255,255,255)");
    return { status: 200, body: { ok: true, image: canvas.toDataURL("image/png") } };
  } catch (error) {
    return { status: 400, body: { ok: false, error: String(error).slice(0, 300) } };
  }
}

function hPrefsRead(sp: URLSearchParams): HttpResult<{ ok: boolean; name?: string; value?: unknown; error?: string }> {
  const name = sp.get("name") ?? "";
  const type = sp.get("type") ?? "";
  if (!name) return { status: 400, body: { ok: false, error: "name required (e.g. ?name=stratus.remote.token&type=bool)" } };
  try {
    let value: unknown;
    if (type === "bool") value = Services.prefs.getBoolPref(name);
    else if (type === "int") value = Services.prefs.getIntPref(name);
    else if (type === "string") value = Services.prefs.getStringPref(name);
    else if (Services.prefs.getPrefType(name) === Services.prefs.PREF_BOOL) value = Services.prefs.getBoolPref(name);
    else if (Services.prefs.getPrefType(name) === Services.prefs.PREF_INT) value = Services.prefs.getIntPref(name);
    else value = Services.prefs.getStringPref(name);
    return { status: 200, body: { ok: true, name, value } };
  } catch (error) {
    return { status: 400, body: { ok: false, error: String(error).slice(0, 300) } };
  }
}

function hSettings(req: SettingsRequest): HttpResult<{ ok: boolean; name?: string; value?: unknown; error?: string }> {
  const name = String(req.name ?? "").trim();
  if (!name) return { status: 400, body: { ok: false, error: "name required" } };
  try {
    let current: unknown;
    switch (req.type) {
      case "bool":
        Services.prefs.setBoolPref(name, Boolean(req.value));
        current = Services.prefs.getBoolPref(name);
        break;
      case "int":
        Services.prefs.setIntPref(name, Number(req.value));
        current = Services.prefs.getIntPref(name);
        break;
      case "string":
        Services.prefs.setStringPref(name, String(req.value));
        current = Services.prefs.getStringPref(name);
        break;
      default:
        return { status: 400, body: { ok: false, error: "type must be bool|int|string" } };
    }
    return { status: 200, body: { ok: true, name, value: current } };
  } catch (error) {
    return { status: 400, body: { ok: false, error: String(error).slice(0, 300) } };
  }
}

function hPrivateOpen(req: PrivateOpenRequest): HttpResult<{ ok: boolean; error?: string }> {
  try {
    const win = Services.wm.getMostRecentWindow("navigator:browser") as unknown as {
      openPrivateWindow?(): void;
      OpenBrowserWindow?(o?: unknown): unknown;
    };
    const pbw = win?.openPrivateWindow
      ? win.openPrivateWindow()
      : win?.OpenBrowserWindow?.({ private: true });
    if (!pbw) return { status: 400, body: { ok: false, error: "could not open private window" } };
    if (req.url) {
      const pb = pbw as { gBrowser?: { selectedBrowser?: { fixupAndLoadURIString(u: string, o: unknown): void } } };
      setTimeout(() => {
        try {
          pb.gBrowser?.selectedBrowser?.fixupAndLoadURIString(String(req.url), {
            triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
          });
        } catch {
          /* ignore */
        }
      }, 600);
    }
    return { status: 200, body: { ok: true } };
  } catch (error) {
    return { status: 400, body: { ok: false, error: String(error).slice(0, 300) } };
  }
}

// -- routing ------------------------------------------------------------------

function buildRouter(): Router {
  const router = new Router();
  router.register("GET", "/status", () => hStatus());
  router.register("GET", "/tabs", () => hTabs());
  router.register("GET", "/page", () => hPage());
  router.register("GET", "/screenshot", () => hScreenshot());
  router.register("GET", "/prefs", (ctx) => hPrefsRead(ctx.searchParams));
  router.register("GET", "/audit", () => ({ status: 200, body: { ok: true, entries: server?.auditEntries() ?? [] } }));
  router.register("POST", "/navigate", (ctx) => hNavigate((ctx.json() ?? {}) as NavigateRequest));
  router.register("POST", "/tabs", (ctx) => hTabsAction((ctx.json() ?? {}) as TabsRequest));
  router.register("POST", "/eval", (ctx) => hEval((ctx.json() ?? {}) as EvalRequest));
  router.register("POST", "/input", (ctx) => hInput((ctx.json() ?? {}) as InputRequest));
  router.register("POST", "/settings", (ctx) => hSettings((ctx.json() ?? {}) as SettingsRequest));
  router.register("POST", "/private/open", (ctx) => hPrivateOpen((ctx.json() ?? {}) as PrivateOpenRequest));
  return router;
}

// -- server -------------------------------------------------------------------

function asHttpMethod(m: string): HttpMethod {
  switch (m) {
    case "GET":
    case "POST":
    case "DELETE":
    case "OPTIONS":
      return m;
    default:
      return "GET";
  }
}

class RemoteControlHttpServer implements nsIServerSocketListener {
  private _server: nsIServerSocket | null = null;
  private _token = "";
  private _router: Router | null = null;
  private _inflight = 0;
  private readonly _audit: AuditEntry[] = [];

  private static readonly READ_HEAD_TIMEOUT_MS = 5000;
  private static readonly READ_BODY_TIMEOUT_MS = 8000;
  private static readonly MAX_BODY_BYTES = 4 * 1024 * 1024;
  private static readonly MAX_INFLIGHT = 8;
  private static readonly MAX_AUDIT = 100;

  auditEntries(): AuditEntry[] {
    return this._audit.map((e) => ({ ...e }));
  }

  private audit(method: string, path: string, status: number, origin: string): void {
    this._audit.push({
      t: Date.now(),
      method,
      path: path.slice(0, 200),
      status,
      origin: origin.slice(0, 120),
    });
    if (this._audit.length > RemoteControlHttpServer.MAX_AUDIT) {
      this._audit.splice(0, this._audit.length - RemoteControlHttpServer.MAX_AUDIT);
    }
  }

  QueryInterface = ChromeUtils.generateQI(["nsIServerSocketListener", "nsIObserver"]);

  start(port: number, token: string, router: Router): void {
    if (this._server) return;
    this._token = token || "";
    this._router = router;
    const server = Cc["@mozilla.org/network/server-socket;1"].createInstance(Ci.nsIServerSocket);
    server.init(port, /* loopbackOnly */ true, 10);
    server.asyncListen(this);
    this._server = server;
    console.info("[remote-control] listening on http://127.0.0.1:" + port + (this._token ? " (token auth)" : ""));
  }

  stop(): void {
    if (!this._server) return;
    try {
      this._server.close();
    } catch {
      /* ignore */
    }
    this._server = null;
  }

  onSocketAccepted(_server: nsIServerSocket, socket: nsISocketTransport): void {
    void this.handleConnection(socket);
  }

  onStopListening(_server: nsIServerSocket, _status: nsresult): void {
    /* noop */
  }

  private static waitForInput(inputStream: nsIInputStream, timeoutMs: number): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      let settled = false;
      const listener = {
        QueryInterface: ChromeUtils.generateQI(["nsIInputStreamCallback"]),
        onInputStreamReady(_stream: nsIAsyncInputStream) {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            resolve(true);
          }
        },
      };
      const asyncStream = inputStream as unknown as nsIAsyncInputStream;
      try {
        asyncStream.asyncWait(listener, 0, 0, Services.tm.mainThread);
      } catch {
        if (!settled) {
          settled = true;
          resolve(false);
        }
        return;
      }
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          try {
            asyncStream.asyncWait(null as unknown as nsIInputStreamCallback, 0, 0, Services.tm.mainThread);
          } catch {
            /* ignore */
          }
          resolve(false);
        }
      }, timeoutMs);
    });
  }


  private async handleConnection(socket: nsISocketTransport): Promise<void> {
    const outStream = socket.openOutputStream(0, 0, 0);
    const write = (data: string): void => {
      outStream.write(data, data.length);
    };
    const respond = (status: number, body: unknown): void => {
      write(jsonResponse(status, body));
    };
    try {
      const inStream = socket.openInputStream(0, 0, 0);
      const sis = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(
        Ci.nsIScriptableInputStream,
      );
      sis.init(inStream);

      // Read until CRLFCRLF (single pass, rope concatenation as in os-server).
      let head = "";
      const headDeadline =
        Date.now() + RemoteControlHttpServer.READ_HEAD_TIMEOUT_MS;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        let avail = 0;
        try {
          avail = sis.available();
        } catch {
          break;
        }
        if (avail > 0) {
          head += sis.read(avail);
          if (head.includes("\r\n\r\n")) break;
        } else {
          const remaining = headDeadline - Date.now();
          if (remaining <= 0) break;
          const dataReady = await RemoteControlHttpServer.waitForInput(
            inStream,
            remaining,
          );
          if (!dataReady) break;
        }
      }
      const split = head.indexOf("\r\n\r\n");
      const headStr = split >= 0 ? head.slice(0, split) : head;
      const req = parseRequestHead(headStr);
      if (!req) {
        respond(400, { error: "bad request" });
        try {
          outStream.close();
        } catch {
          /* ignore */
        }
        return;
      }

      // Body (string accumulation; JSON payloads, UTF-8 safe).
      const contentLength =
        Number.parseInt(req.headers["content-length"] || "0", 10) || 0;
      if (contentLength > RemoteControlHttpServer.MAX_BODY_BYTES) {
        respond(413, { error: "payload too large (max 4 MiB)" });
        this.audit(req.method, req.path, 413, req.headers["origin"] ?? "");
        try {
          outStream.close();
        } catch {
          /* ignore */
        }
        return;
      }
      const leftover = split >= 0 ? head.slice(split + 4) : "";
      const bodyParts: string[] = [leftover];
      let bodyLen = leftover.length;
      const bodyDeadline =
        Date.now() + RemoteControlHttpServer.READ_BODY_TIMEOUT_MS;
      // eslint-disable-next-line no-constant-condition
      while (bodyLen < contentLength) {
        let avail = 0;
        try {
          avail = sis.available();
        } catch {
          break;
        }
        if (avail > 0) {
          const piece = sis.read(Math.min(avail, contentLength - bodyLen));
          if (!piece) break;
          bodyParts.push(piece);
          bodyLen += piece.length;
        } else {
          const remaining = bodyDeadline - Date.now();
          if (remaining <= 0) break;
          const dataReady = await RemoteControlHttpServer.waitForInput(
            inStream,
            remaining,
          );
          if (!dataReady) break;
        }
      }
      const fullBody = bodyParts.join("");
      const rawBody = binaryStringToByteArray(fullBody).slice(0, contentLength);
      const body = new Uint8Array(rawBody);

      const method = asHttpMethod(req.method);
      const origin = req.headers["origin"] ?? "";
      // Origin policy: reject fetches from arbitrary web pages (drive-by
      // control of the browser). CLI agents send no Origin and keep working.
      if (!originAllowed(origin)) {
        respond(403, { error: "origin not allowed" });
        this.audit(req.method, req.path, 403, origin);
        try {
          outStream.close();
        } catch {
          /* ignore */
        }
        return;
      }
      if (this._inflight >= RemoteControlHttpServer.MAX_INFLIGHT) {
        respond(429, { error: "too many concurrent requests" });
        this.audit(req.method, req.path, 429, origin);
        try {
          outStream.close();
        } catch {
          /* ignore */
        }
        return;
      }
      this._inflight++;
      try {
        if (method === "OPTIONS") {
          respond(204, null);
          this.audit(req.method, req.path, 204, origin);
          try {
            outStream.close();
          } catch {
            /* ignore */
          }
          return;
        }
        // token auth
        if (this._token) {
          const auth = req.headers["authorization"] ?? "";
          if (auth !== "Bearer " + this._token) {
            respond(401, { error: "unauthorized" });
            this.audit(req.method, req.path, 401, origin);
            try {
              outStream.close();
            } catch {
              /* ignore */
            }
            return;
          }
        }
        const u = new URL("http://127.0.0.1" + req.path);
        const match = this._router?.match(method, u.pathname);
        if (!match) {
          respond(404, { error: "not found: " + method + " " + u.pathname });
          this.audit(req.method, u.pathname, 404, origin);
          try {
            outStream.close();
          } catch {
            /* ignore */
          }
          return;
        }
        const ctx = {
          method,
          pathname: u.pathname,
          searchParams: u.searchParams,
          headers: req.headers,
          body,
          params: match.params,
          json: () => {
            const txt = new TextDecoder().decode(body).trim();
            if (!txt) return null;
            try {
              return JSON.parse(txt) as unknown;
            } catch {
              return null;
            }
          },
        };
        const result = await match.handler(ctx as never);
        if (result && (result as { isStream?: boolean }).isStream) {
          respond(500, { error: "streams unsupported" });
          this.audit(req.method, u.pathname, 500, origin);
        } else {
          const httpRes = result as HttpResult;
          const status = httpRes.status ?? 200;
          respond(status, httpRes.body ?? {});
          this.audit(req.method, u.pathname, status, origin);
        }
        try {
          outStream.close();
        } catch {
          /* ignore */
        }
      } finally {
        this._inflight--;
      }
    } catch (error) {
      logError("[remote-control] request failed:", error);
      try {
        write(jsonResponse(500, { error: String(error).slice(0, 300) }));
      } catch {
        /* ignore */
      }
      try {
        outStream.close();
      } catch {
        /* ignore */
      }
    }
  }
}

// -- lifecycle ----------------------------------------------------------------

let server: RemoteControlHttpServer | null = null;
let enabledObserver: { observe(): void } | null = null;
let tokenObserver: { observe(): void } | null = null;

function isEnabled(): boolean {
  return Services.prefs.getBoolPref(REMOTE_ENABLED_PREF, true);
}

function currentToken(): string {
  return ensureRemoteToken();
}

export function initRemoteControl(): void {
  if (server) return;
  // Production stance: the first boot generates an auth token so the
  // control surface is never silently open (drive-by protection).
  ensureRemoteToken();
  enabledObserver = {
    observe(): void {
      syncServer();
    },
  };
  tokenObserver = {
    observe(): void {
      syncServer();
    },
  };
  Services.prefs.addObserver(REMOTE_ENABLED_PREF, enabledObserver);
  Services.prefs.addObserver(REMOTE_TOKEN_PREF, tokenObserver);
  syncServer();
}

export function setRemoteEnabled(enabled: boolean): void {
  Services.prefs.setBoolPref(REMOTE_ENABLED_PREF, enabled);
  syncServer();
}

export function getRemoteStatus(): { enabled: boolean; port: number; tokenSet: boolean; listening: boolean } {
  return {
    enabled: isEnabled(),
    port: Services.prefs.getIntPref(REMOTE_PORT_PREF, DEFAULT_PORT),
    tokenSet: currentToken().length > 0,
    listening: !!server && server["_server"] !== null,
  };
}

function syncServer(): void {
  if (!isEnabled()) {
    if (server) {
      server.stop();
      server = null;
    }
    return;
  }
  if (server) return;
  const port = Services.prefs.getIntPref(REMOTE_PORT_PREF, DEFAULT_PORT);
  server = new RemoteControlHttpServer();
  server.start(port, currentToken(), buildRouter());
}

export function _getServerForTest(): RemoteControlHttpServer | null {
  return server;
}
