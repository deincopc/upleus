import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const { userId } = await auth();

  if (!userId || userId !== process.env.ADMIN_CLERK_ID) notFound();

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const [
    totalUsers,
    newUsersWeek,
    newUsersMonth,
    totalMonitors,
    activeMonitors,
    downMonitors,
    monitorsByType,
    checksToday,
    checksHour,
    failedChecksToday,
    alertsToday,
    alertsWeek,
    alertsByType,
    overdueMonitors,
    lastCheck,
    topUsers,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
    prisma.monitor.count(),
    prisma.monitor.count({ where: { isActive: true } }),
    prisma.monitor.count({ where: { isActive: true, isUp: false } }),
    prisma.monitor.groupBy({ by: ["type"], _count: { id: true } }),
    prisma.monitorCheck.count({ where: { checkedAt: { gte: todayStart } } }),
    prisma.monitorCheck.count({ where: { checkedAt: { gte: hourAgo } } }),
    prisma.monitorCheck.count({ where: { checkedAt: { gte: todayStart }, isUp: false } }),
    prisma.alert.count({ where: { sentAt: { gte: todayStart } } }),
    prisma.alert.count({ where: { sentAt: { gte: weekAgo } } }),
    prisma.alert.groupBy({ by: ["type"], _count: { id: true }, orderBy: { _count: { id: "desc" } } }),
    prisma.monitor.count({ where: { isActive: true, nextCheckAt: { lt: now } } }),
    prisma.monitorCheck.findFirst({ orderBy: { checkedAt: "desc" }, select: { checkedAt: true } }),
    prisma.user.findMany({
      take: 10,
      orderBy: { monitors: { _count: "desc" } },
      select: {
        email: true,
        name: true,
        createdAt: true,
        _count: { select: { monitors: true } },
      },
    }),
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { email: true, name: true, createdAt: true },
    }),
  ]);

  const checksSuccessRate =
    checksToday > 0
      ? (((checksToday - failedChecksToday) / checksToday) * 100).toFixed(1)
      : null;

  const workerLastSeen = lastCheck?.checkedAt ?? null;
  const workerStaleSec = workerLastSeen
    ? Math.floor((now.getTime() - new Date(workerLastSeen).getTime()) / 1000)
    : null;
  const workerHealthy = workerStaleSec !== null && workerStaleSec < 120;

  function timeAgo(date: Date): string {
    const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }

  const typeOrder = ["HTTP", "WORDPRESS", "DOMAIN", "TCP", "HEARTBEAT"];
  const typeMap = Object.fromEntries(
    monitorsByType.map((r) => [r.type, r._count.id])
  );

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Admin</h1>
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400">Internal</span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">Platform overview — visible only to you</p>
      </div>

      {/* Growth */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Users</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total users" value={totalUsers} />
          <StatCard label="New this week" value={newUsersWeek} />
          <StatCard label="New this month" value={newUsersMonth} />
          <StatCard label="Total monitors" value={totalMonitors} />
        </div>
      </section>

      {/* Monitor health */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Monitors</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <StatCard label="Active" value={activeMonitors} />
          <StatCard label="Paused" value={totalMonitors - activeMonitors} />
          <StatCard label="Currently down" value={downMonitors} accent={downMonitors > 0 ? "red" : undefined} />
          <StatCard label="Overdue for check" value={overdueMonitors} accent={overdueMonitors > 10 ? "amber" : undefined} />
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-3">By type</p>
          <div className="flex flex-wrap gap-3">
            {typeOrder.map((type) => (
              <div key={type} className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">{type}</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{typeMap[type] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Worker & checks */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Worker & checks</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <StatCard label="Checks today" value={checksToday} />
          <StatCard label="Checks last hour" value={checksHour} />
          <StatCard label="Failed today" value={failedChecksToday} accent={failedChecksToday > 0 ? "amber" : undefined} />
          <StatCard label="Success rate today" value={checksSuccessRate !== null ? `${checksSuccessRate}%` : "—"} />
        </div>
        <div className={`px-4 py-3 rounded-xl border text-sm flex items-center justify-between ${
          workerLastSeen === null
            ? "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-500"
            : workerHealthy
            ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
            : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${workerLastSeen === null ? "bg-gray-300" : workerHealthy ? "bg-emerald-500" : "bg-red-500"}`} />
            <span className="font-medium">
              {workerLastSeen === null ? "Worker — no data" : workerHealthy ? "Worker running" : "Worker may be stalled"}
            </span>
          </div>
          {workerLastSeen && (
            <span className="text-xs opacity-70">Last check {timeAgo(workerLastSeen)}</span>
          )}
        </div>
      </section>

      {/* Alerts */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Alerts sent</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
          <StatCard label="Today" value={alertsToday} />
          <StatCard label="This week" value={alertsWeek} />
        </div>
        {alertsByType.length > 0 && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-3">By type (all time)</p>
            <div className="space-y-2">
              {alertsByType.map((a) => (
                <div key={a.type} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 font-mono text-xs">{a.type}</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{a._count.id}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Top users */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Top users by monitors</h2>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 dark:text-gray-500">User</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-400 dark:text-gray-500">Monitors</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-400 dark:text-gray-500">Joined</th>
              </tr>
            </thead>
            <tbody>
              {topUsers.map((u, i) => (
                <tr key={u.email} className={i < topUsers.length - 1 ? "border-b border-gray-50 dark:border-gray-800/50" : ""}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-xs">{u.name ?? u.email}</p>
                    {u.name && <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-xs">{u.email}</p>}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-900 dark:text-gray-100">{u._count.monitors}</td>
                  <td className="px-5 py-3 text-right text-gray-400 dark:text-gray-500 text-xs">{timeAgo(u.createdAt)}</td>
                </tr>
              ))}
              {topUsers.length === 0 && (
                <tr><td colSpan={3} className="px-5 py-6 text-center text-sm text-gray-400">No users yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent signups */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Recent signups</h2>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 dark:text-gray-500">User</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-400 dark:text-gray-500">Joined</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.map((u, i) => (
                <tr key={u.email} className={i < recentUsers.length - 1 ? "border-b border-gray-50 dark:border-gray-800/50" : ""}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{u.name ?? u.email}</p>
                    {u.name && <p className="text-xs text-gray-400 dark:text-gray-500">{u.email}</p>}
                  </td>
                  <td className="px-5 py-3 text-right text-gray-400 dark:text-gray-500 text-xs">{timeAgo(u.createdAt)}</td>
                </tr>
              ))}
              {recentUsers.length === 0 && (
                <tr><td colSpan={2} className="px-5 py-6 text-center text-sm text-gray-400">No users yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: "red" | "amber";
}) {
  const valueColor =
    accent === "red"
      ? "text-red-600 dark:text-red-400"
      : accent === "amber"
      ? "text-amber-600 dark:text-amber-400"
      : "text-gray-900 dark:text-gray-100";

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
      <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${valueColor}`}>{value}</p>
    </div>
  );
}
