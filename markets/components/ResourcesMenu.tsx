"use client";

import { useEffect, useRef, useState } from "react";

const navLinkStyle: React.CSSProperties = {
  fontSize: 14,
  color: "var(--text-secondary)",
  display: "flex",
  alignItems: "center",
  gap: 4,
  cursor: "pointer",
  textDecoration: "none",
};

const RESOURCES_ITEMS = [
  { label: "Technical Whitepaper", href: "https://alphanet.global/docs/whitepaper" },
  { label: "User Guide", href: "https://alphanet.global/docs/guide" },
  { label: "Points", href: "https://alphanet.global/docs/points" },
];

export default function ResourcesMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        style={{ ...navLinkStyle, background: "none", border: "none", padding: 0 }}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        Resources <ChevronDown flipped={open} />
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 14px)",
            right: 0,
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: 6,
            minWidth: 190,
            boxShadow: "0 16px 32px rgba(0,0,0,0.45)",
            zIndex: 30,
          }}
        >
          {RESOURCES_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              onClick={() => setOpen(false)}
              style={{
                display: "block",
                padding: "9px 12px",
                borderRadius: 6,
                fontSize: 14,
                color: "var(--text-secondary)",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              {item.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function ChevronDown({ flipped = false }: { flipped?: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      style={{ transform: flipped ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }}
    >
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
