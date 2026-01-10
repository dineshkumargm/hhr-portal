import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../services/db';
import { Candidate } from '../types';

const CandidateDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [showResume, setShowResume] = useState(false);

  useEffect(() => {
    const fetchCandidate = async () => {
      if (id) {
        setLoading(true);
        const data = await db.candidates.findOne({ id });
        setCandidate(data);
        setLoading(false);
      }
    };
    fetchCandidate();
  }, [id]);

  const handleDownload = () => {
    if (!candidate?.resumeBase64) return;
    const link = document.createElement('a');
    const mime = candidate.resumeMimeType || 'application/pdf';
    const ext = mime.split('/')[1] || 'pdf';
    link.href = `data:${mime};base64,${candidate.resumeBase64}`;
    link.download = `Resume_${candidate.name.replace(/\s+/g, '_')}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh]">
        <div className="size-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-6"></div>
        <p className="text-text-tertiary font-bold uppercase tracking-widest">Loading Profile Details...</p>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="bg-white rounded-[2.5rem] p-20 text-center shadow-soft border border-blue-50">
        <span className="material-symbols-outlined text-6xl text-text-tertiary mb-4">error</span>
        <h2 className="text-2xl font-bold text-text-main">Candidate Not Found</h2>
        <p className="text-text-tertiary mt-2">The requested profile does not exist in our database.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col xl:grid xl:grid-cols-12 gap-6 md:gap-8">
      {/* Left Column: Profile & Analysis */}
      <div className="flex flex-col gap-6 md:gap-8 xl:col-span-8 order-1">
        <div className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-soft border border-blue-50 flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-start text-center md:text-left">
          <div className="relative shrink-0">
            <div className="size-28 md:size-36 rounded-[1.5rem] md:rounded-[2rem] bg-cover bg-center shadow-lg ring-4 ring-white" style={{ backgroundImage: `url(${candidate.avatar || `https://ui-avatars.com/api/?name=${candidate.name}&background=random&color=fff`})` }}></div>
            <div className={`absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 ${candidate.matchScore > 80 ? 'bg-accent' : 'bg-primary'} size-7 md:size-8 rounded-full border-4 border-white shadow-sm flex items-center justify-center`}>
              <span className="material-symbols-outlined text-white text-[14px] md:text-[16px]">{candidate.matchScore > 80 ? 'verified' : 'person'}</span>
            </div>
          </div>
          <div className="flex-1 w-full">
            <div className="flex flex-col sm:flex-row justify-between items-center md:items-start mb-4 gap-4">
              <div>
                <h1 className="text-2xl md:text-4xl font-bold text-text-main mb-1 tracking-tight">{candidate.name}</h1>
                <p className="text-text-tertiary font-bold uppercase tracking-widest text-[10px] md:text-xs">{candidate.role}</p>
              </div>
              <span className={`px-4 py-1 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-widest border shrink-0 ${candidate.status === 'New' ? 'bg-blue-50 text-primary border-blue-100' :
                candidate.status === 'Rejected' ? 'bg-red-50 text-accent-red border-red-100' :
                  'bg-green-50 text-accent border-green-100'
                }`}>{candidate.status}</span>
            </div>
            <div className="flex flex-wrap gap-3 md:gap-4 justify-center md:justify-start mt-6 md:mt-8">
              <div className="bg-background-main px-4 md:px-5 py-2.5 md:py-3 rounded-2xl flex items-center gap-3 md:gap-4 border border-blue-50">
                <span className="bg-white p-2 rounded-xl shadow-sm text-primary flex items-center shrink-0">
                  <span className="material-symbols-outlined text-[18px] md:text-[20px]">location_on</span>
                </span>
                <div className="text-left">
                  <p className="text-[8px] md:text-[9px] text-text-tertiary font-bold uppercase tracking-widest">Location</p>
                  <p className="text-xs md:text-sm font-bold text-text-main">{candidate.location}</p>
                </div>
              </div>
              <div className="bg-background-main px-4 md:px-5 py-2.5 md:py-3 rounded-2xl flex items-center gap-3 md:gap-4 border border-blue-50">
                <span className="bg-white p-2 rounded-xl shadow-sm text-primary flex items-center shrink-0">
                  <span className="material-symbols-outlined text-[18px] md:text-[20px]">calendar_today</span>
                </span>
                <div className="text-left">
                  <p className="text-[8px] md:text-[9px] text-text-tertiary font-bold uppercase tracking-widest">Applied</p>
                  <p className="text-xs md:text-sm font-bold text-text-main">{candidate.appliedDate}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-row md:flex-col gap-3 shrink-0 mt-4 md:mt-0">
            <button className="size-10 md:size-12 rounded-full border border-blue-100 flex items-center justify-center text-text-secondary hover:text-primary hover:bg-blue-50 transition-all shadow-sm">
              <span className="material-symbols-outlined text-[20px]">mail</span>
            </button>
            <button
              onClick={() => setShowResume(true)}
              className="size-10 md:size-12 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-hover transition-all shadow-lg shadow-blue-500/20"
            >
              <span className="material-symbols-outlined text-[20px]">visibility</span>
            </button>
            <button
              onClick={handleDownload}
              className="size-10 md:size-12 rounded-full border border-blue-100 flex items-center justify-center text-text-secondary hover:text-primary hover:bg-blue-50 transition-all shadow-sm"
              title="Download Resume"
            >
              <span className="material-symbols-outlined text-[20px]">download</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-soft border border-blue-50 flex flex-col justify-between h-52 md:h-56 relative overflow-hidden">
            <div className="flex justify-between items-start z-10">
              <div className="flex flex-col">
                <span className="text-text-tertiary text-[10px] md:text-xs font-bold uppercase tracking-widest mb-1">AI Match Score</span>
                <span className="text-4xl md:text-5xl font-extrabold text-text-main tracking-tighter">{candidate.matchScore}%</span>
              </div>
              <span className={`${candidate.matchScore > 80 ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'} px-2.5 py-1 rounded-lg text-[9px] md:text-[10px] font-bold flex items-center gap-1 uppercase tracking-widest`}>
                <span className="material-symbols-outlined text-[12px] md:text-[14px]">auto_awesome</span> Verified
              </span>
            </div>
            <div className="absolute -bottom-8 -right-8 size-32 md:size-40 rounded-full border-[12px] md:border-[16px] border-blue-50/50 z-0"></div>
            <div className={`absolute -bottom-8 -right-8 size-32 md:size-40 rounded-full border-[12px] md:border-[16px] ${candidate.matchScore > 80 ? 'border-accent' : 'border-primary'} border-l-transparent border-b-transparent z-0 opacity-20`}></div>
            <div className="mt-auto z-10">
              <p className="text-[11px] md:text-xs font-bold text-text-main leading-relaxed italic border-l-4 border-primary pl-3 md:pl-4 py-1">"{candidate.analysis?.substring(0, 100) || 'Match complete'}..."</p>
            </div>
          </div>

          <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-soft border border-blue-50 flex flex-col justify-between h-52 md:h-56">
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <span className="text-text-tertiary text-[10px] md:text-xs font-bold uppercase tracking-widest mb-1">Status Tracking</span>
                <span className="text-2xl md:text-3xl font-extrabold text-text-main tracking-tight">{candidate.status}</span>
              </div>
              <div className="size-10 md:size-12 rounded-xl md:rounded-2xl bg-blue-50 text-primary flex items-center justify-center border border-blue-100">
                <span className="material-symbols-outlined text-[20px] md:text-[24px]">assignment_turned_in</span>
              </div>
            </div>
            <div className="flex gap-3 md:gap-4 mt-6">
              <button className="flex-1 bg-primary text-white py-3 md:py-3.5 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-bold hover:bg-primary-hover shadow-lg active:scale-95 transition-all">Interview</button>
              <button className="flex-1 bg-white border border-red-100 text-accent-red py-3 md:py-3.5 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-bold hover:bg-red-50 transition-all">Reject</button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] p-6 md:p-10 shadow-soft border border-blue-50">
          <h3 className="text-xl md:text-2xl font-bold text-text-main tracking-tight mb-6 md:mb-8">Detailed Resume Insight</h3>
          <div className="p-6 md:p-8 bg-background-main rounded-[1.5rem] md:rounded-[2rem] border border-blue-50">
            <div className="flex items-center gap-4 md:gap-6 mb-6 md:mb-8">
              <div className="size-14 md:size-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary shrink-0">
                <span className="material-symbols-outlined text-2xl md:text-3xl">psychology</span>
              </div>
              <div>
                <h4 className="font-bold text-base md:text-lg text-text-main">AI Summary</h4>
                <p className="text-[11px] md:text-sm text-text-tertiary font-medium">Deep semantic analysis results</p>
              </div>
            </div>
            <p className="text-[13px] md:text-sm text-text-secondary leading-relaxed font-medium">
              {candidate.analysis || 'The candidate demonstrates strong alignment with core requirements.'}
            </p>
          </div>
        </div>
      </div>

      {/* Right Column: Resume Viewer & Sidebar */}
      <div className="flex flex-col gap-6 md:gap-8 xl:col-span-4 order-2">
        <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-soft border border-blue-50 h-[450px] md:h-[520px] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base md:text-lg text-text-main">Resume Preview</h3>
              <span className="text-[9px] bg-blue-50 text-primary px-2 py-1 rounded-md font-bold uppercase">{candidate.resumeMimeType?.split('/')[1] || 'PDF'}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={handleDownload} className="size-9 md:size-10 rounded-full bg-background-main flex items-center justify-center hover:bg-blue-50 transition-colors shadow-sm text-text-secondary hover:text-primary">
                <span className="material-symbols-outlined text-[18px]">download</span>
              </button>
              <button onClick={() => setShowResume(true)} className="size-9 md:size-10 rounded-full bg-background-main flex items-center justify-center hover:bg-blue-50 transition-colors shadow-sm text-text-secondary hover:text-primary">
                <span className="material-symbols-outlined text-[18px]">open_in_full</span>
              </button>
            </div>
          </div>

          <div className="flex-1 bg-background-main rounded-2xl md:rounded-3xl relative overflow-hidden group border border-blue-50/50">
            {candidate.resumeBase64 ? (
              <div className="w-full h-full p-3 md:p-4 pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity">
                {candidate.resumeMimeType?.includes('pdf') ? (
                  <iframe src={`data:application/pdf;base64,${candidate.resumeBase64}#toolbar=0&navpanes=0&scrollbar=0`} className="w-full h-full border-none rounded-xl" />
                ) : candidate.resumeMimeType?.includes('image') ? (
                  <img src={`data:${candidate.resumeMimeType};base64,${candidate.resumeBase64}`} className="w-full h-full object-cover rounded-xl" alt="Resume" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-text-tertiary">
                    <span className="material-symbols-outlined text-4xl">description</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="absolute inset-6 md:inset-8 bg-white shadow-soft rounded-2xl p-6 opacity-60 scale-95 origin-top">
                <div className="w-1/3 h-2 bg-blue-100 rounded-full mb-4 md:mb-6"></div>
                <div className="space-y-2">
                  <div className="w-full h-1.5 bg-gray-50 rounded-full"></div>
                  <div className="w-full h-1.5 bg-gray-50 rounded-full"></div>
                  <div className="w-2/3 h-1.5 bg-gray-50 rounded-full"></div>
                </div>
              </div>
            )}

            <div className="absolute inset-0 flex items-center justify-center bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity gap-3 md:gap-4">
              <button onClick={() => setShowResume(true)} className="bg-primary text-white px-5 md:px-6 py-3 md:py-4 rounded-[1.2rem] md:rounded-[1.5rem] text-xs md:text-sm font-bold shadow-2xl transform translate-y-4 group-hover:translate-y-0 transition-transform flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">zoom_in</span> View
              </button>
              <button onClick={handleDownload} className="bg-white text-primary border border-blue-100 px-5 md:px-6 py-3 md:py-4 rounded-[1.2rem] md:rounded-[1.5rem] text-xs md:text-sm font-bold shadow-2xl transform translate-y-4 group-hover:translate-y-0 transition-transform flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">download</span> Get
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-soft border border-blue-50">
          <h3 className="font-bold text-base md:text-lg text-text-main mb-6">Internal Notes</h3>
          <div className="space-y-6">
            <div className="flex gap-3 md:gap-4">
              <div className="size-8 md:size-10 rounded-full bg-cover bg-center shrink-0 border-2 border-white shadow-sm" style={{ backgroundImage: `url(https://picsum.photos/seed/user1/40/40)` }}></div>
              <div>
                <h4 className="text-xs md:text-sm font-bold text-text-main">AI Recruiter</h4>
                <p className="text-[10px] md:text-[11px] text-text-secondary mt-1 italic">"{candidate.analysis?.substring(0, 80)}..."</p>
              </div>
            </div>
          </div>
          <div className="mt-6 md:mt-8 pt-6 border-t border-blue-50">
            <div className="relative">
              <input className="w-full bg-background-main border-none rounded-2xl py-3.5 md:py-4 px-4 md:px-5 text-[11px] md:text-xs font-bold focus:ring-2 focus:ring-primary/20 placeholder-text-tertiary" placeholder="Add note..." type="text" />
              <button className="absolute right-2.5 top-1/2 -translate-y-1/2 size-8 md:size-9 bg-white shadow-soft rounded-xl flex items-center justify-center text-text-main hover:text-primary transition-all">
                <span className="material-symbols-outlined text-[16px] md:text-[18px]">send</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Full Screen Resume Modal */}
      {showResume && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 lg:p-12">
          <div className="absolute inset-0 bg-text-main/80 backdrop-blur-md" onClick={() => setShowResume(false)}></div>
          <div className="relative w-full h-full max-w-[1000px] bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col">
            <div className="h-16 md:h-20 border-b border-blue-50 flex items-center justify-between px-6 md:px-10 bg-white">
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <div className="size-8 md:size-10 rounded-xl bg-blue-50 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-xl">description</span>
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-text-main text-sm md:text-base truncate">{candidate.name} - Resume</h3>
                  <p className="text-[8px] md:text-[10px] text-text-tertiary uppercase font-bold tracking-widest truncate">{candidate.resumeMimeType}</p>
                </div>
              </div>
              <button
                onClick={() => setShowResume(false)}
                className="size-10 md:size-12 rounded-full bg-background-main hover:bg-blue-50 transition-all flex items-center justify-center text-text-main shrink-0"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 bg-gray-100 p-4 md:p-8 overflow-y-auto">
              {candidate.resumeBase64 ? (
                <div className="w-full h-full bg-white shadow-2xl rounded-xl overflow-hidden min-h-[500px]">
                  {candidate.resumeMimeType?.includes('pdf') ? (
                    <iframe src={`data:application/pdf;base64,${candidate.resumeBase64}`} className="w-full h-full border-none" />
                  ) : (
                    <img src={`data:${candidate.resumeMimeType};base64,${candidate.resumeBase64}`} className="w-full mx-auto" alt="Resume" />
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-text-tertiary">
                  <span className="material-symbols-outlined text-5xl md:text-6xl mb-4">cloud_off</span>
                  <p className="font-bold text-xs md:text-sm uppercase tracking-widest text-center">Resume Data Unavailable</p>
                </div>
              )}
            </div>
            <div className="h-16 md:h-20 border-t border-blue-50 flex items-center justify-center gap-3 md:gap-4 bg-white px-6 md:px-10">
              <button onClick={handleDownload} className="flex-1 max-w-[200px] py-2.5 md:py-3 bg-primary text-white rounded-xl md:rounded-2xl text-[10px] md:text-xs font-bold shadow-lg flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-sm">download</span> Get PDF
              </button>
              <button onClick={() => window.print()} className="hidden sm:block px-8 py-3 bg-white border border-blue-100 rounded-2xl text-[10px] md:text-xs font-bold text-text-main hover:bg-blue-50 transition-all">
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateDetail;
