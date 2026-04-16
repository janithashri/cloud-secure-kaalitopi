

// import React, { useState, useEffect } from "react";
// import { useAuth } from "../context/AuthContext"; // Ensure this matches your project
// import {
//   GlobeAltIcon,
//   ArrowPathIcon,
//   ExclamationTriangleIcon,
//   ExclamationCircleIcon,
//   InformationCircleIcon,
//   ShieldCheckIcon,
//   ArrowDownTrayIcon,
//   SparklesIcon
// } from "@heroicons/react/24/outline";

// const VulnerabilityCard = ({ issue }) => {
//   const severity = issue.severity.toUpperCase();
//   const severityMap = {
//     CRITICAL: { color: "red", icon: <ExclamationTriangleIcon className="w-5 h-5" /> },
//     HIGH: { color: "red", icon: <ExclamationTriangleIcon className="w-5 h-5" /> },
//     MEDIUM: { color: "yellow", icon: <ExclamationCircleIcon className="w-5 h-5" /> },
//     LOW: { color: "blue", icon: <InformationCircleIcon className="w-5 h-5" /> },
//   };

//   const { color, icon } = severityMap[severity] || severityMap["LOW"];

//   return (
//     <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl space-y-4 hover:border-slate-600 transition-colors">
//       <div className="flex items-center justify-between gap-4">
//         <h4 className="text-lg font-bold text-white leading-tight">
//           {issue.rule_id}: {issue.description}
//         </h4>
//         <div className={`flex items-center gap-2 px-3 py-1 rounded-full border border-${color}-500/30 bg-${color}-500/10 text-${color}-400 text-sm font-semibold whitespace-nowrap`}>
//           {icon} {severity}
//         </div>
//       </div>

//       <div className="text-slate-400 text-sm font-mono bg-slate-800/50 p-2 rounded">
//         {issue.file_path} : Line {issue.line_number}
//       </div>

//       {issue.suggested_fix && (
//         <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
//           <div className="flex items-center gap-2 mb-2 text-emerald-400 font-bold">
//             <SparklesIcon className="w-4 h-4" />
//             AI Remediation Fix
//           </div>
//           <pre className="text-slate-300 text-sm whitespace-pre-wrap font-mono overflow-x-auto">
//             {issue.suggested_fix}
//           </pre>
//         </div>
//       )}
//     </div>
//   );
// };

// const IacScanner = () => {
//   const { api } = useAuth(); // Using your authenticated Axios instance
//   const [githubUrl, setGithubUrl] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [results, setResults] = useState([]);
//   const [scanStatus, setScanStatus] = useState(null); // 'cached', 'started', 'completed'
//   const [error, setError] = useState("");

//   const triggerScan = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     setResults([]);
//     setError("");
//     console.log("Triggering scan for:", githubUrl);
//     if (!githubUrl.includes("github.com")) {
//       setError("Please enter a valid GitHub repository URL.");
//       setLoading(false);
//       return;
//     }

//     try {
//       // 1. Call Django Backend
//       const { data } = await api.post("/api/v1/iac/scan/", { repo_url: githubUrl });
//       console.log("Scan response from backend:", data);
//       if (data.status === "completed") {
//         // Immediate Fetch worked!
//         setResults(data.findings);
//         setScanStatus("completed");
//       } else {
//         // Scan started in background (Celery)
//         setScanStatus("started");
//         // In a real app, you'd poll an endpoint here or use WebSockets
//         alert("Scan initiated! Check your dashboard in a few minutes.");
//       }
//     } catch (err) {
//       setError(err.response?.data?.error || "Failed to connect to Django security engine.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-slate-950 text-white p-6">
//       <div className="max-w-5xl mx-auto py-12">
//         {/* Header Section */}
//         <div className="text-center mb-12">
//           <h1 className="text-4xl font-bold mb-4">IaC Security Auditor</h1>
//           <p className="text-slate-400">Scan Terraform repositories for misconfigurations using AI-powered remediation.</p>
//         </div>

//         {/* Input Section */}
//         <form onSubmit={triggerScan} className="bg-slate-900 p-6 rounded-xl border border-slate-700 mb-12">
//           <div className="flex gap-4">
//             <input
//               type="text"
//               className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
//               placeholder="https://github.com/SimranRaitani/CloudSecure"
//               value={githubUrl}
//               onChange={(e) => setGithubUrl(e.target.value)}
//               disabled={loading}
//             />
//             <button
//               type="submit"
//               disabled={loading}
//               className="bg-emerald-500 hover:bg-emerald-400 px-8 py-3 rounded-lg font-bold transition disabled:opacity-50"
//             >
//               {loading ? "Scanning..." : "Audit Repo"}
//             </button>
//           </div>
//         </form>

