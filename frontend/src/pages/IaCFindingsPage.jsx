

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  ArrowLeftIcon, 
  TrashIcon, 
  XMarkIcon, 
  ShieldCheckIcon, 
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';

const IacFindingsPage = () => {
  const [repos, setRepos] = useState([]);
  const [allFindings, setAllFindings] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [selectedFinding, setSelectedFinding] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [repoToDelete, setRepoToDelete] = useState(null);
  const { api } = useAuth();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [repoRes, findingsRes] = await Promise.all([
        api.get('/api/v1/iac/repositories/'),
        api.get('/api/v1/iac/findings/')
      ]);
      setRepos(repoRes.data);
      setAllFindings(findingsRes.data);
    } catch (err) { console.error("Error fetching data", err); }
  };

  const openDeleteModal = (repoUrl, e) => {
    e.stopPropagation();
    setRepoToDelete(repoUrl);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    await api.delete(`/api/v1/iac/repositories/delete/?repo_url=${encodeURIComponent(repoToDelete)}`);
    fetchData();
    if (selectedRepo === repoToDelete) setSelectedRepo(null);
    setIsDeleteModalOpen(false);
  };

  const filteredFindings = allFindings.filter(f => f.repository_url === selectedRepo);

  return (
    <div className="p-8 bg-gray-900 min-h-screen text-white font-sans">
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            {selectedRepo ? 'Security Audit' : 'Infrastructure Inventory'}
          </h1>
          <p className="text-gray-400 mt-2">
            {selectedRepo ? `Reviewing vulnerabilities for ${selectedRepo.split('/').pop()}` : 'Manage and review scanned cloud repositories'}
          </p>
        </div>

        {selectedRepo && (
          <button 
            onClick={() => setSelectedRepo(null)} 
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-blue-400 transition-all shadow-lg"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span>Back to Repositories</span>
          </button>
        )}
      </div>

      {!selectedRepo ? (
        /* REPOSITORY GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {repos.map(repo => (
            <div 
              key={repo.repository_url} 
              onClick={() => setSelectedRepo(repo.repository_url)}
              className="group bg-gray-800 p-6 rounded-2xl border border-gray-700 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/10 cursor-pointer transition-all relative"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="bg-blue-600/20 p-3 rounded-xl">
                  <GlobeAltIcon className="h-6 w-6 text-blue-400" />
                </div>
                <button 
                  onClick={(e) => openDeleteModal(repo.repository_url, e)} 
                  className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
              <h3 className="text-xl font-bold truncate">{repo.repository_url.split('/').pop()}</h3>
              <p className="text-sm text-gray-500 mt-1 truncate">{repo.repository_url}</p>
              <div className="mt-6 pt-6 border-t border-gray-700 flex items-center justify-between">
                <span className="text-blue-400 font-bold">{repo.count} Findings</span>
                <span className="text-gray-500 text-xs group-hover:text-white transition">View Audit &rarr;</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* FINDINGS LIST VIEW */
        <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead className="bg-gray-900/50 border-b border-gray-700">
              <tr>
                <th className="p-5 text-gray-400 text-xs uppercase tracking-widest">Severity</th>
                <th className="p-5 text-gray-400 text-xs uppercase tracking-widest">Vulnerability ID</th>
                <th className="p-5 text-gray-400 text-xs uppercase tracking-widest">Affected Resource</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredFindings.map(f => (
                <tr 
                  key={f.id} 
                  onClick={() => { setSelectedFinding(f); setShowSidebar(true); }}
                  className="hover:bg-gray-700/40 cursor-pointer transition group"
                >
                  <td className="p-5">
                    <span className={`px-3 py-1 rounded-md text-[10px] font-black tracking-tighter uppercase ${
                      f.severity === 'HIGH' || f.severity === 'CRITICAL' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                    }`}>
                      {f.severity}
                    </span>
                  </td>
                  <td className="p-5 font-mono text-blue-400 text-sm">{f.rule_id}</td>
                  <td className="p-5 text-gray-300 text-sm italic">{f.resource_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* RIGHT SIDEBAR DETAIL PANEL */}
      {showSidebar && selectedFinding && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowSidebar(false)} />
          <div className="relative w-full max-w-xl bg-gray-900 h-full shadow-[-20px_0_50px_rgba(0,0,0,0.5)] border-l border-gray-700 overflow-y-auto animate-in slide-in-from-right duration-300">
            
            {/* Sidebar Header */}
            <div className="sticky top-0 bg-gray-900/95 backdrop-blur-md p-6 border-b border-gray-700 flex justify-between items-center z-10">
              <div>
                <h2 className="text-2xl font-black text-white">{selectedFinding.rule_id}</h2>
                <span className="text-xs text-blue-400 uppercase tracking-widest font-bold">Vulnerability Details</span>
              </div>
              <button onClick={() => setShowSidebar(false)} className="p-2 hover:bg-gray-800 rounded-full transition">
                <XMarkIcon className="h-6 w-6 text-gray-400" />
              </button>
            </div>

            <div className="p-8 space-y-8">
              {/* Metadata Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                  <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Severity Status</p>
                  <p className={`font-bold ${selectedFinding.severity === 'HIGH' || selectedFinding.severity === 'CRITICAL' ? 'text-red-500' : 'text-yellow-500'}`}>{selectedFinding.severity}</p>
                </div>
                <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                  <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Code Location</p>
                  <p className="text-white font-mono font-bold">Line {selectedFinding.line_number || 'N/A'}</p>
                </div>
              </div>

              {/* Description Section */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheckIcon className="h-5 w-5 text-blue-500" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">Issue Overview</h3>
                </div>
                <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 shadow-inner">
                   <p className="text-gray-300 leading-relaxed text-sm">{selectedFinding.description}</p>
                </div>
              </section>

              {/* AI REMEDIATION SECTION */}
              <section className="pb-10">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-green-400">AI Expert Remediation</h3>
                </div>
                <div className="bg-[#0f172a] rounded-2xl p-6 border border-green-500/20 shadow-xl">
                  <div className="prose prose-invert prose-sm max-w-none prose-pre:bg-gray-800 prose-pre:border prose-pre:border-gray-700">
                    <ReactMarkdown>{selectedFinding.suggested_fix}</ReactMarkdown>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM DELETE MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsDeleteModalOpen(false)} />
          <div className="relative bg-gray-900 border border-red-500/20 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <TrashIcon className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-2xl font-black text-center mb-2">Purge Repository?</h3>
            <p className="text-gray-400 text-center text-sm mb-8 leading-relaxed">
              This will permanently delete all vulnerability records for <span className="text-white font-mono italic">{repoToDelete?.split('/').pop()}</span>.
            </p>
            <div className="flex gap-4">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-bold transition">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-bold shadow-lg shadow-red-600/20 transition">Delete All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IacFindingsPage;