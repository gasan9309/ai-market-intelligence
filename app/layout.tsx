import type { Metadata } from "next";
import "./globals.css";
import { NavShell } from "@/components/NavShell";

export const metadata: Metadata = {
  title: "AI Market Intelligence",
  description: "Real-time probabilistic market signals from news and price data. Research tool — not financial advice.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-bg text-text-primary">
        <NavShell>{children}</NavShell>
      </body>
    </html>
  );
}
