import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { checkCoffman } from "@/lib/deadlock/coffman";
import type { SystemState } from "@/lib/deadlock/types";

export function CoffmanPanel({
  state,
  allowsPreemption,
}: {
  state: SystemState;
  allowsPreemption: boolean;
}) {
  const report = useMemo(() => checkCoffman(state, allowsPreemption), [state, allowsPreemption]);
  const items: { key: string; label: string; data: { holds: boolean; detail: string } }[] = [
    { key: "me", label: "Mutual Exclusion", data: report.mutualExclusion },
    { key: "haw", label: "Hold and Wait", data: report.holdAndWait },
    { key: "np", label: "No Preemption", data: report.noPreemption },
    { key: "cw", label: "Circular Wait", data: report.circularWait },
  ];

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Coffman Conditions</h3>
          <p className="text-xs text-muted-foreground">
            Deadlock requires ALL four conditions to hold simultaneously.
          </p>
        </div>
        <Badge
          className={
            report.allHold
              ? "bg-destructive text-destructive-foreground"
              : "bg-success text-success-foreground"
          }
        >
          {report.allHold ? "All 4 hold — deadlock possible" : "Deadlock prevented"}
        </Badge>
      </div>
      <ul className="space-y-2">
        {items.map((it) => (
          <li
            key={it.key}
            className="flex items-start gap-2.5 rounded-md border border-border bg-background/40 p-2.5"
          >
            <span
              className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                it.data.holds
                  ? "bg-destructive/15 text-destructive"
                  : "bg-success/15 text-success"
              }`}
            >
              {it.data.holds ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold">{it.label}</span>
                <span
                  className={`font-mono text-[10px] ${it.data.holds ? "text-destructive" : "text-success"}`}
                >
                  {it.data.holds ? "HOLDS" : "BROKEN"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{it.data.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
