export default function AppLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#faf8f5]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#2d8a4e] flex items-center justify-center animate-pulse">
          <span className="text-white text-lg font-bold">F</span>
        </div>
        <p className="text-sm text-[#8a8478]">Loading your workspace...</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#2d8a4e] animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 rounded-full bg-[#2d8a4e] animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 rounded-full bg-[#2d8a4e] animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}
