import { Card } from "@/components/ui/card";
import { Cpu, Database, Activity, ShieldCheck } from "lucide-react";
import type { SystemState } from "@/lib/deadlock/types";
import { computeAvailable } from "@/lib/deadlock/bankers";
import { detectDeadlock } from "@/lib/deadlock/rag";
import { safetyCheck } from "@/lib/deadlock/bankers";
import { useMemo } from "react";

export function StatsBar({ state }: { state: SystemState }) {
  const stats = useMemo(() => {
    const available = computeAvailable(state);
    const det = detectDeadlock(state);
    const safety = safetyCheck(state);
    const totalInstances = state.resources.reduce((s, r) => s + r.total, 0);
    const allocated = state.processes.reduce(
      (s, p) => s + p.allocation.reduce((a, b) => a + b, 0),
      0,
    );
    const utilization = totalInstances > 0 ? Math.round((allocated / totalInstances) * 100) : 0;
    return {
      processCount: state.processes.length,
      resourceCount: state.resources.length,
      utilization,
      available,
      deadlock: det.hasCycle,
      deadlocked: det.deadlocked,
      safe: safety.safe,
    };
  }, [state]);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Stat
        icon={<Cpu className="h-4 w-4" />}
        label="Processes"
        value={String(stats.processCount)}
        accent="primary"
      />
      <Stat
        icon={<Database className="h-4 w-4" />}
        label="Resource types"
        value={String(stats.resourceCount)}
        sub={`Avail [${stats.available.join(", ")}]`}
        accent="resource"
      />
      <Stat
        icon={<Activity className="h-4 w-4" />}
        label="Utilization"
        value={`${stats.utilization}%`}
        sub="of all instances"
        accent={stats.utilization > 85 ? "warning" : "success"}
        bar={stats.utilization}
      />
      <Stat
        icon={<ShieldCheck className="h-4 w-4" />}
        label="System status"
        value={stats.deadlock ? "Deadlocked" : stats.safe ? "Safe" : "Unsafe"}
        sub={
          stats.deadlock
            ? `${stats.deadlocked.length} processes blocked`
            : stats.safe
              ? "Banker's verified"
              : "No safe sequence"
        }
        accent={stats.deadlock ? "destructive" : stats.safe ? "success" : "warning"}
      />
    </div>
  );
}

type Accent = "primary" | "success" | "warning" | "destructive" | "resource";
const ACCENT: Record<Accent, { bg: string; text: string; ring: string }> = {
  primary: { bg: "bg-primary/15", text: "text-primary", ring: "ring-primary/30" },
  success: { bg: "bg-success/15", text: "text-success", ring: "ring-success/30" },
  warning: { bg: "bg-warning/15", text: "text-warning", ring: "ring-warning/30" },
  destructive: { bg: "bg-destructive/15", text: "text-destructive", ring: "ring-destructive/30" },
  resource: { bg: "bg-resource/15", text: "text-resource", ring: "ring-resource/30" },
};

function Stat({
  icon,
  label,
  value,
  sub,
  accent,
  bar,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent: Accent;
  bar?: number;
}) {
  const a = ACCENT[accent];
  return (
    <Card className="relative overflow-hidden p-3.5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="mt-1 text-xl font-bold tracking-tight">{value}</div>
          {sub && <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{sub}</div>}
        </div>
        <div className={`flex h-8 w-8 items-center justify-center rounded-md ${a.bg} ${a.text}`}>
          {icon}
        </div>
      </div>
      {typeof bar === "number" && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-border">
          <div
            className={`h-full ${a.bg.replace("/15", "")}`}
            style={{ width: `${Math.min(100, bar)}%` }}
          />
        </div>
      )}
    </Card>
  );
}
