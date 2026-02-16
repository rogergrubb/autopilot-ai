import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en" className="dark">
      <body className="bg-[#0d0d14] text-white antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
