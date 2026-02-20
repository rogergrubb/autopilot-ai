"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Rocket } from "lucide-react";
import Link from "next/link";
import { toast } from "@/components/ui/Toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
        toast.error("Invalid email or password");
        setLoading(false);
        return;
      }

      toast.success("Welcome back!");
      window.location.href = "/app";
    } catch {
      setError("Something went wrong. Please try again.");
      toast.error("Connection error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#2d8a4e] flex items-center justify-center mb-4 shadow-lg shadow-[#2d8a4e]/20">
            <Rocket className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Full Send AI</h1>
          <p className="text-[#8a8478] text-sm mt-1">
            Sign in to your agent workspace
          </p>
        </div>

        {/* Google OAuth */}
        <button
          onClick={() => signIn("google", { redirectTo: "/app" })}
          className="w-full flex items-center justify-center gap-2 bg-white border border-[#e5e0d8] hover:bg-[#f5f2ed] text-[#1a1a1a] font-medium py-2.5 rounded-lg text-sm transition-all mb-4"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>

        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#e5e0d8]" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-[#faf8f5] px-2 text-[#8a8478]">or</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-[#8a8478] block mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full bg-white border border-[#e5e0d8] rounded-lg px-3 py-2.5 text-[#1a1a1a] text-sm placeholder-[#b5ae9e] focus:outline-none focus:border-[#2d8a4e] transition-colors"
            />
          </div>

          <div>
            <label className="text-sm text-[#8a8478] block mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              className="w-full bg-white border border-[#e5e0d8] rounded-lg px-3 py-2.5 text-[#1a1a1a] text-sm placeholder-[#b5ae9e] focus:outline-none focus:border-[#2d8a4e] transition-colors"
            />
          </div>

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2d8a4e] hover:bg-[#247a42] text-white font-medium py-2.5 rounded-lg text-sm transition-all disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-[#8a8478] text-xs mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-[#2d8a4e] hover:underline font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
