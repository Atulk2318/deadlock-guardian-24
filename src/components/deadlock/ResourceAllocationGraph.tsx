import { useMemo } from "react";
import type { RAGEdge, RAGNode, SystemState } from "@/lib/deadlock/types";
import { buildRAG } from "@/lib/deadlock/rag";

type Props = {
  state: SystemState;
  /** ids of processes considered deadlocked (highlighted) */
  deadlocked?: string[];
  /** cycle paths: array of node-id arrays, edges along the cycle pulse */
  cycles?: string[][];
};

type PositionedNode = RAGNode & { x: number; y: number };

const WIDTH = 720;
const HEIGHT = 460;
const PROCESS_RADIUS = 26;
const RESOURCE_SIZE = 56;

export function ResourceAllocationGraph({ state, deadlocked = [], cycles = [] }: Props) {
  const { nodes, edges } = useMemo(() => buildRAG(state), [state]);

  const positioned: PositionedNode[] = useMemo(() => {
    const procs = nodes.filter((n) => n.kind === "process");
    const ress = nodes.filter((n) => n.kind === "resource");
    const padX = 90;
    const innerW = WIDTH - 2 * padX;

    const procY = HEIGHT * 0.28;
    const resY = HEIGHT * 0.74;

    const placeRow = (count: number, y: number) =>
      Array.from({ length: count }, (_, i) => ({
        x: padX + (count === 1 ? innerW / 2 : (innerW * i) / (count - 1)),
        y,
      }));

    const procPos = placeRow(procs.length, procY);
    const resPos = placeRow(ress.length, resY);
    return [
      ...procs.map((n, i) => ({ ...n, ...procPos[i] })),
      ...ress.map((n, i) => ({ ...n, ...resPos[i] })),
    ];
  }, [nodes]);

  const byId = useMemo(() => {
    const m = new Map<string, PositionedNode>();
    positioned.forEach((p) => m.set(p.id, p));
    return m;
  }, [positioned]);

  const cycleEdgeKeys = useMemo(() => {
    const set = new Set<string>();
    cycles.forEach((cyc) => {
      for (let i = 0; i < cyc.length; i++) {
        const a = cyc[i];
        const b = cyc[(i + 1) % cyc.length];
        set.add(`${a}->${b}`);
      }
    });
    return set;
  }, [cycles]);

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-border bg-card/50 shadow-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary shadow-glow" />
          <h3 className="text-sm font-semibold tracking-tight">Resource Allocation Graph</h3>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Legend swatch="bg-process" label="Process" />
          <Legend swatch="bg-resource rounded-none" label="Resource" />
          <Legend swatchEl={<svg width="20" height="6"><line x1="0" y1="3" x2="20" y2="3" stroke="var(--color-resource)" strokeWidth="2" /></svg>} label="Allocation" />
          <Legend swatchEl={<svg width="20" height="6"><line x1="0" y1="3" x2="20" y2="3" stroke="var(--color-process)" strokeWidth="2" strokeDasharray="3 3" /></svg>} label="Request" />
        </div>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Resource allocation graph">
        <defs>
          <marker id="arrow-alloc" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--color-resource)" />
          </marker>
          <marker id="arrow-req" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--color-process)" />
          </marker>
          <marker id="arrow-cycle" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--color-destructive)" />
          </marker>
        </defs>

        {/* Edges */}
        {edges.map((e, idx) => (
          <Edge
            key={idx}
            edge={e}
            from={byId.get(e.from)}
            to={byId.get(e.to)}
            inCycle={cycleEdgeKeys.has(`${e.from}->${e.to}`)}
          />
        ))}

        {/* Nodes */}
        {positioned.map((n) => (
          <Node key={n.id} node={n} highlighted={deadlocked.includes(n.label)} />
        ))}

        {nodes.length === 0 && (
          <text x={WIDTH / 2} y={HEIGHT / 2} textAnchor="middle" className="fill-muted-foreground text-sm">
            Add processes and resources to see the graph.
          </text>
        )}
      </svg>
    </div>
  );
}

