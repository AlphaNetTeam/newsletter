import { useEffect, useRef, useState } from "react";
import { WS_BASE } from "../api/client";

interface LiveMidsState {
  mids: Record<string, number>;
  connected: boolean;
  lastMessageAt: number | null;
}

/**
 * Subscribes to the backend's /ws/prices relay (which itself relays
 * Hyperliquid's real-time `allMids` feed) for live-ticking prices.
 * Reconnects automatically with backoff on drop. Consumers that need a
 * single symbol's price should read `mids[symbol]`.
 *
 * This is a genuinely-live push channel, not polling — but if the
 * websocket can't connect at all (proxy/firewall blocks it, backend
 * doesn't support it, etc.) `connected` just stays false and callers
 * should fall back to their REST polling interval instead.
 */
export function useLiveMids(): LiveMidsState {
  const [mids, setMids] = useState<Record<string, number>>({});
  const [connected, setConnected] = useState(false);
  const [lastMessageAt, setLastMessageAt] = useState<number | null>(null);
  const backoffRef = useRef(1000);
  const stoppedRef = useRef(false);

  useEffect(() => {
    stoppedRef.current = false;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      if (stoppedRef.current) return;
      ws = new WebSocket(`${WS_BASE}/ws/prices`);

      ws.onopen = () => {
        setConnected(true);
        backoffRef.current = 1000;
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "mids" && msg.data) {
            setMids((prev) => ({ ...prev, ...msg.data }));
            setLastMessageAt(Date.now());
          }
        } catch {
          // ignore malformed frames
        }
      };

      const scheduleReconnect = () => {
        if (stoppedRef.current) return;
        setConnected(false);
        reconnectTimer = setTimeout(connect, backoffRef.current);
        backoffRef.current = Math.min(backoffRef.current * 2, 30000);
      };

      ws.onclose = scheduleReconnect;
      ws.onerror = () => ws?.close();
    }

    connect();

    return () => {
      stoppedRef.current = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, []);

  return { mids, connected, lastMessageAt };
}
