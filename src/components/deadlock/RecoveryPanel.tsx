import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wrench, ShieldOff, Skull } from "lucide-react";
import { buildRecoveryPlans } from "@/lib/deadlock/recovery";
import type { SystemState } from "@/lib/deadlock/types";

const ICONS = {
  "terminate-all": Skull,
  "terminate-min-cost": Wrench,
  preempt: ShieldOff,
} as const;

const LABELS = {
  "terminate-all": "Terminate all",
  "terminate-min-cost": "Greedy minimum cost",
  preempt: "Preempt largest holder",
} as const;

export function RecoveryPanel({
  state,
  onApply,
}: {
  state: SystemState;
  onApply: (next: SystemState) => void;
}) {
  const plans = useMemo(() => buildRecoveryPlans(state), [state]);

  if (plans.length === 0) {
    return (
      <Card className="p-4">
        <h3 className="text-sm font-semibold">Recovery</h3>
        <p className="mt-2 text-xs text-muted-foreground">
          No deadlock detected — nothing to recover from. Trigger a deadlock scenario to see
          recovery strategies.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold">Recovery Strategies</h3>
        <p className="text-xs text-muted-foreground">
          Pick a victim selection policy. Applying a plan updates the live state.
        </p>
      </div>
      <ul className="space-y-2.5">
        {plans.map((plan) => {
          const Icon = ICONS[plan.strategy];
          return (
            <li
              key={plan.strategy}
              className="rounded-md border border-border bg-background/40 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-destructive/15 text-destructive">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <div className="text-xs font-semibold">{LABELS[plan.strategy]}</div>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {plan.victims.map((v) => (
                        <Badge
                          key={v}
                          variant="outline"
                          className="border-destructive/30 px-1.5 py-0 font-mono text-[10px] text-destructive"
                        >
                          {v}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="secondary" onClick={() => onApply(plan.resultingState)}>
                  Apply
                </Button>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{plan.description}</p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
