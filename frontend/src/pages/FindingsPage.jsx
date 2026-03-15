import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { getFindings, getFindingsSummary } from "../api/findings";
import FindingsSummary from "../components/FindingsSummary";
import RulesViolatedTable from "../components/RulesViolatedTable";

export default function FindingsPage() {
  const { api } = useAuth();
  const [providers, setProviders] = useState([]);
  const [selectedProviderId, setSelectedProviderId] = useState(null);
  const [summary, setSummary] = useState(null);
  const [findings, setFindings] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingFindings, setLoadingFindings] = useState(false);
  const [filters, setFilters] = useState({ status: "OPEN" });

  useEffect(() => {
    api.get("/api/v1/providers/").then(({ data }) => {
      const list = Array.isArray(data) ? data : data?.results || [];
      setProviders(list);
      if (!selectedProviderId && list.length) setSelectedProviderId(list[0].id);
    }).catch(() => setProviders([]));
  }, [api]);

  const fetchSummary = useCallback(() => {
    if (!selectedProviderId) return;
    setLoadingSummary(true);
    getFindingsSummary(api, selectedProviderId)
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoadingSummary(false));
  }, [api, selectedProviderId]);

  const fetchFindings = useCallback(() => {
    if (!selectedProviderId) return;
    setLoadingFindings(true);
    getFindings(api, selectedProviderId, filters)
      .then((data) => {
        const list = data?.results ?? data?.data ?? (Array.isArray(data) ? data : []);
        setFindings(list);
      })
      .catch(() => setFindings([]))
      .finally(() => setLoadingFindings(false));
  }, [api, selectedProviderId, filters]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchFindings();
  }, [fetchFindings]);

  // Poll every 5s while a scan might be running (optional: check run state)
  useEffect(() => {
    const t = setInterval(() => {
      if (selectedProviderId) fetchSummary();
    }, 5000);
    return () => clearInterval(t);
  }, [selectedProviderId, fetchSummary]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="text-2xl font-bold text-slate-800">Findings</h1>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="text-sm font-medium text-slate-600">Provider</label>
        <select
          value={selectedProviderId ?? ""}
          onChange={(e) => setSelectedProviderId(Number(e.target.value) || null)}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Select provider</option>
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name || p.aws_account_id}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6">
        <FindingsSummary summary={summary} />
      </div>

      <div className="mt-6 flex flex-wrap gap-4">
        <select
          value={filters.status || ""}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined }))}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="OPEN">Open</option>
          <option value="SUPPRESSED">Suppressed</option>
          <option value="RESOLVED">Resolved</option>
          <option value="">All</option>
        </select>
        <select
          value={filters.severity || ""}
          onChange={(e) => setFilters((f) => ({ ...f, severity: e.target.value || undefined }))}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <button
          type="button"
          onClick={() => { fetchSummary(); fetchFindings(); }}
          className="rounded bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-600"
        >
          Refresh
        </button>
      </div>

      <div className="mt-4">
        <RulesViolatedTable
          findings={findings}
          loading={loadingFindings}
          onSuppress={() => { fetchFindings(); fetchSummary(); }}
          filters={filters}
          onFilterChange={setFilters}
        />
      </div>
    </div>
  );
}
