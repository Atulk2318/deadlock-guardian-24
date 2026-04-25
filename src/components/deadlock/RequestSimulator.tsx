import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, Check, X } from "lucide-react";
import { requestResources } from "@/lib/deadlock/bankers";
import { evaluatePolicy, POLICY_LABELS, type PreventionPolicy } from "@/lib/deadlock/prevention";
import type { SystemState } from "@/lib/deadlock/types";

type EmitArgs = {
  granted: boolean;
  process: string;
  request: number[];
  reason: string;
  policy: PreventionPolicy;
};

export function RequestSimulator({
  state,
  policy,
  onApply,
  onEvent,
}: {
  state: SystemState;
  policy: PreventionPolicy;
  onApply: (next: SystemState) => void;
  onEvent: (e: EmitArgs) => void;
}) {
  const [processId, setProcessId] = useState(state.processes[0]?.id ?? "");
  const [vec, setVec] = useState<number[]>(state.resources.map(() => 0));

  if (vec.length !== state.resources.length) {
    setVec(state.resources.map(() => 0));
  }
  if (processId && !state.processes.some((p) => p.id === processId)) {
    setProcessId(state.processes[0]?.id ?? "");
  }

  const submit = () => {
    if (!processId) return;
    const proc = state.processes.find((p) => p.id === processId)!;

    // First evaluate policy
    const decision = evaluatePolicy(state, processId, vec, policy);
    if (!decision.allowed && policy !== "bankers-avoidance") {
      onEvent({
        granted: false,
        process: proc.name,
        request: [...vec],
        reason: `[${POLICY_LABELS[policy]}] ${decision.reason}`,
        policy,
      });
      return;
    }

    // Apply Banker's-style grant when policy allows
    const r = requestResources(state, processId, vec);
    onEvent({
      granted: r.granted,
      process: proc.name,
      request: [...vec],
      reason: r.reason,
      policy,
    });
    if (r.granted) onApply(r.nextState);
  };

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Request Simulator</h3>
          <p className="text-xs text-muted-foreground">
            Simulate a request and watch the active policy decide its fate.
          </p>
        </div>
        <Badge variant="outline" className="border-primary/40 text-primary">
          {POLICY_LABELS[policy]}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[160px_1fr_auto] sm:items-end">
        <div>
          <Label className="mb-1 block text-[11px] text-muted-foreground">Process</Label>
          <Select value={processId} onValueChange={setProcessId}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {state.processes.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-xs">
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1 block text-[11px] text-muted-foreground">Request vector</Label>
          <div className="flex flex-wrap gap-1.5">
            {state.resources.map((r, i) => (
              <div key={r.id} className="flex items-center gap-1">
                <span className="font-mono text-[10px] text-muted-foreground">{r.name}</span>
                <Input
                  type="number"
                  min={0}
                  value={vec[i] ?? 0}
                  onChange={(e) => {
                    const next = [...vec];
                    next[i] = Math.max(0, Number(e.target.value) || 0);
                    setVec(next);
                  }}
                  className="h-8 w-14 text-center font-mono text-xs"
                />
              </div>
            ))}
          </div>
        </div>
        <Button
          onClick={submit}
          disabled={!processId}
          className="bg-gradient-primary text-primary-foreground"
        >
          <PlayCircle className="h-4 w-4" /> Submit
        </Button>
      </div>

      <p className="mt-3 flex items-start gap-1.5 text-[11px] text-muted-foreground">
        <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-success/15 text-success">
          <Check className="h-2.5 w-2.5" />
        </span>
        Granted requests update Allocation.
        <span className="ml-2 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive/15 text-destructive">
          <X className="h-2.5 w-2.5" />
        </span>
        Denied requests log a reason in the timeline.
      </p>
    </Card>
  );
}
