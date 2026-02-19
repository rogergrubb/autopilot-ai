import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Full Send AI | Autonomous AI Agents",
  description: "AI agents that autonomously execute tasks, research the web, create content, and connect to 3000+ apps.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script src="https://analytics.numberoneson.us/t.js" data-site="fullsend" defer></script>
      </head>
      <body className="bg-[#faf8f5] text-[#1a1a1a] antialiased font-sans">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
