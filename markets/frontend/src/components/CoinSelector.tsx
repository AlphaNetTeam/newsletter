import { useEffect, useRef, useState } from "react";
import type { SymbolInfo } from "../api/types";

interface Props {
  symbols: SymbolInfo[];
  selected: string;
  onChange: (symbol: string) => void;
}

export default function CoinSelector({ symbols, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = symbols.find((s) => s.symbol === selected);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div style={{ position: "relative", display: "inline-block" }} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "9px 14px",
          color: "var(--text-primary)",
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        {current ? `${current.name} · ${current.symbol}` : "Loading…"}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform .15s" }}
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            minWidth: 190,
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: 6,
            boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
            zIndex: 30,
          }}
        >
          {symbols.map((s) => (
            <div
              key={s.symbol}
              onClick={() => {
                onChange(s.symbol);
                setOpen(false);
              }}
              style={{
                padding: "8px 10px",
                borderRadius: 6,
                fontSize: 14,
                cursor: "pointer",
                background: s.symbol === selected ? "var(--accent-green-dim)" : "transparent",
                color: s.symbol === selected ? "var(--accent-green)" : "var(--text-primary)",
              }}
              onMouseEnter={(e) => {
                if (s.symbol !== selected) e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              }}
              onMouseLeave={(e) => {
                if (s.symbol !== selected) e.currentTarget.style.background = "transparent";
              }}
            >
              {s.name} · {s.symbol}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
