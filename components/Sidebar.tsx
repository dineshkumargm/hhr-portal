import React from 'react';
import { NavLink } from 'react-router-dom';
import { Page, User } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  user: User | null;
  activePage: Page;
  onNavigate: (page: Page) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onLogout, user, activePage, onNavigate }) => {
  const navItems = [
    { id: Page.Dashboard, path: '/dashboard', label: 'Dashboard', icon: 'grid_view' },
    { id: Page.Jobs, path: '/jobs', label: 'Jobs', icon: 'business_center' },
    { id: Page.Candidates, path: '/candidates', label: 'Candidates', icon: 'people' },
    { id: Page.ResumeScore, path: '/resume-score', label: 'Resume Score', icon: 'description' },
    { id: 'chat' as Page, path: '/chat', label: 'AI Assistant', icon: 'chat_bubble' },
    { id: Page.Plugins, path: '/plugins', label: 'Plugins', icon: 'extension' },
    { id: Page.Community, path: '/community', label: 'Community', icon: 'groups' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={`fixed inset-0 bg-primary/20 backdrop-blur-sm z-40 transition-opacity duration-300 lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-[240px] bg-background-main lg:static lg:block
        lg:w-[230px] flex flex-col py-5 px-3 shrink-0 transition-transform duration-300 ease-in-out
        overflow-y-auto no-scrollbar
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="px-3 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-9 flex items-center justify-center bg-gradient-to-br from-[#0d33f2] to-[#1e40af] rounded-xl shadow-lg shadow-blue-500/30 ring-1 ring-white/20">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L4 7V17L12 22L20 17V7L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 22V12M12 12V2M12 12H20M12 12L4 7M12 12L20 7" stroke="white" strokeWidth="1.5" strokeOpacity="0.5" strokeLinecap="round" />
                <circle cx="12" cy="12" r="3" fill="white" fillOpacity="0.9" />
              </svg>
            </div>
            <span className="text-lg tracking-tight text-text-main lg:block">
              <span className="text-primary font-black">Agent</span> <span className="font-bold">KAI</span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden size-10 rounded-xl hover:bg-blue-50 flex items-center justify-center text-text-secondary"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) => `
                w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all group
                ${isActive
                  ? 'bg-white text-primary shadow-lg shadow-blue-500/5 font-bold'
                  : 'text-text-secondary hover:bg-blue-50/50 hover:text-primary'
                }
              `}
            >
              {({ isActive }) => (
                <>
                  <span className={`material-symbols-outlined text-[18px] ${isActive ? 'filled' : ''}`}>
                    {item.icon}
                  </span>
                  <span className="lg:block text-[13px] tracking-tight">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto pt-5 flex flex-col gap-3.5">
          <NavLink to="/profile" onClick={onClose} className="flex items-center gap-2.5 p-2.5 bg-white border border-blue-50 rounded-[1rem] shadow-soft cursor-pointer hover:shadow-md hover:border-blue-100 transition-all group overflow-hidden relative">
            <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="material-symbols-outlined text-[10px] text-primary">arrow_forward</span>
            </div>
            <div className="size-8 rounded-full border-2 border-slate-50 flex-shrink-0 overflow-hidden">
              <img
                src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=0d33f2&color=fff&bold=true`}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-black text-text-main truncate leading-tight">{user?.name || 'Recruiter'}</p>
              <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider mt-0.5">My Profile</p>
            </div>
          </NavLink>

          <div className="flex gap-2 justify-start lg:px-0.5">
            <button
              onClick={() => {
                onNavigate(Page.Settings);
                onClose();
              }}
              className={`size-9 rounded-xl flex items-center justify-center shadow-soft transition-all hover:scale-105 ${activePage === Page.Settings ? 'bg-primary text-white' : 'bg-white text-text-secondary hover:text-primary hover:bg-blue-50'
                }`}
              title="Settings"
            >
              <span className="material-symbols-outlined text-[17px]">settings</span>
            </button>
            <button
              onClick={onLogout}
              className="size-9 rounded-xl bg-white flex items-center justify-center text-text-secondary hover:text-accent-red hover:bg-red-50 shadow-soft transition-all hover:scale-105"
              title="Logout"
            >
              <span className="material-symbols-outlined text-[17px]">logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
