import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Noise overlay */}
      <div
        className="fixed inset-0 bg-noise pointer-events-none z-[9999] mix-blend-overlay"
        style={{ opacity: 0.035 }}
        aria-hidden
      />

      {/* Glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(16,185,129,0.12) 0%, transparent 70%)", filter: "blur(60px)" }}
        aria-hidden
      />

      <header className="px-6 h-16 flex items-center border-b border-white/[0.06]">
        <Logo href="/" height={24} dark />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-8xl font-black text-white/[0.06] tracking-tight select-none mb-2">404</p>
        <h1 className="text-2xl font-bold text-white mb-3 -mt-2">Page not found</h1>
        <p className="text-gray-400 text-sm max-w-xs mb-8">
          This page doesn't exist or was moved. Check the URL or head back to the dashboard.
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm bg-white text-gray-900 px-5 py-2.5 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Go to dashboard
          </Link>
          <Link
            href="/"
            className="text-sm text-gray-400 hover:text-white transition-colors px-5 py-2.5"
          >
            Home
          </Link>
        </div>
      </main>

      <footer className="px-6 py-6 text-center">
        <span className="text-xs text-gray-700">© {new Date().getFullYear()} Upleus</span>
      </footer>
    </div>
  );
}
