import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Network,
  Cpu,
  Skull,
  Sparkles,
  Github,
} from "lucide-react";
import { useDeadlockSystem } from "@/hooks/use-deadlock-system";
import { PRESETS } from "@/lib/deadlock/presets";
import { detectDeadlock } from "@/lib/deadlock/rag";
import type { PreventionPolicy } from "@/lib/deadlock/prevention";
import type { SystemEvent } from "@/lib/deadlock/events";
import { RAGCanvas } from "@/components/deadlock/RAGCanvas";
import { SystemEditor } from "@/components/deadlock/SystemEditor";
import { BankersPanel } from "@/components/deadlock/BankersPanel";
import { CoffmanPanel } from "@/components/deadlock/CoffmanPanel";
import { RecoveryPanel } from "@/components/deadlock/RecoveryPanel";
import { RequestSimulator } from "@/components/deadlock/RequestSimulator";
import { PolicyPanel } from "@/components/deadlock/PolicyPanel";
import { StatsBar } from "@/components/deadlock/StatsBar";
import { EventTimeline } from "@/components/deadlock/EventTimeline";
import { ChatBot } from "@/components/deadlock/ChatBot";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Deadlock Toolkit — Detect, Prevent & Recover in Real Time" },
      {
        name: "description",
        content:
          "Interactive deadlock toolkit with Banker's Algorithm, Resource Allocation Graphs, Coffman conditions, prevention policies and AI tutor.",
      },
    ],
  }),
});

let _evId = 0;
const newEventId = () => `ev-${Date.now()}-${++_evId}`;

