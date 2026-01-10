
import React, { useState, useRef, useEffect } from 'react';
import { Job } from '../types';
import { db } from '../services/db';
import { extractJobDetailsFromPDF } from '../services/ai';

const JobManagement: React.FC = () => {
  const [parsing, setParsing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [extractedSkills, setExtractedSkills] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    department: 'Engineering',
    location: '',
    type: 'Full-time'
  });

  // Fetch jobs from "MongoDB" on mount
  useEffect(() => {
    const fetchJobs = async () => {
      const data = await db.jobs.find();
      setJobs(data);
    };
    fetchJobs();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setUploadedFile(file);
      processFileWithAI(file);
    } else if (file) {
      alert("Please upload a PDF file for the Job Description.");
    }
  };

  const processFileWithAI = async (file: File) => {
    setParsing(true);
    try {
      const extractedData = await extractJobDetailsFromPDF(file);

      setFormData({
        title: extractedData.title || '',
        department: extractedData.department || 'Engineering',
        location: extractedData.location || '',
        type: extractedData.type || 'Full-time'
      });
      setExtractedSkills(extractedData.skills || []);
    } catch (err) {
      console.error("AI Parsing Error:", err);
      const message = err instanceof Error ? err.message : "Failed to extract details from PDF.";
      alert(message);
    } finally {
      setParsing(false);
    }
  };

  const handlePublish = async () => {
    if (!formData.title) return;

    setPublishing(true);
    await new Promise(r => setTimeout(r, 800));

    const newJob: Job = {
      id: `j-${Date.now()}`,
      title: formData.title,
      department: formData.department,
      location: formData.location || 'Remote',
      type: formData.type,
      status: 'Active',
      applicantsCount: 0,
      matchesCount: 0,
      skills: extractedSkills.length > 0 ? extractedSkills : ['New Role', formData.title.split(' ')[0]],
      jdFileName: uploadedFile?.name
    };

    // Store in MongoDB
    await db.jobs.insertOne(newJob);

    // Refresh local UI state
    const updatedJobs = await db.jobs.find();
    setJobs(updatedJobs);

    setPublishing(false);
    setShowSuccess(true);

    // Reset form
    setFormData({ title: '', department: 'Engineering', location: '', type: 'Full-time' });
    setUploadedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleDeleteJob = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this job? All associated data will be removed.")) return;

    const success = await db.jobs.deleteOne(id);
    if (success) {
      setJobs(prev => prev.filter(j => j.id !== id));
      if (expandedJobId === id) setExpandedJobId(null);
    } else {
      alert("Failed to delete job.");
    }
  };

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setUploadedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setFormData({ title: '', department: 'Engineering', location: '', type: 'Full-time' });
  };

  return (
    <div className="max-w-[1200px] mx-auto flex flex-col gap-8">
      {showSuccess && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-accent text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
            <span className="material-symbols-outlined">check_circle</span>
            <span className="font-bold">Job Listing Stored in DB!</span>
          </div>
        </div>
      )}

      <section className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-card border border-blue-50">
        <div className="flex flex-col sm:flex-row justify-between items-start mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 text-primary">
              <span className="material-symbols-outlined text-[24px] md:text-[28px] font-bold">description</span>
              <h3 className="text-xl md:text-2xl font-bold tracking-tight">Post a New Opening</h3>
            </div>
            <p className="text-text-tertiary text-[11px] md:text-sm ml-8 md:ml-9 font-medium">Persisted to MongoDB collection.</p>
          </div>
          <button className="hidden sm:block px-6 py-2.5 text-[11px] font-bold text-text-main bg-white border border-blue-100 rounded-full hover:bg-blue-50 transition-all uppercase tracking-widest shadow-sm">Manual Entry</button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
          <div className="w-full lg:w-1/3 flex-shrink-0">
            <div
              onClick={() => !parsing && !publishing && fileInputRef.current?.click()}
              className={`h-full min-h-[220px] md:min-h-[300px] border-2 border-dashed rounded-[2rem] transition-all cursor-pointer group flex flex-col items-center justify-center p-6 text-center relative overflow-hidden ${uploadedFile ? 'border-primary/30 bg-blue-50/10' : 'border-blue-100 bg-blue-50/20 hover:bg-blue-50/40 hover:border-blue-200'
                }`}
            >
              <input type="file" className="hidden" ref={fileInputRef} accept=".pdf" onChange={handleFileUpload} />

              {parsing ? (
                <div className="flex flex-col items-center gap-4 md:gap-6 z-10">
                  <div className="relative size-20 md:size-24">
                    <div className="absolute inset-0 border-4 border-primary/20 rounded-3xl"></div>
                    <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-3xl animate-spin"></div>
                    <span className="material-symbols-outlined absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary text-3xl md:text-4xl">picture_as_pdf</span>
                  </div>
                  <p className="text-primary font-bold text-lg md:text-xl">AI Parsing...</p>
                </div>
              ) : uploadedFile ? (
                <div className="flex flex-col items-center gap-4 md:gap-5 z-10 w-full">
                  <div className="size-16 md:size-20 rounded-2xl bg-white shadow-soft flex items-center justify-center text-red-500 border border-red-50">
                    <span className="material-symbols-outlined text-[32px] md:text-[40px]">picture_as_pdf</span>
                  </div>
                  <div className="w-full">
                    <h4 className="text-text-main font-bold text-sm md:text-base truncate px-4">{uploadedFile.name}</h4>
                    <p className="text-text-tertiary text-[10px] md:text-[11px] font-bold uppercase mt-1">{(uploadedFile.size / 1024).toFixed(1)} KB • PDF</p>
                  </div>
                  <div className="flex gap-2 w-full px-2 md:px-4 mt-2">
                    <button onClick={(e) => { e.stopPropagation(); processFileWithAI(uploadedFile); }} className="flex-1 bg-primary text-white py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-lg">Scan</button>
                    <button onClick={removeFile} className="size-10 bg-white text-accent-red border border-red-50 rounded-xl flex items-center justify-center shadow-sm">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="size-14 md:size-16 rounded-full bg-white flex items-center justify-center mb-4 shadow-soft border border-blue-50 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-primary text-[24px] md:text-[32px]">upload_file</span>
                  </div>
                  <h4 className="text-text-main font-bold text-lg">Upload JD PDF</h4>
                  <p className="text-text-tertiary text-xs mt-2 font-medium">Extract details automatically</p>
                </>
              )}
            </div>
          </div>

          <div className="w-full lg:w-2/3 flex flex-col justify-between">
            <div className="space-y-6 md:space-y-8">
              <div className="flex items-center justify-between pb-3 border-b border-blue-50">
                <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.1em] text-text-tertiary">Position Details</span>
                <button onClick={() => setFormData({ title: '', department: 'Engineering', location: '', type: 'Full-time' })} className="text-[10px] md:text-xs text-text-secondary font-bold hover:text-primary uppercase tracking-widest">Clear</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 md:gap-x-8 md:gap-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-secondary ml-1">Job Title</label>
                  <input className="w-full h-12 md:h-14 rounded-2xl border-none bg-background-main text-sm px-5 focus:ring-2 focus:ring-primary/20 text-text-main font-semibold" placeholder="Machine Learning Engineer" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-secondary ml-1">Department</label>
                  <select className="w-full h-12 md:h-14 rounded-2xl border-none bg-background-main text-sm px-5 focus:ring-2 focus:ring-primary/20 text-text-main cursor-pointer font-semibold" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })}>
                    <option>Engineering</option><option>Product</option><option>Design</option><option>Marketing</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-secondary ml-1">Location</label>
                  <input className="w-full h-12 md:h-14 rounded-2xl border-none bg-background-main text-sm px-5 focus:ring-2 focus:ring-primary/20 text-text-main font-semibold" placeholder="Coimbatore" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-secondary ml-1">Type</label>
                  <select className="w-full h-12 md:h-14 rounded-2xl border-none bg-background-main text-sm px-5 focus:ring-2 focus:ring-primary/20 text-text-main cursor-pointer font-semibold" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                    <option>Full-time</option><option>Contract</option><option>Freelance</option>
                  </select>
                </div>
              </div>
            </div>

            <button onClick={handlePublish} disabled={!formData.title || publishing} className="w-full mt-8 md:mt-10 bg-primary hover:bg-primary-hover text-white font-bold h-14 md:h-16 rounded-[1.2rem] md:rounded-[1.5rem] text-sm md:text-base shadow-xl disabled:opacity-50 group flex items-center justify-center gap-3 active:scale-95 transition-all">
              {publishing ? <div className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Publish Opening <span className="material-symbols-outlined text-[20px] md:text-[22px] group-hover:translate-x-1 transition-transform">send</span></>}
            </button>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <h3 className="text-text-main text-xl md:text-2xl font-bold tracking-tight">Active Listings</h3>
        <div className="grid grid-cols-1 gap-4 md:gap-6">
          {jobs.map((job) => {
            const isExpanded = expandedJobId === job.id;
            return (
              <div
                key={job.id}
                onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                className={`bg-white rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-8 shadow-soft border border-blue-50 hover:shadow-xl transition-all duration-300 group cursor-pointer ${isExpanded ? 'ring-2 ring-primary/20' : ''}`}
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="flex items-center gap-4">
                    <div className={`size-12 md:size-14 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 transition-colors ${isExpanded ? 'bg-primary text-white' : 'bg-blue-50 text-primary'}`}>
                      <span className="material-symbols-outlined text-xl md:text-2xl">{job.department === 'Engineering' ? 'code' : 'design_services'}</span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-text-main font-bold text-lg md:text-xl truncate group-hover:text-primary transition-colors">{job.title}</h4>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                        <p className="text-text-tertiary text-[10px] md:text-[11px] font-bold uppercase">{job.location} • {job.department} • {job.type}</p>
                        <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-blue-100"></span>
                        <span className="text-[9px] md:text-[10px] font-bold text-accent uppercase tracking-wider">{job.status}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-full md:w-auto gap-10">
                    <div className="flex gap-8">
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] md:text-[10px] text-text-tertiary font-bold uppercase mb-1">Applicants</span>
                        <span className="text-xl md:text-2xl font-bold text-text-main">{job.applicantsCount}</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] md:text-[10px] text-text-tertiary font-bold uppercase mb-1">Matches</span>
                        <div className="flex items-center gap-1 text-primary">
                          <span className="material-symbols-outlined text-xs">smart_toy</span>
                          <span className="text-xl md:text-2xl font-bold">{job.matchesCount}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`material-symbols-outlined text-text-tertiary transition-transform duration-300 ${isExpanded ? 'rotate-180 text-primary' : ''}`}>expand_more</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-6 md:mt-8 pt-6 md:pt-8 border-t border-blue-50 animate-[fadeIn_0.3s_ease-out]">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
                      <div className="space-y-6">
                        <div>
                          <h5 className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-text-tertiary mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px]">psychology</span>
                            Required Skills
                          </h5>
                          <div className="flex flex-wrap gap-2">
                            {job.skills.map(skill => (
                              <span key={skill} className="px-2.5 py-1.5 rounded-xl bg-blue-50/50 text-primary text-[10px] md:text-[11px] font-semibold border border-blue-100/50">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h5 className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-text-tertiary mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px]">description</span>
                            Position Overview
                          </h5>
                          <div className="bg-background-main/50 p-4 md:p-5 rounded-2xl border border-blue-50">
                            <p className="text-xs md:text-sm text-text-secondary leading-relaxed">
                              {job.jdFileName
                                ? `Analyzed from file: ${job.jdFileName}. Position focuses on core ${job.department} competencies in ${job.location}.`
                                : `Standardised profile for ${job.title} within the ${job.department} team.`
                              }
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col justify-between gap-6 md:gap-0">
                        <div className="bg-gradient-to-br from-blue-50 to-white p-5 md:p-6 rounded-3xl border border-blue-100 flex items-center justify-between shadow-sm">
                          <div className="flex items-center gap-4">
                            <div className="size-10 md:size-12 rounded-xl md:rounded-2xl bg-white shadow-soft flex items-center justify-center text-primary">
                              <span className="material-symbols-outlined text-xl">auto_awesome</span>
                            </div>
                            <div>
                              <p className="text-[9px] md:text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Match Ratio</p>
                              <p className="text-xs md:text-sm font-bold text-text-main truncate max-w-[120px] md:max-w-none">
                                {job.matchesCount > 0 ? 'Verified Match Pipeline' : 'Awaiting Matches'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl md:text-2xl font-bold text-primary">{Math.round((job.matchesCount / (job.applicantsCount || 1)) * 100)}%</p>
                          </div>
                        </div>

                        <div className="mt-4 md:mt-8 flex flex-col sm:flex-row gap-3">
                          <button className="flex-1 h-12 md:h-14 bg-primary text-white rounded-xl md:rounded-2xl text-[10px] md:text-xs font-bold uppercase tracking-widest hover:bg-primary-hover shadow-lg shadow-blue-500/10 active:scale-95 transition-all flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-[18px] md:text-[20px]">group</span>
                            View Candidates
                          </button>
                          <button className="h-12 md:h-14 sm:w-14 bg-white border border-blue-100 text-text-secondary rounded-xl md:rounded-2xl flex items-center justify-center hover:bg-blue-50 transition-colors shadow-sm">
                            <span className="material-symbols-outlined text-[18px] md:text-[20px]">edit</span>
                          </button>
                          <button
                            onClick={(e) => handleDeleteJob(e, job.id)}
                            className="h-12 md:h-14 sm:w-14 bg-red-50 border border-red-100 text-accent-red rounded-xl md:rounded-2xl flex items-center justify-center hover:bg-red-100 transition-colors shadow-sm"
                          >
                            <span className="material-symbols-outlined text-[18px] md:text-[20px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default JobManagement;
