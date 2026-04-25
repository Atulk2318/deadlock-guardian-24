export type EventKind =
  | "request-granted"
  | "request-denied"
  | "release"
  | "policy-block"
  | "deadlock-detected"
  | "recovery"
  | "preset-loaded"
  | "edit";

export type SystemEvent = {
  id: string;
  ts: number;
  kind: EventKind;
  title: string;
  detail?: string;
  process?: string;
  vector?: number[];
};
