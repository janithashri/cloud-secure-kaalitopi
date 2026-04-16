import ReactMarkdown from 'react-markdown';
import { XMarkIcon } from "@heroicons/react/24/outline";
const DetailPanel = ({ finding, onClose }) => {
    return (
        <div className="fixed inset-0 z-50 flex justify-start">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
            
            {/* Sidebar Content */}
            <div className="relative w-full max-w-lg bg-white h-full shadow-xl p-6 overflow-y-auto transform transition-transform">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Finding Details</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <XMarkIcon className="h-6 w-6" /> {/* Use Heroicons */}
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-gray-500 text-sm">Description</label>
                        <p className="text-lg">{finding.description}</p>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <label className="text-blue-700 font-bold text-sm">AI Remediation</label>
                        <div className="prose prose-sm mt-2">
                            <ReactMarkdown>{finding.suggested_fix}</ReactMarkdown>
                        </div>
                    </div>

                    <div className="flex space-x-2 pt-6">
                        <button className="flex-1 bg-indigo-600 text-white py-2 rounded">Export PDF</button>
                        <button className="flex-1 border border-gray-300 py-2 rounded">Export CSV</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DetailPanel;

