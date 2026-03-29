import { createServer, IncomingMessage, ServerResponse } from "http";
import { parse } from "url";
import next from "next";
import { WebSocketServer } from "ws";
import { setupSignaling } from "./signaling";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

// ─── ICE Server Configuration ────────────────────────────────────────────
// Serves TURN credentials to clients at runtime so credentials are never
// baked into the client bundle and can be rotated without a rebuild.

interface IceServerEntry {
  urls: string | string[];
  username?: string;
  credential?: string;
}

let iceServersCache: { data: { iceServers: IceServerEntry[] }; timestamp: number } | null = null;
const ICE_CACHE_TTL = 300_000; // 5 minutes

async function getIceServers(): Promise<{ iceServers: IceServerEntry[] }> {
  if (iceServersCache && Date.now() - iceServersCache.timestamp < ICE_CACHE_TTL) {
    return iceServersCache.data;
  }

  const iceServers: IceServerEntry[] = [
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
        "stun:stun2.l.google.com:19302",
      ],
    },
  ];

  // Option 1: Metered.ca REST API — fetches fresh short-lived TURN credentials
  // Sign up free at https://www.metered.ca/stun-turn (500 GB/month free)
  const meteredApiKey = process.env.METERED_API_KEY;
  if (meteredApiKey) {
    try {
      const appName = process.env.METERED_APP_NAME || "linkview";
      const url = `https://${appName}.metered.live/api/v1/turn/credentials?apiKey=${meteredApiKey}`;
      const response = await fetch(url);
      if (response.ok) {
        const turnServers = await response.json();
        iceServers.push(...turnServers);
        console.log(`[ICE] Fetched ${turnServers.length} TURN servers from Metered`);
      } else {
        console.error(`[ICE] Metered API error: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      console.error("[ICE] Failed to fetch from Metered API:", err);
    }
  }

  // Option 2: Manual TURN via env vars
  const turnUrls = process.env.TURN_URLS;
  const turnUsername = process.env.TURN_USERNAME;
  const turnCredential = process.env.TURN_CREDENTIAL;
  if (turnUrls && turnUsername && turnCredential) {
    iceServers.push({
      urls: turnUrls.split(","),
      username: turnUsername,
      credential: turnCredential,
    });
    console.log("[ICE] Using TURN servers from env vars");
  }

  if (iceServers.length === 1) {
    console.warn(
      "[ICE] No TURN servers configured! Cross-network connections will fail.\n" +
      "      Set METERED_API_KEY or TURN_URLS/TURN_USERNAME/TURN_CREDENTIAL env vars.\n" +
      "      Free TURN: https://www.metered.ca/stun-turn (500 GB/month)"
    );
  }

  const result = { iceServers };
  iceServersCache = { data: result, timestamp: Date.now() };
  return result;
}

function handleIceServersRequest(_req: IncomingMessage, res: ServerResponse): void {
  getIceServers()
    .then((config) => {
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Cache-Control": "max-age=300",
      });
      res.end(JSON.stringify(config));
    })
    .catch((err) => {
      console.error("[ICE] Error serving ice-servers:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }] }));
    });
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  await app.prepare();

  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);

      // Serve ICE/TURN configuration to clients
      if (parsedUrl.pathname === "/api/ice-servers" && req.method === "GET") {
        handleIceServersRequest(req, res);
        return;
      }

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error handling request:", err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  // WebSocket server with path-based routing
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req: IncomingMessage, socket, head) => {
    const { pathname } = parse(req.url || "", true);

    if (pathname === "/ws") {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } else {
      // Let Next.js handle HMR WebSocket upgrades in dev
      if (dev) return;
      socket.destroy();
    }
  });

  setupSignaling(wss);

  server.listen(port, hostname, () => {
    console.log(
      `\n  ✦ LinkView ${dev ? "Development" : "Production"} Server\n` +
        `  ├─ HTTP:  http://localhost:${port}\n` +
        `  ├─ WS:    ws://localhost:${port}/ws\n` +
        `  └─ Peers: 0 connected\n`,
    );
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log("\nShutting down...");
    wss.close();
    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
