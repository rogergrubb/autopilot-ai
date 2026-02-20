import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#faf8f5] px-4">
      <div className="w-16 h-16 rounded-2xl bg-[#f0ece4] flex items-center justify-center mb-6">
        <span className="text-3xl">🔍</span>
      </div>
      <h1 className="text-2xl font-bold text-[#1a1a1a] mb-2">Page Not Found</h1>
      <p className="text-[#8a8478] text-sm mb-6 text-center max-w-sm">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/app"
        className="px-6 py-2.5 rounded-lg bg-[#2d8a4e] text-white text-sm font-medium hover:bg-[#247a42] transition-colors"
      >
        Go Home
      </Link>
    </div>
  );
}
