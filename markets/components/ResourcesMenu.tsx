"use client";

import { useEffect, useRef, useState } from "react";

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
    <div ref={rootRef} className="mk-select" style={{ position: "relative" }}>
      <a
        href="https://alphanet.global/#resources"
        onClick={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        Resources
        <svg
          className="chev"
          viewBox="0 0 10 6"
          width="9"
          height="6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
          style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform .3s" }}
        >
          <path d="M1 1l4 4 4-4" />
        </svg>
      </a>
      {open && (
        <div role="menu" className="mk-select-menu" style={{ top: "calc(100% + 14px)", left: "auto", right: 0, minWidth: 210 }}>
          {RESOURCES_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              className="mk-opt"
              onClick={() => setOpen(false)}
            >
              <span className="mk-opt-name">{item.label}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
