import Link from "next/link";
import ResourcesMenu from "./ResourcesMenu";
import { BASE_PATH } from "@/lib/config";

const navLinkStyle: React.CSSProperties = {
  fontSize: 14,
  color: "var(--text-secondary)",
  display: "flex",
  alignItems: "center",
  gap: 4,
  cursor: "pointer",
  textDecoration: "none",
};

const LAUNCH_TRADING_URL = "https://trade.alphanet.global/";
const INSIGHTS_URL = "https://alphanet.global/blog";
const GUILD_LEADERS_URL = "https://alphanet.global/#partner-heading";
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
        <a href="https://alphanet.global" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src={`${BASE_PATH}/logo.png`} alt="AlphaNet" width={110} height={22} />
          <span style={{ width: 1, height: 16, background: "var(--border-strong)" }} />
          <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>Trading Evolved</span>
        </a>

        <nav aria-label="Primary" style={{ display: "flex", alignItems: "center", gap: 28 }}>
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

function TelegramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.9 2H22l-7.6 8.7L23.3 22H16.6l-5.3-6.9L5.2 22H2l8.1-9.3L1.3 2h6.8l4.8 6.3L18.9 2Zm-1.2 18h1.7L7.4 3.9H5.6L17.7 20Z" />
    </svg>
  );
}
