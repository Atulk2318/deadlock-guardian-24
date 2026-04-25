import type { SystemState } from "./types";
import { computeAvailable, computeNeed, vecLE } from "./bankers";
import { detectDeadlock } from "./rag";

export type PreventionPolicy =
  | "none"
  | "no-hold-wait" // process must request all resources up front
  | "ordered-requests" // requests must follow resource id order (lower → higher)
  | "preempt-on-wait" // if request can't be granted, release everything
  | "bankers-avoidance"; // only grant if resulting state is safe

export type PolicyDecision = {
  allowed: boolean;
  policy: PreventionPolicy;
  reason: string;
  /** which Coffman condition this policy attacks */
  attacks: "hold-and-wait" | "circular-wait" | "no-preemption" | "via-avoidance";
};

export function evaluatePolicy(
  state: SystemState,
  processId: string,
  request: number[],
  policy: PreventionPolicy,
): PolicyDecision {
  const proc = state.processes.find((p) => p.id === processId);
  if (!proc) {
    return { allowed: false, policy, reason: "Process not found", attacks: "via-avoidance" };
  }

  switch (policy) {
    case "none":
      return {
        allowed: true,
        policy,
        reason: "No prevention policy active. Request flows through unchecked.",
        attacks: "via-avoidance",
      };

    case "no-hold-wait": {
      const holdsAny = proc.allocation.some((a) => a > 0);
      if (holdsAny) {
        return {
          allowed: false,
          policy,
          reason: `${proc.name} already holds resources. Under "request all up front", it must release everything before requesting more.`,
          attacks: "hold-and-wait",
        };
      }
      const available = computeAvailable(state);
      if (!vecLE(request, available)) {
        return {
          allowed: false,
          policy,
          reason: `Atomic request [${request.join(",")}] exceeds Available [${available.join(",")}]. ${proc.name} blocks.`,
          attacks: "hold-and-wait",
        };
      }
      return {
        allowed: true,
        policy,
        reason: `${proc.name} holds nothing — atomic request can be granted.`,
        attacks: "hold-and-wait",
      };
    }

    case "ordered-requests": {
      // Highest-indexed resource currently held
      const heldIndices = proc.allocation
        .map((a, i) => (a > 0 ? i : -1))
        .filter((i) => i >= 0);
      const maxHeld = heldIndices.length > 0 ? Math.max(...heldIndices) : -1;
      const requestedIndices = request
        .map((q, i) => (q > 0 ? i : -1))
        .filter((i) => i >= 0);
      const minRequested = requestedIndices.length > 0 ? Math.min(...requestedIndices) : Infinity;
      if (minRequested <= maxHeld) {
        return {
          allowed: false,
          policy,
          reason: `Resource ordering violation: ${proc.name} holds index ${maxHeld} (${state.resources[maxHeld]?.name}) and requests index ${minRequested} (${state.resources[minRequested]?.name}). Must request strictly higher.`,
          attacks: "circular-wait",
        };
      }
      return {
        allowed: true,
        policy,
        reason: `Request respects resource ordering — no cycle can form.`,
        attacks: "circular-wait",
      };
    }

    case "preempt-on-wait": {
      const available = computeAvailable(state);
      if (vecLE(request, available)) {
        return {
          allowed: true,
          policy,
          reason: `Request fits within Available. Granted normally.`,
          attacks: "no-preemption",
        };
      }
      return {
        allowed: false,
        policy,
        reason: `Request can't be satisfied immediately. ${proc.name}'s held resources will be preempted and added back to Available before retry.`,
        attacks: "no-preemption",
      };
    }

    case "bankers-avoidance": {
      const available = computeAvailable(state);
      const need = computeNeed(state).find((_, i) => state.processes[i].id === processId)!;
      if (!vecLE(request, need)) {
        return {
          allowed: false,
          policy,
          reason: `Request exceeds declared Need. Banker's rejects.`,
          attacks: "via-avoidance",
        };
      }
      if (!vecLE(request, available)) {
        return {
          allowed: false,
          policy,
          reason: `Insufficient Available. ${proc.name} must wait.`,
          attacks: "via-avoidance",
        };
      }
      // Tentative grant
      const tentative: SystemState = {
        resources: state.resources,
        processes: state.processes.map((p) =>
          p.id === processId
            ? { ...p, allocation: p.allocation.map((a, i) => a + (request[i] ?? 0)) }
            : p,
        ),
      };
      const det = detectDeadlock(tentative);
      if (det.hasCycle) {
        return {
          allowed: false,
          policy,
          reason: `Granting would create a deadlock among: ${det.deadlocked.join(", ")}.`,
          attacks: "via-avoidance",
        };
      }
      return {
        allowed: true,
        policy,
        reason: `Resulting state is safe.`,
        attacks: "via-avoidance",
      };
    }
  }
}

export const POLICY_LABELS: Record<PreventionPolicy, string> = {
  none: "No policy",
  "no-hold-wait": "Request all up-front",
  "ordered-requests": "Resource ordering",
  "preempt-on-wait": "Preempt on wait",
  "bankers-avoidance": "Banker's avoidance",
};

export const POLICY_DESCRIPTIONS: Record<PreventionPolicy, string> = {
  none: "All requests pass through. Use this to provoke deadlocks.",
  "no-hold-wait":
    "A process must request every resource it will ever need before starting. Breaks Hold-and-Wait.",
  "ordered-requests":
    "Resources have a global order; processes can only request higher-indexed ones. Breaks Circular Wait.",
  "preempt-on-wait":
    "If a request can't be satisfied, the requester releases everything it holds. Breaks No-Preemption.",
  "bankers-avoidance":
    "Grant only if the resulting state remains safe (a safe sequence still exists).",
};
