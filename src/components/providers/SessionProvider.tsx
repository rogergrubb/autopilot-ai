"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { ToastContainer } from "@/components/ui/Toast";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider>
      {children}
      <ToastContainer />
    </NextAuthSessionProvider>
  );
}
