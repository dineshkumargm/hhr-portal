import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db } from '../services/db';
import { Candidate, Job } from '../types';

interface CandidatesProps {
  onCandidateClick: (id: string) => void;
}

const Candidates: React.FC<CandidatesProps> = ({ onCandidateClick }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const jobIdFromUrl = searchParams.get('jobId');

  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(jobIdFromUrl);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterScoreRange, setFilterScoreRange] = useState<string>('All');
  const [locationSearch, setLocationSearch] = useState<string>('');
  const [filterDateRange, setFilterDateRange] = useState<string>('All');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const allJobs = await db.jobs.find();
        setJobs(allJobs);

        const currentJobId = jobIdFromUrl || (allJobs.length > 0 ? allJobs[0].id : null);
        if (currentJobId && currentJobId !== selectedJobId) {
          setSelectedJobId(currentJobId);
        }

        // Fetch candidates for the current/selected job
        if (currentJobId) {
          const filteredCandidates = await db.candidates.find({ associatedJdId: currentJobId });
          setCandidates(filteredCandidates);
        } else {
          const allCandidates = await db.candidates.find();
          setCandidates(allCandidates);
        }
      } catch (err) {
        console.error("Failed to load candidates:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [jobIdFromUrl]);

  const handleJobChange = (jobId: string) => {
    setSelectedJobId(jobId);
    setSearchParams({ jobId });
  };

  // Helper function to parse date from various formats
  const parseDate = (dateString: string): Date | null => {
    if (!dateString) return null;

    // Try parsing common date formats
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date;
    }

    // Try parsing formats like "Jan 9, 2026"
    const parsed = Date.parse(dateString);
    if (!isNaN(parsed)) {
      return new Date(parsed);
    }

    return null;
  };

  // Helper function to check if date matches filter
  const matchesDateFilter = (candidateDate: string): boolean => {
    if (filterDateRange === 'All') return true;

    const candidateDateObj = parseDate(candidateDate);
    if (!candidateDateObj) return true; // If can't parse, include it

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const candidateDateOnly = new Date(candidateDateObj.getFullYear(), candidateDateObj.getMonth(), candidateDateObj.getDate());

    switch (filterDateRange) {
      case 'Today':
        return candidateDateOnly.getTime() === today.getTime();

      case 'Last 7 Days':
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return candidateDateOnly >= sevenDaysAgo && candidateDateOnly <= today;

      case 'Last 30 Days':
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return candidateDateOnly >= thirtyDaysAgo && candidateDateOnly <= today;

      case 'This Month':
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return candidateDateOnly >= firstDayOfMonth && candidateDateOnly <= today;

      case 'Last Month':
        const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        return candidateDateOnly >= firstDayLastMonth && candidateDateOnly <= lastDayLastMonth;

      case 'This Year':
        const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
        return candidateDateOnly >= firstDayOfYear && candidateDateOnly <= today;

      default:
        return true;
    }
  };

  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      const matchStatus = filterStatus === 'All' || c.status === filterStatus;

      let matchScore = true;
      if (filterScoreRange === 'High') matchScore = (c.matchScore >= 80);
      else if (filterScoreRange === 'Medium') matchScore = (c.matchScore >= 50 && c.matchScore < 80);
      else if (filterScoreRange === 'Low') matchScore = (c.matchScore < 50);

      const matchLocation = !locationSearch ||
        c.location.toLowerCase().includes(locationSearch.toLowerCase());

      const matchDate = matchesDateFilter(c.appliedDate);

      return matchStatus && matchScore && matchLocation && matchDate;
    });
  }, [candidates, filterStatus, filterScoreRange, locationSearch, filterDateRange]);

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  const resetFilters = () => {
    setFilterStatus('All');
    setFilterScoreRange('All');
    setLocationSearch('');
    setFilterDateRange('All');
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-soft border border-blue-50">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-6 mb-8">
          <div className="flex flex-col gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">Select Role To View Applicants</span>
              {selectedJob?.status === 'Active' && (
                <span className="px-2 py-0.5 rounded-md bg-accent/10 text-accent text-[9px] font-bold uppercase tracking-widest animate-pulse border border-accent/20">Active Hiring</span>
              )}
            </div>

            <div className="relative w-full lg:min-w-[400px] h-[60px] bg-background-main hover:bg-blue-50/50 rounded-2xl transition-all border border-transparent hover:border-blue-100 group cursor-pointer flex items-center px-6">
              <span className="text-lg md:text-xl font-bold text-text-main tracking-tight block truncate pr-10 pointer-events-none">
                {selectedJob?.title || 'Select Role'}
              </span>

              <select
                value={selectedJobId || ''}
                onChange={(e) => handleJobChange(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                aria-label="Select Role"
              >
                {jobs.map(job => (
                  <option key={job.id} value={job.id}>{job.title}</option>
                ))}
                {jobs.length === 0 && <option disabled>No jobs available</option>}
              </select>

              <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center text-text-tertiary group-hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-[28px]">expand_more</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] md:text-xs text-text-secondary mt-1 ml-1">
              <span className="font-bold text-primary">{selectedJob?.department}</span>
              <span className="w-1 h-1 rounded-full bg-gray-300"></span>
              <span>{selectedJob?.location}</span>
              <span className="w-1 h-1 rounded-full bg-gray-300"></span>
              <span>{candidates.length} Total Applicants</span>
            </div>
          </div>

          <div className="flex items-center justify-between w-full lg:w-auto gap-4">
            <div className="flex flex-col items-end">
              <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest mb-1">Average Match</p>
              <p className="text-xl md:text-2xl font-bold text-primary">
                {candidates.length > 0
                  ? `${Math.round(candidates.reduce((acc, c) => acc + (c.matchScore || 0), 0) / candidates.length)}%`
                  : '0%'
                }
              </p>
            </div>
            <div className="h-10 w-px bg-blue-100 mx-2"></div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3.5 md:p-4 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center gap-2 ${showFilters ? 'bg-primary text-white' : 'bg-white border border-blue-100 text-primary shadow-blue-500/5'}`}
            >
              <span className="material-symbols-outlined text-[20px]">{showFilters ? 'filter_list_off' : 'filter_list'}</span>
              <span className="text-xs font-bold uppercase tracking-widest">
                {showFilters ? 'Hide' : 'Filter'}
              </span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 overflow-hidden transition-all duration-300 ease-in-out ${showFilters ? 'max-h-[600px] md:max-h-40 opacity-100 mt-2 pb-2' : 'max-h-0 opacity-0'}`}>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-tertiary uppercase ml-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full h-11 bg-background-main border-none rounded-xl text-xs font-bold text-text-main focus:ring-2 focus:ring-primary/20"
            >
              <option value="All">All Statuses</option>
              <option value="New">New</option>
              <option value="Interviewing">Interviewing</option>
              <option value="Shortlisted">Shortlisted</option>
              <option value="Rejected">Rejected</option>
              <option value="Offer Sent">Offer Sent</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-tertiary uppercase ml-1">Match Score</label>
            <select
              value={filterScoreRange}
              onChange={(e) => setFilterScoreRange(e.target.value)}
              className="w-full h-11 bg-background-main border-none rounded-xl text-xs font-bold text-text-main focus:ring-2 focus:ring-primary/20"
            >
              <option value="All">Any Score</option>
              <option value="High">High Match (80%+)</option>
              <option value="Medium">Medium (50-79%)</option>
              <option value="Low">Low Match (&lt;50%)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-tertiary uppercase ml-1">Date Stored</label>
            <select
              value={filterDateRange}
              onChange={(e) => setFilterDateRange(e.target.value)}
              className="w-full h-11 bg-background-main border-none rounded-xl text-xs font-bold text-text-main focus:ring-2 focus:ring-primary/20"
            >
              <option value="All">All Dates</option>
              <option value="Today">Today</option>
              <option value="Last 7 Days">Last 7 Days</option>
              <option value="Last 30 Days">Last 30 Days</option>
              <option value="This Month">This Month</option>
              <option value="Last Month">Last Month</option>
              <option value="This Year">This Year</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-tertiary uppercase ml-1">Location</label>
            <div className="relative">
              <input
                type="text"
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                placeholder="Search city..."
                className="w-full h-11 bg-background-main border-none rounded-xl text-xs font-bold text-text-main focus:ring-2 focus:ring-primary/20 pl-10"
              />
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-sm">location_on</span>
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={resetFilters}
              className="w-full h-11 bg-white border border-blue-100 text-[10px] font-bold text-text-tertiary hover:text-accent-red hover:bg-red-50 rounded-xl transition-all uppercase tracking-widest"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      <section className="bg-white rounded-[2.5rem] shadow-card border border-blue-50 overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-96">
            <div className="size-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
            <p className="text-text-tertiary text-sm font-bold uppercase tracking-widest">Loading Candidates...</p>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-center px-10">
            <div className="size-20 bg-blue-50 rounded-full flex items-center justify-center text-primary/30 mb-6">
              <span className="material-symbols-outlined text-[48px]">person_search</span>
            </div>
            <h3 className="text-xl font-bold text-text-main mb-2 tracking-tight">
              {candidates.length > 0 ? 'No Matches Found' : 'No Applicants Found'}
            </h3>
            <p className="text-text-tertiary text-sm max-w-xs mb-8">
              {candidates.length > 0
                ? 'Try adjusting your filters to find the right candidates.'
                : 'No resumes have been analyzed for this role yet. Use the Upload tool to start matching.'}
            </p>
            {candidates.length > 0 && (
              <button onClick={resetFilters} className="px-8 py-3 bg-primary text-white rounded-2xl text-xs font-bold hover:bg-primary-hover transition-all shadow-lg shadow-blue-500/10 uppercase tracking-widest">
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
              {filteredCandidates.map((candidate) => (
                <div
                  key={candidate.id}
                  onClick={() => onCandidateClick(candidate.id)}
                  className="bg-background-main/50 rounded-3xl p-5 border border-blue-50 active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-14 w-14 flex-shrink-0 relative">
                      <img className="size-full rounded-2xl object-cover shadow-sm ring-2 ring-white" src={candidate.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(candidate.name)}&background=1E40AF&color=fff`} alt="" />
                      <div className={`absolute -bottom-1 -right-1 size-4 rounded-full border-2 border-white shadow-sm ${candidate.matchScore > 85 ? 'bg-accent' : 'bg-text-tertiary'}`}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-text-main text-lg tracking-tight truncate">{candidate.name}</div>
                      <div className="text-[10px] text-text-tertiary font-bold uppercase tracking-wider">{candidate.location}</div>
                    </div>
                    <div className="relative size-12 shrink-0">
                      <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                        <path className="stroke-blue-50 fill-none" strokeWidth="4" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path className={`${candidate.matchScore > 80 ? 'stroke-accent' : candidate.matchScore > 60 ? 'stroke-primary' : 'stroke-text-tertiary'} fill-none transition-all duration-1000`} strokeWidth="4" strokeDasharray={`${candidate.matchScore} 100`} strokeLinecap="round" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold text-text-main">{candidate.matchScore}%</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-blue-50/50">
                    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest border ${candidate.status === 'Interviewing' ? 'bg-blue-50 text-primary border-blue-100' :
                      candidate.status === 'Shortlisted' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                        candidate.status === 'Rejected' ? 'bg-red-50 text-accent-red border-red-100' :
                          candidate.status === 'New' ? 'bg-green-50 text-accent border-green-100' :
                            'bg-white text-text-secondary border-gray-200'
                      }`}>
                      {candidate.status}
                    </span>
                    <span className="text-[10px] text-text-tertiary font-medium">{candidate.appliedDate}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-blue-50 bg-background-main/30">
                    <th className="py-6 pl-10 pr-3 text-left text-[11px] font-bold text-text-tertiary uppercase tracking-widest">Candidate Info</th>
                    <th className="px-3 py-6 text-left text-[11px] font-bold text-text-tertiary uppercase tracking-widest">Parsed Role</th>
                    <th className="px-3 py-6 text-left text-[11px] font-bold text-text-tertiary uppercase tracking-widest">Date Stored</th>
                    <th className="px-3 py-6 text-left text-[11px] font-bold text-text-tertiary uppercase tracking-widest">Pipeline</th>
                    <th className="px-3 py-6 text-center text-[11px] font-bold text-text-tertiary uppercase tracking-widest">AI Match</th>
                    <th className="relative py-6 pl-3 pr-10"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-50">
                  {filteredCandidates.map((candidate) => (
                    <tr
                      key={candidate.id}
                      onClick={() => onCandidateClick(candidate.id)}
                      className="group hover:bg-blue-50/40 transition-all cursor-pointer"
                    >
                      <td className="whitespace-nowrap py-6 pl-10 pr-3">
                        <div className="flex items-center">
                          <div className="h-12 w-12 flex-shrink-0 relative">
                            <img className="size-full rounded-2xl object-cover shadow-sm ring-2 ring-white group-hover:ring-primary/10 transition-all" src={candidate.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(candidate.name)}&background=1E40AF&color=fff`} alt="" />
                            <div className={`absolute -bottom-1 -right-1 size-3.5 rounded-full border-2 border-white shadow-sm ${candidate.matchScore > 85 ? 'bg-accent' : 'bg-text-tertiary'}`}></div>
                          </div>
                          <div className="ml-4">
                            <div className="font-bold text-text-main text-[16px] tracking-tight group-hover:text-primary transition-colors">{candidate.name}</div>
                            <div className="text-[11px] text-text-tertiary font-bold uppercase tracking-wider">{candidate.location}</div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-6">
                        <div className="text-text-main font-bold text-sm">{candidate.role}</div>
                        <div className="text-[10px] text-primary font-bold uppercase tracking-widest mt-0.5">Verified Profile</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-6 text-xs text-text-secondary font-bold">
                        {candidate.appliedDate}
                      </td>
                      <td className="whitespace-nowrap px-3 py-6">
                        <span className={`inline-flex items-center rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border ${candidate.status === 'Interviewing' ? 'bg-blue-50 text-primary border-blue-100' :
                          candidate.status === 'Shortlisted' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                            candidate.status === 'Rejected' ? 'bg-red-50 text-accent-red border-red-100' :
                              candidate.status === 'New' ? 'bg-green-50 text-accent border-green-100' :
                                'bg-white text-text-secondary border-gray-200 shadow-sm'
                          }`}>
                          {candidate.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-6 text-center">
                        <div className="relative size-12 mx-auto group-hover:scale-110 transition-transform">
                          <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                            <path className="stroke-blue-50 fill-none" strokeWidth="3.5" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            <path className={`${candidate.matchScore > 80 ? 'stroke-accent' : candidate.matchScore > 60 ? 'stroke-primary' : 'stroke-text-tertiary'} fill-none transition-all duration-1000`} strokeWidth="3.5" strokeDasharray={`${candidate.matchScore} 100`} strokeLinecap="round" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center text-[11px] font-extrabold text-text-main tracking-tighter">{candidate.matchScore}%</div>
                        </div>
                      </td>
                      <td className="relative whitespace-nowrap py-6 pl-3 pr-10 text-right">
                        <button className="h-10 w-10 flex items-center justify-center rounded-xl text-text-tertiary hover:text-primary hover:bg-blue-50 transition-all border border-transparent hover:border-blue-100">
                          <span className="material-symbols-outlined">chevron_right</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default Candidates;
