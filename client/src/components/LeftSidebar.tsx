import React from 'react';
import { RotateCw, Radar, BarChart3, UserPlus, History, Kanban, Sparkles } from 'lucide-react';
import inboxIcon from '../assets/inbox-icon.png';
import repliedIcon from '../assets/replied-icon.png';
import type { User } from '../types';

export type SidebarActiveTab =
  | 'inbox'
  | 'replied'
  | 'crm_pipeline'
  | 'surveillance'
  | 'metrics'
  | 'add_user'
  | 'audit'
  | 'ai_assistant';

interface LeftSidebarProps {
  activeTab: SidebarActiveTab | string;
  onTabChange: (tab: SidebarActiveTab) => void;
  pendingCount: number;
  currentUser: User | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  activeTab,
  onTabChange,
  pendingCount,
  currentUser,
  onRefresh,
  isRefreshing = false,
}) => {
  const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'CORE_ADMIN';

  return (
    /* Exact Enclosed Column Container matching Image: media_1793192554705_05b36369.png */
    <aside className="w-52 bg-[#f5f6f8] rounded-2xl border border-gray-200/90 p-3 pt-2.5 flex flex-col justify-between shrink-0 select-none shadow-2xs h-full sticky top-3 self-start overflow-hidden overflow-x-hidden">
      <div className="space-y-2.5 overflow-y-auto overflow-x-hidden flex-1 pt-2.5 px-1 pr-1.5">
        {/* 1. INBOX CARD BUTTON */}
        <button
          type="button"
          onClick={() => onTabChange('inbox')}
          className={`w-full relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left cursor-pointer ${
            activeTab === 'inbox'
              ? 'bg-[#fde047] hover:bg-[#facc15] shadow-xs text-gray-950 font-black'
              : 'bg-[#e2e8f0]/80 hover:bg-[#cbd5e1] text-gray-900 font-bold'
          }`}
        >
          <img src={inboxIcon} alt="Inbox" className="w-5 h-5 object-contain shrink-0" />
          <span className="text-sm tracking-tight font-black">Inbox</span>

          {/* Green Counter Badge - unclipped full circle, crisp high-visibility count */}
          <span className="absolute -top-2 right-1 bg-[#22c55e] text-black text-[12px] font-black min-w-[26px] h-[26px] px-1 rounded-full flex items-center justify-center shadow-xs border-2 border-white pointer-events-none leading-none select-none">
            {pendingCount}
          </span>
        </button>

        {/* 2. REPLIED CARD BUTTON */}
        <button
          type="button"
          onClick={() => onTabChange('replied')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left cursor-pointer ${
            activeTab === 'replied'
              ? 'bg-[#fde047] hover:bg-[#facc15] shadow-xs text-gray-950 font-black'
              : 'bg-[#e2e8f0]/80 hover:bg-[#cbd5e1] text-gray-900 font-bold'
          }`}
        >
          <img src={repliedIcon} alt="Replied" className="w-5 h-5 object-contain shrink-0" />
          <span className="text-sm tracking-tight font-black">Replied</span>
        </button>

        {/* 3. ADMIN COMMANDS IN THIS SIDEBAR (User instruction: "move here all of this commands") */}
        {isAdmin && (
          <div className="pt-2 space-y-2 border-t border-gray-200">
            <div className="px-1 pt-1 pb-0.5">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                Admin Commands
              </span>
            </div>

            {/* A. Leads & CRM Pipeline (Kirrivan feature for Admins) */}
            <button
              type="button"
              onClick={() => onTabChange('crm_pipeline')}
              title="Leads & CRM Pipeline"
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all text-left cursor-pointer ${
                activeTab === 'crm_pipeline'
                  ? 'bg-[#fde047] hover:bg-[#facc15] shadow-xs text-gray-950 font-black'
                  : 'bg-[#e2e8f0]/80 hover:bg-[#cbd5e1] text-gray-900 font-bold'
              }`}
            >
              <Kanban className="w-4 h-4 text-gray-900 shrink-0" />
              <span className="text-xs tracking-tight font-black leading-tight">
                Leads & CRM Pipeline
              </span>
            </button>

            {/* B. Surveillance & Scraping */}
            <button
              type="button"
              onClick={() => onTabChange('surveillance')}
              title="Surveillance & Scraping"
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all text-left cursor-pointer ${
                activeTab === 'surveillance'
                  ? 'bg-[#fde047] hover:bg-[#facc15] shadow-xs text-gray-950 font-black'
                  : 'bg-[#e2e8f0]/80 hover:bg-[#cbd5e1] text-gray-900 font-bold'
              }`}
            >
              <Radar className="w-4 h-4 text-gray-900 shrink-0" />
              <span className="text-xs tracking-tight font-black leading-tight">
                Surveillance & Scraping
              </span>
            </button>

            {/* B. Team Message Counts */}
            <button
              type="button"
              onClick={() => onTabChange('metrics')}
              title="Team Message Counts"
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all text-left cursor-pointer ${
                activeTab === 'metrics'
                  ? 'bg-[#fde047] hover:bg-[#facc15] shadow-xs text-gray-950 font-black'
                  : 'bg-[#e2e8f0]/80 hover:bg-[#cbd5e1] text-gray-900 font-bold'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-gray-900 shrink-0" />
              <span className="text-xs tracking-tight font-black leading-tight">
                Team Message Counts
              </span>
            </button>

            {/* C. Add Team Member */}
            <button
              type="button"
              onClick={() => onTabChange('add_user')}
              title="Add Team Member"
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all text-left cursor-pointer ${
                activeTab === 'add_user'
                  ? 'bg-[#fde047] hover:bg-[#facc15] shadow-xs text-gray-950 font-black'
                  : 'bg-[#e2e8f0]/80 hover:bg-[#cbd5e1] text-gray-900 font-bold'
              }`}
            >
              <UserPlus className="w-4 h-4 text-gray-900 shrink-0" />
              <span className="text-xs tracking-tight font-black leading-tight">
                Add Team Member
              </span>
            </button>

            {/* D. Full Audit Trail (Super Admin ONLY - hidden for Core Admin) */}
            {currentUser?.role === 'SUPER_ADMIN' && (
              <button
                type="button"
                onClick={() => onTabChange('audit')}
                title="Full Audit Trail"
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all text-left cursor-pointer ${
                  activeTab === 'audit'
                    ? 'bg-[#fde047] hover:bg-[#facc15] shadow-xs text-gray-950 font-black'
                    : 'bg-[#e2e8f0]/80 hover:bg-[#cbd5e1] text-gray-900 font-bold'
                }`}
              >
                <History className="w-4 h-4 text-gray-900 shrink-0" />
                <span className="text-xs tracking-tight font-black leading-tight">
                  Full Audit Trail
                </span>
              </button>
            )}

            {/* E. Team Intelligence & Performance (Super Admin ONLY) */}
            {currentUser?.role === 'SUPER_ADMIN' && (
              <button
                type="button"
                onClick={() => onTabChange('ai_assistant')}
                title="Team Member Intelligence & Performance"
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all text-left cursor-pointer ${
                  activeTab === 'ai_assistant'
                    ? 'bg-[#fde047] hover:bg-[#facc15] shadow-xs text-gray-950 font-black'
                    : 'bg-[#e2e8f0]/80 hover:bg-[#cbd5e1] text-gray-900 font-bold'
                }`}
              >
                <Sparkles className="w-4 h-4 text-gray-900 shrink-0" />
                <span className="text-xs tracking-tight font-black leading-tight">
                  Team Intelligence
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* REFRESH BUTTON matching mockup */}
      {onRefresh && (
        <div className="pt-3 shrink-0">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="w-full bg-[#5b8cff] hover:bg-blue-600 active:bg-blue-700 text-white font-extrabold text-sm py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-75"
          >
            <span>Refresh</span>
            <span className={`inline-flex items-center justify-center shrink-0 w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}>
              <RotateCw className="w-4 h-4" />
            </span>
          </button>
        </div>
      )}
    </aside>
  );
};
