# LinkView

A peer-to-peer remote screen viewing and control platform built with WebRTC and Next.js. Share your screen with anyone in real time — no downloads, plugins, or accounts required.

## Features

- **Browser-to-browser screen sharing** — powered by WebRTC `getDisplayMedia`
- **WebSocket signaling server** — custom Node.js server handles SDP/ICE exchange
- **Real-time connection metrics** — RTT, jitter, packet loss, bitrate, and frame rate
- **Adaptive streaming** — quality auto-adjusts based on network conditions
- **Network insights dashboard** — live charts via Recharts
- **Network simulator** — test behavior under degraded conditions (latency, packet loss, bandwidth)
- **Multi-viewer support** — up to 10 viewers per room
- **Recording** — record the viewed stream and download as WebM
- **Quality selector** — manually override quality (High / Medium / Low / Minimal)
- **Reconnection & resilience** — exponential backoff, ICE restart, heartbeat keepalive
- **Instant room sharing** — generate a room code and share a link
- **Dark UI** — Tailwind CSS dark theme

## Tech Stack

| Layer     | Technology                                                   |
| --------- | ------------------------------------------------------------ |
| Frontend  | Next.js 14 (App Router), React 18, TypeScript                |
| Styling   | Tailwind CSS 3.4                                             |
| State     | Zustand                                                      |
| Charts    | Recharts                                                     |
| Icons     | Lucide React                                                 |
| WebRTC    | Native browser APIs (`RTCPeerConnection`, `getDisplayMedia`) |
| Signaling | WebSocket (ws) on a custom Node.js HTTP server               |
| Runtime   | Node.js ≥ 20, tsx                                            |

## Project Structure

```
├── server/                  # Custom Node.js server
│   ├── index.ts             # HTTP + WebSocket server, /api/ice-servers endpoint
│   ├── signaling.ts         # WebSocket message handling & relay
│   ├── room-manager.ts      # Room lifecycle, peer tracking, host promotion
│   └── types.ts             # Server-side type definitions
├── src/
│   ├── app/
│   │   ├── layout.tsx       # Root layout (Inter font, dark mode)
│   │   ├── page.tsx         # Home — create or join a room
│   │   ├── globals.css      # Tailwind directives + custom styles
│   │   └── room/[roomId]/
│   │       └── page.tsx     # Room view — video, sidebar, controls
│   ├── components/
│   │   ├── ConnectionOverlay.tsx   # Connecting / reconnecting / failed overlay
│   │   ├── ConnectionStatus.tsx    # Status badge bar
│   │   ├── ControlPanel.tsx        # Bottom toolbar (share, record, etc.)
│   │   ├── MetricsDashboard.tsx    # 6 metric cards + 5 live charts
│   │   ├── NetworkChart.tsx        # Reusable Recharts line chart
│   │   ├── NetworkSimulator.tsx    # Sliders & presets for simulating conditions
│   │   ├── ParticipantList.tsx     # List of peers in the room
│   │   ├── QualitySelector.tsx     # Manual quality override
│   │   ├── RoomHeader.tsx          # Room code, copy link, peer count
│   │   ├── ToastContainer.tsx      # Toast notifications
│   │   └── VideoStream.tsx         # <video> element with ref-based srcObject
│   ├── hooks/
│   │   ├── useWebRTC.ts           # Main orchestrator hook
│   │   ├── useSignaling.ts        # WebSocket signaling connection
│   │   ├── useMetrics.ts          # Stats polling & store updates
│   │   └── useRecording.ts        # MediaRecorder wrapper
│   ├── lib/
│   │   ├── peer-connection.ts     # RTCPeerConnection wrapper
│   │   ├── signaling-client.ts    # WebSocket client with reconnect & heartbeat
│   │   ├── adaptive-streaming.ts  # Quality auto-adjustment engine
│   │   ├── metrics-collector.ts   # RTCStatsReport parser
│   │   ├── media.ts               # getDisplayMedia helper
│   │   ├── recorder.ts            # Recording & download
│   │   ├── constants.ts           # ICE config, quality presets, thresholds
│   │   └── utils.ts               # Room ID generation, signaling URL, helpers
│   ├── stores/
│   │   ├── connection-store.ts    # Peer state, room info
│   │   ├── metrics-store.ts       # Live metrics + 60 s chart history
│   │   └── ui-store.ts            # Panels, recording, toasts
│   └── types/
│       └── index.ts               # Shared TypeScript types
├── render.yaml              # Render deployment blueprint
├── .env.example             # Environment variable reference
├── tailwind.config.ts
├── tsconfig.json
├── next.config.js
└── package.json
```

## Getting Started

### Prerequisites

- **Node.js** ≥ 20
- **npm** ≥ 9

### Install

```bash
git clone https://github.com/franklinwagbara/LinkView.git
cd LinkView
npm install
```

### Run (development)

```bash
npm run dev
```

Opens at [http://localhost:3000](http://localhost:3000). The custom server serves both the Next.js app and the WebSocket signaling endpoint at `/ws`.

### Build & run (production)

```bash
npm run build
npm start
```

## Environment Variables

Copy `.env.example` to `.env` and configure as needed:

| Variable           | Required  | Description                                                          |
| ------------------ | --------- | -------------------------------------------------------------------- |
| `PORT`             | No        | Server port (default `3000`)                                         |
| `METERED_API_KEY`  | **Yes**\* | API key from [metered.ca](https://www.metered.ca/stun-turn) for TURN |
| `METERED_APP_NAME` | No        | Metered app name (default `linkview`)                                |
| `TURN_URLS`        | No        | Manual TURN server URLs (comma-separated)                            |
| `TURN_USERNAME`    | No        | Manual TURN username                                                 |
| `TURN_CREDENTIAL`  | No        | Manual TURN credential                                               |

\* A TURN server is **required** for peers on different networks (different WiFi, cellular, corporate). Without it, only same-network connections will succeed. Sign up free at [metered.ca/stun-turn](https://www.metered.ca/stun-turn) (500 GB/month free tier).

## Deployment (Render)

The repo includes a `render.yaml` blueprint for one-click deployment:

1. Push to GitHub
2. On [render.com](https://render.com), create a **New Web Service** connected to your repo
3. Set:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Free
4. Add environment variables: `NODE_ENV=production`, `METERED_API_KEY=<your key>`
5. Deploy

The signaling WebSocket URL auto-resolves from `window.location.host` — no extra config needed.

> **Note:** Render's free tier spins down after 15 min of inactivity. The first request after idle takes ~30 s to cold-start.

## How It Works

1. **Host** creates a room and receives a shareable room code/link.
2. **Viewer** joins via the code or link.
3. The signaling server relays SDP offers/answers and ICE candidates over WebSocket.
4. A direct WebRTC peer connection is established (relayed through TURN if needed).
5. The host clicks **Share Screen** → `getDisplayMedia` captures the screen → video tracks are sent over the peer connection.
6. The viewer sees the remote screen in real time with live network metrics.

## License

MIT
