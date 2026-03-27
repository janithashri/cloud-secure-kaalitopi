import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import AttackPathDetail from "../components/AttackPathDetail";
import AttackPathPanel from "../components/AttackPathPanel";
import GraphCanvas from "../components/GraphCanvas";
import {
  getAttackQueries,
  getAttackQueryGraph,
  getCartographyGraph,
  runAttackEngine,
} from "../api/graph";

export default function DeepScanPage() {
  const { token, api } = useAuth();
  const [providers, setProviders] = useState([]);
  const [providerId, setProviderId] = useState("");
  const [scanId, setScanId] = useState(null);
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [graphLabelFilter, setGraphLabelFilter] = useState("");
  const [attackQueries, setAttackQueries] = useState([]);
  const [attackResults, setAttackResults] = useState({});
  const [selectedAttack, setSelectedAttack] = useState(null);
  const [attackPathGraph, setAttackPathGraph] = useState(null);
  const [running, setRunning] = useState(false);
  const [graphError, setGraphError] = useState("");
  const [detailNode, setDetailNode] = useState(null);

  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const headers = useMemo(
    () => ({ "Content-Type": "application/json", Authorization: `Token ${token}` }),
    [token]
  );

  async function loadProviders() {
    const res = await fetch(`${apiBase}/api/v1/providers/`, { headers });
    const data = await res.json();
    const list = Array.isArray(data) ? data : data.results || [];
    setProviders(list);
    if (!providerId && list.length) setProviderId(String(list[0].id));
  }

  async function loadHistory(pid) {
    if (!pid) return;
    const res = await fetch(`${apiBase}/api/v1/deep-scan/?provider_id=${pid}&limit=10`, { headers });
    const data = await res.json();
    setHistory(data.scans || []);
  }

  async function loadGraph(pid, label = "") {
    if (!pid) return;
    setGraphError("");
    try {
      const data = await getCartographyGraph(api, pid, label || null);
      setGraphData({ nodes: data.nodes || [], edges: data.edges || [] });
    } catch (err) {
      setGraphError("Unable to load Cartography graph.");
      setGraphData({ nodes: [], edges: [] });
    }
  }

  async function loadAttackCatalog() {
    try {
      const catalog = await getAttackQueries(api);
      setAttackQueries(Array.isArray(catalog) ? catalog : []);
    } catch {
      setAttackQueries([]);
    }
  }

  async function startScan() {
    if (!providerId) return;
    setLoading(true);
    const res = await fetch(`${apiBase}/api/v1/deep-scan/`, {
      method: "POST",
      headers,
      body: JSON.stringify({ provider_id: Number(providerId) }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setScanId(data.scan_id);
      setStatus(data);
    }
  }

  async function runAllAttacks() {
    if (!providerId) return;
    setRunning(true);
    try {
      const data = await runAttackEngine(api, providerId);
      const list = data?.results || [];
      const mapped = {};
      list.forEach((r) => {
        mapped[r.query_id] = r;
      });
      setAttackResults(mapped);
    } finally {
      setRunning(false);
    }
  }

  async function selectAttack(queryId) {
    setSelectedAttack(queryId);
    if (!providerId) return;
    try {
      const data = await getAttackQueryGraph(api, providerId, queryId);
      setAttackPathGraph(data);
    } catch {
      setAttackPathGraph(null);
    }
  }

  useEffect(() => {
    if (!token) return;
    loadProviders().catch(() => {});
    loadAttackCatalog().catch(() => {});
  }, [token]);

  useEffect(() => {
    loadHistory(providerId).catch(() => {});
    loadGraph(providerId, graphLabelFilter).catch(() => {});
  }, [providerId]);

  useEffect(() => {
    loadGraph(providerId, graphLabelFilter).catch(() => {});
  }, [graphLabelFilter]);

  useEffect(() => {
    if (!scanId) return;
    const t = setInterval(async () => {
      const res = await fetch(`${apiBase}/api/v1/deep-scan/${scanId}/`, { headers });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        if (data.state === "COMPLETED" || data.state === "FAILED") {
          clearInterval(t);
          loadHistory(providerId).catch(() => {});
        }
      }
    }, 2000);
    return () => clearInterval(t);
  }, [scanId, providerId, headers]);

  const selectedQuery = attackQueries.find((q) => q.id === selectedAttack) || null;
  const nodeTypes = useMemo(() => {
    const types = Array.from(new Set((graphData.nodes || []).map((n) => n.type).filter(Boolean)));
    types.sort();
    return types;
  }, [graphData]);

  const nodeAttackBadges = useMemo(() => {
    const map = {};
    for (const [qid, result] of Object.entries(attackResults)) {
      if (!result?.violated) continue;
      const pathNodeSet = new Set((attackPathGraph?.nodes || []).map((n) => n.id));
      for (const node of graphData.nodes || []) {
        if (pathNodeSet.has(node.id)) {
          if (!map[node.id]) map[node.id] = [];
          map[node.id].push(qid);
        }
      }
    }
    return map;
  }, [attackResults, attackPathGraph, graphData]);

  return (
    <div className="min-h-screen bg-slate-900 p-6 text-white">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Deep Scan</h1>
        <select
          value={providerId}
          onChange={(e) => setProviderId(e.target.value)}
          className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
        >
          <option value="">Select provider</option>
          {providers.map((p) => (
            <option key={p.id} value={String(p.id)}>
              {p.name || p.aws_account_id}
            </option>
          ))}
        </select>
        <button
          onClick={startScan}
          disabled={!providerId || loading}
          className="rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Starting..." : "Start Deep Scan"}
        </button>
      </div>

      {status && (
        <div className="mb-4 rounded border border-slate-700 bg-slate-800 p-3 text-sm">
          State: {status.state} | Progress: {status.progress ?? 0}% {status.scan_id ? `| Scan: ${status.scan_id}` : ""}
        </div>
      )}

      <div className="mb-4 flex items-center gap-2">
        <span className="text-xs text-slate-400">Filter graph by node type</span>
        <select
          value={graphLabelFilter}
          onChange={(e) => setGraphLabelFilter(e.target.value)}
          className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
        >
          <option value="">All</option>
          {nodeTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[35%_65%]">
        <AttackPathPanel
          queries={attackQueries}
          results={attackResults}
          onRunAll={runAllAttacks}
          onSelectQuery={selectAttack}
          selectedQueryId={selectedAttack}
          running={running}
        />

        <div className="space-y-4">
          {graphError ? (
            <div className="rounded border border-red-700/40 bg-red-900/20 p-3 text-sm text-red-300">{graphError}</div>
          ) : (
            <GraphCanvas
              graphData={graphData}
              attackPathGraph={attackPathGraph}
              selectedAttack={selectedAttack}
              onNodeClick={setDetailNode}
            />
          )}

          {selectedQuery && (
            <AttackPathDetail query={selectedQuery} graph={attackPathGraph} onNodeClick={setDetailNode} />
          )}
        </div>
      </div>

      {detailNode && (
        <div className="fixed right-0 top-0 z-50 h-full w-[380px] overflow-y-auto border-l border-slate-700 bg-slate-950 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">{detailNode.type || "Node"}</h3>
            <button onClick={() => setDetailNode(null)} className="text-xs text-slate-400 hover:text-white">
              Close
            </button>
          </div>
          <div className="mb-2 text-xs text-slate-400">ARN / ID</div>
          <div className="mb-4 break-all rounded bg-slate-900 p-2 text-xs">
            {detailNode.properties?.arn || detailNode.id}
          </div>

          <div className="mb-2 text-xs text-slate-400">Appears in attacks</div>
          <div className="mb-4 flex flex-wrap gap-1">
            {(nodeAttackBadges[detailNode.id] || []).map((qid) => (
              <span key={qid} className="rounded bg-red-900/50 px-2 py-0.5 text-[10px] text-red-300">
                {qid}
              </span>
            ))}
            {(nodeAttackBadges[detailNode.id] || []).length === 0 && (
              <span className="text-xs text-slate-500">None</span>
            )}
          </div>

          <div className="mb-2 text-xs text-slate-400">Properties</div>
          <div className="space-y-1">
            {Object.entries(detailNode.properties || {}).map(([k, v]) => (
              <div key={k} className="rounded bg-slate-900 p-2 text-xs">
                <span className="text-slate-400">{k}: </span>
                <span className="break-all text-slate-200">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 rounded border border-slate-700 bg-slate-800 p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-200">Recent scans</h2>
        {history.length === 0 ? (
          <div className="text-sm text-slate-400">No deep scans yet.</div>
        ) : (
          <div className="space-y-2">
            {history.map((h) => (
              <div key={h.scan_id} className="rounded border border-slate-700 p-2 text-xs">
                <div>{h.state}</div>
                <div className="text-slate-400">{h.scan_id}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
