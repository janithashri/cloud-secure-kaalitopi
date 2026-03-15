import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ProviderCard from "../components/ProviderCard";

export default function ProvidersPage() {
  const { api } = useAuth();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/api/v1/providers/")
      .then(({ data }) => setProviders(data))
      .catch((err) => setError(err.response?.data?.detail || "Failed to load providers"))
      .finally(() => setLoading(false));
  }, [api]);

  const refreshProvider = (id, updates) => {
    setProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  const removeProvider = (id) => {
    setProviders((prev) => prev.filter((p) => p.id !== id));
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-slate-600">Loading providers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Providers</h1>
        <Link
          to="/connect"
          className="rounded bg-slate-800 px-4 py-2 text-white hover:bg-slate-700"
        >
          Connect New Account
        </Link>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">AWS Account ID</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Connection Verified</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Last scan</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">Last Tested</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {providers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No providers yet. Connect an AWS account to get started.
                </td>
              </tr>
            ) : (
              providers.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  onUpdate={(updates) => refreshProvider(provider.id, updates)}
                  onDelete={() => removeProvider(provider.id)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
