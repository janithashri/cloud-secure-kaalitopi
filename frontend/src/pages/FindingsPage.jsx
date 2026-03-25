import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { getFindings, getFindingsSummary } from "../api/findings";
import { triggerInventoryPull, getInventoryRuns } from "../api/inventory";
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
  const [filters, setFilters] = useState({ status: "OPEN", framework: "" });

  const [scanLoading, setScanLoading] = useState(false);
  const [scanPolling, setScanPolling] = useState(false);
  const [latestRun, setLatestRun] = useState(null);
  const [scanStartedAt, setScanStartedAt] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    api
      .get("/api/v1/providers/")
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data?.results || [];
        setProviders(list);
        if (!selectedProviderId && list.length) setSelectedProviderId(list[0].id);
      })
      .catch(() => setProviders([]));
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
        const list =
          data?.results ?? data?.data ?? (Array.isArray(data) ? data : []);
        setFindings(list);
      })
      .catch(() => setFindings([]))
      .finally(() => setLoadingFindings(false));
  }, [api, selectedProviderId, filters]);

  const fetchRuns = useCallback(() => {
    if (!selectedProviderId) return;
    return getInventoryRuns(api, selectedProviderId)
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.results || [];
        setLatestRun(list?.[0] || null);
      })
      .catch(() => setLatestRun(null));
  }, [api, selectedProviderId]);

  const runScan = useCallback(async () => {
    if (!selectedProviderId) return;
    setScanLoading(true);
    setScanPolling(true);
    setScanStartedAt(new Date().toISOString());
    setLatestRun(null);
    try {
      await triggerInventoryPull(api, selectedProviderId);
      await fetchRuns();
      // Give the worker a moment before the first poll tick
      setTimeout(fetchRuns, 1500);
    } catch (err) {
      setScanPolling(false);
      showToast("error", "Scan failed - check logs");
    } finally {
      setScanLoading(false);
    }
  }, [api, selectedProviderId, fetchRuns, showToast]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchFindings();
  }, [fetchFindings]);

  // Poll inventory runs every 5s while the latest run is running.
  useEffect(() => {
    if (!scanPolling || !selectedProviderId) return;
    const t = setInterval(() => {
      fetchRuns();
    }, 5000);
    return () => clearInterval(t);
  }, [scanPolling, selectedProviderId, fetchRuns]);

  // When the run finishes, refresh findings + show toast.
  useEffect(() => {
    if (!scanPolling) return;
    if (!latestRun) return;
    if (scanStartedAt && latestRun.started_at && latestRun.started_at < scanStartedAt) {
      return;
    }
    if (latestRun.state === "running") return;

    setScanPolling(false);
    fetchSummary();
    fetchFindings();

    if (latestRun.state === "completed" || latestRun.state === "partial") {
      showToast("success", "Scan complete - findings updated");
    } else {
      showToast("error", "Scan failed - check logs");
    }
  }, [scanPolling, latestRun?.state, latestRun?.started_at, scanStartedAt, fetchSummary, fetchFindings, showToast]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="text-2xl font-bold text-slate-800">Findings</h1>

      {toast && (
        <div
          className={[
            "mt-4 rounded border px-4 py-3 text-sm",
            toast.type === "success"
              ? "border-green-300 bg-green-50 text-green-800"
              : toast.type === "error"
                ? "border-red-300 bg-red-50 text-red-800"
                : "border-slate-300 bg-slate-50 text-slate-700",
          ].join(" ")}
        >
          {toast.message}
        </div>
      )}

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

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <select
          value={filters.status || ""}
          onChange={(e) =>
            setFilters((f) => ({ ...f, status: e.target.value || undefined }))
          }
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="OPEN">Open</option>
          <option value="SUPPRESSED">Suppressed</option>
          <option value="RESOLVED">Resolved</option>
          <option value="">All</option>
        </select>
        <select
          value={filters.severity || ""}
          onChange={(e) =>
            setFilters((f) => ({ ...f, severity: e.target.value || undefined }))
          }
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        <select
          value={filters.framework || ""}
          onChange={(e) =>
            setFilters((f) => ({ ...f, framework: e.target.value }))
          }
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All frameworks</option>
          <option value="CIS">CIS</option>
          <option value="DPDP">DPDP</option>
          <option value="RBI">RBI</option>
          <option value="SBE">SBE</option>
        </select>
        <select
          value={filters.resource_type || ""}
          onChange={(e) =>
            setFilters((f) => ({ ...f, resource_type: e.target.value || undefined }))
          }
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All resources</option>
          {Object.keys(summary?.by_resource_type || {})
            .sort()
            .map((rt) => (
              <option key={rt} value={rt}>
                {rt}
              </option>
            ))}
        </select>

        <button
          type="button"
          onClick={() => {
            fetchSummary();
            fetchFindings();
          }}
          className="rounded bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-600"
        >
          Refresh
        </button>
        <button
          type="button"
          onClick={runScan}
          disabled={!selectedProviderId || scanLoading || scanPolling}
          className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-500 disabled:opacity-50"
        >
          {scanLoading || scanPolling ? "Running scan..." : "Run Scan"}
        </button>
      </div>

      <div className="mt-4">
        <RulesViolatedTable
          findings={findings}
          loading={loadingFindings}
          onSuppress={() => {
            fetchFindings();
            fetchSummary();
          }}
          filters={filters}
          onFilterChange={setFilters}
        />
      </div>
    </div>
  );
}
