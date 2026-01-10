import React from 'react';
import { User } from '../types';

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
  user: User | null;
}

const Header: React.FC<HeaderProps> = ({ title, onMenuClick, user }) => {
  return (
    <header className="h-14 md:h-16 flex items-center justify-between px-6 md:px-8 lg:px-10 flex-shrink-0 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden size-8.5 flex items-center justify-center bg-white rounded-xl text-text-main shadow-soft border border-blue-50"
        >
          <span className="material-symbols-outlined text-[18px]">menu</span>
        </button>
        <h2 className="text-md md:text-xl font-bold text-text-main tracking-tight truncate max-w-[150px] md:max-w-none">{title}</h2>
      </div>

      <div className="flex items-center gap-3 md:gap-5">
        <div className="hidden md:flex items-center bg-white rounded-full h-9 px-4 w-64 shadow-soft border border-blue-50 transition-all focus-within:shadow-md focus-within:border-blue-100">
          <span className="material-symbols-outlined text-text-tertiary text-[16px]">search</span>
          <input
            className="bg-transparent border-none text-[12px] w-full focus:ring-0 text-text-main placeholder-text-tertiary ml-2 font-medium"
            placeholder="Search anything..."
            type="text"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <button className="size-9 flex items-center justify-center bg-white rounded-full text-text-main hover:text-primary shadow-soft relative transition-all hover:scale-105 active:scale-95 border border-blue-50">
            <span className="material-symbols-outlined text-[18px]">notifications</span>
            <span className="absolute top-1.5 right-1.5 size-1.5 bg-accent-red rounded-full ring-2 ring-white"></span>
          </button>

          <div className="size-9 rounded-full border-2 border-white shadow-md overflow-hidden cursor-pointer hover:border-primary hover:scale-105 transition-all duration-300">
            <img
              src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=0d33f2&color=fff&bold=true`}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
