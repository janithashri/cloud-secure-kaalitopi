import { useMemo } from "react";

const CARTOGRAPHY_NODE_COLORS = {
  AWSAccount: "#1F4E79",
  EC2Instance: "#2E7D32",
  AWSRole: "#4527A0",
  S3Bucket: "#E65100",
  RDSInstance: "#00695C",
  SecurityGroup: "#C62828",
  EC2SecurityGroup: "#C62828",
  AWSPolicy: "#F57F17",
  AWSVPC: "#37474F",
  AWSVpc: "#37474F",
  AWSUser: "#AD1457",
  KMSKey: "#558B2F",
};

const MAX_VISIBLE_NODES = 300;

function circleLayout(nodes, width, height) {
  if (!nodes.length) return {};
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.max(120, Math.min(width, height) / 2 - 80);
  const pos = {};
  nodes.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / nodes.length;
    pos[n.id] = { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });
  return pos;
}

function shortNodeLabel(node) {
  const raw = String(
    node?.label ||
      node?.properties?.name ||
      node?.properties?.arn ||
      node?.properties?.id ||
      node?.id ||
      ""
  );
  if (!raw) return "Node";
  if (raw.startsWith("arn:")) {
    const section = raw.split("/").pop() || raw.split(":").pop() || raw;
    return section.slice(0, 26);
  }
  return raw.slice(0, 26);
}

function forceLayout(nodes, edges, width, height) {
  if (!nodes.length) return {};
  const byId = new Map(nodes.map((n, i) => [n.id, i]));
  const pos = nodes.map((_, i) => ({
    x: width * (0.15 + ((i * 97) % 100) / 140),
    y: height * (0.15 + ((i * 57) % 100) / 140),
    vx: 0,
    vy: 0,
  }));

  const links = edges
    .map((e) => ({ s: byId.get(e.source), t: byId.get(e.target) }))
    .filter((e) => Number.isInteger(e.s) && Number.isInteger(e.t));

  const centerX = width / 2;
  const centerY = height / 2;
  const repulsion = 2600;
  const spring = 0.006;
  const targetLen = 120;
  const damping = 0.85;

  for (let step = 0; step < 140; step += 1) {
    for (let i = 0; i < pos.length; i += 1) {
      for (let j = i + 1; j < pos.length; j += 1) {
        const dx = pos[j].x - pos[i].x;
        const dy = pos[j].y - pos[i].y;
        const d2 = dx * dx + dy * dy + 0.01;
        const d = Math.sqrt(d2);
        const f = repulsion / d2;
        const fx = (f * dx) / d;
        const fy = (f * dy) / d;
        pos[i].vx -= fx;
        pos[i].vy -= fy;
        pos[j].vx += fx;
        pos[j].vy += fy;
      }
    }

    for (const l of links) {
      const a = pos[l.s];
      const b = pos[l.t];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const stretch = d - targetLen;
      const fx = spring * stretch * (dx / d);
      const fy = spring * stretch * (dy / d);
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }

    for (const p of pos) {
      p.vx += (centerX - p.x) * 0.0008;
      p.vy += (centerY - p.y) * 0.0008;
      p.vx *= damping;
      p.vy *= damping;
      p.x = Math.max(30, Math.min(width - 30, p.x + p.vx));
      p.y = Math.max(30, Math.min(height - 30, p.y + p.vy));
    }
  }

  const out = {};
  nodes.forEach((n, i) => {
    out[n.id] = { x: pos[i].x, y: pos[i].y };
  });
  return out;
}

export default function GraphCanvas({
  graphData,
  attackPathGraph,
  selectedAttack,
  onNodeClick,
  width = 900,
  height = 560,
}) {
  const rawNodes = graphData?.nodes || [];
  const rawEdges = graphData?.edges || [];
  const nodes = rawNodes.slice(0, MAX_VISIBLE_NODES);
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = rawEdges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
  const pathNodeIds = new Set((attackPathGraph?.nodes || []).map((n) => n.id));
  const pathEdgeIds = new Set((attackPathGraph?.edges || []).map((e) => `${e.source}->${e.target}`));
  const hasPath = !!selectedAttack && (attackPathGraph?.violated || false);

  const positions = useMemo(() => {
    if (edges.length === 0) return circleLayout(nodes, width, height);
    return forceLayout(nodes, edges, width, height);
  }, [nodes, edges, width, height]);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
      {hasPath && (
        <div className="mb-3 rounded-md border border-red-700/40 bg-red-900/20 px-3 py-2 text-sm text-red-300">
          Showing attack path: {selectedAttack}
        </div>
      )}
      {rawNodes.length > MAX_VISIBLE_NODES && (
        <div className="mb-3 rounded-md border border-amber-700/40 bg-amber-900/20 px-3 py-2 text-xs text-amber-300">
          Rendering first {MAX_VISIBLE_NODES} nodes out of {rawNodes.length} for performance. Use node-type filter to inspect specific resources.
        </div>
      )}
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[560px] w-full rounded bg-slate-950">
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="#64748b" />
          </marker>
          <marker id="arrow-red" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="#ef4444" />
          </marker>
        </defs>

        {edges.map((e, i) => {
          const s = positions[e.source];
          const t = positions[e.target];
          if (!s || !t) return null;
          const key = `${e.source}->${e.target}`;
          const inPath = pathEdgeIds.has(key);
          const dim = hasPath && !inPath;
          return (
            <g key={e.id || `${key}-${i}`}>
              <line
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke={inPath ? "#ef4444" : "#64748b"}
                strokeWidth={inPath ? 2.2 : 1.2}
                opacity={dim ? 0.2 : 0.75}
                strokeDasharray={inPath ? "7 5" : "0"}
                markerEnd={`url(#${inPath ? "arrow-red" : "arrow"})`}
              >
                {inPath && <animate attributeName="stroke-dashoffset" from="24" to="0" dur="1.2s" repeatCount="indefinite" />}
              </line>
            </g>
          );
        })}

        {nodes.map((n) => {
          const p = positions[n.id];
          if (!p) return null;
          const inPath = pathNodeIds.has(n.id);
          const dim = hasPath && !inPath;
          const base = CARTOGRAPHY_NODE_COLORS[n.type] || "#64748b";
          const fill = inPath ? "#dc2626" : base;
          return (
            <g key={n.id} transform={`translate(${p.x}, ${p.y})`} onClick={() => onNodeClick?.(n)} className="cursor-pointer">
              <circle r="22" fill={fill} opacity={dim ? 0.2 : 0.95} stroke={inPath ? "#fca5a5" : "#cbd5e1"} strokeWidth={inPath ? 2 : 1} />
              <text x="0" y="36" textAnchor="middle" fontSize="10" fill={dim ? "#64748b" : "#e2e8f0"}>
                {shortNodeLabel(n)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