function Index() {
  const sys = useDeadlockSystem();
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [policy, setPolicy] = useState<PreventionPolicy>("bankers-avoidance");
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const previousDeadlockRef = useRef(false);

  const detection = useMemo(() => detectDeadlock(sys.state), [sys.state]);

  const pushEvent = useCallback((ev: Omit<SystemEvent, "id" | "ts">) => {
    setEvents((prev) =>
      [{ ...ev, id: newEventId(), ts: Date.now() }, ...prev].slice(0, 80),
    );
  }, []);

  // Auto-emit deadlock detected event on transition
  useEffect(() => {
    if (detection.hasCycle && !previousDeadlockRef.current) {
      pushEvent({
        kind: "deadlock-detected",
        title: "Deadlock detected",
        detail: `${detection.deadlocked.length} processes blocked: ${detection.deadlocked.join(", ")}.`,
      });
    }
    previousDeadlockRef.current = detection.hasCycle;
  }, [detection.hasCycle, detection.deadlocked, pushEvent]);

  const onPresetChange = (id: string) => {
    setPresetId(id);
    sys.loadPreset(id);
    const p = PRESETS.find((x) => x.id === id);
    if (p) {
      pushEvent({
        kind: "preset-loaded",
        title: `Loaded scenario: ${p.name}`,
        detail: p.description,
      });
    }
  };

  const onReset = () => {
    sys.loadPreset(presetId);
    setEvents([]);
  };

  return (
    <div className="min-h-screen text-foreground">
      {/* Decorative background blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 h-[420px] w-[420px] rounded-full bg-resource/10 blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
              <Network className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">Deadlock Toolkit</h1>
              <p className="text-[11px] text-muted-foreground">
                Detect · Prevent · Recover — with Banker's, RAG & Coffman
              </p>
            </div>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <StatusPill detection={detection} />
            <div className="hidden h-6 w-px bg-border sm:block" />
            <Select value={presetId} onValueChange={onPresetChange}>
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
            <Button size="sm" variant="ghost" onClick={onReset} title="Reload preset">
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-6">
        {/* Hero */}
        <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-border bg-card/40 p-6 shadow-card backdrop-blur-sm animate-fade-in-up">
            <Badge variant="outline" className="mb-3 border-primary/40 bg-primary/10 text-primary">
              <Sparkles className="h-3 w-3" />
              Educational simulator
            </Badge>
            <h2 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
              Make <span className="text-gradient">deadlocks</span> visible.
              <br />
              Then break them.
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              An interactive playground for the four classic operating-systems algorithms.
              Build any system, request resources, watch the graph come alive, and apply
              recovery strategies with one click.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
              {[
                "Banker's safety check",
                "RAG cycle detection",
                "Coffman conditions",
                "5 prevention policies",
                "3 recovery strategies",
                "AI tutor",
              ].map((f) => (
                <span
                  key={f}
                  className="rounded-full border border-border bg-background/40 px-2.5 py-1 text-muted-foreground"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card/40 p-5 shadow-card backdrop-blur-sm animate-fade-in-up">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Active scenario
            </div>
            <div className="text-base font-semibold">
              {PRESETS.find((p) => p.id === presetId)?.name}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {PRESETS.find((p) => p.id === presetId)?.description}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <Mini label="Processes" value={sys.state.processes.length} />
              <Mini label="Resources" value={sys.state.resources.length} />
              <Mini
                label={detection.hasCycle ? "Blocked" : "Free"}
                value={detection.hasCycle ? detection.deadlocked.length : 0}
                tone={detection.hasCycle ? "destructive" : "success"}
              />
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="mb-6">
          <StatsBar state={sys.state} />
        </section>

        {/* Main grid */}
        <div className="grid gap-5 lg:grid-cols-[1fr_minmax(360px,420px)]">
          {/* LEFT */}
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
              onEvent={(e) =>
                pushEvent({
                  kind: e.granted ? "request-granted" : "request-denied",
                  title: e.granted
                    ? `Granted: ${e.process}`
                    : `Denied: ${e.process}`,
                  detail: e.reason,
                  process: e.process,
                  vector: e.request,
                })
              }
            />

            <Tabs defaultValue="bankers">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="bankers" className="text-xs">
                  <Cpu className="mr-1 h-3.5 w-3.5" /> Banker's
                </TabsTrigger>
                <TabsTrigger value="coffman" className="text-xs">
                  <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Coffman
                </TabsTrigger>
                <TabsTrigger value="policy" className="text-xs">
                  <Network className="mr-1 h-3.5 w-3.5" /> Policy
                </TabsTrigger>
                <TabsTrigger value="recovery" className="text-xs">
                  <Skull className="mr-1 h-3.5 w-3.5" /> Recovery
                </TabsTrigger>
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
                <RecoveryPanel
                  state={sys.state}
                  onApply={(next) => {
                    sys.applyState(next);
                    pushEvent({
                      kind: "recovery",
                      title: "Recovery plan applied",
                      detail: "System state updated by victim selection.",
                    });
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* RIGHT */}
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
            <div className="h-[420px]">
              <EventTimeline events={events} onClear={() => setEvents([])} />
            </div>
          </aside>
        </div>

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-5 text-xs text-muted-foreground">
          <span>
            Educational toolkit · Banker's · RAG cycle detection · Coffman · victim selection
          </span>
          <span className="inline-flex items-center gap-1">
            <Github className="h-3 w-3" /> Built for OS coursework
          </span>
        </footer>
      </main>

      <ChatBot />
    </div>
  );
}

function Mini({
  label,
  value,
  tone = "primary",
}: {
  label: string;
  value: number | string;
  tone?: "primary" | "success" | "destructive";
}) {
  const cls =
    tone === "destructive"
      ? "text-destructive bg-destructive/10"
      : tone === "success"
        ? "text-success bg-success/10"
        : "text-primary bg-primary/10";
  return (
    <div className={`rounded-lg px-2 py-1.5 ${cls}`}>
      <div className="text-base font-bold leading-none">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wide opacity-80">{label}</div>
    </div>
  );
}

function StatusPill({ detection }: { detection: ReturnType<typeof detectDeadlock> }) {
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
