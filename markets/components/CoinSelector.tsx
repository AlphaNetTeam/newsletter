"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useRef, useState } from "react";
import type { SymbolInfo } from "@/lib/types";

interface Props {
  symbols: SymbolInfo[];
  selected: string;
}

export default function CoinSelector({ symbols, selected }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = symbols.find((s) => s.symbol === selected);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className={`mk-select${open ? " open" : ""}`} ref={ref}>
      <button
        type="button"
        className="mk-select-btn"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="mk-select-name">{current?.symbol ?? selected}</span>
        <svg
          className="chev"
          viewBox="0 0 10 6"
          width="10"
          height="6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="M1 1l4 4 4-4" />
        </svg>
      </button>

      {open && (
        <div className="mk-select-menu" role="listbox" aria-label="Select market">
          {symbols.map((s) => (
            <Link
              key={s.symbol}
              href={`/${s.symbol}` as Route}
              role="option"
              aria-selected={s.symbol === selected}
              onClick={() => setOpen(false)}
              className={`mk-opt${s.symbol === selected ? " on" : ""}`}
            >
              <span className="mk-opt-name">{s.symbol}</span>
              <span className="mk-opt-sym mono">{s.name}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
