import React from 'react';
import type { User } from '../types';
import { XochatLogo } from './CustomerPortal';
import { Shield, Users, LogOut } from 'lucide-react';

interface HeaderProps {
  pendingCount: number;
  currentUser: User | null;
  currentSidebarTab?: string;
  onOpenLogin: () => void;
  onLogout: () => void;
  onOpenAdmin: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  pendingCount,
  currentUser,
  currentSidebarTab = 'inbox',
  onOpenLogin,
  onLogout,
  onOpenAdmin,
}) => {
  const getTabLabel = (tab: string) => {
    switch (tab) {
      case 'inbox':
        return 'Inbox';
      case 'replied':
        return 'Replied';
      case 'surveillance':
        return 'Surveillance & Scraping';
      case 'metrics':
        return 'Team Message Counts';
      case 'add_user':
        return 'Add Team Member';
      case 'audit':
        return 'Full Audit Trail';
      case 'crm_pipeline':
        return 'Leads & CRM Pipeline';
      case 'ai_assistant':
        return 'Team Intelligence';
      default:
        return 'Inbox';
    }
  };

  return (
    <header className="bg-white/95 backdrop-blur-xs border-b border-gray-200 px-8 py-3.5 flex items-center justify-between shadow-2xs relative z-20">
      {/* Left: Official Xochat Logo + Breadcrumb */}
      <div className="flex items-center gap-6">
        <XochatLogo size="md" />

        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight text-gray-800">
            Conversations
          </h1>
          <span className="text-gray-400 font-normal">/</span>
          <span className="text-sm font-semibold text-gray-500 capitalize">
            {getTabLabel(currentSidebarTab)}
          </span>
        </div>
      </div>

      {/* Center: Prominent PENDING Badge */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold tracking-wider text-amber-500 uppercase">
          PENDING
        </span>
        <div className="bg-gradient-to-b from-[#fef3c7] to-[#fde68a] border border-[#fcd34d] text-[#b45309] font-black text-2xl px-5 py-1 rounded-md shadow-inner flex items-center justify-center min-w-[70px]">
          {pendingCount}
        </div>
      </div>

      {/* Right: Login Button or User Profile matching Mockup 3 */}
      <div className="flex items-center gap-3">
        {currentUser ? (
          <div className="flex items-center gap-3">
            {/* Admin Role Indicator Badge */}
            {(currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'CORE_ADMIN') && (
              <button
                type="button"
                onClick={onOpenAdmin}
                title="Open Admin Commands"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 shadow-2xs transition-colors cursor-pointer"
              >
                {currentUser.role === 'SUPER_ADMIN' ? (
                  <Shield className="w-3.5 h-3.5 text-indigo-600" />
                ) : (
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                )}
                <span>
                  {currentUser.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
                </span>
              </button>
            )}

            {/* User Profile Pill matching Mockup 3 */}
            <div className="flex items-center gap-2 pl-2">
              <span className="text-sm font-semibold text-gray-700">
                @{currentUser.username}
              </span>
              <div className="relative">
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-10 h-10 rounded-full border-2 border-slate-800 bg-amber-50 object-cover"
                />
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={onLogout}
              title="Logout"
              className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenLogin}
            className="px-6 py-1.5 border border-[#0066ff] text-[#0066ff] hover:bg-blue-50 font-semibold text-sm rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            Login
          </button>
        )}
      </div>
    </header>
  );
};
