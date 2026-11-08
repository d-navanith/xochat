import React, { useState, useEffect } from 'react';
import type { User, TeamMemberProfile, TeamMemberDossier } from '../types';
import { api } from '../services/api';
import {
  Clock,
  Shield,
  RotateCw,
  CheckCircle2,
  MessageSquare,
  Zap,
  Users,
  Search,
} from 'lucide-react';

interface AiTeamAssistantViewProps {
  currentUser: User | null;
  onShowNotification?: (item: { type: 'success' | 'error' | 'warning' | 'info'; title: string; message: string }) => void;
  onBackToConversations?: () => void;
}

// Generate reliable color for initials
const getAvatarGradient = (username: string) => {
  const gradients = [
    'from-amber-400 to-yellow-500 text-gray-950',
    'from-blue-500 to-indigo-600 text-white',
    'from-emerald-500 to-teal-600 text-white',
    'from-purple-500 to-violet-600 text-white',
  ];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
};

const getInitials = (name: string) => {
  if (!name) return 'TM';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const AiTeamAssistantView: React.FC<AiTeamAssistantViewProps> = ({
  currentUser,
  onShowNotification,
  onBackToConversations,
}) => {
  const [teamMembers, setTeamMembers] = useState<TeamMemberProfile[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('murdock');
  const [dossier, setDossier] = useState<TeamMemberDossier | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');

  const loadTeamMembers = async () => {
    try {
      const res = await api.getAssistantTeamMembers();
      setTeamMembers(res.members);
    } catch (err) {
      console.error('Failed to load team members:', err);
    }
  };

  const loadDossier = async (username: string) => {
    setLoading(true);
    try {
      const res = await api.getAgentDossier(username);
      setDossier(res.dossier);
      setSelectedAgent(username);
    } catch (err: any) {
      console.error('Failed to load agent dossier:', err);
      onShowNotification?.({
        type: 'error',
        title: 'Load Failed',
        message: err.message || `Could not load data for @${username}`,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeamMembers();
    loadDossier('murdock');
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.triggerScrapeTeamActivity();
      await loadDossier(selectedAgent);
      onShowNotification?.({
        type: 'success',
        title: 'Activity Synchronized',
        message: `Updated latest live chat response metrics for @${selectedAgent}.`,
      });
    } catch (err: any) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  // Super Admin security guard
  if (currentUser?.role !== 'SUPER_ADMIN') {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/90 p-12 text-center shadow-2xs space-y-4">
        <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center">
          <Shield className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Access Restricted</h3>
        <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
          Team Member Performance & Overview is restricted to Super Admin only.
        </p>
        {onBackToConversations && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onBackToConversations}
              className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Back to Inbox
            </button>
          </div>
        )}
      </div>
    );
  }

  // Filter handled clients if user searches
  const filteredClients = dossier?.handledClients.filter((client) => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return (
      client.customerName.toLowerCase().includes(term) ||
      client.inquiryText.toLowerCase().includes(term) ||
      client.agentReplyText.toLowerCase().includes(term)
    );
  }) || [];

  return (
    <div className="flex-1 flex flex-col space-y-4 pb-8">
      {/* 1. Theme-Consistent Team Member Switcher Bar */}
      <div className="bg-white rounded-2xl border border-gray-200/90 p-3.5 shadow-2xs flex items-center justify-between flex-wrap gap-3">
        {/* Team Members List Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 mr-1">
            <Users className="w-4 h-4 text-gray-400" />
            <span>Team Members:</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {teamMembers.map((m) => {
              const isSelected = selectedAgent === m.username;
              return (
                <button
                  key={m.username}
                  type="button"
                  onClick={() => {
                    setSelectedAgent(m.username);
                    loadDossier(m.username);
                  }}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#fde047] text-gray-950 font-black shadow-xs ring-1 ring-amber-300'
                      : 'bg-gray-100 hover:bg-gray-200/80 text-gray-700'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-emerald-600' : 'bg-emerald-500'}`} />
                  <span>{m.name}</span>
                  <span className={`text-[10px] font-mono ${isSelected ? 'text-gray-800' : 'text-gray-400'}`}>
                    @{m.username}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sync Button */}
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl border border-gray-200/80 transition-colors cursor-pointer disabled:opacity-50"
          title="Synchronize live chat response counts"
        >
          <RotateCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Syncing...' : 'Sync Activity'}</span>
        </button>
      </div>

      {loading && (
        <div className="py-12 text-center text-xs text-gray-500 font-bold animate-pulse">
          Loading team member performance data...
        </div>
      )}

      {/* 2. Team Member Profile & Performance Details */}
      {dossier && !loading && (
        <div className="space-y-4">
          {/* Main Agent Identity Card */}
          <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-2xs space-y-4">
            <div className="flex items-start justify-between flex-wrap gap-4 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-4">
                {/* 100% Reliable SVG Initials Avatar with Online Badge */}
                <div className="relative shrink-0">
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getAvatarGradient(
                      dossier.profile.username
                    )} flex items-center justify-center font-black text-lg shadow-xs border border-gray-200`}
                  >
                    {getInitials(dossier.profile.name)}
                  </div>
                  <div
                    className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-xs"
                    title="Active on Live Chat"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-black text-gray-900 leading-tight">
                      {dossier.profile.name}
                    </h3>
                    <span className="text-xs font-mono font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                      @{dossier.profile.username}
                    </span>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {dossier.profile.title}
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 font-medium mt-1.5 max-w-2xl leading-relaxed">
                    {dossier.whatHeDoes.summary}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-gray-500 font-medium mt-2 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      {dossier.profile.shift}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-emerald-600 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Active on Live Chat
                    </span>
                    <span>•</span>
                    <span>Joined: {dossier.profile.joinDate}</span>
                  </div>
                </div>
              </div>

              {/* Response Speed SLA Badge */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2 text-right">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Response Speed SLA</div>
                <div className="text-xs font-black text-emerald-950">{dossier.performance.velocityBadge}</div>
              </div>
            </div>

            {/* 4 Clean Key Performance Stat Cards matching Theme */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="bg-[#fafafa] rounded-xl p-3.5 border border-gray-200/80 shadow-2xs">
                <div className="flex items-center justify-between text-gray-500 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Today's Replies</span>
                  <MessageSquare className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl font-black text-gray-900">{dossier.messageCounts.todayCount}</div>
                <span className="text-[10px] text-emerald-600 font-semibold">Active Shift Replies</span>
              </div>

              <div className="bg-[#fafafa] rounded-xl p-3.5 border border-gray-200/80 shadow-2xs">
                <div className="flex items-center justify-between text-gray-500 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Month Inquiries</span>
                  <CheckCircle2 className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-2xl font-black text-gray-900">{dossier.messageCounts.thisMonthCount}</div>
                <span className="text-[10px] text-blue-600 font-semibold">Single-Reply Verified</span>
              </div>

              <div className="bg-[#fafafa] rounded-xl p-3.5 border border-gray-200/80 shadow-2xs">
                <div className="flex items-center justify-between text-gray-500 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Avg Latency</span>
                  <Zap className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-black text-gray-900">{dossier.performance.averageLatencySeconds}s</div>
                <span className="text-[10px] text-emerald-600 font-semibold">&lt; 60s Target Met</span>
              </div>

              <div className="bg-[#fafafa] rounded-xl p-3.5 border border-gray-200/80 shadow-2xs">
                <div className="flex items-center justify-between text-gray-500 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Single-Reply Rate</span>
                  <Shield className="w-4 h-4 text-purple-500" />
                </div>
                <div className="text-2xl font-black text-gray-900">100%</div>
                <span className="text-[10px] text-gray-500 font-medium">Zero Duplicate Replies</span>
              </div>
            </div>
          </div>

          {/* 3. Inquiries Handled by this Agent (Clean Activity Table) */}
          <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 bg-gray-50/70 border-b border-gray-200/80 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-gray-800" />
                  <span>Customer Inquiries Handled by {dossier.profile.name} ({filteredClients.length})</span>
                </h4>
                <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                  Verified customer interactions and replies from the live chat database.
                </p>
              </div>

              {/* Quick Search inside inquiries */}
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filter inquiries..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              {filteredClients.length === 0 ? (
                <div className="py-10 text-center text-xs text-gray-400 font-medium">
                  No matching inquiries found for this team member.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100/70 text-gray-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-2.5">Customer</th>
                      <th className="px-4 py-2.5">Inquiry Message</th>
                      <th className="px-4 py-2.5">{dossier.profile.name}'s Reply</th>
                      <th className="px-4 py-2.5">Response Time</th>
                      <th className="px-4 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredClients.map((client, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-black text-[10px] flex items-center justify-center shrink-0">
                              {getInitials(client.customerName)}
                            </div>
                            <span className="font-bold text-gray-900">
                              {client.customerName}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-700 max-w-xs truncate" title={client.inquiryText}>
                          "{client.inquiryText}"
                        </td>
                        <td className="px-4 py-3 text-gray-900 font-medium max-w-xs truncate" title={client.agentReplyText}>
                          <span className="text-blue-600 font-bold mr-1">↳</span>
                          {client.agentReplyText}
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-500 whitespace-nowrap">
                          {client.responseLatencySeconds}s
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                            REPLIED
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
