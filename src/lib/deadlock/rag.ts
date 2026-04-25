import type { CycleResult, RAGEdge, RAGNode, SystemState } from "./types";
import { computeAvailable, computeNeed } from "./bankers";

/**
 * Build a Resource Allocation Graph from a system state.
 * Pending requests are taken from process.request (if any).
 */
export function buildRAG(state: SystemState): { nodes: RAGNode[]; edges: RAGEdge[] } {
  const nodes: RAGNode[] = [
    ...state.processes.map<RAGNode>((p) => ({ kind: "process", id: p.id, label: p.name })),
    ...state.resources.map<RAGNode>((r) => ({
      kind: "resource",
      id: r.id,
      label: r.name,
      instances: r.total,
    })),
  ];
  const edges: RAGEdge[] = [];
  state.processes.forEach((p) => {
    p.allocation.forEach((a, ri) => {
      if (a > 0) {
        edges.push({
          from: state.resources[ri].id,
          to: p.id,
          kind: "assignment",
          weight: a,
        });
      }
    });
    if (p.request) {
      p.request.forEach((q, ri) => {
        if (q > 0) {
          edges.push({
            from: p.id,
            to: state.resources[ri].id,
            kind: "request",
            weight: q,
          });
        }
      });
    }
  });
  return { nodes, edges };
}

/**
 * Detect deadlock.
 * - Single-instance resources: cycle in RAG ⇔ deadlock.
 * - Multi-instance resources: run reduction algorithm (equivalent to Banker safety
 *   with current Need treated as request); processes that cannot be reduced are deadlocked.
 */
export function detectDeadlock(state: SystemState): CycleResult {
  const allSingle = state.resources.every((r) => r.total === 1);
  if (allSingle) {
    return detectByCycle(state);
  }
  return detectByReduction(state);
}

function detectByCycle(state: SystemState): CycleResult {
  // Build directed graph from RAG edges
  const { edges } = buildRAG(state);
  const adj = new Map<string, string[]>();
  const allIds = new Set<string>();
  edges.forEach((e) => {
    if (!adj.has(e.from)) adj.set(e.from, []);
    adj.get(e.from)!.push(e.to);
    allIds.add(e.from);
    allIds.add(e.to);
  });

  const cycles: string[][] = [];
  const stack: string[] = [];
  const onStack = new Set<string>();
  const visited = new Set<string>();

  function dfs(u: string) {
    visited.add(u);
    stack.push(u);
    onStack.add(u);
    for (const v of adj.get(u) ?? []) {
      if (!visited.has(v)) {
        dfs(v);
      } else if (onStack.has(v)) {
        const idx = stack.indexOf(v);
        if (idx !== -1) {
          const cyc = stack.slice(idx);
          // Normalize for de-dup
          const key = [...cyc].sort().join("|");
          if (!cycles.some((c) => [...c].sort().join("|") === key)) {
            cycles.push(cyc);
          }
        }
      }
    }
    stack.pop();
    onStack.delete(u);
  }

  for (const id of allIds) if (!visited.has(id)) dfs(id);

  const deadlockedSet = new Set<string>();
  cycles.flat().forEach((id) => {
    if (state.processes.some((p) => p.id === id)) deadlockedSet.add(id);
  });

  return {
    hasCycle: cycles.length > 0,
    cycles,
    deadlocked: state.processes.filter((p) => deadlockedSet.has(p.id)).map((p) => p.name),
  };
}

function detectByReduction(state: SystemState): CycleResult {
  // Treat Need as the outstanding request and try to reduce.
  const need = computeNeed(state);
  let work = computeAvailable(state);
  const finished = state.processes.map(() => false);
  let progress = true;
  while (progress) {
    progress = false;
    for (let i = 0; i < state.processes.length; i++) {
      if (finished[i]) continue;
      if (need[i].every((v, j) => v <= work[j])) {
        work = work.map((w, j) => w + state.processes[i].allocation[j]);
        finished[i] = true;
        progress = true;
      }
    }
  }
  const deadlocked = state.processes.filter((_, i) => !finished[i]).map((p) => p.name);
  return {
    hasCycle: deadlocked.length > 0,
    cycles: deadlocked.length > 0 ? [deadlocked.map((n) => state.processes.find((p) => p.name === n)!.id)] : [],
    deadlocked,
  };
}
