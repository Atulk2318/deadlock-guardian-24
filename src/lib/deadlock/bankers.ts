import type { BankersResult, BankersStep, SystemState } from "./types";

export function vecSub(a: number[], b: number[]): number[] {
  return a.map((x, i) => x - (b[i] ?? 0));
}
export function vecAdd(a: number[], b: number[]): number[] {
  return a.map((x, i) => x + (b[i] ?? 0));
}
export function vecLE(a: number[], b: number[]): boolean {
  return a.every((x, i) => x <= (b[i] ?? 0));
}
export function vecZero(n: number): number[] {
  return Array.from({ length: n }, () => 0);
}

export function computeAvailable(state: SystemState): number[] {
  const totals = state.resources.map((r) => r.total);
  return state.processes.reduce((acc, p) => vecSub(acc, p.allocation), totals);
}

export function computeNeed(state: SystemState): number[][] {
  return state.processes.map((p) => vecSub(p.max, p.allocation));
}

/**
 * Banker's safety algorithm. Returns a safe sequence if one exists.
 */
export function safetyCheck(state: SystemState): BankersResult {
  const n = state.processes.length;
  const m = state.resources.length;
  const need = computeNeed(state);
  const finished = state.processes.map(() => false);
  let work = computeAvailable(state);
  const sequence: string[] = [];
  const steps: BankersStep[] = [];
  let iter = 0;

  // Validate non-negative available
  if (work.some((v) => v < 0)) {
    return {
      safe: false,
      safeSequence: [],
      unfinished: state.processes.map((p) => p.name),
      steps: [
        {
          iteration: 0,
          work: [...work],
          finishedBefore: [...finished],
          chosen: null,
          message: `Invalid state: allocation exceeds total resources (Available has negative entry).`,
        },
      ],
    };
  }

  while (true) {
    iter++;
    let chosen: number | null = null;
    for (let i = 0; i < n; i++) {
      if (!finished[i] && vecLE(need[i], work)) {
        chosen = i;
        break;
      }
    }

    if (chosen === null) {
      const unfinished = state.processes.filter((_, i) => !finished[i]).map((p) => p.name);
      steps.push({
        iteration: iter,
        work: [...work],
        finishedBefore: [...finished],
        chosen: null,
        message:
          unfinished.length === 0
            ? `All processes have finished. System is in a SAFE state.`
            : `No process i exists with Need[i] ≤ Work. UNSAFE — potential deadlock among: ${unfinished.join(", ")}.`,
      });
      return {
        safe: unfinished.length === 0,
        safeSequence: sequence,
        unfinished,
        steps,
      };
    }

    const p = state.processes[chosen];
    const before = [...work];
    work = vecAdd(work, p.allocation);
    finished[chosen] = true;
    sequence.push(p.name);
    steps.push({
      iteration: iter,
      work: before,
      finishedBefore: finished.map((f, i) => (i === chosen ? false : f)),
      chosen,
      message: `Need[${p.name}] = [${need[chosen].join(", ")}] ≤ Work = [${before.join(", ")}]. Run ${p.name}, release allocation [${p.allocation.join(", ")}]. New Work = [${work.join(", ")}].`,
    });
    void m;
  }
}

/**
 * Resource-Request algorithm: simulate process Pi requesting `request`.
 * Returns whether the request can be granted while keeping the system safe.
 */
export function requestResources(
  state: SystemState,
  processId: string,
  request: number[],
): { granted: boolean; reason: string; nextState: SystemState; safety?: BankersResult } {
  const idx = state.processes.findIndex((p) => p.id === processId);
  if (idx === -1) {
    return { granted: false, reason: "Process not found.", nextState: state };
  }
  const p = state.processes[idx];
  const need = vecSub(p.max, p.allocation);
  if (!vecLE(request, need)) {
    return {
      granted: false,
      reason: `Request [${request.join(", ")}] exceeds declared Need [${need.join(", ")}] for ${p.name}.`,
      nextState: state,
    };
  }
  const available = computeAvailable(state);
  if (!vecLE(request, available)) {
    return {
      granted: false,
      reason: `Request [${request.join(", ")}] exceeds Available [${available.join(", ")}]. ${p.name} must wait.`,
      nextState: state,
    };
  }
  // Tentatively allocate
  const tentative: SystemState = {
    resources: state.resources,
    processes: state.processes.map((pr, i) =>
      i === idx
        ? { ...pr, allocation: vecAdd(pr.allocation, request), request: undefined }
        : pr,
    ),
  };
  const safety = safetyCheck(tentative);
  if (safety.safe) {
    return {
      granted: true,
      reason: `Request granted. System remains SAFE. Safe sequence: ⟨${safety.safeSequence.join(" → ")}⟩.`,
      nextState: tentative,
      safety,
    };
  }
  return {
    granted: false,
    reason: `Granting would lead to an UNSAFE state. Request denied; ${p.name} must wait.`,
    nextState: state,
    safety,
  };
}
