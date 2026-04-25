import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, AlertTriangle, RotateCcw, Network, Cpu, Skull } from "lucide-react";
import { useDeadlockSystem } from "@/hooks/use-deadlock-system";
import { PRESETS } from "@/lib/deadlock/presets";
import { detectDeadlock } from "@/lib/deadlock/rag";
import { ResourceAllocationGraph } from "@/components/deadlock/ResourceAllocationGraph";
import { SystemEditor } from "@/components/deadlock/SystemEditor";
import { BankersPanel } from "@/components/deadlock/BankersPanel";
import { CoffmanPanel } from "@/components/deadlock/CoffmanPanel";
import { RecoveryPanel } from "@/components/deadlock/RecoveryPanel";
import { RequestSimulator } from "@/components/deadlock/RequestSimulator";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Deadlock Toolkit — Detect, Prevent & Recover in Real Time" },
      {
        name: "description",
        content:
          "Interactive deadlock toolkit with Banker's Algorithm, Resource Allocation Graphs, Coffman conditions and recovery strategies.",
      },
    ],
  }),
});

function Index() {
  const sys = useDeadlockSystem();
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [allowsPreemption, setAllowsPreemption] = useState(false);

  const detection = useMemo(() => detectDeadlock(sys.state), [sys.state]);

  const onPresetChange = (id: string) => {
    setPresetId(id);
    sys.loadPreset(id);
  };

  const deadlockedNames = detection.deadlocked;

  return (
    <div className="min-h-screen text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-background/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
              <Network className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Deadlock Toolkit</h1>
              <p className="text-xs text-muted-foreground">
                Detect · Prevent · Recover — with Banker's, RAG & Coffman
              </p>
            </div>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-3">
            <StatusPill detection={detection} />
            <div className="hidden h-8 w-px bg-border sm:block" />
            <div className="flex items-center gap-2">
              <Label htmlFor="preempt" className="text-xs text-muted-foreground">
                Allow preemption
              </Label>
              <Switch
                id="preempt"
                checked={allowsPreemption}
                onCheckedChange={setAllowsPreemption}
              />
            </div>
            <Select value={presetId} onValueChange={onPresetChange}>
              <SelectTrigger className="h-9 w-[240px] text-xs">
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
              title="Reload preset"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        {/* Hero / current preset description */}
        <div className="mb-5 rounded-xl border border-border bg-card/40 p-4 shadow-card animate-fade-in-up">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
              Scenario
            </Badge>
            <span className="text-sm font-semibold">
              {PRESETS.find((p) => p.id === presetId)?.name}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {PRESETS.find((p) => p.id === presetId)?.description}
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_minmax(360px,420px)]">
          {/* LEFT — visualization + simulator */}
          <div className="space-y-5">
            <ResourceAllocationGraph
              state={sys.state}
              deadlocked={deadlockedNames}
              cycles={detection.cycles}
            />

            <RequestSimulator state={sys.state} onApply={sys.applyState} />

            <Tabs defaultValue="bankers">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="bankers" className="text-xs">
                  <Cpu className="mr-1 h-3.5 w-3.5" /> Banker's
                </TabsTrigger>
                <TabsTrigger value="coffman" className="text-xs">
                  <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Coffman
                </TabsTrigger>
                <TabsTrigger value="recovery" className="text-xs">
                  <Skull className="mr-1 h-3.5 w-3.5" /> Recovery
                </TabsTrigger>
              </TabsList>
              <TabsContent value="bankers" className="mt-3">
                <BankersPanel state={sys.state} />
              </TabsContent>
              <TabsContent value="coffman" className="mt-3">
                <CoffmanPanel state={sys.state} allowsPreemption={allowsPreemption} />
              </TabsContent>
              <TabsContent value="recovery" className="mt-3">
                <RecoveryPanel state={sys.state} onApply={sys.applyState} />
              </TabsContent>
            </Tabs>
          </div>

          {/* RIGHT — editor */}
          <aside className="space-y-5">
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

        <footer className="mt-10 border-t border-border pt-5 text-center text-xs text-muted-foreground">
          Educational toolkit · Banker's Algorithm, RAG cycle detection, Coffman conditions, victim
          selection
        </footer>
      </main>
    </div>
  );
}

function StatusPill({ detection }: { detection: ReturnType<typeof detectDeadlock> }) {
  if (detection.hasCycle) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-3 py-1 text-xs font-semibold text-destructive">
        <AlertTriangle className="h-3.5 w-3.5" />
        Deadlock detected: {detection.deadlocked.join(", ")}
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
