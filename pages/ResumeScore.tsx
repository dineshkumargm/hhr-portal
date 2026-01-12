import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Job, Candidate } from '../types';
import { analyzeResume, fileToBase64, extractJobDetailsFromPDF } from '../services/ai';

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
    const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
    const [jdSource, setJdSource] = useState<'select' | 'upload'>('select');
    const [jdFile, setJdFile] = useState<File | null>(null);
    const [isExtractingJd, setIsExtractingJd] = useState(false);

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
            let currentJob: Job | undefined;

            if (jdSource === 'upload' && jdFile) {
                console.log("[RESUME SCORE] Extracting details from uploaded JD...");
                setIsExtractingJd(true);
                try {
                    const extractedJd = await extractJobDetailsFromPDF(jdFile);
                    console.log("[RESUME SCORE] JD Extracted:", extractedJd);

                    // Create a new Job record
                    const newJob: Job = {
                        id: `j-${Date.now()}`,
                        title: extractedJd.title || "Uploaded Job Position",
                        department: extractedJd.department || "General",
                        location: extractedJd.location || "Remote",
                        type: extractedJd.type || "Full-time",
                        status: 'Active',
                        applicantsCount: 0,
                        matchesCount: 0,
                        skills: extractedJd.skills || [],
                        description: `Extracted from ${jdFile.name}`
                    };

                    // Optimistic update
                    setJobs(prev => [newJob, ...prev]);
                    setSelectedJobId(newJob.id);
                    currentJob = newJob;

                    // Save to DB (Fire and forget, or await if strict)
                    await db.jobs.insertOne(newJob);

                } catch (err: any) {
                    console.error("JD Extraction Failed:", err);
                    setErrorMsg(`Failed to extract job details: ${err.message}`);
                    setIsAnalyzing(false);
                    setIsExtractingJd(false);
                    return;
                } finally {
                    setIsExtractingJd(false);
                }
            } else {
                const allJobs = await db.jobs.find();
                currentJob = allJobs.find(j => j.id === selectedJobId);
            }

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
                        jdMatchScore: data.jdMatchScore || 0,
                        qualificationMatchScore: data.qualificationMatchScore || 0,
                        resumeMatchScore: data.resumeMatchScore || 0,
                        jdMatchReason: data.jdMatchReason || "Analysis not available",
                        qualificationMatchReason: data.qualificationMatchReason || "Analysis not available",
                        resumeMatchReason: data.resumeMatchReason || "Analysis not available",
                        deepAnalysis: data.deepAnalysis,
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
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-gray-200/50 min-h-[500px] flex flex-col hover:border-blue-100 transition-colors">
                        {/* JD Source Toggle */}
                        <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
                            <button
                                onClick={() => setJdSource('select')}
                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${jdSource === 'select' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Select Existing
                            </button>
                            <button
                                onClick={() => setJdSource('upload')}
                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${jdSource === 'upload' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Upload JD
                            </button>
                        </div>

                        {jdSource === 'upload' ? (
                            <div className="flex-1 flex flex-col">
                                <label className="border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 hover:border-blue-200 transition-all p-8 mb-4 h-48">
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        className="hidden"
                                        onChange={(e) => e.target.files && setJdFile(e.target.files[0])}
                                    />
                                    <div className="size-12 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center mb-3">
                                        <span className="material-symbols-outlined text-2xl">description</span>
                                    </div>
                                    <h3 className="text-sm font-bold text-gray-700 mb-1">
                                        {jdFile ? jdFile.name : "Upload Job Description"}
                                    </h3>
                                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                                        {jdFile ? "Click to change" : "PDF ONLY"}
                                    </p>
                                </label>
                                {jdFile && (
                                    <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">check_circle</span>
                                        Ready to extract details
                                    </div>
                                )}
                            </div>
                        ) : (
                            jobs.length === 0 ? (
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
                                            {Array.from(new Map(jobs.map(job => [job.id, job])).values()).map(job => (
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
                            )
                        )}
                    </div>
                </div>

                {/* Right Card: Upload Resumes */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-gray-500 font-bold px-2">
                        <span className="material-symbols-outlined text-[20px]">cloud_upload</span>
                        <span className="text-sm">Upload Resumes</span>
                    </div>
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-gray-200/50 min-h-[500px] flex flex-col hover:border-blue-100 transition-colors">
                        <label className="border-2 border-dashed border-gray-100 rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50/80 hover:border-primary/30 transition-all group p-8 mb-6 bg-gray-50/30">
                            <input type="file" multiple accept=".pdf,.doc,.docx" className="hidden" onChange={handleFileSelect} />
                            <div className="size-16 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-sm">
                                <span className="material-symbols-outlined text-3xl">cloud_upload</span>
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
                                                <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 border ${file.status === 'COMPLETED' ? 'bg-green-50 text-green-500 border-green-100' :
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
                            className="w-full bg-gray-900 hover:bg-black disabled:bg-gray-100 disabled:text-gray-400 text-white h-14 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-xl shadow-gray-900/20 disabled:shadow-none"
                        >
                            {isAnalyzing ? (
                                <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <span className="material-symbols-outlined filled">auto_awesome</span>
                            )}
                            {isExtractingJd ? 'Extracting JD Details...' : isAnalyzing ? 'Scoring Pipeline...' : 'Score Resumes'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Results Section */}
            <div className="flex flex-col gap-6 mt-8">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-500/30">
                            <span className="material-symbols-outlined text-[20px]">analytics</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">Scoring Results</h2>
                            <p className="text-xs text-gray-500 font-medium">AI-ranked candidates based on job requirements</p>
                        </div>
                    </div>
                    {files.filter(f => f.status === 'COMPLETED').length > 0 && (
                        <div className="px-4 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-bold flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                            Analysis Complete
                        </div>
                    )}
                </div>

                <div className="min-h-[300px]">
                    {files.length === 0 || files.every(f => f.status === 'READY') ? (
                        <div className="bg-white/60 backdrop-blur-sm rounded-3xl border border-white/50 shadow-sm flex flex-col items-center justify-center p-20 text-center">
                            <div className="size-20 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl flex items-center justify-center text-gray-300 mb-6 shadow-inner">
                                <span className="material-symbols-outlined text-[48px]">grid_view</span>
                            </div>
                            <h3 className="text-gray-800 font-bold text-lg mb-2">No Results Yet</h3>
                            <p className="text-gray-500 font-medium max-w-sm text-sm">
                                Upload resumes above and click <span className="text-primary font-bold">'Score Resumes'</span> to unlock AI-powered insights.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {files
                                .filter(f => f.status !== 'READY')
                                .sort((a, b) => (b.result?.matchScore || 0) - (a.result?.matchScore || 0))
                                .map((file, idx) => {
                                    const score = file.result?.matchScore || 0;
                                    const isCompleted = file.status === 'COMPLETED';
                                    const isError = file.status === 'ERROR';

                                    // Dynamic gradients based on score
                                    const scoreGradient = score >= 80 ? 'from-green-400 to-emerald-600' :
                                        score >= 60 ? 'from-yellow-400 to-orange-500' :
                                            'from-red-400 to-pink-600';

                                    const cardBorder = score >= 80 ? 'hover:border-green-200' :
                                        score >= 60 ? 'hover:border-yellow-200' :
                                            'hover:border-red-200';

                                    return (
                                        <div
                                            key={file.id}
                                            className={`group relative bg-white rounded-2xl p-5 border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${cardBorder}`}
                                        >
                                            <div className="flex flex-col md:flex-row items-center gap-6">

                                                {/* Rank & Score Visual */}
                                                <div className="relative shrink-0 flex items-center justify-center">
                                                    <div className="relative size-20">
                                                        <svg className="size-full rotate-[-90deg]" viewBox="0 0 36 36">
                                                            <path className="text-gray-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                                            {isCompleted && (
                                                                <path
                                                                    className={`transition-all duration-1000 ease-out drop-shadow-md ${score >= 80 ? 'text-emerald-500' : score >= 60 ? 'text-orange-500' : 'text-pink-500'}`}
                                                                    strokeDasharray={`${score}, 100`}
                                                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    strokeWidth="3"
                                                                    strokeLinecap="round"
                                                                />
                                                            )}
                                                        </svg>
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                            {isCompleted ? (
                                                                <>
                                                                    <span className="text-2xl font-black text-gray-800 tracking-tighter">{score}</span>
                                                                    <span className="text-[9px] font-bold text-gray-400 uppercase">Match</span>
                                                                </>
                                                            ) : isError ? (
                                                                <span className="material-symbols-outlined text-red-400 text-2xl">error</span>
                                                            ) : (
                                                                <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Rank Badge */}
                                                    {isCompleted && (
                                                        <div className={`absolute -top-1 -left-1 size-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg ${idx === 0 ? 'bg-orange-500 ring-2 ring-white' :
                                                            idx === 1 ? 'bg-gray-400 ring-2 ring-white' :
                                                                idx === 2 ? 'bg-orange-700 ring-2 ring-white' : 'bg-gray-800'
                                                            }`}>
                                                            #{idx + 1}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Candidate Info */}
                                                <div className="flex-1 text-center md:text-left min-w-0">
                                                    <h3 className="text-lg font-bold text-gray-800 truncate">
                                                        {file.result?.candidateName || file.name}
                                                    </h3>
                                                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-1">
                                                        {file.result?.currentRole && (
                                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium truncate max-w-[200px]">
                                                                {file.result.currentRole}
                                                            </span>
                                                        )}
                                                        {file.result?.deepAnalysis?.experienceMatchLevel && (
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${file.result.deepAnalysis.experienceMatchLevel === 'High' ? 'bg-green-100 text-green-700' :
                                                                'bg-gray-100 text-gray-500'
                                                                }`}>
                                                                {file.result.deepAnalysis.experienceMatchLevel} Fit
                                                            </span>
                                                        )}
                                                    </div>

                                                    {isCompleted && (
                                                        <p className="text-xs text-gray-500 mt-3 line-clamp-2 md:line-clamp-1 leading-relaxed">
                                                            {file.result?.analysis}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Detailed Metrics */}
                                                {isCompleted && (
                                                    <div className="flex items-center gap-6 px-4 py-2 border-l border-r border-gray-50 mx-4">
                                                        {[
                                                            { label: 'JD Match', val: file.result?.jdMatchScore, icon: 'description' },
                                                            { label: 'Skills', val: file.result?.qualificationMatchScore, icon: 'school' },
                                                            { label: 'Resume', val: file.result?.resumeMatchScore, icon: 'badge' }
                                                        ].map((metric, mIdx) => (
                                                            <div key={mIdx} className="flex flex-col items-center gap-1 group/metric cursor-help relative">
                                                                <div className="relative size-10">
                                                                    <svg className="size-full rotate-[-90deg]" viewBox="0 0 36 36">
                                                                        <path className="text-gray-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                                                        <path
                                                                            className={`${metric.val >= 70 ? 'text-blue-500' : 'text-gray-400'}`}
                                                                            strokeDasharray={`${metric.val || 0}, 100`}
                                                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                                            fill="none"
                                                                            stroke="currentColor"
                                                                            strokeWidth="4"
                                                                            strokeLinecap="round"
                                                                        />
                                                                    </svg>
                                                                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-600">
                                                                        {metric.val}%
                                                                    </div>
                                                                </div>
                                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{metric.label}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Actions */}
                                                <div className="shrink-0">
                                                    <button
                                                        onClick={() => setSelectedCandidate(file.result)}
                                                        disabled={!isCompleted || !file.result?.deepAnalysis}
                                                        className="h-10 px-5 bg-gray-900 text-white text-sm font-bold rounded-xl shadow-lg shadow-gray-200 hover:shadow-gray-400 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none flex items-center gap-2 group/btn"
                                                    >
                                                        <span>Analysis</span>
                                                        <span className="material-symbols-outlined text-[18px] group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    )}
                </div>
            </div>
            {/* Deep Analysis Modal */}
            {selectedCandidate && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[92vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div className="flex items-center gap-4">
                                <div className="size-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                                    <span className="material-symbols-outlined text-2xl">person_search</span>
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800">{selectedCandidate.candidateName}</h2>
                                    <p className="text-sm text-gray-500">{selectedCandidate.currentRole} • {selectedCandidate.experienceYears} Years Exp.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedCandidate(null)}
                                className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-all"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Score Overview on Top */}
                        <div className="grid grid-cols-3 gap-4 p-6 bg-white border-b border-gray-100">
                            {[
                                { label: 'JD Match', score: selectedCandidate.jdMatchScore, reason: selectedCandidate.jdMatchReason },
                                { label: 'Qualification', score: selectedCandidate.qualificationMatchScore, reason: selectedCandidate.qualificationMatchReason },
                                { label: 'Resume Quality', score: selectedCandidate.resumeMatchScore, reason: selectedCandidate.resumeMatchReason }
                            ].map((item, idx) => (
                                <div key={idx} className="flex flex-col items-center p-4 rounded-xl bg-gray-50 border border-gray-100">
                                    <div className="relative size-16 flex items-center justify-center mb-2">
                                        <svg height="64" width="64" className="rotate-[-90deg]">
                                            <circle
                                                stroke="currentColor"
                                                fill="transparent"
                                                strokeWidth="4"
                                                strokeDasharray={`${26 * 2 * Math.PI} ${26 * 2 * Math.PI}`}
                                                style={{ strokeDashoffset: 26 * 2 * Math.PI - (item.score / 100) * 26 * 2 * Math.PI }}
                                                r="26" cx="32" cy="32"
                                                className={`${item.score >= 80 ? 'text-green-500' : item.score >= 50 ? 'text-yellow-500' : 'text-red-500'} transition-all`}
                                            />
                                            <circle stroke="#e5e7eb" fill="transparent" strokeWidth="4" r="26" cx="32" cy="32" className="opacity-20 absolute top-0 left-0" style={{ zIndex: -1 }} />
                                        </svg>
                                        <span className={`absolute text-sm font-bold ${item.score >= 80 ? 'text-green-600' : item.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>{item.score}%</span>
                                    </div>
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{item.label}</span>
                                    <p className="text-[10px] text-center text-gray-400 leading-tight px-2">{item.reason}</p>
                                </div>
                            ))}
                        </div>

                        {/* Content Scrollable */}
                        <div className="overflow-y-auto p-6 space-y-8">
                            {/* Executive Summary */}
                            <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100">
                                <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-lg">summarize</span>
                                    Executive Summary
                                </h3>
                                <p className="text-sm text-gray-700 leading-relaxed">
                                    {selectedCandidate.deepAnalysis?.executiveSummary || selectedCandidate.analysis}
                                </p>
                            </div>

                            {/* SWOT Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Strengths */}
                                <div className="space-y-3">
                                    <h3 className="text-xs font-bold text-green-600 uppercase tracking-widest flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">check_circle</span>
                                        Strengths
                                    </h3>
                                    <ul className="space-y-2">
                                        {selectedCandidate.deepAnalysis?.strengths?.map((item: string, i: number) => (
                                            <li key={i} className="text-sm text-gray-600 bg-green-50/50 p-3 rounded-lg border border-green-100 flex gap-2 items-start">
                                                <span className="text-green-500 text-xs mt-0.5">●</span>
                                                {item}
                                            </li>
                                        )) || <p className="text-sm text-gray-400 italic">No specific strengths listed.</p>}
                                    </ul>
                                </div>

                                {/* Weaknesses */}
                                <div className="space-y-3">
                                    <h3 className="text-xs font-bold text-red-600 uppercase tracking-widest flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">warning</span>
                                        Weaknesses
                                    </h3>
                                    <ul className="space-y-2">
                                        {selectedCandidate.deepAnalysis?.weaknesses?.map((item: string, i: number) => (
                                            <li key={i} className="text-sm text-gray-600 bg-red-50/50 p-3 rounded-lg border border-red-100 flex gap-2 items-start">
                                                <span className="text-red-500 text-xs mt-0.5">●</span>
                                                {item}
                                            </li>
                                        )) || <p className="text-sm text-gray-400 italic">No specific weaknesses listed.</p>}
                                    </ul>
                                </div>

                                {/* Missing Skills */}
                                <div className="space-y-3">
                                    <h3 className="text-xs font-bold text-orange-600 uppercase tracking-widest flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">do_not_disturb_on</span>
                                        Missing Skills
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedCandidate.deepAnalysis?.missingSkills?.map((item: string, i: number) => (
                                            <span key={i} className="px-3 py-1.5 bg-orange-50 text-orange-700 text-xs font-medium rounded-lg border border-orange-100">
                                                {item}
                                            </span>
                                        )) || <p className="text-sm text-gray-400 italic">No missing skills identified.</p>}
                                    </div>
                                </div>

                                {/* Matched Skills */}
                                <div className="space-y-3 col-span-1 md:col-span-3">
                                    <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">verified</span>
                                        Matched Skills
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedCandidate.deepAnalysis?.skillsMatched?.map((item: string, i: number) => (
                                            <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg border border-blue-100">
                                                {item}
                                            </span>
                                        )) || <p className="text-sm text-gray-400 italic">No specific skills matched.</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Analysis & Fit */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center justify-between">
                                        <div className="flex items-center gap-2"><span className="material-symbols-outlined text-sm">history_edu</span> Experience Relevance</div>
                                        {selectedCandidate.deepAnalysis?.experienceMatchLevel && (
                                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase border ${selectedCandidate.deepAnalysis.experienceMatchLevel === 'High' ? 'bg-green-100 text-green-700 border-green-200' :
                                                selectedCandidate.deepAnalysis.experienceMatchLevel === 'Medium' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                                    'bg-red-100 text-red-700 border-red-200'
                                                }`}>{selectedCandidate.deepAnalysis.experienceMatchLevel} Match</span>
                                        )}
                                    </h3>
                                    <div className="mb-3">
                                        {selectedCandidate.deepAnalysis?.roleSimilarity && (
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase">Role Similarity:</span>
                                                <span className={`text-[10px] font-bold ${selectedCandidate.deepAnalysis.roleSimilarity === 'High' ? 'text-green-600' :
                                                    selectedCandidate.deepAnalysis.roleSimilarity === 'Medium' ? 'text-yellow-600' :
                                                        'text-red-600'
                                                    }`}>{selectedCandidate.deepAnalysis.roleSimilarity}</span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        {selectedCandidate.deepAnalysis?.experienceRelevance || "Not available."}
                                    </p>
                                </div>
                                <div className="bg-purple-50/50 rounded-xl p-5 border border-purple-100">
                                    <h3 className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">diversity_3</span>
                                        Cultural Fit
                                    </h3>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        {selectedCandidate.deepAnalysis?.culturalFit || "Not available."}
                                    </p>
                                </div>
                            </div>

                            {/* Interview Questions */}
                            <div>
                                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">quiz</span>
                                    Suggested Interview Questions
                                </h3>
                                <div className="grid grid-cols-1 gap-3">
                                    {selectedCandidate.deepAnalysis?.interviewQuestions?.map((q: string, i: number) => (
                                        <div key={i} className="flex gap-4 p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-primary/20 transition-all">
                                            <span className="size-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                                                {i + 1}
                                            </span>
                                            <p className="text-sm text-gray-700 font-medium">{q}</p>
                                        </div>
                                    )) || <p className="text-sm text-gray-400 italic">No questions generated.</p>}
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={() => setSelectedCandidate(null)}
                                className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 transition-all"
                            >
                                Close Report
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default ResumeScore;
