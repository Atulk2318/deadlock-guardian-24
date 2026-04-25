import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, AlertTriangle, ArrowRight } from "lucide-react";
import { safetyCheck } from "@/lib/deadlock/bankers";
import type { SystemState } from "@/lib/deadlock/types";

export function BankersPanel({ state }: { state: SystemState }) {
  const result = useMemo(() => safetyCheck(state), [state]);

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Banker's Algorithm — Safety Check</h3>
          <p className="text-xs text-muted-foreground">
            Iteratively finds a process whose Need ≤ Work, runs it, releases its allocation.
          </p>
        </div>
        {result.safe ? (
          <Badge className="bg-success text-success-foreground">
            <Check className="h-3 w-3" /> SAFE
          </Badge>
        ) : (
          <Badge className="bg-destructive text-destructive-foreground">
            <AlertTriangle className="h-3 w-3" /> UNSAFE
          </Badge>
        )}
      </div>

      {result.safe && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5 rounded-md bg-success/10 p-2.5">
          <span className="text-xs font-semibold text-success">Safe sequence:</span>
          {result.safeSequence.map((name, i) => (
            <span key={i} className="inline-flex items-center gap-1">
              <span className="rounded-sm bg-success/20 px-1.5 py-0.5 font-mono text-xs text-success">
                {name}
              </span>
              {i < result.safeSequence.length - 1 && (
                <ArrowRight className="h-3 w-3 text-success/70" />
              )}
            </span>
          ))}
        </div>
      )}

      {!result.safe && result.unfinished.length > 0 && (
        <div className="mb-3 rounded-md bg-destructive/10 p-2.5 text-xs">
          <span className="font-semibold text-destructive">Cannot complete:</span>{" "}
          <span className="font-mono">{result.unfinished.join(", ")}</span>
        </div>
      )}

      {/* Steps */}
      <div className="max-h-72 overflow-y-auto rounded-md border border-border bg-background/40">
        <ol className="divide-y divide-border">
          {result.steps.map((s, idx) => (
            <li key={idx} className="px-3 py-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono text-muted-foreground">step {s.iteration}</span>
                {s.chosen !== null ? (
                  <Badge variant="outline" className="border-success/40 text-success">
                    run {state.processes[s.chosen]?.name}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-destructive/40 text-destructive">
                    halt
                  </Badge>
                )}
              </div>
              <p className="mt-1 leading-relaxed text-foreground/90">{s.message}</p>
            </li>
          ))}
        </ol>
      </div>
    </Card>
  );
}