//         {/* Results Section */}
//         {results.length > 0 && (
//           <div className="space-y-6">
//             <div className="flex justify-between items-center border-b border-slate-800 pb-4">
//               <h2 className="text-2xl font-bold">Findings ({results.length})</h2>
//             </div>
//             {results.map((issue, idx) => (
//               <VulnerabilityCard key={idx} issue={issue} />
//             ))}
//           </div>
//         )}

//         {/* Empty State */}
//         {!loading && scanStatus === "completed" && results.length === 0 && (
//           <div className="text-center py-12 bg-slate-900 rounded-xl border-2 border-dashed border-slate-800">
//             <ShieldCheckIcon className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
//             <h3 className="text-xl font-bold">No Issues Found!</h3>
//             <p className="text-slate-400">Your infrastructure code follows security best practices.</p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default IacScanner;

// import React, { useState, useEffect } from "react";
// import { useAuth } from "../context/AuthContext";
// import {
//   ExclamationTriangleIcon,
//   ExclamationCircleIcon,
//   InformationCircleIcon,
//   ShieldCheckIcon,
//   SparklesIcon,
// } from "@heroicons/react/24/outline";

// // ─── Helpers ────────────────────────────────────────────────────────────────

// const getFileName = (filePath) => {
//   if (!filePath) return "unknown";
//   return filePath.split(/[\\/]/).pop() || filePath;
// };

// // ─── Severity Config ─────────────────────────────────────────────────────────

// const SEVERITY_CONFIG = {
//   CRITICAL: {
//     bg: "bg-red-500/10",
//     border: "border-red-500/30",
//     text: "text-red-400",
//     dot: "bg-red-500",
//     bar: "#ef4444",
//     icon: <ExclamationTriangleIcon className="w-4 h-4" />,
//   },
//   HIGH: {
//     bg: "bg-orange-500/10",
//     border: "border-orange-500/30",
//     text: "text-orange-400",
//     dot: "bg-orange-400",
//     bar: "#fb923c",
//     icon: <ExclamationTriangleIcon className="w-4 h-4" />,
//   },
//   MEDIUM: {
//     bg: "bg-yellow-500/10",
//     border: "border-yellow-500/30",
//     text: "text-yellow-400",
//     dot: "bg-yellow-400",
//     bar: "#facc15",
//     icon: <ExclamationCircleIcon className="w-4 h-4" />,
//   },
//   LOW: {
//     bg: "bg-blue-500/10",
//     border: "border-blue-500/30",
//     text: "text-blue-400",
//     dot: "bg-blue-400",
//     bar: "#60a5fa",
//     icon: <InformationCircleIcon className="w-4 h-4" />,
//   },
// };

// // ─── Loading Messages Cycler ──────────────────────────────────────────────────

// const LOADING_MESSAGES = [
//   { emoji: "🔗", text: "Connecting to GitHub…" },
//   { emoji: "📂", text: "Cloning repository files…" },
//   { emoji: "🔍", text: "Parsing Terraform configs…" },
//   { emoji: "🛡️", text: "Running Checkov security rules…" },
//   { emoji: "🤖", text: "Generating AI remediation fixes for critical issues…" },
//   { emoji: "📊", text: "Compiling findings report…" },
// ];

// const LoadingState = () => {
//   const [msgIndex, setMsgIndex] = useState(0);
//   const [visible, setVisible] = useState(true);

//   useEffect(() => {
//     const cycle = setInterval(() => {
//       setVisible(false);
//       setTimeout(() => {
//         setMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
//         setVisible(true);
//       }, 350);
//     }, 2400);
//     return () => clearInterval(cycle);
//   }, []);

//   const msg = LOADING_MESSAGES[msgIndex];
//   const progress = ((msgIndex + 1) / LOADING_MESSAGES.length) * 100;

