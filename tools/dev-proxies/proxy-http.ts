// Dev-only HTTP proxy for M8.3 live verification.
// Listens on 127.0.0.1:58080, logs every proxied request (method host

// path) to _dist/proxy-http.log, forwards plain HTTP and tunnels CONNECT.

import { fileURLToPath } from "node:url";

const HOST = "127.0.0.1";
const PORT = 59123;
const LOG = fileURLToPath(new URL("../../_dist/proxy-http.log", import.meta.url));

async function pump(src: Deno.Conn, dst: Deno.Conn): Promise<void> {
  const chunk = new Uint8Array(65536);
  while (true) {
    const n = await src.read(chunk);
    if (n === null) return;
    try { await dst.write(chunk.slice(0, n)); } catch { return; }
  }
}

function log(line: string): void {
  const ts = new Date().toISOString();
  Deno.writeTextFileSync(LOG, `[${ts}] ${line}\n`, { append: true });
}

try { Deno.removeSync(LOG); } catch { /* first run */ }

const listener = Deno.listen({ hostname: HOST, port: PORT });
console.log(`proxy listening on ${HOST}:${PORT}, log=${LOG}`);
log("proxy started");

function parseRequestHead(buf: Uint8Array): {
  method: string;
  target: string;
  host: string;
  path: string;
  isConnect: boolean;
} | null {
  const text = new TextDecoder().decode(buf);
  const first = text.slice(0, text.indexOf("\r\n\r\n") === -1 ? text.length : text.indexOf("\r\n\r\n")).split("\r\n")[0];
  const parts = first.split(" ");
  if (parts.length < 2) return null;
  const method = parts[0];
  const target = parts[1];
  const isConnect = method === "CONNECT";
  try {
    if (isConnect) {
      const [h] = target.split(":");
      return { method, target, host: h, path: "", isConnect, };
    }
    const url = new URL(target);
    return { method, target, host: url.hostname, path: url.pathname, isConnect };
  } catch {
    return { method, target, host: target, path: "", isConnect };
  }
}

async function handle(conn: Deno.Conn): Promise<void> {
  try {
    const headLen = 65536;
    let buf = new Uint8Array(headLen);
    const n = await conn.read(buf);
    if (n === null) { conn.close(); return; }
    buf = buf.slice(0, n);
    const req = parseRequestHead(buf);
    if (!req) { conn.close(); return; }
    log(`${req.method} ${req.host}${req.path}${req.isConnect ? " (CONNECT tunnel)" : ""}`);

    if (req.isConnect) {
      const [h, p] = req.target.split(":");
      const upstream = await Deno.connect({ hostname: h, port: Number(p || 443) });
      await conn.write(new TextEncoder().encode("HTTP/1.1 200 Connection established\r\n\r\n"));
      // bidirectional tunnel pump
      const a = pump(conn, upstream);
      const b = pump(upstream, conn);
      await Promise.all([a, b]);
      upstream.close();
      return;
    }

    const url = new URL(req.target);
    const upstream = await Deno.connect({ hostname: url.hostname, port: Number(url.port || (url.protocol === "https:" ? 443 : 80)) });
    await upstream.write(buf);
    const resp = new Uint8Array(65536);
    const rn = await upstream.read(resp);
    if (rn !== null) {
      await conn.write(resp.slice(0, rn));
      // keep relaying until close
      while (true) {
        const chunk = new Uint8Array(65536);
        const cn = await upstream.read(chunk);
        if (cn === null) break;
        await conn.write(chunk.slice(0, cn));
      }
    }
    upstream.close();
  } catch (e) {
    log(`error: ${String(e)}`);
  } finally {
    try { conn.close(); } catch { /* already closed */ }
  }
}

for await (const conn of listener) {
  void handle(conn);
}
