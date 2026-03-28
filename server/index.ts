import { createServer, IncomingMessage } from "http";
import { parse } from "url";
import next from "next";
import { WebSocketServer } from "ws";
import { setupSignaling } from "./signaling";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

async function main() {
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();

  await app.prepare();

  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
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
