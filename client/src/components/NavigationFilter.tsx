import React from 'react';
import { DatePickerPill } from './DatePickerPill';

interface NavigationFilterProps {
  isAdmin?: boolean;
  sidebarTab: 'inbox' | 'replied';
  currentTab: 'all' | 'replied' | 'mine';
  onTabChange: (tab: 'all' | 'replied' | 'mine') => void;
  allCount: number;
  repliedCount: number;
  mineCount: number;
  myRepliedCount: number;
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export const NavigationFilter: React.FC<NavigationFilterProps> = ({
  isAdmin = false,
  sidebarTab,
  currentTab,
  onTabChange,
  allCount,
  repliedCount,
  mineCount,
  myRepliedCount,
  selectedDate,
  onDateChange,
}) => {
  return (
    <div className="bg-transparent px-4 sm:px-6 pt-2 pb-2 flex items-center justify-between border-b border-gray-200">
      {/* Tabs */}
      <div className="flex items-center gap-6">
        {isAdmin ? (
          /* ADMIN VIEW: Super Admin and Core Admin oversee all team inquiries and replies.
             Admins NEVER see "Mine" tabs with team members' replies! */
          <button
            onClick={() => onTabChange('all')}
            className="relative pb-2 flex items-center gap-2 text-sm font-semibold transition-colors text-gray-900 border-b-2 border-blue-600 cursor-pointer"
          >
            <span>All</span>
            <span className="text-xs px-2 py-0.5 rounded-xs font-bold bg-gray-200 text-gray-800">
              {sidebarTab === 'inbox' ? allCount : repliedCount}
            </span>
          </button>
        ) : sidebarTab === 'inbox' ? (
          /* AGENT INBOX VIEW: All (pending queue) & Mine (assigned to me) */
          <>
            <button
              onClick={() => onTabChange('all')}
              className={`relative pb-2 flex items-center gap-2 text-sm font-semibold transition-colors cursor-pointer ${
                currentTab === 'all'
                  ? 'text-gray-900 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>All</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-xs font-bold ${
                  currentTab === 'all' ? 'bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {allCount}
              </span>
            </button>

            <button
              onClick={() => onTabChange('mine')}
              className={`relative pb-2 flex items-center gap-2 text-sm font-semibold transition-colors cursor-pointer ${
                currentTab === 'mine'
                  ? 'text-gray-900 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>Mine</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-xs font-bold ${
                  currentTab === 'mine' ? 'bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {mineCount}
              </span>
            </button>
          </>
        ) : (
          /* AGENT REPLIED VIEW: Strictly their own replies only (Security isolation: cannot see other agents' replies) */
          <button
            onClick={() => onTabChange('mine')}
            className="relative pb-2 flex items-center gap-2 text-sm font-semibold transition-colors text-gray-900 border-b-2 border-blue-600 cursor-pointer"
          >
            <span>Mine</span>
            <span className="text-xs px-2 py-0.5 rounded-xs font-bold bg-gray-200 text-gray-800">
              {myRepliedCount}
            </span>
          </button>
        )}
      </div>

      {/* Date Option matching media_1793535661819_ede9d9a6.png */}
      <DatePickerPill
        value={selectedDate}
        onChange={onDateChange}
      />
    </div>
  );
};
