import { useEffect, useRef } from "react";

/** Runs `callback` every `delayMs`, always calling the latest closure
 * (avoids the classic stale-closure bug with a raw setInterval + []).
 * Pass `delayMs: null` to pause.
 */
export function useInterval(callback: () => void, delayMs: number | null) {
  const savedCallback = useRef(callback);
  savedCallback.current = callback;

  useEffect(() => {
    if (delayMs === null) return;
    const id = setInterval(() => savedCallback.current(), delayMs);
    return () => clearInterval(id);
  }, [delayMs]);
}
