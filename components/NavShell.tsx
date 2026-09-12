"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/history", label: "Prediction History" },
  { href: "/performance", label: "Model Performance" },
  { href: "/data-quality", label: "Data Quality" },
  { href: "/backtest", label: "Backtesting" },
  { href: "/paper-trading", label: "Paper Trading" },
];

export function NavShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b hairline bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center gap-8 px-5 py-3">
          <Link href="/" className="flex items-baseline gap-2 shrink-0">
            <span className="text-[15px] font-semibold tracking-tight">AI Market Intelligence</span>
          </Link>
          <nav className="flex flex-1 items-center gap-1 overflow-x-auto text-sm">
            {LINKS.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`whitespace-nowrap rounded px-3 py-1.5 transition-colors ${
                    active ? "bg-bg-panel text-text-primary" : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-5 py-6">{children}</main>
      <footer className="border-t hairline px-5 py-4 text-center text-xs text-text-tertiary">
        Research signals only — not financial advice. Paper trading uses simulated capital; no real trades are executed.
      </footer>
    </div>
  );
}
