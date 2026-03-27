import React, { useState } from 'react';
import { 
  GlobeAltIcon, 
  ArrowPathIcon, 
  ExclamationTriangleIcon, 
  ShieldCheckIcon,
  ShieldExclamationIcon,
  ExclamationCircleIcon,
  InformationCircleIcon 
} from '@heroicons/react/24/outline';
import VulnerabilityCard from './VulnerabilityCard';

const IacScanner = () => {
  const [githubUrl, setGithubUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  const triggerScan = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResults([]);
    setError('');

    // Basic Validation
    if (!githubUrl.includes("github.com")) {
      setError("Please enter a valid GitHub repository URL.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/iac/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: githubUrl }),
      });

      const data = await response.json();
      console.log("Scan response:", data); // Debug log
      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to complete scan.");
      }

      // tfsec returns results in data.results
      setResults(data.results.results || []);
    } catch (err) {
      setError(err.message || "Backend connection failed. Check if your Flask server is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header Section */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-extrabold mb-4">Secure your Infrastructure</h1>
        <p className="text-slate-400">Enter a public GitHub repository URL to scan Terraform files for security vulnerabilities.</p>
      </div>

      {/* Input Form Section */}
      <form onSubmit={triggerScan} className="bg-slate-800 p-6 rounded-xl shadow-2xl border border-slate-700">
        <div className="flex flex-col gap-4">
          <label className="text-sm font-medium text-slate-300">GitHub Repository URL</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <GlobeAltIcon className="h-5 w-5 text-slate-500" />
            </div>
            <input
              type="text"
              placeholder="https://github.com/username/project"
              className="block w-full pl-10 pr-3 py-3 bg-slate-900 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-white"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition ${
              loading ? 'bg-slate-700 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/20'
            }`}
          >
            {loading ? (
              <>
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                Scanning Repository...
              </>
            ) : (
              'Start IaC Scan'
            )}
          </button>
        </div>
      </form>

      {/* --- RESULTS SECTION --- */}
      <div className="mt-10 space-y-8">
        
        {/* 1. Loading State Skeleton */}
        {loading && (
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-800 rounded w-1/4"></div>
            <div className="h-32 bg-slate-800 rounded-xl"></div>
            <div className="h-32 bg-slate-800 rounded-xl"></div>
          </div>
        )}

        {/* 2. Error Message */}
        {error && (
          <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-xl text-red-200 flex items-center gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* 3. Main Results Display */}
        {!loading && results.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Summary Stats Bar */}
            <div className="flex flex-wrap gap-4 mb-8">
              <div className="flex-1 bg-slate-800/50 border border-slate-700 p-4 rounded-xl text-center">
                <p className="text-slate-500 text-xs uppercase tracking-wider font-bold">Total Issues</p>
                <p className="text-2xl font-mono text-white">{results.length}</p>
              </div>
              <div className="flex-1 bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-center">
                <p className="text-red-500 text-xs uppercase tracking-wider font-bold">High Risk</p>
                <p className="text-2xl font-mono text-red-500">
                  {results.filter(r => r.severity === 'HIGH').length}
                </p>
              </div>
              <div className="flex-1 bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl text-center">
                <p className="text-yellow-500 text-xs uppercase tracking-wider font-bold">Medium Risk</p>
                <p className="text-2xl font-mono text-yellow-500">
                  {results.filter(r => r.severity === 'MEDIUM').length}
                </p>
              </div>
            </div>

            {/* Vulnerability List Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  Detailed Findings
                  <span className="text-sm font-normal text-slate-500">(tfsec analysis)</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {results.map((issue, index) => (
                  <VulnerabilityCard key={index} issue={issue} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 4. Success State (No vulnerabilities found) */}
        {!loading && results.length === 0 && !error && githubUrl && (
          <div className="text-center py-16 bg-slate-800/20 border-2 border-dashed border-slate-800 rounded-3xl">
            <div className="bg-green-500/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheckIcon className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-white">Infrastructure looks secure!</h3>
            <p className="text-slate-500 max-w-xs mx-auto mt-2">
              No critical misconfigurations were detected in the .tf files.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default IacScanner;