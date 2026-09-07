import { BASE_PATH } from "@/lib/config";

const PLATFORM_LINKS = [
  { label: "Launch Trading", href: "https://trade.alphanet.global/" },
  { label: "Strategy Marketplace", href: "https://trade.alphanet.global/strategies" },
  { label: "Leaderboard", href: "https://alphanet.global/#leaderboard" },
  { label: "Markets", href: "https://alphanet.global/markets", current: true },
  { label: "Points", href: "https://alphanet.global/points" },
  { label: "AI DEX", href: "https://alphanet.global/#ai-dex", pill: "SEP" },
];

const RESOURCES_LINKS = [
  { label: "Technical Whitepaper", href: "https://alphanet.global/docs/whitepaper" },
  { label: "User Guide", href: "https://alphanet.global/docs/guide" },
  { label: "Points Documentation", href: "https://alphanet.global/points" },
  { label: "Hackworth V3", href: "https://alphanet.global/hackworth-v3" },
  { label: "Guild Program", href: "https://alphanet.global/points#guild" },
];

const COMMUNITY_LINKS = [
  { label: "Follow on X", href: "https://x.com/AlphaNet_AI" },
  { label: "Join on Telegram", href: "https://t.me/AlphaNet_AI" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <a className="brand" href="https://alphanet.global">
            <img className="brand-logo" src={`${BASE_PATH}/logo.png`} alt="AlphaNet" width={110} height={22} />
            <span className="brand-sep" />
            <span className="brand-sub">Trading&nbsp;Evolved</span>
          </a>
          <p>
            End-to-end institutional-grade
            <br />
            AI futures trading platform.
          </p>
        </div>

        <FooterCol title="PLATFORM" links={PLATFORM_LINKS} />
        <FooterCol title="RESOURCES" links={RESOURCES_LINKS} />
        <FooterCol title="COMMUNITY" links={COMMUNITY_LINKS} />
      </div>

      <div className="container footer-base mono">
        <span>© {year} ALPHANET. ALL RIGHTS RESERVED.</span>
        <span>PAST PERFORMANCE DOES NOT GUARANTEE FUTURE RESULTS.</span>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string; current?: boolean; pill?: string }[];
}) {
  return (
    <div className="footer-col">
      <div className="mono footer-h">{title}</div>
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target={link.current ? undefined : "_blank"}
          rel={link.current ? undefined : "noopener noreferrer"}
          aria-current={link.current ? "page" : undefined}
        >
          {link.label}
          {link.pill && <span className="pill-new">{link.pill}</span>}
        </a>
      ))}
    </div>
  );
}
