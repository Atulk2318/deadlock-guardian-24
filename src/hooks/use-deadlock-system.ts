import { useState, useCallback, useMemo } from "react";
import type { Process, ResourceType, SystemState } from "@/lib/deadlock/types";
import { PRESETS } from "@/lib/deadlock/presets";

let _idSeq = 100;
const newId = (prefix: string) => `${prefix}${_idSeq++}`;

export function useDeadlockSystem(initial?: SystemState) {
  const [state, setState] = useState<SystemState>(initial ?? PRESETS[0].state);

  const loadPreset = useCallback((id: string) => {
    const p = PRESETS.find((x) => x.id === id);
    if (p) setState(structuredClone(p.state));
  }, []);

  const reset = useCallback(() => setState(PRESETS[0].state), []);

  const addResource = useCallback(() => {
    setState((s) => {
      const id = newId("R");
      const name = `R${s.resources.length}`;
      return {
        resources: [...s.resources, { id, name, total: 1 }],
        processes: s.processes.map((p) => ({
          ...p,
          max: [...p.max, 0],
          allocation: [...p.allocation, 0],
          request: p.request ? [...p.request, 0] : undefined,
        })),
      };
    });
  }, []);

  const removeResource = useCallback((index: number) => {
    setState((s) => ({
      resources: s.resources.filter((_, i) => i !== index),
      processes: s.processes.map((p) => ({
        ...p,
        max: p.max.filter((_, i) => i !== index),
        allocation: p.allocation.filter((_, i) => i !== index),
        request: p.request?.filter((_, i) => i !== index),
      })),
    }));
  }, []);

  const updateResource = useCallback((index: number, patch: Partial<ResourceType>) => {
    setState((s) => ({
      ...s,
      resources: s.resources.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    }));
  }, []);

  const addProcess = useCallback(() => {
    setState((s) => {
      const id = newId("P");
      const name = `P${s.processes.length}`;
      const m = s.resources.length;
      return {
        ...s,
        processes: [
          ...s.processes,
          {
            id,
            name,
            max: Array.from({ length: m }, () => 0),
            allocation: Array.from({ length: m }, () => 0),
          },
        ],
      };
    });
  }, []);

  const removeProcess = useCallback((id: string) => {
    setState((s) => ({ ...s, processes: s.processes.filter((p) => p.id !== id) }));
  }, []);

  const updateProcess = useCallback((id: string, patch: Partial<Process>) => {
    setState((s) => ({
      ...s,
      processes: s.processes.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  }, []);

  const setProcessVector = useCallback(
    (id: string, field: "max" | "allocation" | "request", index: number, value: number) => {
      setState((s) => ({
        ...s,
        processes: s.processes.map((p) => {
          if (p.id !== id) return p;
          const base = p[field] ?? Array.from({ length: s.resources.length }, () => 0);
          const next = [...base];
          next[index] = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
          return { ...p, [field]: next };
        }),
      }));
    },
    [],
  );

  const applyState = useCallback((next: SystemState) => setState(structuredClone(next)), []);

  const totals = useMemo(() => state.resources.map((r) => r.total), [state]);

  return {
    state,
    totals,
    loadPreset,
    reset,
    addResource,
    removeResource,
    updateResource,
    addProcess,
    removeProcess,
    updateProcess,
    setProcessVector,
    applyState,
  };
}
