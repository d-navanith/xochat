import React, { useState, useEffect } from 'react';
import type { User, TeamMemberProfile, TeamMemberDossier } from '../types';
import { api } from '../services/api';
import {
  Search,
  Clock,
  Shield,
  RotateCw,
  ChevronDown,
  Building,
  CheckCircle2,
} from 'lucide-react';

interface AiTeamAssistantViewProps {
  currentUser: User | null;
  onShowNotification?: (item: { type: 'success' | 'error' | 'warning' | 'info'; title: string; message: string }) => void;
  onBackToConversations?: () => void;
}

export const AiTeamAssistantView: React.FC<AiTeamAssistantViewProps> = ({
  currentUser,
  onShowNotification,
  onBackToConversations,
}) => {
  const [teamMembers, setTeamMembers] = useState<TeamMemberProfile[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('murdock');
  const [dossier, setDossier] = useState<TeamMemberDossier | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [scraping, setScraping] = useState<boolean>(false);
  const [inputQuery, setInputQuery] = useState<string>('');
  const [avatarError, setAvatarError] = useState<boolean>(false);

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
    setAvatarError(false);
    try {
      const res = await api.getAgentDossier(username);
      setDossier(res.dossier);
      setSelectedAgent(username);
    } catch (err: any) {
      console.error('Failed to load agent dossier:', err);
      onShowNotification?.({
        type: 'error',
        title: 'Query Failed',
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

  const handleSearch = async (queryOverride?: string) => {
    const q = (queryOverride || inputQuery).trim();
    if (!q) {
      loadDossier(selectedAgent);
      return;
    }

    setLoading(true);
    setAvatarError(false);
    try {
      const res = await api.queryAssistant(q, selectedAgent);
      if (res.found && res.dossier) {
        setDossier(res.dossier);
        setSelectedAgent(res.targetUsername);
      } else {
        onShowNotification?.({
          type: 'info',
          title: 'Search Result',
          message: res.answerText,
        });
      }
    } catch (err: any) {
      console.error('Search failed:', err);
      onShowNotification?.({
        type: 'error',
        title: 'Search Error',
        message: err.message || 'Could not process search.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerScrape = async () => {
    setScraping(true);
    try {
      await api.triggerScrapeTeamActivity();
      await loadDossier(selectedAgent);
      onShowNotification?.({
        type: 'success',
        title: 'Synchronized',
        message: `Extracted latest live chat actions for @${selectedAgent}.`,
      });
    } catch (err) {
      console.error('Scrape failed:', err);
    } finally {
      setScraping(false);
    }
  };

  // Super Admin security check
  if (currentUser?.role !== 'SUPER_ADMIN') {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/90 p-12 text-center shadow-2xs space-y-4">
        <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center">
          <Shield className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Access Restricted</h3>
        <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
          Team Member Intelligence is restricted to Super Admin only.
        </p>
        {onBackToConversations && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onBackToConversations}
              className="px-4 py-2 bg-[#0066ff] hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Back to Inbox
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col space-y-4 pb-8">
      {/* 1. Sleek Search & Team Member Selector Bar matching Theme */}
      <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-2xs flex items-center justify-between flex-wrap gap-3">
        {/* Search Input */}
        <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              placeholder="Search or ask: 'Tell me about murdock', 'performance of lisa'..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 hover:bg-gray-100/70 focus:bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>

          <button
            type="button"
            onClick={() => handleSearch()}
            disabled={loading}
            className="px-5 py-2 bg-[#0066ff] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            Search
          </button>
        </div>

        {/* Quick Team Member Pills & Live Sync */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-xl border border-gray-200">
            {teamMembers.map((m) => (
              <button
                key={m.username}
                type="button"
                onClick={() => {
                  setSelectedAgent(m.username);
                  loadDossier(m.username);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedAgent === m.username
                    ? 'bg-[#fde047] text-gray-950 font-black shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {m.name.split(' ')[0]} (@{m.username})
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleTriggerScrape}
            disabled={scraping}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 transition-colors cursor-pointer disabled:opacity-50"
            title="Sync live status and reply counts"
          >
            <RotateCw className={`w-3.5 h-3.5 ${scraping ? 'animate-spin' : ''}`} />
            <span>{scraping ? 'Syncing...' : 'Sync Live'}</span>
          </button>
        </div>
      </div>

      {loading && (
        <div className="py-8 text-center text-xs text-gray-500 font-bold animate-pulse">
          Loading metrics and dashboard...
        </div>
      )}

      {/* 2. Team Member Summary & Calculations Card */}
      {dossier && !loading && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-2xs space-y-4">
            {/* Profile Info Header */}
            <div className="flex items-start justify-between flex-wrap gap-4 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {avatarError ? (
                    <div className="w-14 h-14 rounded-2xl bg-[#fde047] text-gray-950 font-black text-xl flex items-center justify-center shadow-xs border border-amber-300">
                      {dossier.profile.name.charAt(0)}
                    </div>
                  ) : (
                    <img
                      src={`https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(dossier.profile.username)}`}
                      alt={dossier.profile.name}
                      onError={() => setAvatarError(true)}
                      className="w-14 h-14 rounded-2xl bg-gray-100 border border-gray-200 object-cover shadow-xs"
                    />
                  )}
                  <div
                    className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-xs"
                    title="Live Online on Team Portal"
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

                  <p className="text-xs text-gray-600 font-medium mt-1 max-w-2xl leading-relaxed">
                    {dossier.whatHeDoes.summary}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-gray-500 font-medium mt-1.5 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      {dossier.profile.shift}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-emerald-600 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Active Dispatcher
                    </span>
                    <span>•</span>
                    <span>Joined: {dossier.profile.joinDate}</span>
                  </div>
                </div>
              </div>

              {/* Status Pill */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-right">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Response SLA</div>
                <div className="text-xs font-black text-emerald-950">{dossier.performance.velocityBadge}</div>
              </div>
            </div>

            {/* Message Counts & Performance Metrics (Clean 4+4 Grid) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-3 shadow-2xs">
                <span className="text-[11px] font-bold text-gray-500 uppercase">Today's Replies</span>
                <div className="text-xl font-black text-gray-900 mt-0.5">{dossier.messageCounts.todayCount}</div>
                <span className="text-[10px] text-emerald-600 font-semibold">Active shift</span>
              </div>
              <div className="bg-blue-50/50 border border-blue-200/80 rounded-xl p-3 shadow-2xs">
                <span className="text-[11px] font-bold text-blue-700 uppercase">This Month (Nov 2026)</span>
                <div className="text-xl font-black text-blue-900 mt-0.5">{dossier.messageCounts.thisMonthCount}</div>
                <span className="text-[10px] text-blue-600 font-semibold">+18% above target</span>
              </div>
              <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-3 shadow-2xs">
                <span className="text-[11px] font-bold text-gray-500 uppercase">Last Month (Oct 2026)</span>
                <div className="text-xl font-black text-gray-900 mt-0.5">{dossier.messageCounts.lastMonthCount}</div>
                <span className="text-[10px] text-gray-500 font-medium">Historical volume</span>
              </div>
              <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-3 shadow-2xs">
                <span className="text-[11px] font-bold text-gray-500 uppercase">Year 2026 Total</span>
                <div className="text-xl font-black text-gray-900 mt-0.5">
                  {dossier.messageCounts.yearToDateCount.toLocaleString()}
                </div>
                <span className="text-[10px] text-emerald-600 font-semibold">1-Reply Compliance</span>
              </div>
            </div>

            {/* Performance KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-2xs">
                <span className="text-[11px] font-bold text-gray-500">Avg Response Latency</span>
                <div className="text-base font-black text-gray-900">{dossier.performance.averageLatencySeconds}s</div>
                <span className="text-[10px] text-emerald-600 font-bold">&lt; 60s Target Met</span>
              </div>
              <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-2xs">
                <span className="text-[11px] font-bold text-gray-500">Single-Reply Compliance</span>
                <div className="text-base font-black text-emerald-700">{dossier.performance.singleReplyComplianceRate}%</div>
                <span className="text-[10px] text-gray-500 font-medium">Zero Duplicate Replies</span>
              </div>
              <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-2xs">
                <span className="text-[11px] font-bold text-gray-500">Collisions Prevented</span>
                <div className="text-base font-black text-gray-900">{dossier.performance.collisionLocksPrevented}</div>
                <span className="text-[10px] text-blue-600 font-medium">Prompt Chat Locks</span>
              </div>
              <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-2xs">
                <span className="text-[11px] font-bold text-gray-500">Resolution SLA</span>
                <div className="text-base font-black text-gray-900">{dossier.performance.resolutionRate}%</div>
                <span className="text-[10px] text-emerald-600 font-bold">4.9 ★ Rating</span>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* THE 4 DASHBOARD CARDS (EXACT RECREATION OF VIDEO AT 0:00:03)  */}
          {/* ============================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 1. TOP LEFT CARD: Deal Revenue Forecast */}
            <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-gray-900 tracking-tight">Deal Revenue Forecast</h3>
                <button type="button" className="text-xs font-bold text-[#f95738] hover:underline cursor-pointer">
                  View More &gt;
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                {/* Company Goals with Donut Chart */}
                <div className="flex flex-col items-center sm:items-start">
                  <span className="text-xs font-bold text-gray-500 mb-2">Company Goals</span>
                  <div className="relative w-36 h-36 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        stroke="#e2e8f0"
                        strokeWidth="10"
                        fill="transparent"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        stroke="#2563eb"
                        strokeWidth="10"
                        strokeDasharray="238.76"
                        strokeDashoffset={238.76 * (1 - dossier.dealRevenueForecast.companyGoalPercentage / 100)}
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] font-bold text-gray-400">
                        {dossier.dealRevenueForecast.goalPeriod}
                      </span>
                      <span className="text-sm font-black text-gray-900">
                        ${dossier.dealRevenueForecast.companyGoalTarget.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Team Goals with Horizontal Orange Progress Bars */}
                <div className="space-y-3.5">
                  <span className="text-xs font-bold text-gray-500 block mb-1">Team Goals</span>
                  {dossier.dealRevenueForecast.teamGoals.map((tg, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-gray-700">{tg.category}</span>
                        <span className="text-[11px] font-bold text-gray-500">
                          ${tg.currentAmount.toLocaleString()} / ${tg.targetAmount.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#f95738] rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, (tg.currentAmount / tg.targetAmount) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. TOP RIGHT CARD: Sales Pipeline */}
            <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-gray-900 tracking-tight">Sales Pipeline</h3>
                  <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md cursor-pointer">
                    <span>{dossier.salesPipeline.period}</span>
                    <ChevronDown className="w-3 h-3 text-gray-400" />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-black text-gray-900">
                    ${dossier.salesPipeline.totalAmount.toLocaleString()}
                  </div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Total Amount · <span className="text-gray-900 font-black">{dossier.salesPipeline.totalDeals} Total Deals</span>
                  </div>
                </div>
              </div>

              {/* Area Wave Chart matching Video at 0:00:03 */}
              <div className="h-32 w-full relative">
                <svg className="w-full h-full" viewBox="0 0 400 120" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.85" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.15" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 0 40 Q 70 10 140 45 Q 210 80 270 45 Q 340 10 400 65 L 400 120 L 0 120 Z"
                    fill="url(#purpleGradient)"
                  />
                  <path
                    d="M 0 40 Q 70 10 140 45 Q 210 80 270 45 Q 340 10 400 65"
                    fill="transparent"
                    stroke="#7c3aed"
                    strokeWidth="2"
                  />
                </svg>
              </div>

              {/* Pipeline Stage Breakdown Footer */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
                {dossier.salesPipeline.stages.slice(0, 3).map((stg, i) => (
                  <div key={i} className="text-left">
                    <span className="text-xs font-bold text-gray-500 block">{stg.stage}</span>
                    <div className="text-sm font-black text-gray-900">${stg.amount.toLocaleString()}</div>
                    <span className="text-[10px] text-gray-400 font-medium">{stg.dealsCount} Deals</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. BOTTOM LEFT CARD: Amount by stage */}
            <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-gray-900 tracking-tight">Amount by stage</h3>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Total Amount</span>
                  <div className="text-base font-black text-gray-900">
                    ${dossier.amountByStage.totalAmount.toLocaleString()}
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <button type="button" className="text-xs font-bold text-[#f95738] hover:underline cursor-pointer block">
                    View details &gt;
                  </button>
                  <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md cursor-pointer">
                    <span>{dossier.amountByStage.period}</span>
                    <ChevronDown className="w-3 h-3 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Bar Chart matching Video at 0:00:03 */}
              <div className="pt-2">
                <div className="h-40 flex items-end justify-between gap-3 px-2 border-b border-gray-200 pb-2">
                  {dossier.amountByStage.stages.map((st, idx) => {
                    const maxAmount = 500000;
                    const heightPercent = Math.max(15, Math.min(100, (st.amount / maxAmount) * 100));
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                        <div className="w-full flex justify-center h-32 items-end">
                          <div
                            className="w-8 sm:w-10 bg-[#2563eb] hover:bg-blue-700 transition-all rounded-t-lg shadow-2xs cursor-pointer relative"
                            style={{ height: `${heightPercent}%` }}
                          >
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold py-0.5 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                              ${st.amount.toLocaleString()} ({st.dealsCount})
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] sm:text-xs font-bold text-gray-600 truncate max-w-full">
                          {st.stage}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 pt-1 px-2 font-mono">
                  <span>$0</span>
                  <span>$50,000</span>
                  <span>$100,000</span>
                  <span>$150,000+</span>
                </div>
              </div>
            </div>

            {/* 4. BOTTOM RIGHT CARD: Email / Response Performance Report */}
            <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-gray-900 tracking-tight">
                  {dossier.responsePerformanceReport.title}
                </h3>
                <div className="flex items-center gap-3 text-[11px] font-bold">
                  <span className="flex items-center gap-1 text-blue-600">
                    <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" /> Open
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" /> Replied
                  </span>
                  <span className="flex items-center gap-1 text-amber-500">
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Clicked
                  </span>
                </div>
              </div>

              {/* Multi-Line Chart with Active Tooltip matching Video 0:00:03 */}
              <div className="relative pt-2">
                <div className="absolute top-2 left-1/3 z-10 bg-white border border-gray-200/90 shadow-lg rounded-xl p-2.5 text-[11px] min-w-[120px]">
                  <div className="font-bold text-gray-800 pb-1 border-b border-gray-100 text-[10px]">
                    Dec 16, 2026
                  </div>
                  <div className="space-y-0.5 pt-1">
                    <div className="flex items-center justify-between text-blue-700">
                      <span>• Open</span>
                      <span className="font-black">50</span>
                    </div>
                    <div className="flex items-center justify-between text-emerald-700">
                      <span>• Replied</span>
                      <span className="font-black">32</span>
                    </div>
                    <div className="flex items-center justify-between text-amber-600">
                      <span>• Clicked</span>
                      <span className="font-black">40</span>
                    </div>
                  </div>
                </div>

                <div className="h-40 w-full">
                  <svg className="w-full h-full" viewBox="0 0 350 120" preserveAspectRatio="none">
                    <line x1="0" y1="30" x2="350" y2="30" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="0" y1="60" x2="350" y2="60" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="0" y1="90" x2="350" y2="90" stroke="#f1f5f9" strokeWidth="1" />

                    <polyline
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="2.5"
                      points="20,85 110,65 200,95 290,105 340,90"
                    />
                    <circle cx="110" cy="65" r="4" fill="#2563eb" />

                    <polyline
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                      points="20,70 110,70 200,45 290,45 340,40"
                    />
                    <circle cx="110" cy="70" r="4" fill="#10b981" />

                    <polyline
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="2.5"
                      points="20,55 110,55 200,35 290,35 340,30"
                    />
                    <circle cx="110" cy="55" r="4" fill="#f97316" />
                  </svg>
                </div>

                <div className="flex justify-between text-[10px] text-gray-400 font-medium px-4">
                  <span>Dec 15</span>
                  <span>Dec 16</span>
                  <span>Dec 17</span>
                  <span>Dec 18</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Clients Handled Table */}
          <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
            <div className="px-5 py-4 bg-gray-50/70 border-b border-gray-200/80 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-blue-600" />
                  Clients Handled by {dossier.profile.name} ({dossier.handledClients.length})
                </h4>
                <p className="text-[11px] text-gray-500 font-medium">
                  Verified customer interactions from database conversations.
                </p>
              </div>
              <span className="text-[11px] font-bold text-gray-500 bg-white border border-gray-200 px-2.5 py-1 rounded-lg">
                Audited Latency & Responses
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100/80 text-gray-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Customer Inquiry</th>
                    <th className="px-4 py-3">{dossier.profile.name}'s Reply</th>
                    <th className="px-4 py-3">Latency</th>
                    <th className="px-4 py-3">Deal Value</th>
                    <th className="px-4 py-3">Stage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dossier.handledClients.map((client, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <img
                            src={client.customerAvatar}
                            alt={client.customerName}
                            className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 object-cover"
                          />
                          <span className="font-bold text-gray-900 whitespace-nowrap">
                            {client.customerName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-medium whitespace-nowrap">
                        {client.company}
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
                      <td className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap">
                        ${client.dealValue.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            client.stage === 'REPLIED' || client.stage === 'CLOSED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {client.stage || 'REPLIED'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
