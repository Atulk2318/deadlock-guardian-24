import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";
import type { SystemState } from "@/lib/deadlock/types";
import { computeAvailable, computeNeed } from "@/lib/deadlock/bankers";

type Props = {
  state: SystemState;
  onUpdateResource: (i: number, patch: { name?: string; total?: number }) => void;
  onAddResource: () => void;
  onRemoveResource: (i: number) => void;
  onAddProcess: () => void;
  onRemoveProcess: (id: string) => void;
  onUpdateProcess: (id: string, patch: { name?: string }) => void;
  onSetVector: (id: string, field: "max" | "allocation" | "request", i: number, v: number) => void;
};

export function SystemEditor({
  state,
  onUpdateResource,
  onAddResource,
  onRemoveResource,
  onAddProcess,
  onRemoveProcess,
  onUpdateProcess,
  onSetVector,
}: Props) {
  const available = computeAvailable(state);
  const need = computeNeed(state);

  return (
    <div className="space-y-4">
      {/* Resources */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Resource Types</h3>
            <p className="text-xs text-muted-foreground">Total instances per resource type.</p>
          </div>
          <Button size="sm" variant="secondary" onClick={onAddResource}>
            <Plus className="h-3.5 w-3.5" /> Resource
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {state.resources.map((r, i) => (
            <div key={r.id} className="flex items-center gap-1 rounded-md border border-border bg-background/40 p-2">
              <Input
                value={r.name}
                onChange={(e) => onUpdateResource(i, { name: e.target.value })}
                className="h-8 w-14 text-xs font-medium"
              />
              <Input
                type="number"
                min={0}
                value={r.total}
                onChange={(e) => onUpdateResource(i, { total: Math.max(0, Number(e.target.value) || 0) })}
                className="h-8 flex-1 text-xs"
              />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onRemoveResource(i)}>
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
        {state.resources.length > 0 && (
          <div className="mt-3 rounded-md bg-muted/50 px-3 py-2 text-xs">
            <span className="font-semibold text-muted-foreground">Available:</span>{" "}
            <span className="font-mono">[{available.join(", ")}]</span>
          </div>
        )}
      </Card>

      {/* Processes */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Processes</h3>
            <p className="text-xs text-muted-foreground">Set Max demand, Allocation, and pending Request.</p>
          </div>
          <Button size="sm" variant="secondary" onClick={onAddProcess}>
            <Plus className="h-3.5 w-3.5" /> Process
          </Button>
        </div>

        {state.processes.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">No processes yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="px-2 py-1.5 font-medium">Process</th>
                  <th className="px-2 py-1.5 font-medium">Field</th>
                  {state.resources.map((r) => (
                    <th key={r.id} className="px-1.5 py-1.5 text-center font-medium">
                      {r.name}
                    </th>
                  ))}
                  <th className="px-2 py-1.5"></th>
                </tr>
              </thead>
              <tbody>
                {state.processes.map((p, pi) => (
                  <ProcessRows
                    key={p.id}
                    p={p}
                    need={need[pi]}
                    resourceCount={state.resources.length}
                    onName={(name) => onUpdateProcess(p.id, { name })}
                    onSet={(field, i, v) => onSetVector(p.id, field, i, v)}
                    onRemove={() => onRemoveProcess(p.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function ProcessRows({
  p,
  need,
  resourceCount,
  onName,
  onSet,
  onRemove,
}: {
  p: import("@/lib/deadlock/types").Process;
  need: number[];
  resourceCount: number;
  onName: (name: string) => void;
  onSet: (field: "max" | "allocation" | "request", i: number, v: number) => void;
  onRemove: () => void;
}) {
  const cells = (vals: number[] | undefined, field: "max" | "allocation" | "request") =>
    Array.from({ length: resourceCount }).map((_, i) => (
      <td key={i} className="px-1 py-1">
        <Input
          type="number"
          min={0}
          value={vals?.[i] ?? 0}
          onChange={(e) => onSet(field, i, Number(e.target.value))}
          className="h-7 w-12 px-1 text-center font-mono text-xs"
        />
      </td>
    ));

  return (
    <>
      <tr className="border-t border-border/60">
        <td rowSpan={4} className="px-2 align-top">
          <div className="flex flex-col items-start gap-1.5 py-2">
            <Input
              value={p.name}
              onChange={(e) => onName(e.target.value)}
              className="h-7 w-16 text-xs font-semibold"
            />
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onRemove}>
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        </td>
        <td className="px-2 py-1 font-medium text-muted-foreground">Max</td>
        {cells(p.max, "max")}
        <td></td>
      </tr>
      <tr>
        <td className="px-2 py-1 font-medium text-muted-foreground">Allocation</td>
        {cells(p.allocation, "allocation")}
        <td></td>
      </tr>
      <tr>
        <td className="px-2 py-1 font-medium text-muted-foreground">Need</td>
        {need.map((v, i) => (
          <td key={i} className="px-1 py-1 text-center font-mono text-xs text-primary">
            {v}
          </td>
        ))}
        <td></td>
      </tr>
      <tr className="border-b border-border/30">
        <td className="px-2 py-1 font-medium text-muted-foreground">Request</td>
        {cells(p.request ?? Array.from({ length: resourceCount }, () => 0), "request")}
        <td></td>
      </tr>
    </>
  );
}
