import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Logo } from "@/components/Logo";
import { CodeTabs } from "@/components/CodeTabs";
import { HeroBlobs } from "@/components/home/HeroBlobs";
import { ScrollReveal } from "@/components/home/ScrollReveal";

export const metadata: Metadata = {
  title: "Upleus — Uptime & SSL Monitoring",
  description:
    "Monitor your websites, APIs, domains, and cron jobs. Get instant alerts when something goes wrong — before your users notice.",
};

export default async function Home() {
  const { userId } = await auth();

  return (
    <div className="min-h-screen bg-gray-950 text-white antialiased">

      {/* ── Noise overlay (full page grain texture) ─────────────── */}
      <div
        className="fixed inset-0 bg-noise pointer-events-none z-[9999] mix-blend-overlay"
        style={{ opacity: 0.035 }}
        aria-hidden
      />

      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-gray-950/75 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center">
          <div className="flex-1">
            <Logo href="/" height={26} dark />
          </div>
          <div className="hidden sm:flex items-center gap-8">
            <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="text-sm text-gray-400 hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="flex-1 flex items-center justify-end gap-3">
            {userId ? (
              <Link
                href="/dashboard"
                className="text-sm bg-white text-gray-900 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/sign-in" className="text-sm text-gray-400 hover:text-white transition-colors font-medium">
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="text-sm bg-white text-gray-900 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-all"
                >
                  Get started free
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-16">

        {/* Animated blob gradients */}
        <HeroBlobs />

        {/* Subtle grid lines */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
          aria-hidden
        />

        {/* Vignette edges */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, rgba(3,7,18,0.85) 100%)",
          }}
          aria-hidden
        />

        {/* Content */}
        <div className="relative z-10 text-center max-w-4xl mx-auto px-6 pb-12">

          {/* Status badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] sm:text-xs font-medium mt-10 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <span className="sm:hidden">6 monitor types</span>
            <span className="hidden sm:inline">HTTP · TCP · Heartbeat · WordPress · Shopify · Domain & SSL</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.04]">
            Stop finding out
            <span
              className="block mt-1 bg-clip-text text-transparent animate-shimmer"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, #34d399, #6ee7b7, #2dd4bf, #34d399)",
                backgroundSize: "200% auto",
              }}
            >
              from your customers
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-xl text-gray-400 leading-relaxed max-w-2xl mx-auto">
            Monitor websites, TCP ports, cron jobs, SSL certs, domain expiry, WordPress security, and Shopify stores.
            Get alerted the moment something breaks — before your users notice.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/sign-up"
              className="cta-glow group relative bg-emerald-500 text-white px-8 py-3.5 rounded-xl text-sm font-semibold hover:bg-emerald-400 transition-all hover:-translate-y-0.5"
            >
              Start monitoring free
              <span className="ml-2 inline-block group-hover:translate-x-1 transition-transform">→</span>
            </Link>
            <a
              href="#features"
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors font-medium"
            >
              See what we monitor ↓
            </a>
          </div>
          <p className="mt-4 text-xs text-gray-700">No credit card · 5 monitors free · Free forever</p>
        </div>

        {/* Dashboard mockup */}
        <div className="relative z-10 w-full max-w-4xl mx-auto px-6 pb-0 hidden sm:block">
          {/* Glow beneath mockup */}
          <div
            className="absolute inset-x-24 top-8 h-32 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 60% 80% at 50% 0%, rgba(16,185,129,0.18), transparent)" }}
            aria-hidden
          />

          {/* Browser window */}
          <div
            className="relative rounded-2xl overflow-hidden border border-white/10 shadow-[0_32px_80px_rgba(0,0,0,0.7)]"
            style={{ transform: "perspective(1100px) rotateX(7deg)", transformOrigin: "center top" }}
          >
            {/* Chrome bar */}
            <div className="flex items-center gap-2 px-5 py-3.5 bg-[#0d1117] border-b border-white/[0.06]">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/50" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-gray-800/60 border border-white/[0.06] rounded-md px-8 py-1 text-xs text-gray-600">
                  app.upleus.com/dashboard
                </div>
              </div>
            </div>

            {/* Dashboard body */}
            <div className="bg-[#0a0f16] p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-white">All monitors</p>
                  <p className="text-xs text-gray-600 mt-0.5">7 monitors · 1 incident</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-full font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  1 down
                </div>
              </div>

              <div className="space-y-2">
                {([
                  { name: "app.example.com",      badge: null,          ms: "118ms", status: "up",   extra: null         },
                  { name: "db.example.com:5432",  badge: "TCP",         ms: "4ms",   status: "up",   extra: null         },
                  { name: "my-brand.myshopify.com", badge: "Shopify",     ms: "—",     status: "down", extra: "pwd on"     },
                  { name: "Daily backup job",      badge: "Heartbeat",   ms: "—",     status: "up",   extra: null         },
                  { name: "example.com",          badge: null,          ms: "203ms", status: "up",   extra: "SSL 23d"    },
                  { name: "client-blog.com",      badge: "WordPress",   ms: "—",     status: "up",   extra: "2 issues"   },
                ] as const).map((row) => (
                  <div
                    key={row.name}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                      row.status === "down"
                        ? "bg-red-500/[0.06] border-red-500/20"
                        : "bg-white/[0.02] border-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${row.status === "up" ? "bg-emerald-400" : "bg-red-400"}`} />
                      <span className="text-sm text-gray-300 font-mono">{row.name}</span>
                      {row.badge && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-gray-500 font-medium">{row.badge}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      {row.extra && (
                        <span className={`hidden sm:block text-xs px-2 py-0.5 rounded-full border ${
                          row.extra.includes("issue")
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}>
                          {row.extra}
                        </span>
                      )}
                      <span className="text-xs text-gray-700 hidden sm:block">{row.ms}</span>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        row.status === "up"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-red-500/10 text-red-400"
                      }`}>
                        {row.status === "up" ? "Up" : "Down"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom fade — blends mockup into the page */}
            <div
              className="absolute bottom-0 inset-x-0 h-20 pointer-events-none"
              style={{ background: "linear-gradient(to top, #030712, transparent)" }}
              aria-hidden
            />
          </div>
        </div>
      </section>

      {/* ── Stats strip ─────────────────────────────────────────── */}
      <section className="border-y border-white/[0.05] bg-white/[0.02]">
        <div className="max-w-4xl mx-auto px-6 py-10 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {([
            { value: "3 min",  label: "check interval" },
            { value: "< 60s", label: "time to alert" },
            { value: "5",      label: "monitor types" },
            { value: "Free",   label: "to get started" },
          ] as const).map((s) => (
            <div key={s.label}>
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-gray-600 mt-1 tracking-wide uppercase">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────── */}
      <section id="features" className="py-20 sm:py-32 px-6 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(16,185,129,0.07), transparent)" }}
          aria-hidden
        />

        <div className="relative max-w-6xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-10 sm:mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
                Six ways to know<br className="hidden sm:block" /> something's wrong
              </h2>
              <p className="mt-4 text-gray-400 max-w-lg mx-auto text-base sm:text-lg">
                Most tools only ping your homepage. We go deeper.
              </p>
            </div>
          </ScrollReveal>

          {/* Primary feature cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {([
              {
                label: "HTTP",
                title: "Website uptime",
                desc: "Hit your URL every 3 minutes, record status code and response time. Down alert fast.",
                accent: "#10b981",
                accentBg: "rgba(16,185,129,0.08)",
                accentBorder: "rgba(16,185,129,0.2)",
                accentText: "text-emerald-400",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
                  </svg>
                ),
              },
              {
                label: "TCP",
                title: "Port monitoring",
                desc: "Check that your database, Redis, or SSH port is reachable — not just the website in front of it.",
                accent: "#3b82f6",
                accentBg: "rgba(59,130,246,0.08)",
                accentBorder: "rgba(59,130,246,0.2)",
                accentText: "text-blue-400",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                  </svg>
                ),
              },
              {
                label: "Heartbeat",
                title: "Cron monitoring",
                desc: "Your job pings us when it finishes. If we don't hear from it on time, we alert you.",
                accent: "#8b5cf6",
                accentBg: "rgba(139,92,246,0.08)",
                accentBorder: "rgba(139,92,246,0.2)",
                accentText: "text-violet-400",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h2l2-6 4 12 3-8 2 4h5" />
                  </svg>
                ),
              },
              {
                label: "SSL & Domain",
                title: "Expiry alerts",
                desc: "Reminders 30, 7, and 1 day before your cert or domain runs out. Forgetting isn't an option.",
                accent: "#f59e0b",
                accentBg: "rgba(245,158,11,0.08)",
                accentBorder: "rgba(245,158,11,0.2)",
                accentText: "text-amber-400",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                ),
              },
              {
                label: "WordPress",
                title: "Security scanning",
                desc: "Detect outdated core, abandoned plugins, XML-RPC exposure, directory listing, and login page risk. Daily.",
                accent: "#f97316",
                accentBg: "rgba(249,115,22,0.08)",
                accentBorder: "rgba(249,115,22,0.2)",
                accentText: "text-orange-400",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                ),
              },
              {
                label: "Shopify",
                title: "Store health",
                desc: "Auto-detect password mode, maintenance mode, and cart API failures. Know when your store goes dark before customers bounce.",
                accent: "#06b6d4",
                accentBg: "rgba(6,182,212,0.08)",
                accentBorder: "rgba(6,182,212,0.2)",
                accentText: "text-cyan-400",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                  </svg>
                ),
              },
            ] as const).map((f, i) => (
              <ScrollReveal key={f.label} delay={i * 80}>
                <div
                  className="group relative h-full p-6 rounded-2xl border bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300 cursor-default overflow-hidden"
                  style={{ borderColor: f.accentBorder }}
                >
                  {/* Top accent line */}
                  <div
                    className="absolute top-0 inset-x-0 h-px"
                    style={{ background: `linear-gradient(90deg, transparent, ${f.accent}80, transparent)` }}
                    aria-hidden
                  />
                  {/* Hover glow */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ background: `radial-gradient(ellipse 70% 50% at 50% 0%, ${f.accentBg}, transparent)` }}
                    aria-hidden
                  />

                  <div className="relative">
                    <div
                      className={`inline-flex items-center gap-2 text-xs font-bold px-2.5 py-1 rounded-full mb-5 ${f.accentText}`}
                      style={{ background: f.accentBg, border: `1px solid ${f.accentBorder}` }}
                    >
                      {f.icon}
                      {f.label}
                    </div>
                    <h3 className="font-semibold text-white text-lg mb-2">{f.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* Secondary features */}
          <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {([
              {
                title: "Instant email alerts",
                desc: "Down and recovery — two emails per incident. No dashboards to remember to check.",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 text-gray-500" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                ),
              },
              {
                title: "Public status pages",
                desc: "Each project gets a shareable status URL. Let clients self-serve before they call you.",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 text-gray-500" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                ),
              },
              {
                title: "Incident history",
                desc: "Every outage logged with start, end, and duration. Useful for SLA conversations.",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 text-gray-500" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                ),
              },
              {
                title: "Plugin risk reports",
                desc: "Abandoned, outdated, or delisted WordPress plugins flagged automatically. Know before you're exploited.",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 text-gray-500" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path strokeLinecap="round" strokeLinejoin="round" d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                ),
              },
            ] as const).map((f, i) => (
              <ScrollReveal key={f.title} delay={i * 80}>
                <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/10 transition-colors">
                  <div className="mb-4">{f.icon}</div>
                  <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Heartbeat / code integration ────────────────────────── */}
      <section className="py-20 sm:py-32 px-6 relative overflow-hidden border-t border-white/[0.04]">
        {/* Violet glow — right side */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 55% 70% at 85% 50%, rgba(139,92,246,0.08), transparent)" }}
          aria-hidden
        />
        {/* Emerald glow — left side */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 40% 60% at 15% 50%, rgba(16,185,129,0.06), transparent)" }}
          aria-hidden
        />

        <div className="relative max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

            <ScrollReveal>
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 mb-6">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h2l2-6 4 12 3-8 2 4h5" />
                  </svg>
                  Heartbeat monitoring
                </span>

                <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight leading-[1.1]">
                  One line.
                  <br />
                  <span
                    className="bg-clip-text text-transparent"
                    style={{
                      backgroundImage: "linear-gradient(90deg, #a78bfa, #34d399)",
                    }}
                  >
                    Never miss a silent failure.
                  </span>
                </h2>

                <p className="mt-5 text-gray-400 leading-relaxed text-base sm:text-lg">
                  Cron jobs fail without telling anyone. The script errors, the process gets killed, the server reboots.
                  Add one line — we alert you the moment your job stops checking in.
                </p>

                <ul className="mt-7 space-y-3.5">
                  {[
                    "Works with any language or script",
                    "Set the expected interval — hourly, daily, custom",
                    "Configurable grace period before alerting",
                    "Last 30 check-ins visible at a glance",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-gray-400">
                      <svg className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={140}>
              <CodeTabs />
            </ScrollReveal>

          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────── */}
      <section className="py-20 sm:py-32 px-6 relative overflow-hidden border-t border-white/[0.04]">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 80% at 50% 50%, rgba(16,185,129,0.04), transparent)" }}
          aria-hidden
        />

        <div className="relative max-w-5xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-10 sm:mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">Set up in two minutes</h2>
              <p className="mt-4 text-gray-400 text-base sm:text-lg">No agents, no SDK, no infrastructure to touch.</p>
            </div>
          </ScrollReveal>

          <div className="grid sm:grid-cols-3 gap-5">
            {([
              {
                n: "01",
                title: "Add a monitor",
                desc: "Paste a URL for HTTP, enter host + port for TCP, give a heartbeat a name and interval. Done.",
              },
              {
                n: "02",
                title: "We check on schedule",
                desc: "HTTP and TCP polled every 3 minutes. SSL, domain, WordPress, and Shopify scanned regularly. Heartbeat waits for your job to report in.",
              },
              {
                n: "03",
                title: "Get the email that matters",
                desc: "Something breaks → email. It recovers → email. That's the whole loop. No noise in between.",
              },
            ] as const).map((step, i) => (
              <ScrollReveal key={step.n} delay={i * 100}>
                <div className="relative p-7 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/10 transition-colors overflow-hidden">
                  {/* Large ghost number */}
                  <div className="absolute -top-2 -right-1 text-[80px] font-black text-white/[0.03] font-mono leading-none select-none">
                    {step.n}
                  </div>
                  <div className="relative">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5">
                      <span className="text-xs font-bold text-emerald-400 font-mono">{step.n}</span>
                    </div>
                    <h3 className="font-semibold text-white mb-2 text-lg">{step.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Built for agencies ───────────────────────────────────── */}
      <section className="py-20 sm:py-32 px-6 relative overflow-hidden border-t border-white/[0.04]">
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(16,185,129,0.06), transparent 70%)" }}
          aria-hidden
        />

        <div className="relative max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-2 gap-10 sm:gap-16 items-center">

            <ScrollReveal>
              <div>
                <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight leading-[1.1]">
                  Useful if you manage
                  <span className="block text-gray-500"> sites for other people</span>
                </h2>
                <p className="mt-5 text-gray-400 leading-relaxed">
                  Group monitors into projects — one per client. Each project gets a public status page you can
                  share with them. Add their email so alerts go directly to them too.
                </p>
                <p className="mt-4 text-gray-400 leading-relaxed">
                  When something breaks, your client finds out at the same time you do. Not an hour later
                  when they call.
                </p>
                <Link
                  href="/sign-up"
                  className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Try it free →
                </Link>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={150}>
              <div className="space-y-3">
                {([
                  { name: "Client A — ecommerce store", monitors: 4, status: "All up",    up: true  },
                  { name: "Client B — SaaS startup",    monitors: 6, status: "All up",    up: true  },
                  { name: "Client C — WordPress blog",  monitors: 2, status: "1 incident", up: false },
                ] as const).map((p) => (
                  <div
                    key={p.name}
                    className={`flex items-center justify-between rounded-xl px-5 py-4 border transition-colors ${
                      p.up
                        ? "bg-white/[0.02] border-white/[0.06]"
                        : "bg-red-500/[0.05] border-red-500/20"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">{p.name}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{p.monitors} monitors</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      p.up ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                    }`}>
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollReveal>

          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 sm:py-32 px-6 relative overflow-hidden border-t border-white/[0.04]">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 70% at 50% 110%, rgba(16,185,129,0.09), transparent)" }}
          aria-hidden
        />

        <div className="relative max-w-4xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-14">
              <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">Free while we grow</h2>
              <p className="mt-4 text-gray-400 text-base sm:text-lg">No credit card. No trial. No bait-and-switch.</p>
            </div>
          </ScrollReveal>

          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">

            <ScrollReveal>
              <div className="relative rounded-2xl p-7 border border-emerald-500/25 bg-white/[0.02] overflow-hidden h-full flex flex-col">
                {/* Top shimmer line */}
                <div
                  className="absolute top-0 inset-x-0 h-px"
                  style={{ background: "linear-gradient(90deg, transparent, rgba(16,185,129,0.6), transparent)" }}
                  aria-hidden
                />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(16,185,129,0.07), transparent)" }}
                  aria-hidden
                />

                <div className="relative flex-1">
                  <div className="text-xs font-medium text-gray-500 mb-2">Free</div>
                  <div className="flex items-baseline gap-1.5 mb-2">
                    <span className="text-4xl font-bold text-white">$0</span>
                    <span className="text-gray-500 text-sm">/ month</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-7">Everything that's built, free to use.</p>
                  <ul className="space-y-3 mb-8">
                    {[
                      "5 monitors total",
                      "HTTP, TCP, heartbeat, domain, WordPress & Shopify",
                      "3-minute check interval",
                      "SSL & domain expiry alerts",
                      "WordPress security scanning",
                      "Shopify store health checks",
                      "Email alerts with recovery",
                      "Public status page per project",
                    ].map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-sm text-gray-300">
                        <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <Link
                  href="/sign-up"
                  className="relative block text-center py-3 rounded-xl text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
                >
                  Get started free
                </Link>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={100}>
              <div className="rounded-2xl p-7 border border-white/[0.06] bg-white/[0.01] flex flex-col h-full">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="text-xs font-medium text-gray-600">Pro</div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/5 text-gray-600">
                      Coming soon
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5 mb-2">
                    <span className="text-4xl font-bold text-gray-800">—</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-7">For teams and agencies that need more.</p>
                  <ul className="space-y-3 mb-8">
                    {[
                      "Higher monitor limits",
                      "Slack & webhook alerts",
                      "WordPress vulnerability scanning",
                      "Keyword & content monitoring",
                      "Maintenance windows",
                      "Monthly uptime reports",
                      "Team access",
                    ].map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                        <svg className="w-4 h-4 text-gray-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="block text-center py-3 rounded-xl text-sm font-semibold bg-white/[0.03] text-gray-700 cursor-not-allowed border border-white/[0.05] select-none">
                  Coming soon
                </div>
              </div>
            </ScrollReveal>

          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────── */}
      <section className="py-20 sm:py-32 px-6 relative overflow-hidden border-t border-white/[0.04]">
        {/* Big emerald radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 80% at 50% 50%, rgba(16,185,129,0.13), transparent)" }}
          aria-hidden
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
          aria-hidden
        />

        <ScrollReveal>
          <div className="relative max-w-2xl mx-auto text-center">
            <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
              The next outage is going<br className="hidden sm:block" /> to happen.
            </h2>
            <p
              className="text-4xl sm:text-5xl font-bold mt-1 bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(90deg, #34d399, #2dd4bf)" }}
            >
              Who finds out first?
            </p>
            <p className="mt-6 text-gray-400 text-base sm:text-lg">Takes two minutes to set up. Free forever.</p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/sign-up"
                className="cta-glow bg-emerald-500 text-white px-9 py-4 rounded-xl text-base font-semibold hover:bg-emerald-400 transition-all hover:-translate-y-0.5 shadow-xl shadow-emerald-500/20"
              >
                Create free account →
              </Link>
            </div>
            <p className="mt-5 text-xs text-gray-700">No credit card · 5 monitors free</p>
          </div>
        </ScrollReveal>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.05] py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo href="/" height={22} dark />
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <a href="#features" className="text-gray-700 text-xs hover:text-gray-400 transition-colors">Features</a>
            <a href="#pricing" className="text-gray-700 text-xs hover:text-gray-400 transition-colors">Pricing</a>
            <Link href="/sign-in" className="text-gray-700 text-xs hover:text-gray-400 transition-colors">Sign in</Link>
            <Link href="/legal/privacy" className="text-gray-700 text-xs hover:text-gray-400 transition-colors">Privacy</Link>
            <Link href="/legal/terms" className="text-gray-700 text-xs hover:text-gray-400 transition-colors">Terms</Link>
          </div>
          <span className="text-gray-800 text-xs">© {new Date().getFullYear()} Upleus</span>
        </div>
      </footer>

    </div>
  );
}
