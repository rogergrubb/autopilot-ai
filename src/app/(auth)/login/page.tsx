"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Zap } from "lucide-react";

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
      await signIn("credentials", {
        email,
        password,
        redirectTo: "/",
      });
    } catch {
      setError("Invalid credentials. Use password: demo");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-500/20">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">AutoPilot AI</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Sign in to your agent workspace
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-zinc-400 block mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          <div>
            <label className="text-sm text-zinc-400 block mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium py-2.5 rounded-lg text-sm transition-all disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-zinc-600 text-xs mt-6">
          Demo: Use any email with password &quot;demo&quot;
        </p>
      </div>
    </div>
  );
}
