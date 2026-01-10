import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { User } from '../types';

interface ProfileProps {
    onUserUpdate?: () => void;
}

const Profile: React.FC<ProfileProps> = ({ onUserUpdate }) => {
    const [user, setUser] = useState<User | null>(db.getUser());
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Edit form state
    const [editForm, setEditForm] = useState({
        name: '',
        title: '',
        location: '',
        about: '',
        skills: '',
        avatar: ''
    });

    useEffect(() => {
        if (user) {
            setEditForm({
                name: user.name || '',
                title: user.title || '',
                location: user.location || '',
                about: user.about || '',
                skills: (user.settings?.skills || []).join(', '),
                avatar: user.avatar || ''
            });
        }
    }, [user]);

    const compressImage = (base64: string): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = base64;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 400;
                const MAX_HEIGHT = 400;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = reader.result as string;
                const compressed = await compressImage(base64);
                setEditForm(prev => ({ ...prev, avatar: compressed }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        if (!user) return;

        try {
            const updatedData = {
                ...user,
                name: editForm.name,
                title: editForm.title,
                location: editForm.location,
                about: editForm.about,
                avatar: editForm.avatar,
                settings: {
                    ...user.settings,
                    skills: editForm.skills.split(',').map(s => s.trim()).filter(s => s !== '')
                }
            };

            await db.updateUser(user.id, updatedData);
            setUser(updatedData);
            if (onUserUpdate) onUserUpdate();
            setIsEditModalOpen(false);
        } catch (error) {
            console.error("Failed to update profile", error);
            alert("Failed to save changes. Please try again.");
        }
    };

    if (!user) return null;

    return (
        <div className="max-w-5xl mx-auto py-8 px-4">
            <div className="bg-white rounded-[2.5rem] shadow-soft border border-blue-50 overflow-hidden">
                {/* Banner */}
                <div className="h-48 bg-[#0D33F2] relative"></div>

                <div className="px-10 pb-12 relative">
                    {/* Profile Header Area */}
                    <div className="flex flex-col md:flex-row items-end md:items-center justify-between -mt-16 mb-8">
                        <div className="flex flex-col items-center md:items-start gap-4">
                            <div className="relative group">
                                <div className="size-36 rounded-[2.5rem] border-[6px] border-white bg-white shadow-xl overflow-hidden relative group">
                                    <img
                                        src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=0d33f2&color=fff&bold=true`}
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                    />
                                    <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold uppercase tracking-widest">
                                        <span className="material-symbols-outlined text-2xl mb-1">photo_camera</span>
                                        Change Photo
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                    </label>
                                </div>
                                <div className="absolute -bottom-1 -right-1 size-9 bg-[#7ED321] rounded-full border-4 border-white flex items-center justify-center shadow-lg">
                                    <span className="material-symbols-outlined text-white text-[18px] font-bold">check</span>
                                </div>
                            </div>
                            <div className="mt-2 text-center md:text-left">
                                <h1 className="text-4xl font-black text-[#0D0F1C] tracking-tight">{user.name}</h1>
                                <p className="text-[#0D33F2] font-extrabold uppercase tracking-[0.15em] text-[11px] mt-1">{user.title || 'RECRUITER'}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsEditModalOpen(true)}
                            className="mt-6 md:mt-0 px-8 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-black text-[#0D0F1C] hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm uppercase tracking-[0.1em]"
                        >
                            Edit Profile
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mt-12">
                        {/* Left Column: Stats & Contact */}
                        <div className="space-y-8">
                            <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
                                <h3 className="text-xs font-black text-[#0D0F1C] uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#0D33F2] text-lg">analytics</span>
                                    Performance
                                </h3>
                                <div className="space-y-6">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Growth Rate</p>
                                        <p className="text-xl font-black text-[#0D0F1C]">+24.8%</p>
                                    </div>
                                    <div className="h-px bg-slate-200 w-full opacity-50"></div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Successful Placements</p>
                                        <p className="text-xl font-black text-[#0D0F1C]">156 Candidates</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
                                <h3 className="text-xs font-black text-[#0D0F1C] uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#0D33F2] text-lg">alternate_email</span>
                                    Contact
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-slate-400 text-lg">mail</span>
                                        <span className="text-xs font-bold text-[#0D0F1C]">{user.email}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-slate-400 text-lg">location_on</span>
                                        <span className="text-xs font-bold text-[#0D0F1C]">{user.location || 'San Francisco, CA'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Columns: About & Skills */}
                        <div className="lg:col-span-2 space-y-10">
                            <section>
                                <h3 className="text-xs font-black text-[#0D0F1C] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#0D33F2] text-lg">person</span>
                                    Professional Summary
                                </h3>
                                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                                    {user.about || 'Specializing in identifying high-impact engineering talent and fostering diverse work environments. Experienced in full-cycle recruiting across tech hubs globally.'}
                                </p>
                            </section>

                            <section>
                                <h3 className="text-xs font-black text-[#0D0F1C] uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#0D33F2] text-lg">token</span>
                                    Core Competencies
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {(user.settings?.skills || ['Recruiting', 'Talent Search', 'AI Integration', 'Networking']).map((skill: string) => (
                                        <span key={skill} className="px-4 py-2 bg-[#0D33F2]/5 text-[#0D33F2] text-[10px] font-black uppercase tracking-widest rounded-xl border border-[#0D33F2]/10 transition-all hover:bg-[#0D33F2]/10 cursor-default">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <h3 className="text-xs font-black text-[#0D0F1C] uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#0D33F2] text-lg">work_history</span>
                                    Work Experience
                                </h3>
                                <div className="space-y-6">
                                    <div className="flex gap-4">
                                        <div className="size-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                                            <span className="material-symbols-outlined text-slate-400">corporate_fare</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-[#0D0F1C]">Senior Talent Partner</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Global Systems Inc · 2021 - Present</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="size-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                                            <span className="material-symbols-outlined text-slate-400">apartment</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-[#0D0F1C]">Technical Recruiter</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">TechFlow Solutions · 2018 - 2021</p>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Profile Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-10">
                            <div className="flex justify-between items-center mb-10">
                                <div>
                                    <h2 className="text-3xl font-black text-[#0D0F1C] tracking-tight">Edit Profile</h2>
                                    <p className="text-[#0D33F2] font-bold text-[10px] uppercase tracking-widest mt-1">Update your professional identity</p>
                                </div>
                                <button
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="size-10 rounded-xl bg-slate-50 text-slate-400 hover:text-red-500 transition-colors flex items-center justify-center"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="flex justify-center mb-10">
                                <div className="relative group">
                                    <div className="size-24 rounded-3xl border-4 border-slate-50 shadow-md overflow-hidden relative">
                                        <img
                                            src={editForm.avatar || `https://ui-avatars.com/api/?name=${editForm.name || 'User'}&background=0d33f2&color=fff`}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                        />
                                        <label className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity text-white text-[8px] font-black uppercase tracking-widest">
                                            <span className="material-symbols-outlined text-lg">photo_camera</span>
                                            Edit
                                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Full Name</label>
                                        <input
                                            type="text"
                                            value={editForm.name}
                                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-[#0D0F1C] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#0D33F2]/5 focus:border-[#0D33F2]/30 transition-all font-display"
                                            placeholder="Enter your name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Professional Title</label>
                                        <input
                                            type="text"
                                            value={editForm.title}
                                            onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-[#0D0F1C] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#0D33F2]/5 focus:border-[#0D33F2]/30 transition-all font-display"
                                            placeholder="e.g. Senior Recruiter"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Location</label>
                                    <input
                                        type="text"
                                        value={editForm.location}
                                        onChange={e => setEditForm({ ...editForm, location: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-[#0D0F1C] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#0D33F2]/5 focus:border-[#0D33F2]/30 transition-all font-display"
                                        placeholder="e.g. San Francisco, CA"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">About Me</label>
                                    <textarea
                                        value={editForm.about}
                                        onChange={e => setEditForm({ ...editForm, about: e.target.value })}
                                        rows={4}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-[#0D0F1C] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#0D33F2]/5 focus:border-[#0D33F2]/30 transition-all font-display no-scrollbar resize-none"
                                        placeholder="Brief professional bio..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Skills (Comma separated)</label>
                                    <input
                                        type="text"
                                        value={editForm.skills}
                                        onChange={e => setEditForm({ ...editForm, skills: e.target.value })}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-[#0D0F1C] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#0D33F2]/5 focus:border-[#0D33F2]/30 transition-all font-display"
                                        placeholder="e.g. Recruiting, Strategy, AI"
                                    />
                                </div>

                                <div className="flex gap-4 pt-6">
                                    <button
                                        onClick={() => setIsEditModalOpen(false)}
                                        className="flex-1 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black text-slate-500 hover:bg-slate-100 transition-all uppercase tracking-widest"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        className="flex-[2] py-4 bg-[#0D33F2] text-white rounded-2xl text-[11px] font-black shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all uppercase tracking-widest"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
