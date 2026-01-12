import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Job, Candidate } from '../types';
import { analyzeResume, fileToBase64, extractJobDetailsFromPDF, ExtractedJobDetails } from '../services/ai';

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

    // New State for JD Upload
    const [jobSource, setJobSource] = useState<'database' | 'upload'>('database');
    const [uploadedJdFile, setUploadedJdFile] = useState<File | null>(null);
    const [parsedJd, setParsedJd] = useState<ExtractedJobDetails | null>(null);
    const [isParsingJd, setIsParsingJd] = useState(false);

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

    const handleJdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadedJdFile(file);
        setParsedJd(null);
        setIsParsingJd(true);
        setErrorMsg(null);

        try {
            console.log("[JD PARSE] Starting analysis of uploaded JD:", file.name);
            const details = await extractJobDetailsFromPDF(file);
            console.log("[JD PARSE] Success:", details);
            setParsedJd(details);
        } catch (err: any) {
            console.error("[JD PARSE] Failed:", err);
            setErrorMsg(`Failed to parse Job Description: ${err.message}. Please try a clearer PDF.`);
            setUploadedJdFile(null); // Reset on error
        } finally {
            setIsParsingJd(false);
        }
    };

    const removeFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const startAnalysis = async () => {
        console.log("[RESUME SCORE] Starting analysis. Files count:", files.length, "Source:", jobSource);
        setErrorMsg(null);

        // Validation based on source
        if (jobSource === 'database' && !selectedJobId) {
            setErrorMsg("Please select a job from the list.");
            return;
        }
        if (jobSource === 'upload' && !parsedJd) {
            setErrorMsg("Please upload and let AI parse a Job Description first.");
            return;
        }
        if (files.length === 0) {
            setErrorMsg("Please upload at least one resume.");
            return;
        }

        setIsAnalyzing(true);
        try {
            // Determine Job Context
            let jobContext: { title: string, skills: string[], description?: string, location?: string } | null = null;
            let currentJobId = selectedJobId;

            if (jobSource === 'database') {
                const allJobs = await db.jobs.find();
                const job = allJobs.find(j => j.id === selectedJobId);
                if (!job) throw new Error("Selected job not found in database.");
                jobContext = {
                    title: job.title,
                    skills: job.skills || [],
                    description: job.description,
                    location: job.location
                };
            } else {
                // Upload Source
                if (!parsedJd) throw new Error("No parsed JD available.");
                jobContext = {
                    title: parsedJd.title,
                    skills: parsedJd.skills,
                    description: `Department: ${parsedJd.department}. Type: ${parsedJd.type}. ${parsedJd.title}.`,
                    location: parsedJd.location
                };
                currentJobId = 'temp-uploaded-jd'; // Placeholder ID for uploaded context
            }

            console.log("[RESUME SCORE] Using Job Context:", jobContext.title);

            for (let i = 0; i < files.length; i++) {
                const currentFile = files[i];
                if (currentFile.status === 'COMPLETED') continue;

                if (i > 0) {
                    await new Promise(r => setTimeout(r, 3000));
                }

                console.log(`[RESUME SCORE] Processing file ${i + 1}/${files.length}: ${currentFile.name}`);
                setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'READING', progress: 10 } : f));

                try {
                    setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'PARSING', progress: 30 } : f));

                    const data = await analyzeResume(currentFile.file, {
                        title: jobContext.title,
                        skills: jobContext.skills,
                        description: jobContext.description
                    });

                    const matchScore = Number(data.matchScore) || 0;
                    setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, progress: 80 } : f));

                    const base64Data = await fileToBase64(currentFile.file);

                    const newCandidate: Candidate = {
                        id: `c-${Date.now()}-${i}`,
                        name: data.candidateName || currentFile.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, ' '),
                        role: data.currentRole || jobContext.title,
                        company: 'Extracted Profile',
                        location: jobContext.location || 'Remote',
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
                        associatedJdId: currentJobId,
                        analysis: data.analysis,
                        resumeBase64: (currentFile.file.size < 1 * 1024 * 1024) ? base64Data : "",
                        resumeMimeType: currentFile.file.type
                    };

                    console.log(`[RESUME SCORE] Saving candidate ${newCandidate.name} to DB...`);
                    await db.candidates.insertOne(newCandidate);

                    // Only update job stats if it's a real database job
                    if (jobSource === 'database') {
                        const allJobs = await db.jobs.find(); // Re-fetch to be safe
                        const currentJob = allJobs.find(j => j.id === selectedJobId);
                        if (currentJob) {
                            await db.jobs.updateOne(currentJob.id, {
                                applicantsCount: (currentJob.applicantsCount || 0) + 1,
                                matchesCount: (matchScore > 80) ? (currentJob.matchesCount || 0) + 1 : (currentJob.matchesCount || 0)
                            });
                        }
                    }

                    setFiles(prev => prev.map((f, idx) => idx === i ?
                        { ...f, status: 'COMPLETED', progress: 100, result: data } : f));

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
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2 text-gray-500 font-bold">
                            <span className="material-symbols-outlined text-[20px]">business_center</span>
                            <span className="text-sm">Job Context</span>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm min-h-[500px] flex flex-col">
                        {/* Source Toggle Tabs */}
                        <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
                            <button
                                onClick={() => setJobSource('database')}
                                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${jobSource === 'database' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Select Existing Job
                            </button>
                            <button
                                onClick={() => setJobSource('upload')}
                                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${jobSource === 'upload' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Upload JD File
                            </button>
                        </div>

                        {jobSource === 'database' ? (
                            // Existing Job Selection UI
                            <>
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
                                            <div className="flex-1 bg-gray-50 rounded-xl p-4 border border-gray-100 overflow-y-auto max-h-[400px]">
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
                            </>
                        ) : (
                            // Upload JD UI
                            <div className="flex-1 flex flex-col">
                                {!parsedJd && !isParsingJd ? (
                                    <label className="flex-1 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50/50 hover:border-blue-200 transition-all group p-8 bg-gray-50/30">
                                        <input type="file" accept=".pdf" className="hidden" onChange={handleJdUpload} />
                                        <div className="size-16 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm group-hover:shadow-purple-200">
                                            <span className="material-symbols-outlined text-3xl">upload_file</span>
                                        </div>
                                        <h3 className="text-base font-bold text-gray-700 mb-1">Upload JD File</h3>
                                        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">PDF Only (Max 5MB)</p>
                                        <p className="text-xs text-purple-400 mt-4 px-4">AI will extract title, skills, and requirements automatically.</p>
                                    </label>
                                ) : isParsingJd ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                                        <div className="size-16 border-4 border-purple-100 border-t-purple-500 rounded-full animate-spin mb-6"></div>
                                        <h3 className="text-lg font-bold text-gray-800 mb-2">Analyzing Job Description...</h3>
                                        <p className="text-sm text-gray-500">Extracting key requirements and skills context.</p>
                                    </div>
                                ) : parsedJd && (
                                    <div className="flex-1 flex flex-col">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
                                                <span className="material-symbols-outlined text-sm">check_circle</span>
                                                <span className="text-xs font-bold uppercase tracking-wider">JD Parsed Successfully</span>
                                            </div>
                                            <button
                                                onClick={() => { setParsedJd(null); setUploadedJdFile(null); }}
                                                className="text-xs font-bold text-red-400 hover:text-red-600 px-2 py-1"
                                            >
                                                REMOVE
                                            </button>
                                        </div>

                                        <div className="flex-1 bg-purple-50/50 rounded-xl p-5 border border-purple-100 overflow-y-auto max-h-[400px]">
                                            <div className="space-y-4">
                                                <div>
                                                    <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">Job Title</span>
                                                    <h3 className="text-lg font-black text-gray-800 leading-tight mt-1">{parsedJd.title}</h3>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Department</span>
                                                        <p className="text-sm font-medium text-gray-700 mt-0.5">{parsedJd.department}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Location</span>
                                                        <p className="text-sm font-medium text-gray-700 mt-0.5">{parsedJd.location}</p>
                                                    </div>
                                                </div>

                                                <div>
                                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Required Skills</span>
                                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                                        {parsedJd.skills.map((skill, idx) => (
                                                            <span key={idx} className="px-2.5 py-1 bg-white border border-purple-100 text-purple-700 text-xs font-bold rounded-lg shadow-sm">
                                                                {skill}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
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
                            disabled={isAnalyzing || files.length === 0 || (jobSource === 'database' && (!selectedJobId || jobs.length === 0)) || (jobSource === 'upload' && !parsedJd)}
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
                    <div className="flex flex-col gap-8 pb-10">
                        {files.length === 0 || files.every(f => f.status === 'READY') ? (
                            <div className="bg-white/50 backdrop-blur-xl rounded-[2rem] border border-white/40 shadow-xl shadow-blue-500/5 flex-1 flex flex-col items-center justify-center p-24 text-center">
                                <div className="size-24 bg-gradient-to-tr from-blue-50 to-indigo-100 rounded-[2rem] flex items-center justify-center text-primary mb-8 animate-pulse shadow-inner">
                                    <span className="material-symbols-outlined text-[52px]">analytics</span>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-800 mb-3 tracking-tight">Ready to analyze</h3>
                                <p className="text-gray-400 font-medium max-w-sm mx-auto leading-relaxed">
                                    Upload resumes and select a job to see advanced AI-driven candidate matching insights.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {files
                                    .filter(f => f.status !== 'READY')
                                    .sort((a, b) => (b.result?.matchScore || 0) - (a.result?.matchScore || 0))
                                    .map((file, idx) => {
                                        const score = file.result?.matchScore || 0;
                                        const isHigh = score >= 80;
                                        const isMid = score >= 50;

                                        const scoreColor = isHigh ? 'text-emerald-500' : isMid ? 'text-amber-500' : 'text-rose-500';
                                        const scoreBg = isHigh ? 'bg-emerald-500' : isMid ? 'bg-amber-500' : 'bg-rose-500';

                                        const renderMetric = (label: string, value: number, reason: string) => (
                                            <div className="group/metric relative flex flex-col items-center gap-1.5 p-3 rounded-2xl hover:bg-gray-50/80 transition-all cursor-default w-24">
                                                <div className="relative size-12 flex items-center justify-center">
                                                    <svg className="size-full rotate-[-90deg]" viewBox="0 0 40 40">
                                                        <circle cx="20" cy="20" r="18" fill="transparent" stroke="currentColor" strokeWidth="3" strokeDasharray={`${2 * Math.PI * 18}`} strokeDashoffset={`${2 * Math.PI * 18 * (1 - value / 100)}`} className={`${value >= 80 ? 'text-emerald-400' : value >= 50 ? 'text-amber-400' : 'text-rose-400'} transition-all duration-1000`} />
                                                        <circle cx="20" cy="20" r="18" fill="transparent" stroke="gray" strokeWidth="3" strokeOpacity="0.08" />
                                                    </svg>
                                                    <span className="absolute text-[10px] font-black text-gray-700 tracking-tighter">{value}%</span>
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>

                                                {/* Refined Tooltip: Better positioning and logic */}
                                                <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-48 opacity-0 group-hover/metric:opacity-100 pointer-events-none transition-all duration-300 transform translate-y-2 group-hover/metric:translate-y-0 z-[60]">
                                                    <div className="bg-gray-900/95 backdrop-blur-md text-white text-[10px] p-4 rounded-[1.5rem] shadow-2xl border border-white/10 leading-relaxed text-center">
                                                        <div className="font-bold mb-1.5 opacity-40 uppercase tracking-[0.2em] text-[8px]">{label} Analysis</div>
                                                        {reason}
                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[8px] border-transparent border-t-gray-900/95"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        );

                                        return (
                                            <div key={file.id} className="group/card bg-white rounded-[3rem] p-5 border border-gray-100 shadow-sm hover:shadow-2xl hover:border-blue-200/50 transition-all duration-700 animate-in slide-in-from-bottom-8 fade-in duration-1000 relative">
                                                <div className="flex flex-col lg:flex-row gap-8 items-stretch">

                                                    {/* Left Section: Context */}
                                                    <div className="flex items-center gap-6 pr-6 lg:border-r lg:border-gray-50/50">
                                                        <div className="text-4xl font-black text-gray-300 group-hover/card:text-blue-200 transition-colors duration-700 leading-none select-none">#{idx + 1}</div>
                                                        <div className="relative group/avatar shrink-0">
                                                            <div className="size-24 rounded-[2.5rem] bg-gradient-to-br from-gray-50 via-blue-50/20 to-indigo-50/30 p-1 flex items-center justify-center overflow-hidden border border-blue-100/30 shadow-inner group-hover/avatar:rotate-2 transition-transform duration-700">
                                                                <div className="size-full rounded-[2.2rem] bg-white flex items-center justify-center text-primary font-black text-4xl shadow-sm">
                                                                    {file.result?.candidateName?.charAt(0)?.toUpperCase() || '?'}
                                                                </div>
                                                            </div>
                                                            <div className={`absolute -bottom-1 -right-1 size-8 rounded-[1rem] ${scoreBg} border-4 border-white flex items-center justify-center shadow-lg transform group-hover/avatar:scale-110 transition-transform duration-500`}>
                                                                <span className="material-symbols-outlined text-white text-[16px] filled">auto_awesome</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Middle Section: Main Info */}
                                                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-4">
                                                        <div>
                                                            <h3 className="text-2xl font-black text-gray-800 tracking-tight group-hover/card:text-primary transition-colors duration-700 truncate mb-1">
                                                                {file.result?.candidateName || file.name}
                                                            </h3>
                                                            <div className="flex items-center gap-3">
                                                                <p className="text-xs font-bold text-gray-400 flex items-center gap-1.5 uppercase tracking-wider">
                                                                    <span className="material-symbols-outlined text-sm">work</span>
                                                                    {file.result?.currentRole || 'Talent Profile'}
                                                                </p>
                                                                <span className="size-1 bg-gray-200 rounded-full"></span>
                                                                <p className="text-xs font-bold text-blue-500/70 flex items-center gap-1.5 uppercase tracking-wider">
                                                                    <span className="material-symbols-outlined text-sm">location_on</span>
                                                                    Remote
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-wrap items-center gap-2">
                                                            {file.result?.deepAnalysis?.skillsMatched?.slice(0, 5).map((skill: string, i: number) => (
                                                                <span key={i} className="px-3.5 py-1.5 bg-gray-50/50 text-gray-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-gray-100 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100 transition-all duration-300">
                                                                    {skill}
                                                                </span>
                                                            ))}
                                                            {file.result?.deepAnalysis?.skillsMatched?.length > 5 && (
                                                                <span className="text-[10px] text-gray-300 font-bold ml-1">+{file.result.deepAnalysis.skillsMatched.length - 5} MORE</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Right Section: Visual Insights */}
                                                    <div className="flex flex-col sm:flex-row items-center gap-8 pl-8 pr-4 bg-gray-50/30 rounded-[2.5rem] border border-gray-100/30">
                                                        {/* Secondary Rounds */}
                                                        <div className="flex items-center gap-1">
                                                            {renderMetric('JD Match', file.result?.jdMatchScore || 0, file.result?.jdMatchReason)}
                                                            {renderMetric('Quals', file.result?.qualificationMatchScore || 0, file.result?.qualificationMatchReason)}
                                                            {renderMetric('Quality', file.result?.resumeMatchScore || 0, file.result?.resumeMatchReason)}
                                                        </div>

                                                        {/* Master Circle & Button */}
                                                        <div className="flex flex-col items-center gap-5 min-w-[160px]">
                                                            <div className="group/main relative size-24 p-1.5 bg-white rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.05)] border border-gray-50 group-hover/card:shadow-blue-500/10 transition-all duration-700">
                                                                <div className="size-full rounded-full flex flex-col items-center justify-center relative">
                                                                    <svg className="absolute inset-0 size-full rotate-[-90deg]" viewBox="0 0 80 80">
                                                                        <circle cx="40" cy="40" r="34" fill="transparent" stroke="currentColor" strokeWidth="10" strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - score / 100)}`} className={`${scoreColor} transition-all duration-1000 ease-out`} />
                                                                        <circle cx="40" cy="40" r="34" fill="transparent" stroke="gray" strokeWidth="10" strokeOpacity="0.03" />
                                                                    </svg>
                                                                    <span className={`text-2xl font-black ${scoreColor} leading-none tracking-tighter`}>{score}%</span>
                                                                    <span className="text-[9px] font-black text-gray-400 mt-1 tracking-widest uppercase">Matching</span>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => setSelectedCandidate(file.result)}
                                                                disabled={file.status !== 'COMPLETED' || !file.result?.deepAnalysis}
                                                                className="w-full h-12 bg-gray-900 hover:bg-primary text-white text-[11px] font-black uppercase tracking-[0.15em] rounded-2xl shadow-xl shadow-gray-200 hover:shadow-blue-500/20 active:scale-95 transition-all duration-500 disabled:opacity-10 disabled:grayscale flex items-center justify-center gap-2 group-hover/card:bg-primary"
                                                            >
                                                                <span className="material-symbols-outlined text-[16px] filled">history_edu</span>
                                                                AI Insights
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Integrated Summary Footer */}
                                                <div className="mt-6 pt-5 border-t border-dashed border-gray-100/80">
                                                    <div className="bg-gradient-to-r from-blue-50/40 via-transparent to-transparent p-4 rounded-3xl border border-blue-50/20 group-hover/card:border-blue-100/50 transition-all duration-700">
                                                        <div className="flex items-start gap-3">
                                                            <div className="size-8 rounded-xl bg-blue-100/50 flex items-center justify-center text-blue-500 shrink-0">
                                                                <span className="material-symbols-outlined text-lg filled">auto_awesome</span>
                                                            </div>
                                                            <p className="text-sm text-gray-500 font-medium leading-relaxed italic pr-4">
                                                                {file.status === 'ERROR' ? 'Analysis failed for this file.' : file.result?.analysis || 'Calculating candidate alignment tokens...'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* Deep Analysis Modal */}
            {selectedCandidate && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
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
