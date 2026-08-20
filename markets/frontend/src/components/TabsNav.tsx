const TABS = ["Price", "News", "Strategies", "Volatility", "FAQ"] as const;
export type TabKey = (typeof TABS)[number];

interface Props {
  active: TabKey;
  onChange: (tab: TabKey) => void;
}

// Mirrors the source design: only "Price" is a live, data-backed tab.
// The others are present for visual parity but are non-functional there
// too, so we render them as disabled to be honest about scope rather
// than silently doing nothing on click.
export default function TabsNav({ active, onChange }: Props) {
  return (
    <div
      style={{
        display: "flex",
        gap: 28,
        borderBottom: "1px solid var(--border)",
      }}
    >
      {TABS.map((tab) => {
        const isActive = tab === active;
        const isEnabled = tab === "Price";
        return (
          <button
            key={tab}
            type="button"
            disabled={!isEnabled}
            onClick={() => isEnabled && onChange(tab)}
            title={isEnabled ? undefined : "Not implemented in this demo"}
            style={{
              background: "none",
              border: "none",
              borderBottom: isActive ? "2px solid var(--accent-green)" : "2px solid transparent",
              color: isActive
                ? "var(--text-primary)"
                : isEnabled
                ? "var(--text-secondary)"
                : "var(--text-tertiary)",
              fontSize: 14,
              fontWeight: isActive ? 600 : 500,
              padding: "0 0 12px 0",
              cursor: isEnabled ? "pointer" : "not-allowed",
              opacity: isEnabled ? 1 : 0.55,
            }}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}
