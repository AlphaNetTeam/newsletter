import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{ maxWidth: 720, margin: "80px auto", padding: "0 32px" }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>Market not found</h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: 24 }}>
        That symbol isn&apos;t in the AlphaNet markets list.
      </p>
      <Link href="/BTC" style={{ color: "var(--accent-green)", fontWeight: 600 }}>
        View BTC trading strategy
      </Link>
    </main>
  );
}