//   return (
//     <div className="flex flex-col items-center justify-center py-20 gap-8">
//       {/* Spinner */}
//       <div className="relative w-24 h-24">
//         <svg
//           className="absolute inset-0 w-24 h-24 animate-spin"
//           style={{ animationDuration: "1.4s" }}
//           viewBox="0 0 96 96"
//           fill="none"
//         >
//           <circle cx="48" cy="48" r="40" stroke="#064e3b" strokeWidth="4" />
//           <circle
//             cx="48" cy="48" r="40"
//             stroke="#10b981"
//             strokeWidth="4"
//             strokeLinecap="round"
//             strokeDasharray="200"
//             strokeDashoffset="150"
//           />
//         </svg>
//         <svg
//           className="absolute inset-0 w-24 h-24 animate-spin"
//           style={{ animationDuration: "3s", animationDirection: "reverse" }}
//           viewBox="0 0 96 96"
//           fill="none"
//         >
//           <circle
//             cx="48" cy="48" r="28"
//             stroke="#065f46"
//             strokeWidth="2"
//             strokeLinecap="round"
//             strokeDasharray="90"
//             strokeDashoffset="70"
//           />
//         </svg>
//         <div className="absolute inset-0 flex items-center justify-center">
//           <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
//             <div className="w-4 h-4 rounded-full bg-emerald-400 animate-pulse" />
//           </div>
//         </div>
//       </div>

//       {/* Cycling message */}
//       <div
//         className="text-center transition-all duration-300"
//         style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(8px)" }}
//       >
//         <div className="text-3xl mb-3">{msg.emoji}</div>
//         <p className="text-emerald-400 font-semibold text-base">{msg.text}</p>
//         <p className="text-slate-500 text-sm mt-1">This may take up to 30 seconds…</p>
//       </div>

//       {/* Progress bar */}
//       <div className="w-64">
//         <div className="flex justify-between text-xs text-slate-600 mb-2">
//           <span>Step {msgIndex + 1} of {LOADING_MESSAGES.length}</span>
//           <span>{Math.round(progress)}%</span>
//         </div>
//         <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
//           <div
//             className="h-full bg-emerald-500 rounded-full transition-all duration-700"
//             style={{ width: `${progress}%` }}
//           />
//         </div>
//       </div>

//       {/* Step dots */}
//       <div className="flex items-center gap-2">
//         {LOADING_MESSAGES.map((_, i) => (
//           <div
//             key={i}
//             className="rounded-full transition-all duration-500"
//             style={{
//               width: i === msgIndex ? "22px" : "7px",
//               height: "7px",
//               background: i < msgIndex ? "#059669" : i === msgIndex ? "#10b981" : "#1e3a2f",
//             }}
//           />
//         ))}
//       </div>
//     </div>
//   );
// };

// // ─── Severity Summary Cards ───────────────────────────────────────────────────

// const SeveritySummary = ({ results }) => {
//   const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
//   results.forEach((r) => {
//     const k = r.severity?.toUpperCase();
//     if (k in counts) counts[k]++;
//   });

//   const LABELS = [
//     { key: "CRITICAL", label: "Critical" },
//     { key: "HIGH", label: "High" },
//     { key: "MEDIUM", label: "Medium" },
//     { key: "LOW", label: "Low" },
//   ];

//   return (
//     <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
//       {LABELS.map(({ key, label }) => {
//         const cfg = SEVERITY_CONFIG[key];
//         const count = counts[key];
//         return (
//           <div
//             key={key}
//             className={`relative rounded-2xl border ${cfg.border} ${cfg.bg} px-4 py-4 overflow-hidden`}
//           >
//             {/* accent top bar */}
//             <div
//               className="absolute top-0 left-0 right-0 h-0.5"
//               style={{ background: cfg.bar }}
//             />
//             <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${cfg.text}`}>
//               {label}
//             </p>
//             <p className="text-white text-4xl font-bold leading-none mb-1">{count}</p>
//             <p className="text-slate-500 text-xs">
//               {count === 0 ? "none detected" : count === 1 ? "issue found" : "issues found"}
//             </p>
//           </div>
//         );
//       })}
//     </div>
//   );
// };

// // ─── Vulnerability Card ───────────────────────────────────────────────────────

// const VulnerabilityCard = ({ issue, index }) => {
//   const severity = issue.severity?.toUpperCase() || "LOW";
//   const cfg = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.LOW;
//   const fileName = getFileName(issue.file_path);

//   return (
//     <div className="bg-slate-900 border border-slate-700/50 rounded-2xl overflow-hidden hover:border-slate-600 transition-all duration-200">
//       {/* accent bar */}
//       <div className="h-0.5 w-full" style={{ background: cfg.bar }} />

//       <div className="p-5">
//         {/* Header */}
//         <div className="flex items-start justify-between gap-4 mb-4">
//           <div className="flex items-start gap-3 min-w-0">
//             <span className="text-slate-700 font-mono text-xs pt-0.5 shrink-0 select-none">
//               #{String(index + 1).padStart(2, "0")}
//             </span>
//             <h4 className="text-sm font-semibold text-white leading-snug">
//               <span className="text-emerald-400 font-mono text-xs">{issue.rule_id}</span>
//               <span className="mx-2 text-slate-600">·</span>
//               {issue.description}
//             </h4>
//           </div>
//           <div
//             className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${cfg.border} ${cfg.bg} ${cfg.text} text-xs font-bold uppercase tracking-wide shrink-0`}
//           >
//             {cfg.icon}
//             <span>{severity}</span>
//           </div>
//         </div>

