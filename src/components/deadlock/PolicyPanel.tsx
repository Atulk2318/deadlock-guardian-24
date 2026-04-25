import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  POLICY_DESCRIPTIONS,
  POLICY_LABELS,
  type PreventionPolicy,
} from "@/lib/deadlock/prevention";
import { ShieldCheck } from "lucide-react";

const POLICIES: PreventionPolicy[] = [
  "none",
  "no-hold-wait",
  "ordered-requests",
  "preempt-on-wait",
  "bankers-avoidance",
];

const ATTACKS: Record<PreventionPolicy, string> = {
  none: "—",
  "no-hold-wait": "Hold-and-Wait",
  "ordered-requests": "Circular Wait",
  "preempt-on-wait": "No-Preemption",
  "bankers-avoidance": "Avoidance",
};

export function PolicyPanel({
  value,
  onChange,
}: {
  value: PreventionPolicy;
  onChange: (p: PreventionPolicy) => void;
}) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary">
          <ShieldCheck className="h-3.5 w-3.5" />
        </span>
        <div>
          <h3 className="text-sm font-semibold">Prevention Policy</h3>
          <p className="text-xs text-muted-foreground">
            Active policy is enforced when you submit a request.
          </p>
        </div>
      </div>
      <RadioGroup value={value} onValueChange={(v) => onChange(v as PreventionPolicy)}>
        <div className="grid grid-cols-1 gap-2">
          {POLICIES.map((p) => (
            <label
              key={p}
              htmlFor={`policy-${p}`}
              className={`flex cursor-pointer items-start gap-2.5 rounded-md border p-2.5 transition-colors ${
                value === p
                  ? "border-primary/50 bg-primary/5"
                  : "border-border bg-background/40 hover:border-primary/30"
              }`}
            >
              <RadioGroupItem id={`policy-${p}`} value={p} className="mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold">{POLICY_LABELS[p]}</span>
                  <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                    breaks: {ATTACKS[p]}
                  </Badge>
                </div>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                  {POLICY_DESCRIPTIONS[p]}
                </p>
              </div>
            </label>
          ))}
        </div>
      </RadioGroup>
    </Card>
  );
}
