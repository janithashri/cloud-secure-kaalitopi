import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ConnectionTestButton from "../components/ConnectionTestButton";
import IAMInstructions from "../components/IAMInstructions";

export default function ConnectPage() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [awsAccountId, setAwsAccountId] = useState("");
  const [inventoryRoleName, setInventoryRoleName] = useState("CloudSecureRole");
  const [providerId, setProviderId] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);

  const handleTestConnection = useCallback(async () => {
    setTestResult(null);
    try {
      let id = providerId;
      if (!id) {
        const { data } = await api.post("/api/v1/providers/", {
          name: name || "Unnamed",
          aws_account_id: awsAccountId,
          inventory_role_name: inventoryRoleName,
        });
        id = data.id;
        setProviderId(id);
      } else {
        await api.patch(`/api/v1/providers/${id}/`, {
          name: name || "Unnamed",
          aws_account_id: awsAccountId,
          inventory_role_name: inventoryRoleName,
        });
      }
      const { data } = await api.post(`/api/v1/providers/${id}/test-connection/`);
      setTestResult({ success: true, ...data });
    } catch (err) {
      setTestResult({
        success: false,
        message: err.response?.data?.message || err.message || "Connection failed",
      });
    }
  }, [api, providerId, name, awsAccountId, inventoryRoleName]);

  const handleSave = async () => {
    if (!testResult?.success) return;
    setSaveLoading(true);
    try {
      navigate("/providers");
    } finally {
      setSaveLoading(false);
    }
  };

  const validAccountId = /^\d{12}$/.test(awsAccountId);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-slate-800">Connect AWS Account</h1>
      <div className="space-y-4 rounded-lg bg-white p-6 shadow">
        <div>
          <label className="block text-sm font-medium text-slate-700">Provider Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            placeholder="My AWS Account"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">AWS Account ID</label>
          <input
            type="text"
            value={awsAccountId}
            onChange={(e) => setAwsAccountId(e.target.value.replace(/\D/g, "").slice(0, 12))}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-mono"
            placeholder="123456789012"
            maxLength={12}
          />
          {awsAccountId && !validAccountId && (
            <p className="mt-1 text-sm text-amber-600">Must be exactly 12 digits</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">IAM Role Name</label>
          <input
            type="text"
            value={inventoryRoleName}
            onChange={(e) => setInventoryRoleName(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </div>
        <ConnectionTestButton
          onTest={handleTestConnection}
          testResult={testResult}
          disabled={!validAccountId}
        />
        {testResult?.success && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saveLoading}
            className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-500 disabled:opacity-50"
          >
            Save & go to Providers
          </button>
        )}
      </div>
      <IAMInstructions
        cloudSecureAccountId={awsAccountId || "YOUR_CLOUDSECURE_ACCOUNT_ID"}
      />
    </div>
  );
}
