import { useEffect, useMemo, useRef, useState } from "react";
import type { RAGEdge, RAGNode, SystemState } from "@/lib/deadlock/types";
import { buildRAG } from "@/lib/deadlock/rag";

type Props = {
  state: SystemState;
  deadlocked?: string[];
  cycles?: string[][];
};

type Pos = { x: number; y: number };
type PositionedNode = RAGNode & Pos & { vx: number; vy: number; fixed?: boolean };

const WIDTH = 760;
const HEIGHT = 520;
const PROCESS_R = 24;
const RES_W = 60;
const RES_H = 48;

export function RAGCanvas({ state, deadlocked = [], cycles = [] }: Props) {
  const { nodes, edges } = useMemo(() => buildRAG(state), [state]);
  const [positions, setPositions] = useState<Map<string, Pos>>(new Map());
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const animRef = useRef<number | undefined>(undefined);
  const nodesRef = useRef<PositionedNode[]>([]);

  // Initialize / sync positions when node set changes
  useEffect(() => {
    setPositions((prev) => {
      const next = new Map<string, Pos>();
      const procs = nodes.filter((n) => n.kind === "process");
      const ress = nodes.filter((n) => n.kind === "resource");
      const cx = WIDTH / 2;
      const cy = HEIGHT / 2;
      procs.forEach((n, i) => {
        const existing = prev.get(n.id);
        if (existing) {
          next.set(n.id, existing);
        } else {
          // Distribute on inner circle
          const angle = (i / Math.max(procs.length, 1)) * Math.PI * 2 - Math.PI / 2;
          next.set(n.id, {
            x: cx + Math.cos(angle) * 130,
            y: cy + Math.sin(angle) * 110,
          });
        }
      });
      ress.forEach((n, i) => {
        const existing = prev.get(n.id);
        if (existing) {
          next.set(n.id, existing);
        } else {
          // Distribute on outer ring
          const angle = (i / Math.max(ress.length, 1)) * Math.PI * 2 - Math.PI / 2 + Math.PI / 6;
          next.set(n.id, {
            x: cx + Math.cos(angle) * 230,
            y: cy + Math.sin(angle) * 190,
          });
        }
      });
      return next;
    });
  }, [nodes]);

  // Force-directed simulation
  useEffect(() => {
    const items: PositionedNode[] = nodes.map((n) => {
      const p = positions.get(n.id) ?? { x: WIDTH / 2, y: HEIGHT / 2 };
      return { ...n, x: p.x, y: p.y, vx: 0, vy: 0 };
    });
    nodesRef.current = items;

    let frame = 0;
    const tick = () => {
      frame++;
      const items = nodesRef.current;
      const ids = items.map((i) => i.id);
      const idIndex = new Map(ids.map((id, i) => [id, i]));

      // Repulsion
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const a = items[i];
          const b = items[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist2 = dx * dx + dy * dy + 0.01;
          const dist = Math.sqrt(dist2);
          const force = 4500 / dist2;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          if (a.id !== dragId) {
            a.vx -= fx;
            a.vy -= fy;
          }
          if (b.id !== dragId) {
            b.vx += fx;
            b.vy += fy;
          }
        }
      }

      // Attraction along edges
      for (const e of edges) {
        const i = idIndex.get(e.from);
        const j = idIndex.get(e.to);
        if (i === undefined || j === undefined) continue;
        const a = items[i];
        const b = items[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
        const target = 150;
        const k = 0.012;
        const force = (dist - target) * k;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        if (a.id !== dragId) {
          a.vx += fx;
          a.vy += fy;
        }
        if (b.id !== dragId) {
          b.vx -= fx;
          b.vy -= fy;
        }
      }

      // Center gravity
      for (const n of items) {
        if (n.id === dragId) continue;
        n.vx += (WIDTH / 2 - n.x) * 0.002;
        n.vy += (HEIGHT / 2 - n.y) * 0.002;
      }

      // Integrate + damping + bounds
      for (const n of items) {
        if (n.id === dragId) continue;
        n.vx *= 0.82;
        n.vy *= 0.82;
        n.x += n.vx;
        n.y += n.vy;
        const margin = 40;
        n.x = Math.max(margin, Math.min(WIDTH - margin, n.x));
        n.y = Math.max(margin, Math.min(HEIGHT - margin, n.y));
      }

      if (frame % 2 === 0) {
        const map = new Map<string, Pos>();
        items.forEach((n) => map.set(n.id, { x: n.x, y: n.y }));
        setPositions(map);
      }

      // Settle after enough frames if not dragging
      if (frame < 240 || dragId) {
        animRef.current = requestAnimationFrame(tick);
      }
    };
    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, dragId]);

  const cycleEdgeKeys = useMemo(() => {
    const set = new Set<string>();
    cycles.forEach((cyc) => {
      for (let i = 0; i < cyc.length; i++) {
        set.add(`${cyc[i]}->${cyc[(i + 1) % cyc.length]}`);
      }
    });
    return set;
  }, [cycles]);

  const onPointerDown = (id: string, e: React.PointerEvent) => {
    e.preventDefault();
    setDragId(id);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragId || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const sx = WIDTH / rect.width;
    const sy = HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * sx;
    const y = (e.clientY - rect.top) * sy;
    const item = nodesRef.current.find((n) => n.id === dragId);
    if (item) {
      item.x = x;
      item.y = y;
      item.vx = 0;
      item.vy = 0;
      setPositions((prev) => {
        const next = new Map(prev);
        next.set(dragId, { x, y });
        return next;
      });
    }
  };
  const onPointerUp = () => setDragId(null);

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card/40 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-background/30 px-4 py-2.5 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary shadow-glow" />
          <h3 className="text-sm font-semibold tracking-tight">Resource Allocation Graph</h3>
          <span className="hidden text-[10px] text-muted-foreground sm:inline">
            · drag nodes to rearrange
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <Legend swatch={<span className="block h-2.5 w-2.5 rounded-full bg-process" />} label="Process" />
          <Legend swatch={<span className="block h-2.5 w-2.5 rounded-sm bg-resource" />} label="Resource" />
          <Legend
            swatch={<svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" stroke="var(--color-resource)" strokeWidth="2" /></svg>}
            label="Allocation"
          />
          <Legend
            swatch={<svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" stroke="var(--color-process)" strokeWidth="2" strokeDasharray="3 3" /></svg>}
            label="Request"
          />
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="block w-full touch-none select-none"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        role="img"
        aria-label="Resource allocation graph"
      >
        <defs>
          {/* Subtle grid */}
          <pattern id="rag-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="var(--color-border)" strokeOpacity="0.18" strokeWidth="1" />
          </pattern>
          <radialGradient id="rag-bg" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor="oklch(0.24 0.04 250)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="oklch(0.16 0.02 250)" stopOpacity="0" />
          </radialGradient>
          <marker id="m-alloc" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--color-resource)" />
          </marker>
          <marker id="m-req" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--color-process)" />
          </marker>
          <marker id="m-cycle" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--color-destructive)" />
          </marker>
          <filter id="glow-process" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-danger" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width={WIDTH} height={HEIGHT} fill="url(#rag-bg)" />
        <rect width={WIDTH} height={HEIGHT} fill="url(#rag-grid)" />

        {/* Edges */}
        <g>
          {edges.map((e, idx) => (
            <Edge
              key={`${e.from}-${e.to}-${idx}`}
              edge={e}
              from={positions.get(e.from)}
              to={positions.get(e.to)}
              fromKind={nodes.find((n) => n.id === e.from)?.kind ?? "process"}
              toKind={nodes.find((n) => n.id === e.to)?.kind ?? "process"}
              inCycle={cycleEdgeKeys.has(`${e.from}->${e.to}`)}
              dimmed={!!hoverId && hoverId !== e.from && hoverId !== e.to}
            />
          ))}
        </g>

        {/* Nodes */}
        <g>
          {nodes.map((n) => {
            const p = positions.get(n.id);
            if (!p) return null;
            return (
              <NodeView
                key={n.id}
                node={n}
                pos={p}
                highlighted={deadlocked.includes(n.label)}
                hovered={hoverId === n.id}
                dimmed={!!hoverId && hoverId !== n.id && !isNeighbor(hoverId, n.id, edges)}
                onPointerDown={(e) => onPointerDown(n.id, e)}
                onMouseEnter={() => setHoverId(n.id)}
                onMouseLeave={() => setHoverId(null)}
              />
            );
          })}
        </g>

        {nodes.length === 0 && (
          <text x={WIDTH / 2} y={HEIGHT / 2} textAnchor="middle" className="fill-muted-foreground text-sm">
            Add processes and resources to see the graph.
          </text>
        )}
      </svg>
    </div>
  );
}

