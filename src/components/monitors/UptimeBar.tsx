type Check = { isUp: boolean; checkedAt: Date | string };

export function UptimeBar({ checks }: { checks: Check[] }) {
  // checks are newest-first; we want left = oldest, right = newest
  const ordered = [...checks].reverse();

  // Pad with nulls on the left so recent checks always anchor to the right
  const SLOTS = 30;
  const slots: (Check | null)[] = [
    ...Array(Math.max(0, SLOTS - ordered.length)).fill(null),
    ...ordered.slice(0, SLOTS),
  ];

  return (
    <div className="flex gap-px mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
      {slots.map((check, i) => (
        <div
          key={i}
          title={
            check
              ? `${new Date(check.checkedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} — ${check.isUp ? "Up" : "Down"}`
              : "No data"
          }
          className={`flex-1 h-1.5 rounded-sm cursor-default transition-opacity hover:opacity-70 ${
            !check
              ? "bg-gray-100 dark:bg-gray-800"
              : check.isUp
              ? "bg-emerald-400"
              : "bg-red-400"
          }`}
        />
      ))}
    </div>
  );
}
