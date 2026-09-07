const TABS = [
  { id: "price", label: "Price" },
  { id: "news", label: "News" },
  { id: "strategies", label: "Strategies" },
  { id: "volatility", label: "Volatility" },
  { id: "faq", label: "FAQ" },
] as const;

export default function TabsNav() {
  return (
    <nav className="mk-tabs mono" aria-label="Section">
      {TABS.map((tab) => (
        <a key={tab.id} href={`#${tab.id}`}>
          {tab.label}
        </a>
      ))}
    </nav>
  );
}
