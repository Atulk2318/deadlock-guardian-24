export type ResourceType = {
  id: string;
  name: string;
  total: number;
};

export type Process = {
  id: string;
  name: string;
  /** Maximum demand vector (length = #resources) */
  max: number[];
  /** Currently allocated vector */
  allocation: number[];
  /** Pending request vector (0 if none) */
  request?: number[];
  finished?: boolean;
};

export type SystemState = {
  resources: ResourceType[];
  processes: Process[];
};

export type BankersStep = {
  iteration: number;
  /** work vector at start of iteration */
  work: number[];
  /** finished flags at start of iteration */
  finishedBefore: boolean[];
  /** process index chosen this iteration, or null if none */
  chosen: number | null;
  /** human-readable reason */
  message: string;
};

export type BankersResult = {
  safe: boolean;
  safeSequence: string[];
  steps: BankersStep[];
  unfinished: string[];
};

export type RAGNode =
  | { kind: "process"; id: string; label: string }
  | { kind: "resource"; id: string; label: string; instances: number };

export type RAGEdge = {
  from: string;
  to: string;
  /** "assignment" = resource -> process, "request" = process -> resource */
  kind: "assignment" | "request";
  weight?: number;
};

export type CycleResult = {
  hasCycle: boolean;
  cycles: string[][];
  /** processes considered deadlocked (involved in a knot for multi-instance, in a cycle for single-instance) */
  deadlocked: string[];
};

export type CoffmanReport = {
  mutualExclusion: { holds: boolean; detail: string };
  holdAndWait: { holds: boolean; detail: string };
  noPreemption: { holds: boolean; detail: string };
  circularWait: { holds: boolean; detail: string };
  allHold: boolean;
};

export type RecoveryPlan = {
  strategy: "terminate-all" | "terminate-min-cost" | "preempt";
  victims: string[];
  description: string;
  /** state after applying the plan */
  resultingState: SystemState;
};