//         {/* File + line chip */}
//         <div className="flex items-center gap-2 bg-slate-800/70 border border-slate-700/40 rounded-lg px-3 py-2 w-fit mb-4">
//           <svg className="w-3 h-3 text-slate-500 shrink-0" viewBox="0 0 16 16" fill="currentColor">
//             <path d="M4 0h5.293A1 1 0 0 1 10 .293L13.707 4a1 1 0 0 1 .293.707V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm5.5 1.5v2a1 1 0 0 0 1 1h2L9.5 1.5z" />
//           </svg>
//           <span className="text-slate-300 text-xs font-mono font-medium">{fileName}</span>
//           <span className="text-slate-600 text-xs">:</span>
//           <span className="text-slate-400 text-xs font-mono">Line {issue.line_number}</span>
//         </div>

//         {/* AI Fix */}
//         {issue.suggested_fix && (
//           <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
//             <div className="flex items-center gap-2 mb-3 text-emerald-400 text-xs font-bold uppercase tracking-widest">
//               <SparklesIcon className="w-3.5 h-3.5" />
//               AI Remediation
//             </div>
//             <pre className="text-slate-300 text-xs whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
//               {issue.suggested_fix}
//             </pre>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// // ─── Main Component ───────────────────────────────────────────────────────────

// const IacScanner = () => {
//   const { api } = useAuth();
//   const [githubUrl, setGithubUrl] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [results, setResults] = useState([]);
//   const [scanStatus, setScanStatus] = useState(null);
//   const [error, setError] = useState("");

//   const triggerScan = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     setResults([]);
//     setError("");
//     setScanStatus(null);

//     if (!githubUrl.includes("github.com")) {
//       setError("Please enter a valid GitHub repository URL.");
//       setLoading(false);
//       return;
//     }

//     try {
//       const { data } = await api.post("/api/v1/iac/scan/", { repo_url: githubUrl });
//       if (data.status === "completed") {
//         setResults(data.findings);
//         setScanStatus("completed");
//       } else {
//         setScanStatus("started");
//         alert("Scan initiated! Check your dashboard in a few minutes.");
//       }
//     } catch (err) {
//       setError(err.response?.data?.error || "Failed to connect to Django security engine.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-slate-950 text-white px-6 pb-16">
//       <div className="max-w-4xl mx-auto pt-14">

//         {/* ── Header ── */}
//         <div className="text-center mb-12">
//           <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-5">
//             <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
//             <span className="text-emerald-400 text-xs font-semibold uppercase tracking-widest">
//               AI-Powered Security
//             </span>
//           </div>
//           <h1 className="text-4xl font-bold mb-3 tracking-tight">IaC Security Auditor</h1>
//           <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
//             Scan Terraform repositories for misconfigurations using AI-powered
//             detection and automated remediation.
//           </p>
//         </div>

//         {/* ── Input Form ── */}
//         <form
//           onSubmit={triggerScan}
//           className="bg-slate-900 p-5 rounded-2xl border border-slate-700/60 mb-10 shadow-2xl shadow-black/30"
//         >
//           <label className="block text-slate-500 text-xs font-semibold uppercase tracking-widest mb-3">
//             GitHub Repository URL
//           </label>
//           <div className="flex gap-3">
//             <div className="flex-1 flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-xl px-4 focus-within:border-emerald-500/60 transition-colors">
//               <svg className="w-4 h-4 text-slate-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
//                 <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
//               </svg>
//               <input
//                 type="text"
//                 className="flex-1 bg-transparent py-3 outline-none text-sm text-white placeholder-slate-600"
//                 placeholder="https://github.com/your-org/your-terraform-repo"
//                 value={githubUrl}
//                 onChange={(e) => setGithubUrl(e.target.value)}
//                 disabled={loading}
//               />
//             </div>
//             <button
//               type="submit"
//               disabled={loading}
//               className="bg-emerald-500 hover:bg-emerald-400 active:scale-95 px-7 py-3 rounded-xl font-bold text-sm transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 text-slate-950 flex items-center gap-2"
//             >
//               {loading ? (
//                 <>
//                   <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
//                     <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="30" />
//                   </svg>
//                   Scanning…
//                 </>
//               ) : (
//                 "Audit Repo"
//               )}
//             </button>
//           </div>
//         </form>

