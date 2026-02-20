import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  title: "Full Send AI | Autonomous AI Agents That Get Things Done",
  description: "AI agents that autonomously execute tasks, research the web, create content, make phone calls, and connect to 3000+ apps. Your personal AI workforce.",
  keywords: ["AI agents", "autonomous AI", "AI assistant", "task automation", "AI research", "content creation"],
  authors: [{ name: "Full Send AI" }],
  creator: "Full Send AI",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://fullsendai.com",
    siteName: "Full Send AI",
    title: "Full Send AI | Autonomous AI Agents That Get Things Done",
    description: "AI agents that autonomously execute tasks, research the web, create content, make phone calls, and connect to 3000+ apps.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Full Send AI - Autonomous AI Agents",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Full Send AI | Autonomous AI Agents",
    description: "AI agents that autonomously execute tasks, research the web, create content, and connect to 3000+ apps.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  metadataBase: new URL(process.env.NEXTAUTH_URL || "https://fullsendai.com"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="canonical" href="https://fullsendai.com" />
        <script src="https://analytics.numberoneson.us/t.js" data-site="fullsend" defer></script>
      </head>
      <body className="bg-[#faf8f5] text-[#1a1a1a] antialiased font-sans">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
