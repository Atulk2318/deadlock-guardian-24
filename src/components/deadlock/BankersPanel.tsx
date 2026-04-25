import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipBack, SkipForward, Check, AlertTriangle, ArrowRight } from "lucide-react";
import { safetyCheck } from "@/lib/deadlock/bankers";
import type { SystemState } from "@/lib/deadlock/types";

export function BankersPanel({ state }: { state: SystemState }) {
  const result = useMemo(() => safetyCheck(state), [state]);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  // Reset when scenario changes
  useEffect(() => {
    setStep(0);
    setPlaying(false);
  }, [result.steps.length]);

  // Auto-advance
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      setStep((s) => {
        if (s >= result.steps.length - 1) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, 1100);
    return () => clearTimeout(t);
  }, [playing, step, result.steps.length]);

  const current = result.steps[step];
  const totalSteps = result.steps.length;

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Banker's Algorithm — Safety Check</h3>
          <p className="text-xs text-muted-foreground">
            Find a process whose Need ≤ Work. Run it, release its allocation, repeat.
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
        <div className="mb-3 flex flex-wrap items-center gap-1.5 rounded-md border border-success/30 bg-success/10 p-2.5">
          <span className="text-xs font-semibold text-success">Safe sequence:</span>
          {result.safeSequence.map((name, i) => (
            <span key={i} className="inline-flex items-center gap-1">
              <span
                className={`rounded px-1.5 py-0.5 font-mono text-xs transition-all ${
                  i <= step - 1 || (current?.chosen !== null && i <= step)
                    ? "bg-success text-success-foreground shadow-glow"
                    : "bg-success/15 text-success"
                }`}
              >
                {name}
              </span>
              {i < result.safeSequence.length - 1 && <ArrowRight className="h-3 w-3 text-success/70" />}
            </span>
          ))}
        </div>
      )}

      {!result.safe && result.unfinished.length > 0 && (
        <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-xs">
          <span className="font-semibold text-destructive">Cannot complete:</span>{" "}
          <span className="font-mono">{result.unfinished.join(", ")}</span>
        </div>
      )}

      {/* Stepper controls */}
      {totalSteps > 0 && (
        <div className="mb-3 rounded-md border border-border bg-background/40 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Step-through
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {step + 1} / {totalSteps}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => {
                setStep(0);
                setPlaying(false);
              }}
              disabled={step === 0}
            >
              <SkipBack className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              className="h-7 w-7 bg-gradient-primary text-primary-foreground"
              onClick={() => setPlaying((p) => !p)}
              disabled={step >= totalSteps - 1 && !playing}
            >
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setStep((s) => Math.min(totalSteps - 1, s + 1))}
              disabled={step >= totalSteps - 1}
            >
              <SkipForward className="h-3.5 w-3.5" />
            </Button>
            <Slider
              value={[step]}
              min={0}
              max={Math.max(0, totalSteps - 1)}
              step={1}
              onValueChange={(v) => {
                setPlaying(false);
                setStep(v[0]);
              }}
              className="ml-1 flex-1"
            />
          </div>

          {current && (
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-muted-foreground">Work =</span>
                <code className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-foreground">
                  [{current.work.join(", ")}]
                </code>
                {current.chosen !== null ? (
                  <Badge variant="outline" className="border-success/40 text-success">
                    run {state.processes[current.chosen]?.name}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-destructive/40 text-destructive">
                    halt
                  </Badge>
                )}
              </div>
              <p className="leading-relaxed text-foreground/90">{current.message}</p>
            </div>
          )}
        </div>
      )}

      {/* Full step list */}
      <details className="rounded-md border border-border bg-background/40">
        <summary className="cursor-pointer px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground">
          Full trace ({totalSteps} steps)
        </summary>
        <ol className="max-h-56 divide-y divide-border overflow-y-auto">
          {result.steps.map((s, idx) => (
            <li
              key={idx}
              className={`px-3 py-2 text-xs ${idx === step ? "bg-primary/5" : ""}`}
              onClick={() => {
                setStep(idx);
                setPlaying(false);
              }}
              style={{ cursor: "pointer" }}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-muted-foreground">step {s.iteration}</span>
                {s.chosen !== null ? (
                  <Badge variant="outline" className="border-success/40 text-success">
                    {state.processes[s.chosen]?.name}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-destructive/40 text-destructive">
                    halt
                  </Badge>
                )}
              </div>
              <p className="mt-1 leading-relaxed text-foreground/80">{s.message}</p>
            </li>
          ))}
        </ol>
      </details>
    </Card>
  );
}
