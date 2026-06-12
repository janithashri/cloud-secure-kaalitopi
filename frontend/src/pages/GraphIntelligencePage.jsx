/**
 * GraphIntelligencePage
 *
 * Displays graph-analytics results (escalated findings + shadow risks)
 * produced by the Graph Intelligence pipeline that runs after Deep Scan.
 *
 * Layout mirrors DeepScanPage: provider selector at the top, action button,
 * summary cards, then two data tables with sort + filter controls.
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { getGraphIntelligence, runGraphAnalysis } from "../api/graphIntelligence";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncate(str, max = 40) {
  if (!str) return "—";
  return str.length > max ? str.slice(0, max) + "…" : str;
}

function fmtHops(v) {
  return v >= 99 ? "∞" : String(v);
}

const SEVERITY_ORDER = ["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"];

const SEVERITY_COLOR = {
  CRITICAL: "text-red-400",
  HIGH:     "text-orange-400",
  MEDIUM:   "text-yellow-400",
  LOW:      "text-slate-400",
  INFO:     "text-slate-500",
};

const SEVERITY_BG = {
  CRITICAL: "bg-red-500/10 text-red-400",
  HIGH:     "bg-orange-500/10 text-orange-400",
  MEDIUM:   "bg-yellow-500/10 text-yellow-400",
  LOW:      "bg-slate-700 text-slate-400",
  INFO:     "bg-slate-700 text-slate-500",
};

const REASON_CHIP = {
  high_centrality:    "bg-purple-500/20 text-purple-300",
  chokepoint:         "bg-orange-500/20 text-orange-300",
  internet_exposed:   "bg-red-500/20 text-red-300",
  large_blast_radius: "bg-yellow-500/20 text-yellow-300",
  dense_zone:         "bg-slate-600 text-slate-300",
  bridge_node:        "bg-blue-500/20 text-blue-300",
};

function reasonLabel(reason, node) {
  switch (reason) {
    case "high_centrality":    return "High Centrality";
    case "chokepoint":         return "Chokepoint";
    case "internet_exposed":   return "Internet Exposed";
    case "large_blast_radius": return `Blast Radius: ${node?.community_size ?? ""}`;
    case "dense_zone":         return "Dense Zone";
    case "bridge_node":        return "Bridge Node";
    default:                   return reason;
  }
}

// ---------------------------------------------------------------------------
// Sort buttons — separate ▲ ▼ per column, independently clickable
// ---------------------------------------------------------------------------
function SortButtons({ col, sortCol, sortDir, onSort }) {
  const activeUp   = sortCol === col && sortDir === "asc";
  const activeDown = sortCol === col && sortDir === "desc";
  return (
    <span className="ml-1.5 inline-flex flex-col gap-0" style={{ lineHeight: 1, verticalAlign: "middle" }}>
      <button
        onClick={(e) => { e.stopPropagation(); onSort(col, "asc"); }}
        className={`text-[9px] leading-none transition-colors ${
          activeUp ? "text-emerald-400" : "text-slate-600 hover:text-slate-300"
        }`}
        title="Sort ascending"
      >▲</button>
      <button
        onClick={(e) => { e.stopPropagation(); onSort(col, "desc"); }}
        className={`text-[9px] leading-none transition-colors ${
          activeDown ? "text-emerald-400" : "text-slate-600 hover:text-slate-300"
        }`}
        title="Sort descending"
      >▼</button>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Summary card
// ---------------------------------------------------------------------------
function SummaryCard({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 truncate text-2xl font-bold text-white" title={sub || undefined}>
        {value}
      </p>
      {sub && <p className="mt-0.5 truncate text-xs text-slate-500" title={sub}>{sub}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// GDS unavailable banner
// ---------------------------------------------------------------------------
function GdsBanner() {
  return (
    <div className="rounded-xl border border-yellow-700/40 bg-yellow-900/20 px-5 py-4 text-yellow-300 text-sm">
      <strong className="font-semibold">Graph Data Science plugin not detected.</strong>
      {" "}Graph Intelligence requires the Neo4j Graph Data Science (GDS) plugin.
      Install GDS on your Neo4j instance to enable this feature.
    </div>
  );
}

// ---------------------------------------------------------------------------
// Escalated Findings table — with sort + filter
// ---------------------------------------------------------------------------

const SORT_COLS = {
  arn:                    (n) => n.arn,
  resource_type:          (n) => n.resource_type || "",
  original_severity:      (n) => SEVERITY_ORDER.indexOf(n.original_severity),
  graph_adjusted_severity:(n) => SEVERITY_ORDER.indexOf(n.graph_adjusted_severity),
  pagerank_score:         (n) => n.pagerank_score,
  betweenness_score:      (n) => n.betweenness_score,
  hops_from_internet:     (n) => n.hops_from_internet,
  community_size:         (n) => n.community_size,
  core_value:             (n) => n.core_value,
};

function EscalatedFindingsTable({ nodes }) {
  const [expanded,  setExpanded]  = useState(null);
  const [sortCol,   setSortCol]   = useState("graph_adjusted_severity");
  const [sortDir,   setSortDir]   = useState("desc");

  // Filters
  const [filterSeverity,  setFilterSeverity]  = useState("ALL");
  const [filterType,      setFilterType]      = useState("ALL");
  const [filterHops,      setFilterHops]      = useState("ALL");   // ALL | finite | internet
  const [filterEscalated, setFilterEscalated] = useState(false);   // show only escalated

  // Unique resource types for the dropdown
  const resourceTypes = useMemo(
    () => ["ALL", ...Array.from(new Set(nodes.map((n) => n.resource_type).filter(Boolean))).sort()],
    [nodes]
  );

  // Apply filters
  const filtered = useMemo(() => {
    return nodes.filter((n) => {
      if (filterEscalated && n.graph_adjusted_severity === n.original_severity) return false;
      if (filterSeverity !== "ALL" && n.graph_adjusted_severity !== filterSeverity) return false;
      if (filterType !== "ALL" && n.resource_type !== filterType) return false;
      if (filterHops === "finite" && n.hops_from_internet >= 99) return false;
      if (filterHops === "internet" && n.hops_from_internet > 2) return false;
      return true;
    });
  }, [nodes, filterEscalated, filterSeverity, filterType, filterHops]);

  // Apply sort
  const sorted = useMemo(() => {
    const accessor = SORT_COLS[sortCol] || ((n) => n.arn);
    return [...filtered].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortCol, sortDir]);

  function handleSort(col, dir) {
    if (dir) {
      // Called from a specific ▲ or ▼ button
      setSortCol(col);
      setSortDir(dir);
    } else if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("desc");
    }
  }

  const thClass = "px-4 py-3 select-none whitespace-nowrap";

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
        {/* Escalated only toggle */}
        <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={filterEscalated}
            onChange={(e) => setFilterEscalated(e.target.checked)}
            className="rounded border-slate-600 bg-slate-800 accent-emerald-500"
          />
          Escalated only
        </label>

        <div className="h-4 w-px bg-slate-700" />

        {/* Severity filter */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">Severity</span>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Resource type filter */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">Type</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {resourceTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Hops filter */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">Hops</span>
          <select
            value={filterHops}
            onChange={(e) => setFilterHops(e.target.value)}
            className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">All</option>
            <option value="finite">Reachable from Internet</option>
            <option value="internet">≤ 2 hops (Internet exposed)</option>
          </select>
        </div>

        <div className="ml-auto text-xs text-slate-500">
          {sorted.length} / {nodes.length} nodes
        </div>
      </div>

      {/* Table */}
      {sorted.length === 0 ? (
        <p className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-6 text-center text-sm text-slate-500">
          No findings match the current filters.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <th className={thClass}>
                  Resource <SortButtons col="arn" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className={thClass}>
                  Type <SortButtons col="resource_type" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className={thClass}>
                  Severity <SortButtons col="graph_adjusted_severity" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-4 py-3 whitespace-nowrap">Reasons</th>
                <th className={thClass}>
                  PageRank <SortButtons col="pagerank_score" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className={thClass}>
                  Betweenness <SortButtons col="betweenness_score" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className={thClass}>
                  Hops <SortButtons col="hops_from_internet" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className={thClass}>
                  Blast Radius <SortButtons col="community_size" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className={thClass}>
                  K-Core <SortButtons col="core_value" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                </th>
                <th className="px-4 py-3">
                  Bridge <SortButtons col="is_bridge" sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950">
              {sorted.map((node) => {
                const isOpen = expanded === node.arn;
                return (
                  <>
                    <tr
                      key={node.arn}
                      className="cursor-pointer hover:bg-slate-900/60 transition"
                      onClick={() => setExpanded(isOpen ? null : node.arn)}
                    >
                      {/* Resource */}
                      <td className="px-4 py-3">
                        <span title={node.arn} className="font-mono text-slate-300">
                          {truncate(node.arn, 40)}
                        </span>
                      </td>
                      {/* Type */}
                      <td className="px-4 py-3 text-slate-400">{node.resource_type || "—"}</td>
                      {/* Severity */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`font-medium ${SEVERITY_COLOR[node.original_severity] || "text-slate-400"}`}>
                          {node.original_severity}
                        </span>
                        {node.graph_adjusted_severity !== node.original_severity && (
                          <>
                            {" → "}
                            <span className={`font-bold ${SEVERITY_COLOR[node.graph_adjusted_severity] || "text-white"}`}>
                              {node.graph_adjusted_severity}
                            </span>
                          </>
                        )}
                      </td>
                      {/* Reasons */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {node.escalation_reasons.length > 0 ? node.escalation_reasons.map((r) => (
                            <span
                              key={r}
                              className={`rounded px-1.5 py-0.5 text-xs font-medium ${REASON_CHIP[r] || "bg-slate-700 text-slate-300"}`}
                            >
                              {reasonLabel(r, node)}
                            </span>
                          )) : <span className="text-slate-600">—</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-300">{node.pagerank_score.toFixed(4)}</td>
                      <td className="px-4 py-3 font-mono text-slate-300">{node.betweenness_score.toFixed(1)}</td>
                      {/* Hops — colour-coded */}
                      <td className="px-4 py-3 font-mono font-semibold">
                        {node.hops_from_internet >= 99 ? (
                          <span className="text-slate-500">∞</span>
                        ) : node.hops_from_internet <= 2 ? (
                          <span className="text-red-400">{node.hops_from_internet}</span>
                        ) : (
                          <span className="text-yellow-400">{node.hops_from_internet}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-300">{node.community_size}</td>
                      <td className="px-4 py-3 font-mono text-slate-300">{node.core_value}</td>
                      <td className="px-4 py-3 font-medium">
                        {node.is_bridge
                          ? <span className="text-red-400">Yes</span>
                          : <span className="text-slate-500">No</span>}
                      </td>
                    </tr>

                    {/* Expanded detail row */}
                    {isOpen && (
                      <tr key={`${node.arn}-detail`} className="bg-slate-900/80">
                        <td colSpan={10} className="px-6 py-5">
                          <div className="space-y-3">
                            {/* Full ARN */}
                            <div>
                              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">ARN</span>
                              <p className="mt-0.5 break-all font-mono text-sm text-slate-200">{node.arn}</p>
                            </div>

                            {/* Graph scores grid */}
                            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                              {[
                                ["PageRank",    node.pagerank_score.toFixed(4)],
                                ["Betweenness", node.betweenness_score.toFixed(1)],
                                ["Hops",        fmtHops(node.hops_from_internet)],
                                ["Community",   node.community_size],
                                ["K-Core",      node.core_value],
                                ["Bridge",      node.is_bridge ? "Yes" : "No"],
                              ].map(([k, v]) => (
                                <div key={k} className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
                                  <p className="text-xs text-slate-500">{k}</p>
                                  <p className="text-sm font-semibold text-slate-200">{v}</p>
                                </div>
                              ))}
                            </div>

                            {/* Explanation */}
                            <p className="text-sm text-slate-300">
                              This <strong>{node.resource_type}</strong> was{" "}
                              {node.graph_adjusted_severity !== node.original_severity ? (
                                <>
                                  escalated from{" "}
                                  <span className={`font-semibold ${SEVERITY_COLOR[node.original_severity]}`}>
                                    {node.original_severity}
                                  </span>{" "}
                                  to{" "}
                                  <span className={`font-semibold ${SEVERITY_COLOR[node.graph_adjusted_severity]}`}>
                                    {node.graph_adjusted_severity}
                                  </span>{" "}
                                  because: {node.escalation_reasons.join(", ")}.
                                </>
                              ) : (
                                <>scored at <span className={`font-semibold ${SEVERITY_COLOR[node.original_severity]}`}>{node.original_severity}</span> with no graph escalation.</>
                              )}
                            </p>

                            {/* Rule */}
                            {node.rule_id && (
                              <p className="text-sm text-slate-400">
                                Rule that fired:{" "}
                                <span className="text-slate-200">{node.rule_name}</span>{" "}
                                <span className="font-mono text-slate-500">({node.rule_id})</span>
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shadow Risks table
// ---------------------------------------------------------------------------
function ShadowRisksTable({ risks }) {
  const [expanded, setExpanded] = useState(null);

  return (
    <div className="space-y-3">
      {/* Info banner */}
      <div className="rounded-xl border border-blue-700/30 bg-blue-900/10 px-4 py-3 text-blue-300 text-sm">
        These resources have no active findings but share misconfiguration
        attribute patterns with resources that failed compliance checks.
        This is a predictive signal — no rule has fired on these resources yet.
      </div>

      {risks.length === 0 ? (
        <p className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-6 text-center text-sm text-slate-500">
          No shadow risks detected.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Resource</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Similarity</th>
                <th className="px-4 py-3">Matched Rule</th>
                <th className="px-4 py-3">Matched Resource</th>
                <th className="px-4 py-3">Attributes Matched</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950">
              {risks.map((risk) => {
                const isOpen = expanded === risk.arn;
                const pct = Math.round((risk.violation_similarity_score || 0) * 100);
                const barColor = pct >= 90 ? "bg-red-500" : "bg-orange-400";

                return (
                  <>
                    <tr
                      key={risk.arn}
                      className="cursor-pointer hover:bg-slate-900/60 transition"
                      onClick={() => setExpanded(isOpen ? null : risk.arn)}
                    >
                      <td className="px-4 py-3">
                        <span title={risk.arn} className="font-mono text-slate-300">
                          {truncate(risk.arn, 40)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{risk.resource_type || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded-full bg-slate-800">
                            <div
                              className={`h-2 rounded-full ${barColor}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className={`text-xs font-semibold ${pct >= 90 ? "text-red-400" : "text-orange-400"}`}>
                            {pct}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-400">
                        {risk.matched_rule_id || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span title={risk.matched_resource_arn} className="font-mono text-slate-400">
                          {truncate(risk.matched_resource_arn, 35) || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {risk.matching_attributes && risk.matching_attributes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {risk.matching_attributes.map((a) => (
                              <span key={a} className="rounded bg-slate-700 px-1.5 py-0.5 text-xs text-slate-300">
                                {a}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                    </tr>

                    {isOpen && (
                      <tr key={`${risk.arn}-detail`} className="bg-slate-900/80">
                        <td colSpan={6} className="px-6 py-5">
                          <div className="space-y-3">
                            <div>
                              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">ARN</span>
                              <p className="mt-0.5 break-all font-mono text-sm text-slate-200">{risk.arn}</p>
                            </div>
                            <p className="text-sm text-slate-300">
                              This resource is not flagged by any rule, but{" "}
                              <strong>{pct}%</strong> of its security attributes match those of{" "}
                              <span className="font-mono text-slate-400">{risk.matched_resource_arn || "a flagged resource"}</span>
                              {risk.matched_rule_id
                                ? <>, which failed <span className="font-mono text-slate-400">{risk.matched_rule_id}</span>.</>
                                : "."}
                            </p>
                            {risk.matching_attributes && risk.matching_attributes.length > 0 && (
                              <div>
                                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">
                                  Matching attributes
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {risk.matching_attributes.map((a) => (
                                    <span key={a} className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-300">
                                      {a}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------
export default function GraphIntelligencePage() {
  const { api } = useAuth();

  const [providers, setProviders]       = useState([]);
  const [providerId, setProviderId]     = useState("");
  const [data, setData]                 = useState(null);
  const [loading, setLoading]           = useState(false);
  const [running, setRunning]           = useState(false);
  const [error, setError]               = useState(null);

  // Load provider list on mount
  useEffect(() => {
    api
      .get("/api/v1/providers/")
      .then((res) => {
        const list = res.data?.providers || res.data || [];
        setProviders(list);
        if (list.length > 0 && !providerId) {
          setProviderId(String(list[0].id));
        }
      })
      .catch(() => {});
  }, [api]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch results whenever providerId changes
  const fetchData = useCallback(() => {
    if (!providerId) return;
    setLoading(true);
    setError(null);
    getGraphIntelligence(api, providerId)
      .then((d) => setData(d))
      .catch((e) => setError(e?.response?.data?.error || "Failed to load graph intelligence data."))
      .finally(() => setLoading(false));
  }, [api, providerId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Trigger an on-demand run
  const handleRun = () => {
    if (!providerId || running) return;
    setRunning(true);
    setError(null);
    runGraphAnalysis(api, providerId)
      .then(() => {
        setTimeout(fetchData, 3000);
      })
      .catch((e) => {
        setError(e?.response?.data?.error || "Failed to start graph analysis.");
      })
      .finally(() => setRunning(false));
  };

  const summary  = data?.summary  || {};
  const hiNodes  = data?.high_risk_nodes || [];
  const shadows  = data?.shadow_risks    || [];
  const hasData  = hiNodes.length > 0 || shadows.length > 0;
  const gdsOk    = summary.gds_available === true;

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white">
      {/* ------------------------------------------------------------------ */}
      {/* Top bar                                                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Graph Intelligence</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Graph-driven risk escalation and shadow risk detection
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Provider selector */}
          <select
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
          >
            {providers.length === 0 && (
              <option value="">No providers</option>
            )}
            {providers.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.name || p.aws_account_id || `Provider ${p.id}`}
              </option>
            ))}
          </select>

          {/* Run button */}
          <button
            onClick={handleRun}
            disabled={!providerId || running}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {running ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Running…
              </>
            ) : (
              "Run Graph Analysis"
            )}
          </button>
        </div>
      </div>

      {/* Last run timestamp */}
      {summary.last_run_timestamp && (
        <p className="mb-4 text-xs text-slate-500">
          Last run: {new Date(summary.last_run_timestamp).toLocaleString()}
        </p>
      )}

      {/* Error banner */}
      {error && (
        <div className="mb-4 rounded-xl border border-red-700/40 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-24 text-slate-500 text-sm">
          <svg className="mr-2 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Loading graph intelligence data…
        </div>
      )}

      {!loading && (
        <>
          {/* GDS unavailable banner */}
          {!gdsOk && <div className="mb-6"><GdsBanner /></div>}

          {/* Summary cards */}
          {data && (
            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <SummaryCard label="High Risk Nodes" value={summary.total_high_risk_nodes ?? 0} />
              <SummaryCard label="Escalated Findings" value={summary.total_escalated ?? 0} />
              <SummaryCard label="Shadow Risks" value={summary.total_shadow_risks ?? 0} />
              <SummaryCard
                label="Most Dangerous Node"
                value={truncate(summary.most_dangerous_node_arn || "—", 22)}
                sub={summary.most_dangerous_node_arn || undefined}
              />
            </div>
          )}

          {/* Empty state */}
          {!hasData && !error && gdsOk && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-12 text-center text-slate-500">
              <p className="text-sm">
                GDS is installed. Run a <strong className="text-slate-300">Deep Scan</strong> first
                (from the Deep Scan page), then click <strong className="text-slate-300">Run Graph Analysis</strong> above
                to populate graph intelligence data.
              </p>
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Escalated Findings table                                         */}
          {/* ---------------------------------------------------------------- */}
          {hasData && (
            <section className="mb-8">
              <h2 className="mb-3 text-lg font-semibold text-white">Escalated Findings</h2>
              <EscalatedFindingsTable nodes={hiNodes} />
            </section>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Shadow Risks table                                                */}
          {/* ---------------------------------------------------------------- */}
          {hasData && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">Shadow Risks</h2>
              <ShadowRisksTable risks={shadows} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