function isNeighbor(a: string, b: string, edges: RAGEdge[]) {
  return edges.some((e) => (e.from === a && e.to === b) || (e.from === b && e.to === a));
}

function Legend({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {swatch}
      {label}
    </span>
  );
}

function NodeView({
  node,
  pos,
  highlighted,
  hovered,
  dimmed,
  onPointerDown,
  onMouseEnter,
  onMouseLeave,
}: {
  node: RAGNode;
  pos: Pos;
  highlighted: boolean;
  hovered: boolean;
  dimmed: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const opacity = dimmed ? 0.35 : 1;
  const filter = highlighted ? "url(#glow-danger)" : hovered ? "url(#glow-process)" : undefined;
  const strokeColor = highlighted ? "var(--color-destructive)" : hovered ? "var(--color-primary)" : "var(--color-border)";
  const strokeWidth = highlighted || hovered ? 2.5 : 1.5;

  if (node.kind === "process") {
    return (
      <g
        style={{ opacity, cursor: "grab", touchAction: "none" }}
        onPointerDown={onPointerDown}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={highlighted ? "animate-pulse-danger" : "animate-fade-in-up"}
      >
        <circle cx={pos.x} cy={pos.y} r={PROCESS_R + 4} fill="var(--color-process)" opacity="0.18" />
        <circle
          cx={pos.x}
          cy={pos.y}
          r={PROCESS_R}
          fill="var(--color-process)"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          filter={filter}
        />
        <text
          x={pos.x}
          y={pos.y}
          textAnchor="middle"
          dominantBaseline="central"
          className="pointer-events-none fill-[color:var(--color-process-foreground)] text-[12px] font-bold"
        >
          {node.label}
        </text>
      </g>
    );
  }

  return (
    <g
      style={{ opacity, cursor: "grab", touchAction: "none" }}
      onPointerDown={onPointerDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={highlighted ? "animate-pulse-danger" : "animate-fade-in-up"}
    >
      <rect
        x={pos.x - RES_W / 2 - 3}
        y={pos.y - RES_H / 2 - 3}
        width={RES_W + 6}
        height={RES_H + 6}
        rx={8}
        fill="var(--color-resource)"
        opacity="0.15"
      />
      <rect
        x={pos.x - RES_W / 2}
        y={pos.y - RES_H / 2}
        width={RES_W}
        height={RES_H}
        rx={6}
        fill="var(--color-resource)"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        filter={filter}
      />
      <text
        x={pos.x}
        y={pos.y - 7}
        textAnchor="middle"
        className="pointer-events-none fill-[color:var(--color-resource-foreground)] text-[12px] font-bold"
      >
        {node.label}
      </text>
      {/* Instance pips */}
      <g className="pointer-events-none">
        {Array.from({ length: Math.min(node.instances, 8) }).map((_, i) => {
          const cols = Math.min(node.instances, 4);
          const gap = 8;
          const startX = pos.x - ((cols - 1) * gap) / 2;
          const row = Math.floor(i / cols);
          const col = i % cols;
          return (
            <circle
              key={i}
              cx={startX + col * gap}
              cy={pos.y + 8 + row * 7}
              r={2}
              fill="var(--color-resource-foreground)"
              opacity="0.85"
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
  fromKind,
  toKind,
  inCycle,
  dimmed,
}: {
  edge: RAGEdge;
  from?: Pos;
  to?: Pos;
  fromKind: "process" | "resource";
  toKind: "process" | "resource";
  inCycle: boolean;
  dimmed: boolean;
}) {
  if (!from || !to) return null;
  const trim = (k: "process" | "resource") => (k === "process" ? PROCESS_R + 4 : Math.max(RES_W, RES_H) / 2 + 4);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const sx = from.x + ux * trim(fromKind);
  const sy = from.y + uy * trim(fromKind);
  const tx = to.x - ux * trim(toKind);
  const ty = to.y - uy * trim(toKind);

  // Curve perpendicular for visual separation
  const mx = (sx + tx) / 2;
  const my = (sy + ty) / 2;
  const nx = -uy;
  const ny = ux;
  const curve = 18;
  const cx = mx + nx * curve;
  const cy = my + ny * curve;

  const isAlloc = edge.kind === "assignment";
  const color = inCycle ? "var(--color-destructive)" : isAlloc ? "var(--color-resource)" : "var(--color-process)";
  const marker = inCycle ? "url(#m-cycle)" : isAlloc ? "url(#m-alloc)" : "url(#m-req)";
  const path = `M ${sx} ${sy} Q ${cx} ${cy} ${tx} ${ty}`;
  const opacity = dimmed ? 0.25 : 1;

  return (
    <g style={{ opacity }} className={inCycle ? "animate-pulse-danger" : ""}>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={inCycle ? 2.5 : 1.75}
        strokeDasharray={isAlloc ? undefined : "5 4"}
        markerEnd={marker}
      />
      {edge.weight && edge.weight > 1 && (
        <g>
          <rect x={cx - 9} y={cy - 8} width={18} height={14} rx={3} fill="var(--color-card)" stroke={color} strokeWidth={1} />
          <text x={cx} y={cy - 1} textAnchor="middle" dominantBaseline="central" className="text-[10px] font-bold" fill={color}>
            {edge.weight}
          </text>
        </g>
      )}
    </g>
  );
}