//         {/* ── Error ── */}
//         {error && (
//           <div className="mb-8 flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
//             <ExclamationTriangleIcon className="w-5 h-5 text-red-400 shrink-0" />
//             <p className="text-red-400 text-sm">{error}</p>
//           </div>
//         )}

//         {/* ── Loading State ── */}
//         {loading && <LoadingState />}

//         {/* ── Results ── */}
//         {!loading && results.length > 0 && (
//           <div>
//             <SeveritySummary results={results} />
//             <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
//               <h2 className="text-xl font-bold text-white">
//                 Findings
//                 <span className="ml-2 text-sm font-normal text-slate-500">
//                   ({results.length} {results.length === 1 ? "issue" : "issues"} detected)
//                 </span>
//               </h2>
//             </div>
//             <div className="space-y-4">
//               {results.map((issue, idx) => (
//                 <VulnerabilityCard key={idx} issue={issue} index={idx} />
//               ))}
//             </div>
//           </div>
//         )}

//         {/* ── Clean State ── */}
//         {!loading && scanStatus === "completed" && results.length === 0 && (
//           <div className="text-center py-16 bg-slate-900 rounded-2xl border border-dashed border-slate-800">
//             <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
//               <ShieldCheckIcon className="w-8 h-8 text-emerald-400" />
//             </div>
//             <h3 className="text-xl font-bold mb-2">All Clear!</h3>
//             <p className="text-slate-400 text-sm max-w-xs mx-auto">
//               No security issues detected. Your infrastructure follows best practices.
//             </p>
//           </div>
//         )}

//       </div>
//     </div>
//   );
// };

// export default IacScanner;
import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

// ─── Helpers ────────────────────────────────────────────────────────────────

const getFileName = (filePath) => {
  if (!filePath) return "unknown";
  return filePath.split(/[\\/]/).pop() || filePath;
};

// ─── Severity Config ─────────────────────────────────────────────────────────

const SEVERITY_CONFIG = {
  CRITICAL: {
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    text: "text-red-400",
    dot: "bg-red-500",
    bar: "#ef4444",
    icon: <ExclamationTriangleIcon className="w-4 h-4" />,
  },
  HIGH: {
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    text: "text-orange-400",
    dot: "bg-orange-400",
    bar: "#fb923c",
    icon: <ExclamationTriangleIcon className="w-4 h-4" />,
  },
  MEDIUM: {
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    text: "text-yellow-400",
    dot: "bg-yellow-400",
    bar: "#facc15",
    icon: <ExclamationCircleIcon className="w-4 h-4" />,
  },
  LOW: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    text: "text-blue-400",
    dot: "bg-blue-400",
    bar: "#60a5fa",
    icon: <InformationCircleIcon className="w-4 h-4" />,
  },
};

// ─── Loading Messages Cycler ──────────────────────────────────────────────────

const LOADING_MESSAGES = [
  { emoji: "🔗", text: "Connecting to GitHub…" },
  { emoji: "📂", text: "Cloning repository files…" },
  { emoji: "🔍", text: "Parsing Terraform configs…" },
  { emoji: "🛡️", text: "Running Checkov security rules…" },
  { emoji: "🤖", text: "Generating AI remediation fixes…" },
  { emoji: "📊", text: "Compiling findings report…" },
];

const LoadingState = () => {
  const [msgIndex, setMsgIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const cycle = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        setVisible(true);
      }, 350);
    }, 2400);
    return () => clearInterval(cycle);
  }, []);

  const msg = LOADING_MESSAGES[msgIndex];
  const progress = ((msgIndex + 1) / LOADING_MESSAGES.length) * 100;

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-8">
      {/* Spinner */}
      <div className="relative w-24 h-24">
        <svg
          className="absolute inset-0 w-24 h-24 animate-spin"
          style={{ animationDuration: "1.4s" }}
          viewBox="0 0 96 96"
          fill="none"
        >
          <circle cx="48" cy="48" r="40" stroke="#064e3b" strokeWidth="4" />
          <circle
            cx="48" cy="48" r="40"
            stroke="#10b981"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="200"
            strokeDashoffset="150"
          />
        </svg>
        <svg
          className="absolute inset-0 w-24 h-24 animate-spin"
          style={{ animationDuration: "3s", animationDirection: "reverse" }}
          viewBox="0 0 96 96"
          fill="none"
        >
          <circle
            cx="48" cy="48" r="28"
            stroke="#065f46"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="90"
            strokeDashoffset="70"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Cycling message */}
      <div
        className="text-center transition-all duration-300"
        style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(8px)" }}
      >
        <div className="text-3xl mb-3">{msg.emoji}</div>
        <p className="text-emerald-400 font-semibold text-base">{msg.text}</p>
        <p className="text-slate-500 text-sm mt-1">This may take up to 30 seconds…</p>
      </div>

      {/* Progress bar */}
      <div className="w-64">
        <div className="flex justify-between text-xs text-slate-600 mb-2">
          <span>Step {msgIndex + 1} of {LOADING_MESSAGES.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step dots */}
      <div className="flex items-center gap-2">
        {LOADING_MESSAGES.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-500"
            style={{
              width: i === msgIndex ? "22px" : "7px",
              height: "7px",
              background: i < msgIndex ? "#059669" : i === msgIndex ? "#10b981" : "#1e3a2f",
            }}
          />
        ))}
      </div>
    </div>
  );
};

