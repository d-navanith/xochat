import React from 'react';
import { Radar, BarChart3, UserPlus, History } from 'lucide-react';
import type { User } from '../types';

export type AdminViewTab = 'surveillance' | 'metrics' | 'add_user' | 'audit';

interface AdminNavBarProps {
  activeTab: AdminViewTab | null;
  onTabChange: (tab: AdminViewTab) => void;
  currentUser: User | null;
}

export const AdminNavBar: React.FC<AdminNavBarProps> = ({
  activeTab,
  onTabChange,
  currentUser,
}) => {
  // Only render for Super Admin or Core Admin
  if (!currentUser || (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'CORE_ADMIN')) {
    return null;
  }

  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

  return (
    <div className="w-full shadow-2xs relative z-20">
      {/* Top dark navy stripe matching media_1793191929559_cbc3ae2d.png */}
      <div className="w-full h-5 bg-[#0b1329]" />

      {/* Main White Nav Bar matching exact Figma update */}
      <div className="w-full bg-white border-b border-gray-200/90 px-6 sm:px-10 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-6 sm:gap-9 overflow-x-auto no-scrollbar">
          {/* 1. Agent Surveillance & Scraping (Mockup item 1) */}
          <button
            type="button"
            onClick={() => onTabChange('surveillance')}
            className={`flex items-center gap-2 text-[13px] sm:text-sm font-semibold transition-colors cursor-pointer shrink-0 ${
              activeTab === 'surveillance'
                ? 'text-[#4338ca] font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Radar
              className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${
                activeTab === 'surveillance' ? 'text-[#4338ca]' : 'text-slate-500'
              }`}
            />
            <span>Agent Surveillance & Scraping</span>
          </button>

          {/* 2. Team Message Counts (Mockup item 2) */}
          <button
            type="button"
            onClick={() => onTabChange('metrics')}
            className={`flex items-center gap-2 text-[13px] sm:text-sm font-semibold transition-colors cursor-pointer shrink-0 ${
              activeTab === 'metrics'
                ? 'text-[#4338ca] font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3
              className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${
                activeTab === 'metrics' ? 'text-[#4338ca]' : 'text-slate-500'
              }`}
            />
            <span>Team Message Counts</span>
          </button>

          {/* 3. Add Team Member (Mockup item 3) */}
          <button
            type="button"
            onClick={() => onTabChange('add_user')}
            className={`flex items-center gap-2 text-[13px] sm:text-sm font-semibold transition-colors cursor-pointer shrink-0 ${
              activeTab === 'add_user'
                ? 'text-[#4338ca] font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus
              className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${
                activeTab === 'add_user' ? 'text-[#4338ca]' : 'text-slate-500'
              }`}
            />
            <span>Add Team Member</span>
          </button>

          {/* 4. Full Audit Trail (Super Admin ONLY - hidden for Core Admin) */}
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => onTabChange('audit')}
              className={`flex items-center gap-2 text-[13px] sm:text-sm font-semibold transition-colors cursor-pointer shrink-0 ${
                activeTab === 'audit'
                  ? 'text-[#4338ca] font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History
                className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${
                  activeTab === 'audit' ? 'text-[#4338ca]' : 'text-slate-500'
                }`}
              />
              <span>Full Audit Trail</span>
            </button>
          )}
        </div>

        {/* Right role badge: Identifies whether Super Admin or Core Admin */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            {isSuperAdmin ? '⚡ SUPER ADMIN' : '🛡️ ADMIN'}
          </span>
          <span className="text-xs text-gray-500 font-medium">
            @{currentUser.username}
          </span>
        </div>
      </div>
    </div>
  );
};

