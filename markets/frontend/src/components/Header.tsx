import { useEffect, useRef, useState } from "react";
import logoUrl from "../assets/logo.png";

const navLinkStyle: React.CSSProperties = {
  fontSize: 14,
  color: "var(--text-secondary)",
  display: "flex",
  alignItems: "center",
  gap: 4,
  cursor: "pointer",
  textDecoration: "none",
};

// Every nav destination here is verified against alphanet.global's own
// header (read straight off its DOM, not guessed) — this clone is a
// standalone page, not a route inside the real site, so these send the
// visitor out to the real thing in a new tab rather than 404ing on a
// route that only exists here.
const LAUNCH_TRADING_URL = "https://trade.alphanet.global/";
const INSIGHTS_URL = "https://alphanet.global/blog";
const GUILD_LEADERS_URL = "https://alphanet.global/#partner-heading";
const RESOURCES_ITEMS = [
  { label: "Technical Whitepaper", href: "https://alphanet.global/docs/whitepaper" },
  { label: "User Guide", href: "https://alphanet.global/docs/guide" },
  { label: "Points", href: "https://alphanet.global/docs/points" },
];

// Must match <main>'s maxWidth in StrategyPage.tsx — the header bar itself
// is full-width (so its background/border-bottom span edge to edge), but
// its *content* needs to line up with the page body underneath it, same
// as the source design (logo and page heading share one left edge there).
// Without this the header content was flush against the viewport edge
// (32px in) while the body content below it was centered in a narrower
// column, so on any wide screen the two visibly didn't line up.
const PAGE_MAX_WIDTH = 1180;

export default function Header() {
  return (
    <header
      style={{
        borderBottom: "1px solid var(--border)",
        position: "sticky",
        top: 0,
        background: "rgba(5,7,10,0.85)",
        backdropFilter: "blur(8px)",
        zIndex: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: PAGE_MAX_WIDTH,
          margin: "0 auto",
          padding: "0 32px",
          height: 64,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={logoUrl} alt="AlphaNet" style={{ height: 22, display: "block" }} />
          <span
            style={{
              width: 1,
              height: 16,
              background: "var(--border-strong)",
            }}
          />
          <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            Trading Evolved
          </span>
        </div>

        <nav style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <a href="https://t.me/AlphaNet_AI" target="_blank" rel="noreferrer" aria-label="Telegram" style={navLinkStyle}>
            <TelegramIcon />
          </a>
          <a href="https://x.com/AlphaNet_AI" target="_blank" rel="noreferrer" aria-label="X" style={navLinkStyle}>
            <XIcon />
          </a>
          <a
            href={LAUNCH_TRADING_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: "linear-gradient(135deg, var(--accent-blue), var(--accent-blue-2))",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "9px 18px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              textDecoration: "none",
            }}
          >
            Launch Trading
          </a>
          <ResourcesMenu />
          <a href={INSIGHTS_URL} target="_blank" rel="noopener noreferrer" style={navLinkStyle}>
            Insights
          </a>
          <span style={{ ...navLinkStyle, color: "var(--text-primary)", fontWeight: 600, cursor: "default" }}>
            Markets
          </span>
          <a href={GUILD_LEADERS_URL} target="_blank" rel="noopener noreferrer" style={navLinkStyle}>
            Guild Leaders
          </a>
        </nav>
      </div>
    </header>
  );
}

// Matches the real site's Resources dropdown exactly (verified by opening
// it live): a plain right-aligned list of 3 links, no icons or
// descriptions — click to toggle, click anywhere outside to close.
function ResourcesMenu() {
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
      <span
        style={navLinkStyle}
        onClick={() => setOpen((o) => !o)}
        role="button"
        tabIndex={0}
        aria-expanded={open}
      >
        Resources <ChevronDown flipped={open} />
      </span>
      {open && (
        <div
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
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-secondary)";
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

function TelegramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M21.5 4.5 2.7 11.9c-1.2.5-1.2 1.2-.2 1.5l4.8 1.5 1.8 5.6c.2.6.4.8.9.8.4 0 .6-.2.9-.5l2.2-2.1 4.6 3.4c.8.5 1.4.2 1.6-.8l3-14.1c.3-1.3-.5-1.9-1.8-1.7Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.9 2H22l-7.6 8.7L23.3 22H16.6l-5.3-6.9L5.2 22H2l8.1-9.3L1.3 2h6.8l4.8 6.3L18.9 2Zm-1.2 18h1.7L7.4 3.9H5.6L17.7 20Z" />
    </svg>
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