// ─── Severity Summary Cards ───────────────────────────────────────────────────

const SeveritySummary = ({ results }) => {
  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  results.forEach((r) => {
    const k = r.severity?.toUpperCase();
    if (k in counts) counts[k]++;
  });

  const LABELS = [
    { key: "CRITICAL", label: "Critical" },
    { key: "HIGH", label: "High" },
    { key: "MEDIUM", label: "Medium" },
    { key: "LOW", label: "Low" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
      {LABELS.map(({ key, label }) => {
        const cfg = SEVERITY_CONFIG[key];
        const count = counts[key];
        return (
          <div
            key={key}
            className={`relative rounded-2xl border ${cfg.border} ${cfg.bg} px-4 py-4 overflow-hidden`}
          >
            {/* accent top bar */}
            <div
              className="absolute top-0 left-0 right-0 h-0.5"
              style={{ background: cfg.bar }}
            />
            <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${cfg.text}`}>
              {label}
            </p>
            <p className="text-white text-4xl font-bold leading-none mb-1">{count}</p>
            <p className="text-slate-500 text-xs">
              {count === 0 ? "none detected" : count === 1 ? "issue found" : "issues found"}
            </p>
          </div>
        );
      })}
    </div>
  );
};

// ─── Vulnerability Card ───────────────────────────────────────────────────────

const VulnerabilityCard = ({ issue, index }) => {
  const severity = issue.severity?.toUpperCase() || "LOW";
  const cfg = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.LOW;
  const fileName = getFileName(issue.file_path);

  return (
    <div className="bg-slate-900 border border-slate-700/50 rounded-2xl overflow-hidden hover:border-slate-600 transition-all duration-200">
      {/* accent bar */}
      <div className="h-0.5 w-full" style={{ background: cfg.bar }} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3 min-w-0">
            <span className="text-slate-700 font-mono text-xs pt-0.5 shrink-0 select-none">
              #{String(index + 1).padStart(2, "0")}
            </span>
            <h4 className="text-sm font-semibold text-white leading-snug">
              <span className="text-emerald-400 font-mono text-xs">{issue.rule_id}</span>
              <span className="mx-2 text-slate-600">·</span>
              {issue.description}
            </h4>
          </div>
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${cfg.border} ${cfg.bg} ${cfg.text} text-xs font-bold uppercase tracking-wide shrink-0`}
          >
            {cfg.icon}
            <span>{severity}</span>
          </div>
        </div>

        {/* File + line chip */}
        <div className="flex items-center gap-2 bg-slate-800/70 border border-slate-700/40 rounded-lg px-3 py-2 w-fit mb-4">
          <svg className="w-3 h-3 text-slate-500 shrink-0" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 0h5.293A1 1 0 0 1 10 .293L13.707 4a1 1 0 0 1 .293.707V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2zm5.5 1.5v2a1 1 0 0 0 1 1h2L9.5 1.5z" />
          </svg>
          <span className="text-slate-300 text-xs font-mono font-medium">{fileName}</span>
          <span className="text-slate-600 text-xs">:</span>
          <span className="text-slate-400 text-xs font-mono">Line {issue.line_number}</span>
        </div>

        {/* AI Fix */}
        {issue.suggested_fix && (
          <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-3 text-emerald-400 text-xs font-bold uppercase tracking-widest">
              <SparklesIcon className="w-3.5 h-3.5" />
              AI Remediation
            </div>
            <pre className="text-slate-300 text-xs whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
              {issue.suggested_fix}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── URL Validation ───────────────────────────────────────────────────────────

// Matches: https://github.com/owner/repo  (no extra path segments)
const GITHUB_REPO_REGEX = /^https?:\/\/github\.com\/[\w.-]+\/[\w.-]+(\/)?$/;

const validateGithubUrl = (url) => {
  if (!url.trim()) return { valid: false, message: "Please enter a GitHub repository URL." };
  if (!url.startsWith("https://github.com") && !url.startsWith("http://github.com"))
    return { valid: false, message: "URL must start with https://github.com" };
  if (!GITHUB_REPO_REGEX.test(url.trim()))
    return { valid: false, message: "Enter a valid repo URL — e.g. https://github.com/owner/repo-name" };
  return { valid: true, message: "" };
};

// ─── Main Component ───────────────────────────────────────────────────────────

const IacScanner = () => {
  const { api } = useAuth();
  const [githubUrl, setGithubUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [scanStatus, setScanStatus] = useState(null);
  const [error, setError] = useState("");
  const [urlError, setUrlError] = useState("");
  const [touched, setTouched] = useState(false);

  const handleUrlChange = (e) => {
    const val = e.target.value;
    setGithubUrl(val);
    if (touched) {
      const { message } = validateGithubUrl(val);
      setUrlError(message);
    }
  };

  const handleBlur = () => {
    setTouched(true);
    const { message } = validateGithubUrl(githubUrl);
    setUrlError(message);
  };

  // const triggerScan = async (e) => {
  //   e.preventDefault();
  //   setTouched(true);
  //   const { valid, message } = validateGithubUrl(githubUrl);
  //   if (!valid) {
  //     setUrlError(message);
  //     return;
  //   }
  //   setUrlError("");
  //   setLoading(true);
  //   setResults([]);
  //   setError("");
  //   setScanStatus(null);

  //   try {
  //     const { data } = await api.post("/api/v1/iac/scan/", { repo_url: githubUrl });
  //     if (data.status === "completed") {
  //       setResults(data.findings);
  //       setScanStatus("completed");
  //     } else {
  //       setScanStatus("started");
  //       alert("Scan initiated! Check your dashboard in a few minutes.");
  //     }
  //   } catch (err) {
  //     setError(err.response?.data?.error || "Failed to connect to Django security engine.");
  //   } finally {
  //     setLoading(false);
  //   }
  // };
  // const triggerScan = async (e) => {
  //   e.preventDefault();
  //   setTouched(true);
  //   const { valid, message } = validateGithubUrl(githubUrl);
  //   if (!valid) {
  //     setUrlError(message);
  //     return;
  //   }

  //   setUrlError("");
  //   setLoading(true);
  //   setResults([]);
  //   setError("");
  //   setScanStatus(null);

  //   try {
  //     // 1. Initial Call to Start Scan
  //     const { data } = await api.post("/api/v1/iac/scan/", { repo_url: githubUrl });
      
  //     if (data.status === "completed") {
  //       // If it was already in DB and returned instantly
  //       setResults(data.findings);
  //       setScanStatus("completed");
  //       setLoading(false);
  //     } else {
  //       // 2. If it started a Celery task, start POLLING
  //       setScanStatus("started");
  //       pollResults(githubUrl);
  //     }
  //   } catch (err) {
  //     setError(err.response?.data?.error || "Failed to connect to Django security engine.");
  //     setLoading(false);
  //   }
  // };

  const triggerScan = async (e) => {
  if (e) e.preventDefault();
  
  setLoading(true);
  setError("");
  setResults([]);

  try {
    const { data } = await api.post("/api/v1/iac/scan/", { repo_url: githubUrl });

    if (data.status === "completed") {
      setResults(data.findings);
      setLoading(false);
    } else if (data.status === "started") {
      // Start the interval to check back every 4 seconds
      const intervalId = setInterval(async () => {
        try {
          const pollRes = await api.post("/api/v1/iac/scan/", { repo_url: githubUrl });
          
          if (pollRes.data.status === "completed") {
            setResults(pollRes.data.findings);
            setLoading(false);
            clearInterval(intervalId); // Stop polling
          }
        } catch (pollErr) {
          console.error("Polling error", pollErr);
        }
      }, 4000);

      // Timeout after 3 minutes
      setTimeout(() => {
        clearInterval(intervalId);
        if (loading) setLoading(false);
      }, 180000);
    }
  } catch (err) {
    setError("Failed to start scan.");
    setLoading(false);
  }
};

  // ─── Polling Helper ──────────────────────────────────────────────────────────
  
  const pollResults = async (url) => {
    const interval = setInterval(async () => {
      try {
        // We call the same endpoint; the backend should return "completed" once Celery is done
        const { data } = await api.post("/api/v1/iac/scan/", { repo_url: url });
        
        if (data.status === "completed") {
          setResults(data.findings);
          setScanStatus("completed");
          setLoading(false);
          clearInterval(interval); // Stop polling
        }
      } catch (err) {
        console.error("Polling error:", err);
        // We don't stop the interval here in case of a minor network glitch, 
        // but you could add a "max retries" counter if you wanted to be safe.
      }
    }, 3000); // Check every 3 seconds

    // Optional: Stop polling after 2 minutes (timeout) to avoid infinite loops
    setTimeout(() => {
      clearInterval(interval);
      if (loading) {
        setLoading(false);
        setError("Scan is taking longer than expected. Please check the Findings page later.");
      }
    }, 120000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white px-6 pb-16">
      <div className="max-w-4xl mx-auto pt-14">

        {/* ── Header ── */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
            <span className="text-emerald-400 text-xs font-semibold uppercase tracking-widest">
              AI-Powered Security
            </span>
          </div>
          <h1 className="text-4xl font-bold mb-3 tracking-tight">IaC Security Auditor</h1>
          <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
            Scan Terraform repositories for misconfigurations using AI-powered
            detection and automated remediation.
          </p>
        </div>

        {/* ── Input Form ── */}
        <form
          onSubmit={triggerScan}
          className="bg-slate-900 p-5 rounded-2xl border border-slate-700/60 mb-10 shadow-2xl shadow-black/30"
        >
          <label className="block text-slate-500 text-xs font-semibold uppercase tracking-widest mb-3">
            GitHub Repository URL
          </label>
          <div className="flex gap-3">
            <div
              className={`flex-1 flex items-center gap-3 bg-slate-800 border rounded-xl px-4 transition-colors ${
                urlError
                  ? "border-red-500/60"
                  : touched && githubUrl && !urlError
                  ? "border-emerald-500/60"
                  : "border-slate-700 focus-within:border-emerald-500/60"
              }`}
            >
              {/* GitHub icon */}
              <svg className="w-4 h-4 text-slate-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <input
                type="text"
                className="flex-1 bg-transparent py-3 outline-none text-sm text-white placeholder-slate-600"
                placeholder="https://github.com/owner/repo-name"
                value={githubUrl}
                onChange={handleUrlChange}
                onBlur={handleBlur}
                disabled={loading}
              />
              {/* Validation icon */}
              {touched && githubUrl && (
                urlError ? (
                  <svg className="w-4 h-4 text-red-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-emerald-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5z" clipRule="evenodd" />
                  </svg>
                )
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-500 hover:bg-emerald-400 active:scale-95 px-7 py-3 rounded-xl font-bold text-sm transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 text-slate-950 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40" strokeDashoffset="30" />
                  </svg>
                  Scanning…
                </>
              ) : (
                "Audit Repo"
              )}
            </button>
          </div>

          {/* Inline validation message */}
          {urlError && (
            <div className="mt-3 flex items-center gap-2 text-red-400 text-xs">
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm.75 4.25a.75.75 0 0 0-1.5 0v3.5a.75.75 0 0 0 1.5 0v-3.5zM8 11.5a.875.875 0 1 1 0-1.75.875.875 0 0 1 0 1.75z" />
              </svg>
              {urlError}
            </div>
          )}

          {/* Format hint */}
          {!urlError && (
            <p className="mt-3 text-slate-600 text-xs">
              Expected format:{" "}
              <span className="font-mono text-slate-500">https://github.com/owner/repo-name</span>
            </p>
          )}
        </form>

        {/* ── Error ── */}
        {error && (
          <div className="mb-8 flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* ── Loading State ── */}
        {loading && <LoadingState />}

        {/* ── Results ── */}
        {!loading && results.length > 0 && (
          <div>
            <SeveritySummary results={results} />
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white">
                Findings
                <span className="ml-2 text-sm font-normal text-slate-500">
                  ({results.length} {results.length === 1 ? "issue" : "issues"} detected)
                </span>
              </h2>
            </div>
            <div className="space-y-4">
              {results.map((issue, idx) => (
                <VulnerabilityCard key={idx} issue={issue} index={idx} />
              ))}
            </div>
          </div>
        )}

        {/* ── Clean State ── */}
        {!loading && scanStatus === "completed" && results.length === 0 && (
          <div className="text-center py-16 bg-slate-900 rounded-2xl border border-dashed border-slate-800">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
              <ShieldCheckIcon className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">All Clear!</h3>
            <p className="text-slate-400 text-sm max-w-xs mx-auto">
              No security issues detected. Your infrastructure follows best practices.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default IacScanner;

