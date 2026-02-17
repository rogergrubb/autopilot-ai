import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "DoAnything | Autonomous AI Agents",
  description: "AI agents that autonomously run your social media strategy and grow your following",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#faf8f5] text-[#1a1a1a] antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
