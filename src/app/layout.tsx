import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DoAnything AI",
  description: "Autonomous AI agents that work for you",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-white min-h-screen antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
