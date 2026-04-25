import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, Check, X } from "lucide-react";
import { requestResources } from "@/lib/deadlock/bankers";
import type { SystemState } from "@/lib/deadlock/types";

type Outcome = {
  granted: boolean;
  reason: string;
  process: string;
  request: number[];
};

export function RequestSimulator({
  state,
  onApply,
}: {
  state: SystemState;
  onApply: (next: SystemState) => void;
}) {
  const [processId, setProcessId] = useState(state.processes[0]?.id ?? "");
  const [vec, setVec] = useState<number[]>(state.resources.map(() => 0));
  const [history, setHistory] = useState<Outcome[]>([]);

  // Re-init vec if resource count changes
  if (vec.length !== state.resources.length) {
    setVec(state.resources.map(() => 0));
  }
  // Re-init process if removed
  if (processId && !state.processes.some((p) => p.id === processId)) {
    setProcessId(state.processes[0]?.id ?? "");
  }

  const submit = () => {
    if (!processId) return;
    const r = requestResources(state, processId, vec);
    const proc = state.processes.find((p) => p.id === processId)!;
    setHistory((h) => [
      { granted: r.granted, reason: r.reason, process: proc.name, request: [...vec] },
      ...h.slice(0, 6),
    ]);
    if (r.granted) onApply(r.nextState);
  };

  return (
    <Card className="p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold">Request Simulator</h3>
        <p className="text-xs text-muted-foreground">
          Simulate a process requesting resources. Banker's decides whether granting it keeps
          the system safe.
        </p>
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
                <span className="text-[10px] font-mono text-muted-foreground">{r.name}</span>
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
        <Button onClick={submit} disabled={!processId} className="bg-gradient-primary text-primary-foreground">
          <PlayCircle className="h-4 w-4" /> Request
        </Button>
      </div>

      {history.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Recent decisions
          </h4>
          <ul className="space-y-1.5">
            {history.map((h, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-md border border-border bg-background/40 p-2 text-xs"
              >
                <Badge
                  className={
                    h.granted
                      ? "bg-success text-success-foreground"
                      : "bg-destructive text-destructive-foreground"
                  }
                >
                  {h.granted ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  {h.granted ? "Granted" : "Denied"}
                </Badge>
                <div className="min-w-0">
                  <div className="font-mono">
                    {h.process} → request [{h.request.join(", ")}]
                  </div>
                  <div className="text-muted-foreground">{h.reason}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
