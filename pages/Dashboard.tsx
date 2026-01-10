import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { db } from '../services/db';
import { Job, Activity } from '../types';

const DATA = [
  { name: 'Mon', apps: 20 },
  { name: 'Tue', apps: 45 },
  { name: 'Wed', apps: 30 },
  { name: 'Thu', apps: 55 },
  { name: 'Fri', apps: 40 },
  { name: 'Sat', apps: 15 },
  { name: 'Sun', apps: 10 },
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [jobsData, activitiesData] = await Promise.all([
        db.jobs.find(),
        db.activities.find()
      ]);
      setJobs(jobsData);
      setActivities(activitiesData);
    };
    fetchData();
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-soft border border-blue-50 flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-0">
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-2 text-text-secondary">
              <span className="material-symbols-outlined text-[20px] text-primary">group</span>
              <span className="text-sm font-medium">Total Employees</span>
            </div>
            <h3 className="text-4xl md:text-5xl font-bold text-primary tracking-tight mb-2">450</h3>
          </div>
          <div className="hidden sm:block w-px h-16 bg-blue-50 mx-6"></div>
          <div className="flex-1 text-center sm:text-left border-t sm:border-t-0 border-blue-50 pt-6 sm:pt-0 w-full sm:w-auto">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-2 text-text-secondary">
              <span className="material-symbols-outlined text-[20px] text-primary">work</span>
              <span className="text-sm font-medium">Open Jobs</span>
            </div>
            <h3 className="text-4xl md:text-5xl font-bold text-primary tracking-tight mb-2">{jobs.length}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-soft border border-blue-50 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-2xl bg-blue-50 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">folder_open</span>
              </div>
              <div>
                <p className="font-bold text-text-main">Total Applications</p>
                <p className="text-xs text-text-tertiary">Live from DB</p>
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-between items-end">
            <h4 className="text-2xl font-bold text-text-main">
              {jobs.reduce((acc, curr) => acc + (curr.applicantsCount || 0), 0)}
            </h4>
            <button className="size-8 rounded-full border border-blue-100 flex items-center justify-center text-primary hover:bg-blue-50 transition-colors">
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-soft border border-blue-50 flex flex-col justify-between md:col-span-2 lg:col-span-1">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-2xl bg-blue-50 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">verified</span>
              </div>
              <div>
                <p className="font-bold text-text-main">Match Analysis</p>
                <p className="text-xs text-text-tertiary">AI Powered</p>
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-between items-end">
            <h4 className="text-2xl font-bold text-text-main">
              {jobs.reduce((acc, curr) => acc + (curr.matchesCount || 0), 0)}
            </h4>
            <button className="size-8 rounded-full border border-blue-100 flex items-center justify-center text-primary hover:bg-blue-50 transition-colors">
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[2rem] p-6 md:p-8 shadow-soft border border-blue-50">
          <h3 className="text-xl font-bold text-text-main mb-8">Application Trend</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#9CA3AF' }}
                  interval={window.innerWidth < 640 ? 1 : 0}
                />
                <Tooltip cursor={{ fill: '#F9FAFB' }} />
                <Bar dataKey="apps" fill="#1E40AF" radius={[6, 6, 6, 6]} barSize={window.innerWidth < 640 ? 20 : 32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] p-6 shadow-soft border border-blue-50">
          <h3 className="font-bold text-text-main mb-6 text-lg">Live Activity</h3>
          <div className="space-y-6">
            {activities.slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex gap-4 items-start group">
                <div className="size-10 rounded-full bg-blue-50 overflow-hidden shrink-0 ring-2 ring-white flex items-center justify-center">
                  {activity.avatar ? <img className="size-full object-cover" src={activity.avatar} alt="" /> : <span className="material-symbols-outlined text-primary">bolt</span>}
                </div>
                <div className="flex-1">
                  <p className="text-[13px] text-text-main leading-tight"><span className="font-bold">{activity.user}</span> {activity.action} <span className="text-primary font-medium">{activity.target}</span></p>
                  <p className="text-[11px] text-text-tertiary mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white rounded-[2rem] p-6 md:p-8 shadow-soft border border-blue-50">
        <h3 className="text-xl font-bold text-text-main mb-6">Active Job Openings</h3>
        <div className="overflow-x-auto -mx-2 md:mx-0">
          <table className="w-full text-left min-w-[600px] md:min-w-0">
            <tbody className="divide-y divide-blue-50">
              {jobs.map((job) => (
                <tr key={job.id} onClick={() => navigate(`/candidates?jobId=${job.id}`)} className="group hover:bg-blue-50/30 transition-colors cursor-pointer">
                  <td className="px-4 py-5">
                    <div className="flex items-center gap-4">
                      <div className="size-10 md:size-12 rounded-2xl bg-blue-50 text-primary flex items-center justify-center shadow-sm shrink-0">
                        <span className="material-symbols-outlined">{job.department === 'Engineering' ? 'code' : 'design_services'}</span>
                      </div>
                      <div>
                        <p className="font-bold text-text-main text-sm md:text-[15px]">{job.title}</p>
                        <p className="text-[11px] md:text-xs text-text-tertiary mt-0.5">{job.location} • {job.department}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-5">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map(i => <div key={i} className="size-7 md:size-8 rounded-full border-2 border-white bg-blue-100" />)}
                      <div className="size-7 md:size-8 rounded-full bg-primary text-white border-2 border-white flex items-center justify-center text-[10px] font-bold">+{job.applicantsCount}</div>
                    </div>
                  </td>
                  <td className="px-4 py-5"><span className="px-2.5 py-1 rounded-md text-[9px] md:text-[10px] font-bold bg-green-50 text-green-600 border border-green-100 uppercase">{job.status}</span></td>
                  <td className="px-4 py-5 text-right"><span className="material-symbols-outlined text-text-tertiary text-sm md:text-base">arrow_forward_ios</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
