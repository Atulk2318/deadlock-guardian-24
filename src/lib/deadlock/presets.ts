import type { SystemState } from "./types";

export type Preset = {
  id: string;
  name: string;
  description: string;
  state: SystemState;
};

export const PRESETS: Preset[] = [
  {
    id: "classic-banker",
    name: "Classic Banker's (safe)",
    description:
      "The textbook example from Silberschatz: 5 processes, 3 resource types. Already in a safe state with sequence ⟨P1, P3, P4, P0, P2⟩.",
    state: {
      resources: [
        { id: "A", name: "A", total: 10 },
        { id: "B", name: "B", total: 5 },
        { id: "C", name: "C", total: 7 },
      ],
      processes: [
        { id: "P0", name: "P0", max: [7, 5, 3], allocation: [0, 1, 0] },
        { id: "P1", name: "P1", max: [3, 2, 2], allocation: [2, 0, 0] },
        { id: "P2", name: "P2", max: [9, 0, 2], allocation: [3, 0, 2] },
        { id: "P3", name: "P3", max: [2, 2, 2], allocation: [2, 1, 1] },
        { id: "P4", name: "P4", max: [4, 3, 3], allocation: [0, 0, 2] },
      ],
    },
  },
  {
    id: "dining-philosophers",
    name: "Dining Philosophers (deadlocked)",
    description:
      "4 philosophers, each holding their left fork and waiting for their right. Single-instance resources form a perfect cycle.",
    state: {
      resources: [
        { id: "F0", name: "F0", total: 1 },
        { id: "F1", name: "F1", total: 1 },
        { id: "F2", name: "F2", total: 1 },
        { id: "F3", name: "F3", total: 1 },
      ],
      processes: [
        {
          id: "Ph0",
          name: "Ph0",
          max: [1, 1, 0, 0],
          allocation: [1, 0, 0, 0],
          request: [0, 1, 0, 0],
        },
        {
          id: "Ph1",
          name: "Ph1",
          max: [0, 1, 1, 0],
          allocation: [0, 1, 0, 0],
          request: [0, 0, 1, 0],
        },
        {
          id: "Ph2",
          name: "Ph2",
          max: [0, 0, 1, 1],
          allocation: [0, 0, 1, 0],
          request: [0, 0, 0, 1],
        },
        {
          id: "Ph3",
          name: "Ph3",
          max: [1, 0, 0, 1],
          allocation: [0, 0, 0, 1],
          request: [1, 0, 0, 0],
        },
      ],
    },
  },
  {
    id: "two-process-deadlock",
    name: "Two-Process Deadlock",
    description:
      "P0 holds R0 and waits for R1; P1 holds R1 and waits for R0. The simplest possible deadlock.",
    state: {
      resources: [
        { id: "R0", name: "R0", total: 1 },
        { id: "R1", name: "R1", total: 1 },
      ],
      processes: [
        {
          id: "P0",
          name: "P0",
          max: [1, 1],
          allocation: [1, 0],
          request: [0, 1],
        },
        {
          id: "P1",
          name: "P1",
          max: [1, 1],
          allocation: [0, 1],
          request: [1, 0],
        },
      ],
    },
  },
  {
    id: "unsafe-but-not-deadlocked",
    name: "Unsafe (no deadlock yet)",
    description:
      "Banker's would refuse the next request — safety check fails — but no actual circular wait exists yet.",
    state: {
      resources: [
        { id: "A", name: "A", total: 6 },
        { id: "B", name: "B", total: 5 },
      ],
      processes: [
        { id: "P0", name: "P0", max: [4, 3], allocation: [3, 1] },
        { id: "P1", name: "P1", max: [2, 2], allocation: [1, 2] },
        { id: "P2", name: "P2", max: [3, 4], allocation: [2, 1] },
      ],
    },
  },
];
