import { Link } from "react-router-dom";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-semibold text-slate-800">Dashboard</h1>
      <p className="mb-4 text-slate-600">
        Inventory data will appear here after your first scan.
      </p>
      <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="mb-2 font-medium">How to run a scan</p>
        <ol className="list-inside list-decimal space-y-1">
          <li>Go to <strong>Providers</strong> and connect an AWS account (or use one already added).</li>
          <li>Click <strong>Test Connection</strong> and ensure it shows &quot;Connection verified&quot;.</li>
          <li>Click <strong>Run scan</strong> on that provider. The scan runs in the background.</li>
          <li>When the scan finishes, inventory data will show here on the Dashboard.</li>
        </ol>
      </div>
      <Link
        to="/providers"
        className="inline-block rounded bg-slate-800 px-4 py-2 text-white hover:bg-slate-700"
      >
        Go to Providers
      </Link>
    </div>
  );
}
