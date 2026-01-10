import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Job, Candidate } from '../types';
import { analyzeResume, fileToBase64 } from '../services/ai';

interface UploadFile {
    id: string;
    file: File;
    name: string;
    size: string;
    status: 'READY' | 'READING' | 'PARSING' | 'COMPLETED' | 'ERROR';
    progress: number;
    result?: any;
}

const ResumeScore: React.FC = () => {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [selectedJobId, setSelectedJobId] = useState<string>('');
    const [files, setFiles] = useState<UploadFile[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        const fetchJobs = async () => {
            const data = await db.jobs.find();
            setJobs(data);
            if (data.length > 0 && !selectedJobId) {
                setSelectedJobId(data[0].id);
            }
        };
        fetchJobs();
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        const newFiles: UploadFile[] = selectedFiles.map((f: File) => ({
            id: Math.random().toString(36).substr(2, 9),
            file: f,
            name: f.name,
            size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
            status: 'READY',
            progress: 0
        }));
        setFiles(prev => [...prev, ...newFiles]);
    };

    const removeFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const startAnalysis = async () => {
        console.log("[RESUME SCORE] Starting analysis. Files count:", files.length, "Job ID:", selectedJobId);
        setErrorMsg(null);

        if (!selectedJobId || files.length === 0) {
            console.warn("[RESUME SCORE] Missing job selection or files.");
            setErrorMsg("Please select a job and upload at least one resume.");
            return;
        }

        setIsAnalyzing(true);
        try {
            const allJobs = await db.jobs.find();
            const currentJob = allJobs.find(j => j.id === selectedJobId);

            if (!currentJob) {
                console.error("[RESUME SCORE] Selected job not found in DB:", selectedJobId);
                setErrorMsg("The selected job could not be found in the database. Please refresh.");
                setIsAnalyzing(false);
                return;
            }

            console.log("[RESUME SCORE] Target job found:", currentJob.title);

            for (let i = 0; i < files.length; i++) {
                const currentFile = files[i];
                if (currentFile.status === 'COMPLETED') continue;

                // THROTTLE: Wait 3 seconds between requests (Free Tier Limit: 15 RPM)
                if (i > 0) {
                    console.log(`[RESUME SCORE] Throttling for 3s...`);
                    await new Promise(r => setTimeout(r, 3000));
                }

                console.log(`[RESUME SCORE] Processing file ${i + 1}/${files.length}: ${currentFile.name}`);
                setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'READING', progress: 10 } : f));

                try {
                    console.log(`[RESUME SCORE] Sending ${currentFile.name} to Gemini...`);
                    setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'PARSING', progress: 30 } : f));

                    const data = await analyzeResume(currentFile.file, {
                        title: currentJob.title,
                        skills: currentJob.skills || [],
                        description: currentJob.description
                    });

                    const matchScore = Number(data.matchScore) || 0;
                    console.log(`[RESUME SCORE] AI Analysis received for ${currentFile.name}: ${matchScore}%`);

                    setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, progress: 80 } : f));

                    const base64Data = await fileToBase64(currentFile.file);

                    const newCandidate: Candidate = {
                        id: `c-${Date.now()}-${i}`,
                        name: data.candidateName || currentFile.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, ' '),
                        role: data.currentRole || currentJob.title,
                        company: 'Extracted Profile',
                        location: currentJob.location || 'Remote',
                        appliedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                        status: 'New',
                        matchScore: matchScore,
                        associatedJdId: selectedJobId,
                        analysis: data.analysis,
                        // SAFETY: If file > 1MB, do not send Base64 to DB to avoid Vercel 4.5MB Payload Limit (500 Error)
                        resumeBase64: (currentFile.file.size < 1 * 1024 * 1024) ? base64Data : "",
                        resumeMimeType: currentFile.file.type
                    };

                    console.log(`[RESUME SCORE] Saving candidate ${newCandidate.name} to DB...`);
                    await db.candidates.insertOne(newCandidate);

                    console.log(`[RESUME SCORE] Updating job stats for ${currentJob.title}...`);
                    await db.jobs.updateOne(currentJob.id, {
                        applicantsCount: (currentJob.applicantsCount || 0) + 1,
                        matchesCount: (matchScore > 80) ? (currentJob.matchesCount || 0) + 1 : (currentJob.matchesCount || 0)
                    });

                    setFiles(prev => prev.map((f, idx) => idx === i ?
                        { ...f, status: 'COMPLETED', progress: 100, result: data } : f));

                    console.log(`[RESUME SCORE] Successfully processed ${currentFile.name}`);
                } catch (err: any) {
                    console.error(`[RESUME SCORE] Error processing ${currentFile.name}:`, err);
                    setFiles(prev => prev.map((f, idx) => idx === i ?
                        { ...f, status: 'ERROR', progress: 0 } : f));
                    setErrorMsg(`Failed to analyze ${currentFile.name}: ${err.message || 'Unknown error'}`);
                }
            }

            console.log("[RESUME SCORE] Analysis complete!");
        } catch (err: any) {
            console.error("[RESUME SCORE] Fatal error:", err);
            setErrorMsg(`Analysis failed: ${err.message || 'Unknown error'}`);
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 max-w-[1400px] mx-auto py-4">
            {/* Page Title Header */}
            <div className="flex items-center gap-4 px-2">
                <div className="size-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 shadow-sm">
                    <span className="material-symbols-outlined text-[28px]">psychology</span>
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-text-main leading-tight">Resume Scorer</h1>
                    <p className="text-sm text-text-tertiary">AI-powered content matching for talent acquisition</p>
                </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                    <span className="material-symbols-outlined text-red-500">error</span>
                    <p className="text-sm text-red-700">{errorMsg}</p>
                    <button
                        onClick={() => setErrorMsg(null)}
                        className="ml-auto text-red-500 hover:text-red-700"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Card: Job Selection */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-gray-500 font-bold px-2">
                        <span className="material-symbols-outlined text-[20px]">business_center</span>
                        <span className="text-sm">Select Job</span>
                    </div>
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm min-h-[500px] flex flex-col">
                        {jobs.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                                <div className="size-16 bg-gray-50 rounded-xl flex items-center justify-center text-gray-300 mb-4">
                                    <span className="material-symbols-outlined text-[40px]">work_off</span>
                                </div>
                                <p className="text-sm text-gray-400 font-medium mb-2">No jobs available</p>
                                <p className="text-xs text-gray-300">Create a job first to score resumes</p>
                            </div>
                        ) : (
                            <>
                                <label className="block mb-4">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Select Job Position</span>
                                    <select
                                        value={selectedJobId}
                                        onChange={(e) => setSelectedJobId(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    >
                                        {jobs.map(job => (
                                            <option key={job.id} value={job.id}>
                                                {job.title} - {job.department} ({job.location})
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                {selectedJobId && (
                                    <div className="flex-1 bg-gray-50 rounded-xl p-4 border border-gray-100">
                                        <div className="mb-3">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Job Details</span>
                                        </div>
                                        {(() => {
                                            const selectedJob = jobs.find(j => j.id === selectedJobId);
                                            if (!selectedJob) return null;
                                            return (
                                                <div className="space-y-2">
                                                    <div>
                                                        <span className="text-xs text-gray-400 font-medium">Title:</span>
                                                        <p className="text-sm font-bold text-gray-700">{selectedJob.title}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs text-gray-400 font-medium">Department:</span>
                                                        <p className="text-sm font-medium text-gray-600">{selectedJob.department}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs text-gray-400 font-medium">Location:</span>
                                                        <p className="text-sm font-medium text-gray-600">{selectedJob.location}</p>
                                                    </div>
                                                    {selectedJob.skills && selectedJob.skills.length > 0 && (
                                                        <div>
                                                            <span className="text-xs text-gray-400 font-medium">Skills:</span>
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {selectedJob.skills.map((skill, idx) => (
                                                                    <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-lg">
                                                                        {skill}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {selectedJob.description && (
                                                        <div className="mt-3 pt-3 border-t border-gray-200">
                                                            <span className="text-xs text-gray-400 font-medium">Description:</span>
                                                            <p className="text-xs text-gray-600 mt-1 line-clamp-4">{selectedJob.description}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Right Card: Upload Resumes */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-gray-500 font-bold px-2">
                        <span className="material-symbols-outlined text-[20px]">cloud_upload</span>
                        <span className="text-sm">Upload Resumes</span>
                    </div>
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm min-h-[500px] flex flex-col">
                        <label className="border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50/50 transition-all group p-8 mb-6 bg-gray-50/30">
                            <input type="file" multiple accept=".pdf,.doc,.docx" className="hidden" onChange={handleFileSelect} />
                            <div className="size-14 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
                                <span className="material-symbols-outlined text-2xl">upload</span>
                            </div>
                            <h3 className="text-base font-bold text-gray-700 mb-1">Click to upload or drag and drop</h3>
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">PDF, DOCX (Max 10MB)</p>
                        </label>

                        {/* Selected Files Section */}
                        <div className="flex-1 overflow-y-auto no-scrollbar mb-6 min-h-[200px]">
                            {files.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Selected Files ({files.length})</p>
                                    {files.map(file => (
                                        <div key={file.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm group hover:border-blue-100 transition-all">
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 border ${
                                                    file.status === 'COMPLETED' ? 'bg-green-50 text-green-500 border-green-100' :
                                                    file.status === 'ERROR' ? 'bg-red-50 text-red-500 border-red-100' :
                                                    file.status === 'PARSING' || file.status === 'READING' ? 'bg-blue-50 text-blue-500 border-blue-100' :
                                                    'bg-orange-50 text-orange-500 border-orange-100'
                                                }`}>
                                                    {file.status === 'COMPLETED' ? (
                                                        <span className="material-symbols-outlined text-[22px]">check_circle</span>
                                                    ) : file.status === 'ERROR' ? (
                                                        <span className="material-symbols-outlined text-[22px]">error</span>
                                                    ) : file.status === 'PARSING' || file.status === 'READING' ? (
                                                        <div className="size-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                    ) : (
                                                        <span className="material-symbols-outlined text-[22px]">picture_as_pdf</span>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-bold text-gray-700 truncate">{file.name}</p>
                                                    <p className="text-[11px] text-gray-400 font-medium">{file.size}</p>
                                                    {file.status === 'PARSING' || file.status === 'READING' ? (
                                                        <div className="mt-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${file.progress}%` }}></div>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => removeFile(file.id)}
                                                className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all ml-2"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">close</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Score Action Button */}
                        <button
                            onClick={startAnalysis}
                            disabled={isAnalyzing || files.length === 0 || !selectedJobId || jobs.length === 0}
                            className="w-full bg-primary hover:bg-primary-hover disabled:bg-gray-100 disabled:text-gray-400 text-white h-14 rounded-xl font-bold flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-blue-500/20 disabled:shadow-none"
                        >
                            {isAnalyzing ? (
                                <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <span className="material-symbols-outlined filled">auto_awesome</span>
                            )}
                            {isAnalyzing ? 'Scoring Pipeline...' : 'Score Resumes'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Results Section */}
            <div className="flex flex-col gap-4 mt-6">
                <div className="flex items-center gap-2 text-primary font-bold px-2">
                    <span className="material-symbols-outlined text-[20px]">analytics</span>
                    <span className="text-sm">Scoring Results</span>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[300px] flex flex-col">
                    {files.length === 0 || files.every(f => f.status === 'READY') ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
                            <div className="size-16 bg-gray-50 rounded-xl flex items-center justify-center text-gray-200 mb-6">
                                <span className="material-symbols-outlined text-[40px]">grid_view</span>
                            </div>
                            <p className="text-gray-400 font-medium max-w-sm">
                                Upload resumes and click 'Score Resumes' to see analysis here.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-100">
                                        <th className="px-8 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Rank</th>
                                        <th className="px-8 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Candidate</th>
                                        <th className="px-8 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Match Score</th>
                                        <th className="px-8 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Summary</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {files
                                        .filter(f => f.status !== 'READY')
                                        .sort((a, b) => (b.result?.matchScore || 0) - (a.result?.matchScore || 0))
                                        .map((file, idx) => (
                                        <tr key={file.id} className="hover:bg-gray-50/50 transition-all">
                                            <td className="px-8 py-5 text-sm font-bold text-gray-400">#{idx + 1}</td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-8 rounded-lg bg-blue-50 flex items-center justify-center text-primary font-bold text-xs">
                                                        {file.result?.candidateName?.charAt(0)?.toUpperCase() || '?'}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-text-main">{file.result?.candidateName || file.name}</p>
                                                        {file.result?.currentRole && (
                                                            <p className="text-xs text-gray-400">{file.result.currentRole}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden shrink-0">
                                                        <div
                                                            className={`h-full transition-all duration-1000 ${
                                                                file.status === 'COMPLETED' ? 'bg-primary' : 
                                                                file.status === 'ERROR' ? 'bg-red-500' : 'bg-blue-200'
                                                            }`}
                                                            style={{ width: `${file.result?.matchScore || 0}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className={`text-sm font-bold ${
                                                        file.status === 'ERROR' ? 'text-red-500' : 'text-primary'
                                                    }`}>
                                                        {file.result?.matchScore || 0}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <p className="text-sm text-gray-500 font-medium truncate max-w-lg">
                                                    {file.status === 'ERROR' ? 'Analysis failed' : file.result?.analysis || 'Processing...'}
                                                </p>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResumeScore;
