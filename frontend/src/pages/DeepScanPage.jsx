import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function DeepScanPage() {
  const { token } = useAuth();
  const [providers, setProviders] = useState([]);
  const [providerId, setProviderId] = useState("");
  const [scanId, setScanId] = useState(null);
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    if (!token) return;
    loadProviders().catch(() => {});
  }, [token]);

  useEffect(() => {
    loadHistory(providerId).catch(() => {});
  }, [providerId]);

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

  return (
    <div className="min-h-screen bg-slate-900 p-6 text-white">
      <h1 className="text-2xl font-bold">Deep Scan</h1>
      <p className="mt-1 text-sm text-slate-400">Run full graph-based deep infrastructure scan.</p>
      <div className="mt-4 flex items-center gap-3">
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
        <div className="mt-5 rounded border border-slate-700 bg-slate-800 p-4">
          <div className="text-sm">State: {status.state}</div>
          <div className="text-sm">Progress: {status.progress ?? 0}%</div>
          {status.scan_id && <div className="text-xs text-slate-400">Scan: {status.scan_id}</div>}
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
