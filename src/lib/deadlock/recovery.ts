import type { RecoveryPlan, SystemState } from "./types";
import { detectDeadlock } from "./rag";

/**
 * Generate recovery strategies for a deadlocked state.
 *
 * Strategies:
 *  - terminate-all: abort every deadlocked process (simplest, costliest).
 *  - terminate-min-cost: greedily terminate one deadlocked process at a time
 *    (lowest allocation total = "cheapest" victim) until deadlock breaks.
 *  - preempt: take resources from one victim and give them back to Available.
 */
export function buildRecoveryPlans(state: SystemState): RecoveryPlan[] {
  const det = detectDeadlock(state);
  if (!det.hasCycle) return [];

  const deadlockedIds = state.processes
    .filter((p) => det.deadlocked.includes(p.name))
    .map((p) => p.id);

  // Strategy 1: terminate all
  const terminateAll: RecoveryPlan = {
    strategy: "terminate-all",
    victims: det.deadlocked,
    description:
      "Abort every process involved in the deadlock. Releases all their resources at once. Simple and guaranteed, but maximally disruptive.",
    resultingState: removeProcesses(state, deadlockedIds),
  };

  // Strategy 2: greedy minimum cost
  const greedyVictims: string[] = [];
  let working = state;
  while (true) {
    const d = detectDeadlock(working);
    if (!d.hasCycle) break;
    const candidates = working.processes.filter((p) => d.deadlocked.includes(p.name));
    if (candidates.length === 0) break;
    // Cost = sum of allocation (resources held)
    const victim = [...candidates].sort(
      (a, b) =>
        a.allocation.reduce((s, x) => s + x, 0) - b.allocation.reduce((s, x) => s + x, 0),
    )[0];
    greedyVictims.push(victim.name);
    working = removeProcesses(working, [victim.id]);
  }
  const terminateMin: RecoveryPlan = {
    strategy: "terminate-min-cost",
    victims: greedyVictims,
    description: `Iteratively abort the cheapest deadlocked process (by total resources held) until the deadlock is resolved. Victim order: ${greedyVictims.join(" → ")}.`,
    resultingState: working,
  };

  // Strategy 3: preempt single victim's resources
  const preemptVictim = [...state.processes]
    .filter((p) => det.deadlocked.includes(p.name))
    .sort(
      (a, b) =>
        b.allocation.reduce((s, x) => s + x, 0) - a.allocation.reduce((s, x) => s + x, 0),
    )[0];
  const preemptPlan: RecoveryPlan = {
    strategy: "preempt",
    victims: preemptVictim ? [preemptVictim.name] : [],
    description: preemptVictim
      ? `Preempt all resources from ${preemptVictim.name} (largest holder) and roll it back. Its allocation [${preemptVictim.allocation.join(", ")}] returns to Available.`
      : "No preemption candidate available.",
    resultingState: preemptVictim
      ? {
          resources: state.resources,
          processes: state.processes.map((p) =>
            p.id === preemptVictim.id
              ? { ...p, allocation: p.allocation.map(() => 0), request: undefined }
              : p,
          ),
        }
      : state,
  };

  return [terminateAll, terminateMin, preemptPlan];
}

function removeProcesses(state: SystemState, ids: string[]): SystemState {
  return {
    resources: state.resources,
    processes: state.processes.filter((p) => !ids.includes(p.id)),
  };
}
