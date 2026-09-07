"use client";

import { useEffect, useState } from "react";
import ResourcesMenu from "./ResourcesMenu";
import { BASE_PATH } from "@/lib/config";

const LAUNCH_TRADING_URL = "https://trade.alphanet.global/";
const INSIGHTS_URL = "https://alphanet.global/blog";
const POINTS_URL = "https://alphanet.global/points";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
    <header className={`nav${scrolled ? " scrolled" : ""}`}>
      <a className="brand" href="https://alphanet.global">
        <img className="brand-logo" src={`${BASE_PATH}/logo.png`} alt="AlphaNet" width={110} height={22} />
        <span className="brand-sep" />
        <span className="brand-sub">Trading&nbsp;Evolved</span>
      </a>

      <div className="nav-right">
        <a className="icon-link" href="https://t.me/AlphaNet_AI" target="_blank" rel="noopener noreferrer" aria-label="AlphaNet on Telegram">
          <TelegramIcon />
        </a>
        <a className="icon-link" href="https://x.com/AlphaNet_AI" target="_blank" rel="noopener noreferrer" aria-label="AlphaNet on X">
          <XIcon />
        </a>
        <a className="btn-nav" href={LAUNCH_TRADING_URL} target="_blank" rel="noopener noreferrer">
          Launch Trading
        </a>

        <nav className="nav-links" aria-label="Primary">
          <ResourcesMenu />
          <a href={INSIGHTS_URL} target="_blank" rel="noopener noreferrer">
            Insights
          </a>
          <a href="https://alphanet.global/markets" className="active" aria-current="page">
            Markets
          </a>
          <a href={POINTS_URL}>Points</a>
        </nav>

        <button
          type="button"
          className="burger"
          id="burger"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span />
          <span />
        </button>
      </div>
    </header>

    {menuOpen && (
      <div className="menu-overlay" onClick={() => setMenuOpen(false)}>
        <nav className="menu-links" aria-label="Mobile" onClick={(e) => e.stopPropagation()}>
          <a href="https://alphanet.global/#resources">Resources</a>
          <a href={INSIGHTS_URL} target="_blank" rel="noopener noreferrer">
            Insights
          </a>
          <a href="https://alphanet.global/markets" className="active" aria-current="page">
            Markets
          </a>
          <a href={POINTS_URL}>Points</a>
          <a className="btn-nav" href={LAUNCH_TRADING_URL} target="_blank" rel="noopener noreferrer">
            Launch Trading
          </a>
        </nav>
      </div>
    )}
    </>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.437-.752-.241-1.35-.368-1.298-.778.027-.213.32-.431.879-.654 3.446-1.5 5.744-2.49 6.895-2.969 3.283-1.362 3.965-1.598 4.409-1.606z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
