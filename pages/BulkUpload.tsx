
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Job, Candidate } from '../types';
import { analyzeResume } from '../services/ai';

interface UploadFile {
  id: string;
  file: File;
  name: string;
  size: string;
  status: 'READY' | 'READING' | 'PARSING' | 'COMPLETED' | 'ERROR';
  progress: number;
  result?: any;
}

const BulkUpload: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchJobs = async () => {
      const data = await db.jobs.find();
      setJobs(data);
      if (data.length > 0) setSelectedJobId(data[0].id);
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

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result as string;
        resolve(base64String.split(',')[1]);
      };
      reader.onerror = error => reject(error);
    });
  };



  const startAnalysis = async () => {
    console.log("[BULK UPLOAD] Starting analysis. Files count:", files.length, "Job ID:", selectedJobId);
    setErrorMsg(null);

    if (!selectedJobId || files.length === 0) {
      console.warn("[BULK UPLOAD] Missing job selection or files.");
      return;
    }

    setIsAnalyzing(true);
    try {
      const allJobs = await db.jobs.find();
      let currentJob = allJobs.find(j => j.id === selectedJobId);

      if (!currentJob) {
        console.error("[BULK UPLOAD] Selected job not found in DB:", selectedJobId);
        setErrorMsg("The selected job could not be found in the database. Please refresh.");
        return;
      }

      console.log("[BULK UPLOAD] Target job found:", currentJob.title);

      for (let i = 0; i < files.length; i++) {
        const currentFile = files[i];
        if (currentFile.status === 'COMPLETED') continue;

        // THROTTLE: Wait 3 seconds between requests (Free Tier Limit: 15 RPM)
        if (i > 0) {
          console.log(`[BULK UPLOAD] Throttling for 3s...`);
          await new Promise(r => setTimeout(r, 3000));
        }

        console.log(`[BULK UPLOAD] Processing file ${i + 1}/${files.length}: ${currentFile.name}`);
        setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'PARSING', progress: 30 } : f));

        try {
          console.log(`[BULK UPLOAD] Sending ${currentFile.name} to Gemini...`);
          const data = await analyzeResume(currentFile.file, {
            title: currentJob.title,
            skills: currentJob.skills
          });

          const matchScore = Number(data.matchScore) || 0;
          console.log(`[BULK UPLOAD] AI Analysis received for ${currentFile.name}: ${matchScore}%`);

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

          console.log(`[BULK UPLOAD] Saving candidate ${newCandidate.name} to DB...`);
          await db.candidates.insertOne(newCandidate);

          console.log(`[BULK UPLOAD] Updating job stats for ${currentJob.title}...`);
          const updatedJob = await db.jobs.updateOne(currentJob.id, {
            applicantsCount: (currentJob.applicantsCount || 0) + 1,
            matchesCount: (matchScore > 80) ? (currentJob.matchesCount || 0) + 1 : (currentJob.matchesCount || 0)
          });

          if (updatedJob) currentJob = updatedJob;

          setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'COMPLETED', progress: 100, result: { ...data, matchScore } } : f));
          console.log(`[BULK UPLOAD] File ${i + 1} completed successfully.`);
        } catch (err: any) {
          console.error(`[BULK UPLOAD] Error analyzing file ${currentFile.name}:`, err);

          let friendlyMsg = `Error with ${currentFile.name}`;
          if (err.message?.includes('429')) {
            friendlyMsg = "Google API Daily Quota Exceeded! Please wait or use a different API Key.";
          } else {
            friendlyMsg = `Error: ${err.message || 'API Issue'}`;
          }

          setErrorMsg(friendlyMsg);
          setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'ERROR', progress: 0 } : f));
          if (err.message?.includes('429')) break;
        }
      }

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (globalErr: any) {
      console.error("[BULK UPLOAD] Global analysis error:", globalErr);
      setErrorMsg(`System Error: ${globalErr.message || 'Unknown'}`);
    } finally {
      setIsAnalyzing(false);
      console.log("[BULK UPLOAD] Analysis session finished.");
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div className="flex flex-col gap-8">
      {errorMsg && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[60] w-[90%] max-w-md">
          <div className="bg-red-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
            <span className="material-symbols-outlined">error</span>
            <span className="font-bold text-sm">{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="ml-auto opacity-70 hover:opacity-100">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[60] animate-bounce w-[90%] max-w-md">
          <div className="bg-accent text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
            <span className="material-symbols-outlined">verified</span>
            <span className="font-bold text-sm text-center">Batch Analysis Complete! Resumes are now viewable.</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 flex flex-col gap-6 md:gap-8">
          <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-soft border border-blue-50 transition-all">
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <h2 className="text-lg md:text-xl font-bold text-text-main tracking-tight">Select Target Job</h2>
              <div className="bg-blue-50 p-2 rounded-xl">
                <span className="material-symbols-outlined text-primary text-[20px]">work</span>
              </div>
            </div>
            <div className="relative group mb-6">
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full appearance-none bg-background-main hover:bg-blue-50/50 border-none rounded-2xl px-5 py-3.5 md:py-4 pr-12 text-sm font-bold text-text-main focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
              >
                {jobs.map(job => (
                  <option key={job.id} value={job.id}>{job.title}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none text-xl group-hover:text-primary transition-colors">expand_more</span>
            </div>

            {selectedJobId && (
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                <p className="text-[9px] md:text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Requirement Context</p>
                <div className="flex flex-wrap gap-2">
                  {jobs.find(j => j.id === selectedJobId)?.skills.map(skill => (
                    <span key={skill} className="px-2 py-1 bg-white text-[9px] font-bold rounded-lg border border-primary/10 text-primary truncate max-w-[120px]">{skill}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="hidden lg:flex bg-white rounded-[2rem] p-8 shadow-soft border border-blue-50 flex-1 flex-col">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-text-main tracking-tight">AI Pro Engine</h3>
              <span className="material-symbols-outlined text-accent animate-pulse">auto_awesome</span>
            </div>
            <div className="space-y-6">
              {[
                { icon: 'verified_user', color: 'bg-orange-50 text-orange-500', label: 'Gemini 3 Pro', desc: 'Highest reasoning accuracy' },
                { icon: 'description', color: 'bg-blue-50 text-primary', label: 'Persistence', desc: 'Saves file for later viewing' },
                { icon: 'query_stats', color: 'bg-purple-50 text-purple-500', label: 'Strict Scoring', desc: 'Critical skill gap analysis' }
              ].map(rule => (
                <div key={rule.label} className="flex items-center gap-4">
                  <div className={`h-11 w-11 rounded-2xl ${rule.color} flex items-center justify-center border border-current/10 shrink-0`}>
                    <span className="material-symbols-outlined text-[20px]">{rule.icon}</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-text-main">{rule.label}</p>
                    <p className="text-[10px] text-text-tertiary font-medium mt-0.5">{rule.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col gap-6 md:gap-8">
          <label className={`bg-white rounded-[2.5rem] p-8 md:p-12 shadow-soft border-2 border-dashed transition-all group cursor-pointer relative overflow-hidden flex flex-col items-center justify-center py-12 md:py-16 text-center ${files.length > 0 ? 'border-primary/20 bg-blue-50/5' : 'border-blue-100 hover:border-primary/50 hover:bg-blue-50/20'}`}>
            <input type="file" multiple className="hidden" onChange={handleFileSelect} accept=".pdf,.docx,.jpg,.png" />
            <div className="absolute -right-16 -top-16 h-64 w-64 bg-blue-50 rounded-full blur-3xl opacity-30 pointer-events-none"></div>
            <div className={`h-16 w-16 md:h-20 md:w-20 bg-primary text-white rounded-[1.2rem] md:rounded-[1.5rem] flex items-center justify-center mb-5 md:mb-6 shadow-xl shadow-blue-500/20 group-hover:scale-110 transition-all`}>
              <span className="material-symbols-outlined text-3xl md:text-4xl">cloud_upload</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-text-main mb-2 tracking-tight">
              {files.length > 0 ? `${files.length} Resumes Ready` : 'Drop Resumes for Matching'}
            </h2>
            <p className="text-text-tertiary text-xs md:text-sm font-medium mb-6 md:mb-8 max-w-[280px] md:max-w-sm">Files will be analyzed and stored in simulated MongoDB.</p>
            <div className="bg-white border border-blue-100 text-text-main px-6 md:px-8 py-2.5 md:py-3 rounded-2xl font-bold shadow-sm active:scale-95 transition-all text-[10px] md:text-xs uppercase tracking-widest hover:bg-blue-50">
              {files.length > 0 ? 'Add More' : 'Browse Files'}
            </div>
          </label>

          <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-soft border border-blue-50 flex-1 flex flex-col min-h-[400px]">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg md:text-xl font-bold text-text-main tracking-tight">Analysis Pipeline</h3>
              <div className="flex gap-3">
                <span className="bg-blue-50 text-primary text-[9px] md:text-[10px] font-bold px-3 md:px-4 py-1.5 md:py-2 rounded-xl border border-blue-100 uppercase tracking-widest">{files.length} In Queue</span>
              </div>
            </div>

            <div className="flex-1 space-y-3 md:space-y-4 overflow-y-auto pr-2 no-scrollbar min-h-[300px]">
              {files.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-text-tertiary opacity-40">
                  <span className="material-symbols-outlined text-5xl md:text-6xl mb-4">analytics</span>
                  <p className="font-bold uppercase tracking-widest text-[10px] md:text-xs">Awaiting Input</p>
                </div>
              ) : (
                files.map((file) => (
                  <div key={file.id} className={`p-4 md:p-5 rounded-[1.2rem] md:rounded-[1.5rem] bg-background-main border border-transparent hover:border-blue-100 hover:bg-white hover:shadow-sm transition-all flex items-center gap-3 md:gap-5 group`}>
                    <div className={`h-11 w-11 md:h-14 md:w-14 rounded-xl md:rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0 border border-blue-50/50 ${file.status === 'COMPLETED' ? 'text-accent' : file.status === 'ERROR' ? 'text-accent-red' : 'text-primary'}`}>
                      <span className="material-symbols-outlined text-xl md:text-2xl">
                        {file.status === 'COMPLETED' ? 'check_circle' : file.status === 'ERROR' ? 'warning' : 'description'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1.5 md:mb-2">
                        <p className={`text-xs md:text-sm font-bold truncate ${file.status === 'ERROR' ? 'text-accent-red' : 'text-text-main'}`}>{file.name}</p>
                        <div className="flex items-center gap-2">
                          {file.status === 'COMPLETED' && (
                            <span className="text-[8px] md:text-[9px] font-bold text-accent bg-accent/5 px-1.5 py-0.5 rounded-md border border-accent/10 whitespace-nowrap">{file.result?.matchScore}%</span>
                          )}
                          <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-lg uppercase tracking-widest border shrink-0 ${file.status === 'READY' ? 'text-text-tertiary bg-white border-blue-50' :
                            file.status === 'READING' || file.status === 'PARSING' ? 'text-primary bg-blue-50 border-blue-100 animate-pulse' :
                              file.status === 'COMPLETED' ? 'text-white bg-accent border-accent' :
                                'text-accent-red bg-red-50 border-red-100'
                            }`}>
                            {file.status}
                          </span>
                        </div>
                      </div>
                      {file.status === 'PARSING' || file.status === 'READING' ? (
                        <div className="h-1.5 w-full bg-blue-100 rounded-full overflow-hidden mt-2">
                          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${file.progress}%` }}></div>
                        </div>
                      ) : file.status === 'COMPLETED' ? (
                        <p className="text-[9px] md:text-[10px] text-text-tertiary font-medium italic mt-0.5 line-clamp-1">AI Verdict: {file.result?.analysis}</p>
                      ) : (
                        <p className="text-[9px] md:text-[10px] text-text-tertiary font-bold uppercase tracking-wider">{file.size} • JSON Storage Ready</p>
                      )}
                    </div>
                    {!isAnalyzing && file.status !== 'COMPLETED' && (
                      <button onClick={() => removeFile(file.id)} className="h-9 w-9 md:h-10 md:w-10 rounded-xl flex items-center justify-center text-text-tertiary hover:bg-white hover:text-accent-red hover:shadow-soft transition-all opacity-0 group-hover:opacity-100 border border-transparent hover:border-red-50 shrink-0">
                        <span className="material-symbols-outlined text-[18px] md:text-[20px]">delete</span>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="mt-8 pt-8 border-t border-blue-50 flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
              <button onClick={() => setFiles([])} className="order-2 sm:order-1 px-8 py-3.5 rounded-2xl text-[10px] md:text-xs font-bold text-text-tertiary hover:text-primary transition-all uppercase tracking-widest active:scale-95">
                Reset Collection
              </button>
              <button
                onClick={startAnalysis}
                disabled={isAnalyzing || files.length === 0 || files.every(f => f.status === 'COMPLETED')}
                className="order-1 sm:order-2 w-full sm:w-auto px-10 py-3.5 md:py-4 rounded-2xl bg-primary text-white text-[10px] md:text-xs font-bold hover:bg-primary-hover shadow-xl shadow-blue-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-3 uppercase tracking-widest active:scale-95"
              >
                {isAnalyzing ? (
                  <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span className="material-symbols-outlined text-[18px]">psychology</span>
                )}
                {isAnalyzing ? 'Deep Analyzing...' : 'High Accuracy Match'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkUpload;
