"use client";

import { useEffect, useState } from "react";

const TABS = [
  { id: "price", label: "Price" },
  { id: "news", label: "News" },
  { id: "strategies", label: "Strategies" },
  { id: "volatility", label: "Volatility" },
  { id: "faq", label: "FAQ" },
] as const;

export default function TabsNav() {
  const [active, setActive] = useState("price");

  useEffect(() => {
    const sync = () => setActive(window.location.hash.replace("#", "") || "price");
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return (
    <nav
      aria-label="On this page"
      style={{
        display: "flex",
        gap: 28,
        borderBottom: "1px solid var(--border)",
      }}
    >
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <a
            key={tab.id}
            href={`#${tab.id}`}
            aria-current={isActive ? "true" : undefined}
            onClick={() => setActive(tab.id)}
            style={{
              background: "none",
              border: "none",
              borderBottom: isActive ? "2px solid var(--accent-green)" : "2px solid transparent",
              color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
              fontSize: 14,
              fontWeight: isActive ? 600 : 500,
              padding: "0 0 12px 0",
              textDecoration: "none",
            }}
          >
            {tab.label}
          </a>
        );
      })}
    </nav>
  );
}