function Legend({ swatch, swatchEl, label }: { swatch?: string; swatchEl?: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {swatchEl ?? <span className={`inline-block h-2.5 w-2.5 rounded-full ${swatch ?? ""}`} />}
      {label}
    </span>
  );
}

function Node({ node, highlighted }: { node: PositionedNode; highlighted: boolean }) {
  const stroke = highlighted ? "var(--color-destructive)" : "var(--color-border)";
  const strokeClass = highlighted ? "animate-pulse-danger" : "";
  if (node.kind === "process") {
    return (
      <g className="animate-fade-in-up">
        <circle
          cx={node.x}
          cy={node.y}
          r={PROCESS_RADIUS}
          fill="var(--color-process)"
          stroke={stroke}
          strokeWidth={highlighted ? 3 : 1.5}
          className={strokeClass}
        />
        <text
          x={node.x}
          y={node.y}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-[color:var(--color-process-foreground)] text-[13px] font-semibold"
        >
          {node.label}
        </text>
      </g>
    );
  }
  return (
    <g className="animate-fade-in-up">
      <rect
        x={node.x - RESOURCE_SIZE / 2}
        y={node.y - RESOURCE_SIZE / 2}
        width={RESOURCE_SIZE}
        height={RESOURCE_SIZE}
        rx={6}
        fill="var(--color-resource)"
        stroke={stroke}
        strokeWidth={highlighted ? 3 : 1.5}
        className={strokeClass}
      />
      <text
        x={node.x}
        y={node.y - 6}
        textAnchor="middle"
        className="fill-[color:var(--color-resource-foreground)] text-[12px] font-bold"
      >
        {node.label}
      </text>
      {/* Instance dots */}
      <g>
        {Array.from({ length: Math.min(node.instances, 6) }).map((_, i) => {
          const cols = Math.min(node.instances, 3);
          const gap = 8;
          const startX = node.x - ((cols - 1) * gap) / 2;
          const row = Math.floor(i / cols);
          const col = i % cols;
          return (
            <circle
              key={i}
              cx={startX + col * gap}
              cy={node.y + 8 + row * 7}
              r={2}
              fill="var(--color-resource-foreground)"
              opacity={0.85}
            />
          );
        })}
      </g>
    </g>
  );
}

function Edge({
  edge,
  from,
  to,
  inCycle,
}: {
  edge: RAGEdge;
  from?: PositionedNode;
  to?: PositionedNode;
  inCycle: boolean;
}) {
  if (!from || !to) return null;
  // Trim line endpoints so arrowheads sit at node edge
  const trim = (p: PositionedNode) =>
    p.kind === "process" ? PROCESS_RADIUS + 4 : RESOURCE_SIZE / 2 + 4;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const sx = from.x + ux * trim(from);
  const sy = from.y + uy * trim(from);
  const tx = to.x - ux * trim(to);
  const ty = to.y - uy * trim(to);

  const isAlloc = edge.kind === "assignment";
  const baseColor = inCycle
    ? "var(--color-destructive)"
    : isAlloc
      ? "var(--color-resource)"
      : "var(--color-process)";
  const marker = inCycle ? "url(#arrow-cycle)" : isAlloc ? "url(#arrow-alloc)" : "url(#arrow-req)";

  // Midpoint for weight label
  const mx = (sx + tx) / 2;
  const my = (sy + ty) / 2;

  return (
    <g className={inCycle ? "animate-pulse-danger" : ""}>
      <line
        x1={sx}
        y1={sy}
        x2={tx}
        y2={ty}
        stroke={baseColor}
        strokeWidth={inCycle ? 2.5 : 1.75}
        strokeDasharray={isAlloc ? undefined : "5 4"}
        markerEnd={marker}
      />
      {edge.weight && edge.weight > 1 && (
        <g>
          <rect
            x={mx - 9}
            y={my - 9}
            width={18}
            height={14}
            rx={3}
            fill="var(--color-card)"
            stroke={baseColor}
            strokeWidth={1}
          />
          <text x={mx} y={my} textAnchor="middle" dominantBaseline="central" className="text-[10px] font-bold" fill={baseColor}>
            {edge.weight}
          </text>
        </g>
      )}
    </g>
  );
}
