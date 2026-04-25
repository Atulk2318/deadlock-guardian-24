import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Trash2, Check, X, ShieldOff, AlertTriangle, Wand2, FileDown, Settings2, Edit3 } from "lucide-react";
import type { SystemEvent } from "@/lib/deadlock/events";

const ICONS: Record<SystemEvent["kind"], React.ComponentType<{ className?: string }>> = {
  "request-granted": Check,
  "request-denied": X,
  release: ShieldOff,
  "policy-block": Settings2,
  "deadlock-detected": AlertTriangle,
  recovery: Wand2,
  "preset-loaded": FileDown,
  edit: Edit3,
};

const TONE: Record<SystemEvent["kind"], string> = {
  "request-granted": "text-success bg-success/15",
  "request-denied": "text-warning bg-warning/15",
  release: "text-muted-foreground bg-muted",
  "policy-block": "text-warning bg-warning/15",
  "deadlock-detected": "text-destructive bg-destructive/15",
  recovery: "text-primary bg-primary/15",
  "preset-loaded": "text-primary bg-primary/15",
  edit: "text-muted-foreground bg-muted",
};

export function EventTimeline({
  events,
  onClear,
}: {
  events: SystemEvent[];
  onClear: () => void;
}) {
  return (
    <Card className="flex h-full flex-col p-4">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Event Timeline</h3>
          <p className="text-xs text-muted-foreground">Live log of system actions.</p>
        </div>
        {events.length > 0 && (
          <Button size="sm" variant="ghost" onClick={onClear} className="h-7 text-xs">
            <Trash2 className="h-3 w-3" /> Clear
          </Button>
        )}
      </div>
      <ScrollArea className="-mx-2 flex-1">
        <ol className="space-y-1.5 px-2">
          {events.length === 0 && (
            <li className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
              No events yet. Try the Request Simulator or load a preset.
            </li>
          )}
          {events.map((ev) => {
            const Icon = ICONS[ev.kind];
            return (
              <li
                key={ev.id}
                className="flex items-start gap-2 rounded-md border border-border bg-background/40 p-2 text-xs animate-fade-in-up"
              >
                <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${TONE[ev.kind]}`}>
                  <Icon className="h-3 w-3" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground">{ev.title}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {new Date(ev.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  </div>
                  {ev.detail && (
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{ev.detail}</p>
                  )}
                  {ev.vector && (
                    <code className="mt-0.5 inline-block rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-foreground/80">
                      {ev.process ? `${ev.process} ` : ""}[{ev.vector.join(", ")}]
                    </code>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </ScrollArea>
    </Card>
  );
}
