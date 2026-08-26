"use client";

import { useEffect, useState } from "react";

const HYPERLIQUID_WS_URL = "wss://api.hyperliquid.xyz/ws";

interface LiveMidsState {
  mids: Record<string, number>;
  connected: boolean;
}

export function useLiveMids(): LiveMidsState {
  const [mids, setMids] = useState<Record<string, number>>({});
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let stopped = false;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let backoff = 1000;

    function connect() {
      if (stopped) return;
      ws = new WebSocket(HYPERLIQUID_WS_URL);

      ws.onopen = () => {
        setConnected(true);
        backoff = 1000;
        ws?.send(JSON.stringify({ method: "subscribe", subscription: { type: "allMids" } }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as {
            channel?: string;
            data?: { mids?: Record<string, string | number> };
          };
          if (msg.channel !== "allMids" || !msg.data?.mids) return;
          const next: Record<string, number> = {};
          for (const [sym, px] of Object.entries(msg.data.mids)) {
            const n = Number(px);
            if (n > 0) next[sym] = n;
          }
          if (Object.keys(next).length) {
            setMids((prev) => ({ ...prev, ...next }));
          }
        } catch {
          // ignore malformed frames
        }
      };

      const scheduleReconnect = () => {
        if (stopped) return;
        setConnected(false);
        reconnectTimer = setTimeout(connect, backoff);
        backoff = Math.min(backoff * 2, 30000);
      };

      ws.onclose = scheduleReconnect;
      ws.onerror = () => ws?.close();
    }

    connect();
    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, []);

  return { mids, connected };
}
