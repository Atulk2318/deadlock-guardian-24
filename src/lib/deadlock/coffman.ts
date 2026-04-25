import type { CoffmanReport, SystemState } from "./types";
import { detectDeadlock } from "./rag";

/**
 * Heuristic Coffman conditions checker. These conditions are properties of the
 * system policy as much as the current state, so we infer plausibly:
 *
 * - Mutual Exclusion: at least one resource has total instances < sum-of-max-demands
 *   (i.e. resource is contended and cannot be shared freely).
 * - Hold and Wait: some process holds ≥1 resource AND has a pending request.
 * - No Preemption: assumed true unless user policy overrides (we report as policy assumption).
 * - Circular Wait: a cycle (or unreducible set) exists in the wait-for / RAG.
 */
export function checkCoffman(state: SystemState, allowsPreemption = false): CoffmanReport {
  const mutex = state.resources.some((r) => {
    const sumMax = state.processes.reduce((s, p, _i) => {
      void _i;
      return s + (p.max[state.resources.indexOf(r)] ?? 0);
    }, 0);
    return r.total < sumMax || r.total <= 1;
  });

  const haw = state.processes.some(
    (p) => p.allocation.some((a) => a > 0) && (p.request?.some((q) => q > 0) ?? false),
  );

  const det = detectDeadlock(state);

  const report: CoffmanReport = {
    mutualExclusion: {
      holds: mutex,
      detail: mutex
        ? "At least one resource is non-shareable (instances < total declared demand)."
        : "All resources have enough instances to satisfy combined max demand — effectively shareable.",
    },
    holdAndWait: {
      holds: haw,
      detail: haw
        ? "A process holds resources while requesting more."
        : "No process is currently holding resources while waiting for additional ones.",
    },
    noPreemption: {
      holds: !allowsPreemption,
      detail: allowsPreemption
        ? "Recovery policy permits preemption — condition is broken."
        : "System policy does not preempt allocated resources (assumed).",
    },
    circularWait: {
      holds: det.hasCycle,
      detail: det.hasCycle
        ? `Circular wait detected involving: ${det.deadlocked.join(", ")}.`
        : "No circular wait in the current request graph.",
    },
    allHold: false,
  };
  report.allHold =
    report.mutualExclusion.holds &&
    report.holdAndWait.holds &&
    report.noPreemption.holds &&
    report.circularWait.holds;
  return report;
}
