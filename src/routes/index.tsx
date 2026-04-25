import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertTriangle, ShieldCheck, RotateCcw } from "lucide-react";

import { useDeadlockSystem } from "@/hooks/use-deadlock-system";
import { PRESETS } from "@/lib/deadlock/presets";
import { detectDeadlock } from "@/lib/deadlock/rag";
import type { PreventionPolicy } from "@/lib/deadlock/prevention";

import { RAGCanvas } from "@/components/deadlock/RAGCanvas";
import { SystemEditor } from "@/components/deadlock/SystemEditor";
import { BankersPanel } from "@/components/deadlock/BankersPanel";
import { CoffmanPanel } from "@/components/deadlock/CoffmanPanel";
import { RecoveryPanel } from "@/components/deadlock/RecoveryPanel";
import { RequestSimulator } from "@/components/deadlock/RequestSimulator";
import { PolicyPanel } from "@/components/deadlock/PolicyPanel";
import { StatsBar } from "@/components/deadlock/StatsBar";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Deadlock Toolkit" },
      {
        name: "description",
        content:
          "Detect, prevent and recover from deadlocks with Banker's Algorithm, Resource Allocation Graphs and Coffman conditions.",
      },
    ],
  }),
});

function Index() {
  const sys = useDeadlockSystem();
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [policy, setPolicy] = useState<PreventionPolicy>("bankers-avoidance");

  const detection = useMemo(() => detectDeadlock(sys.state), [sys.state]);

  const handlePresetChange = (id: string) => {
    setPresetId(id);
    sys.loadPreset(id);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-6 py-3">
          <div>
            <h1 className="text-base font-bold">Deadlock Toolkit</h1>
            <p className="text-[11px] text-muted-foreground">
              Detect · Prevent · Recover
            </p>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <StatusPill detection={detection} />
            <Select value={presetId} onValueChange={handlePresetChange}>
              <SelectTrigger className="h-9 w-[230px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESETS.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => sys.loadPreset(presetId)}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] space-y-5 px-6 py-6">
        <StatsBar state={sys.state} />

        <div className="grid gap-5 lg:grid-cols-[1fr_minmax(360px,420px)]">
          {/* LEFT — graph, simulator, algorithm tabs */}
          <div className="space-y-5">
            <RAGCanvas
              state={sys.state}
              deadlocked={detection.deadlocked}
              cycles={detection.cycles}
            />

            <RequestSimulator
              state={sys.state}
              policy={policy}
              onApply={sys.applyState}
              onEvent={() => {}}
            />

            <Tabs defaultValue="bankers">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="bankers" className="text-xs">Banker's</TabsTrigger>
                <TabsTrigger value="coffman" className="text-xs">Coffman</TabsTrigger>
                <TabsTrigger value="policy" className="text-xs">Policy</TabsTrigger>
                <TabsTrigger value="recovery" className="text-xs">Recovery</TabsTrigger>
              </TabsList>

              <TabsContent value="bankers" className="mt-3">
                <BankersPanel state={sys.state} />
              </TabsContent>
              <TabsContent value="coffman" className="mt-3">
                <CoffmanPanel
                  state={sys.state}
                  allowsPreemption={policy === "preempt-on-wait"}
                />
              </TabsContent>
              <TabsContent value="policy" className="mt-3">
                <PolicyPanel value={policy} onChange={setPolicy} />
              </TabsContent>
              <TabsContent value="recovery" className="mt-3">
                <RecoveryPanel state={sys.state} onApply={sys.applyState} />
              </TabsContent>
            </Tabs>
          </div>

          {/* RIGHT — editor */}
          <aside>
            <SystemEditor
              state={sys.state}
              onUpdateResource={sys.updateResource}
              onAddResource={sys.addResource}
              onRemoveResource={sys.removeResource}
              onAddProcess={sys.addProcess}
              onRemoveProcess={sys.removeProcess}
              onUpdateProcess={sys.updateProcess}
              onSetVector={sys.setProcessVector}
            />
          </aside>
        </div>
      </main>
    </div>
  );
}

function StatusPill({
  detection,
}: {
  detection: ReturnType<typeof detectDeadlock>;
}) {
  if (detection.hasCycle) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-3 py-1 text-xs font-semibold text-destructive">
        <AlertTriangle className="h-3.5 w-3.5" />
        Deadlock: {detection.deadlocked.join(", ")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">
      <ShieldCheck className="h-3.5 w-3.5" />
      No deadlock
    </span>
  );
}
