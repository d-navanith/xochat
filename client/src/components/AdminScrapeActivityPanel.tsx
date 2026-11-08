import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { AuditLog } from '../types';
import { Search, Clock, Zap, RotateCw, Globe } from 'lucide-react';

export const AdminScrapeActivityPanel: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeStep, setScrapeStep] = useState<string | null>(null);
  const [lastScrapedTime, setLastScrapedTime] = useState<string | null>(null);
  const [scrapedAgents, setScrapedAgents] = useState<any[]>([]);
  const [autoScrape, setAutoScrape] = useState(false);

  // Filters
  const [agentFilter, setAgentFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const fetchActivity = async () => {
    setLoading(true);
    try {
      const data = await api.getScrapeActivity({
        agentUsername: agentFilter || undefined,
        customerQuery: customerFilter || undefined,
        action: actionFilter || undefined,
      });
      setLogs(data.activityStream);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, [agentFilter, customerFilter, actionFilter]);

  // Handle Live Scrape Button Click (User vision: "Admin button -> process -> automatically scraping team members website")
  const handleTriggerScrape = async () => {
    if (isScraping) return;
    setIsScraping(true);

    // Multi-stage visual feedback for real scraping process
    setScrapeStep('Connecting to Team Members Web Portal (http://localhost:5121)...');
    await new Promise((r) => setTimeout(r, 450));

    setScrapeStep('Scraping live agent DOM & socket threads (@murdock, @lisa, @john)...');
    await new Promise((r) => setTimeout(r, 550));

    setScrapeStep('Extracting answered customer loads, reply texts, and latency timers...');

    try {
      const result = await api.triggerScrapeTeamActivity();
      setLogs(result.activityStream);
      setScrapedAgents(result.scrapedAgents || []);
      setLastScrapedTime(new Date().toLocaleTimeString());
      setScrapeStep(`Successfully scraped ${result.totalScrapedActions} real interventions from localhost:5121!`);
      setTimeout(() => setScrapeStep(null), 3000);
    } catch (err) {
      console.error('Scrape failed:', err);
      setScrapeStep('Scraping error: could not connect to team portal.');
      setTimeout(() => setScrapeStep(null), 3000);
    } finally {
      setIsScraping(false);
    }
  };

  // Auto-scrape interval if enabled
  useEffect(() => {
    if (!autoScrape) return;
    const interval = setInterval(() => {
      api.triggerScrapeTeamActivity()
        .then((result) => {
          setLogs(result.activityStream);
          setScrapedAgents(result.scrapedAgents || []);
          setLastScrapedTime(new Date().toLocaleTimeString());
        })
        .catch(console.error);
    }, 8000);

    return () => clearInterval(interval);
  }, [autoScrape]);

  return (
    <div className="space-y-4">
      {/* 1. TOP LIVE SCRAPING COMMAND CONTROL (Matches user's exact design theme) */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-2xs">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-50 text-[#0066ff] rounded-lg">
                <Globe className="w-5 h-5 text-[#0066ff]" />
              </span>
              <h3 className="text-base font-black tracking-tight text-gray-900 flex items-center gap-2">
                <span>Automated Team Website Scraper</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Zero Database
                </span>
              </h3>
            </div>
            <p className="text-xs text-gray-500 font-medium">
              Scrapes live agent responses, response latencies, and answered customer loads directly from{' '}
              <code className="text-[#0066ff] font-bold">http://localhost:5121</code>.
            </p>
          </div>

          {/* Scrape Triggers matching Xochat Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAutoScrape(!autoScrape)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                autoScrape
                  ? 'bg-emerald-500 border-emerald-600 text-white shadow-xs'
                  : 'bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-700'
              }`}
            >
              {autoScrape ? '● Auto-Scrape (8s Active)' : '○ Enable Auto-Scrape'}
            </button>

            <button
              type="button"
              onClick={handleTriggerScrape}
              disabled={isScraping}
              className="inline-flex items-center gap-2 bg-[#0052cc] hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white font-extrabold text-sm py-2.5 px-5 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Zap className={`w-4 h-4 ${isScraping ? 'animate-bounce' : ''}`} />
              <span>{isScraping ? 'Scraping Port 5121...' : 'Scrape Team Portal Now'}</span>
            </button>
          </div>
        </div>

        {/* Visual Scraping Process Indicator Bar */}
        {scrapeStep && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs font-bold text-gray-900 mb-1.5">
              <span className="flex items-center gap-2">
                <RotateCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                {scrapeStep}
              </span>
              <span className="text-[11px] font-mono text-gray-500">Live Scraper Engine</span>
            </div>
            <div className="w-full bg-amber-200/60 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isScraping ? 'w-3/4 bg-[#fde047]' : 'w-full bg-emerald-500'
                }`}
              />
            </div>
          </div>
        )}

        {/* Live Scraped Agents Telemetry Pills */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-500 text-[11px] uppercase tracking-wider">
              Scraped Team Members:
            </span>
            {scrapedAgents.length === 0 ? (
              <span className="text-gray-400 italic text-[11px]">Click button above to scrape port 5121</span>
            ) : (
              scrapedAgents.map((ag) => (
                <span
                  key={ag.agentId}
                  className="inline-flex items-center gap-1.5 bg-[#fef08a] border border-[#fde047] text-gray-900 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full shadow-2xs"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>@{ag.username}</span>
                  <span className="bg-white/80 text-gray-900 rounded-full px-1 text-[10px] font-black">
                    {ag.repliedCount}
                  </span>
                </span>
              ))
            )}
          </div>

          {lastScrapedTime && (
            <div className="text-[11px] font-medium text-gray-400">
              Last Scraped: <span className="text-gray-700 font-bold">{lastScrapedTime}</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. FILTER & SEARCH DOCK */}
      <div className="bg-white p-3 rounded-xl border border-gray-200/90 shadow-2xs flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            placeholder="Search by customer name or inquiry..."
            className="w-full bg-transparent text-xs text-gray-800 placeholder-gray-400 outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 font-semibold outline-none cursor-pointer"
          >
            <option value="">All Team Members</option>
            <option value="murdock">@murdock (H.M. Murdock)</option>
            <option value="lisa">@lisa (Lisa Cuddy)</option>
            <option value="john">@john (John Doe)</option>
          </select>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 font-semibold outline-none cursor-pointer"
          >
            <option value="">All Actions</option>
            <option value="MESSAGE_SENT">Agent Replies</option>
            <option value="LOCK_ACQUIRED">Atomic Claims</option>
            <option value="LOCK_COLLISION_BLOCKED">Collisions Prevented</option>
          </select>
        </div>
      </div>

      {/* 3. SURVEILLANCE ACTIVITY STREAM (Matching ConversationCard Figma Design) */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-2xl p-8 text-center text-xs text-gray-400 border border-gray-200">
            Extracting activity stream from memory ledger...
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-gray-200 text-gray-500">
            <p className="font-bold text-gray-700 text-sm">No activity recorded yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Click "Scrape Team Portal Now" to extract live interventions from port 5121.
            </p>
          </div>
        ) : (
          logs.map((log) => {
            const isReply = log.action === 'MESSAGE_SENT';

            return (
              <div
                key={log.id}
                className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs p-4 flex items-start justify-between gap-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="relative shrink-0 mt-0.5">
                    <img
                      src={`https://api.dicebear.com/7.x/personas/svg?seed=${log.actorUsername || 'User'}`}
                      alt={log.actorName || ''}
                      className="w-10 h-10 rounded-full border border-gray-300 bg-amber-50 object-cover"
                    />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border border-white rounded-full"></span>
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-sm text-gray-900">
                        {log.actorName || `@${log.actorUsername}`}
                      </span>
                      <span className="text-xs text-gray-400 font-medium">
                        @{log.actorUsername}
                      </span>
                      <span className="text-[11px] font-extrabold text-[#0066ff] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        {log.action}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        ✓ Scraped from localhost:5121
                      </span>
                    </div>

                    {/* Customer and Details Box */}
                    {log.customerName && (
                      <div className="text-xs font-bold text-gray-700">
                        Inquiry: <span className="text-gray-900">{log.customerName}</span>
                      </div>
                    )}

                    {/* Reply Bubble in Soft Lavender matching User Figma */}
                    {isReply && log.replyText && (
                      <div className="mt-1.5 max-w-xl">
                        <div className="bg-[#e0e7ff] text-gray-900 rounded-2xl rounded-bl-xs px-4 py-2.5 text-xs font-medium leading-relaxed border border-blue-100/70 shadow-2xs">
                          {log.replyText}
                        </div>
                      </div>
                    )}

                    {!isReply && log.targetDescription && (
                      <p className="text-xs text-gray-600 font-medium">
                        {log.targetDescription}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Metadata: Response Latency & Timestamp */}
                <div className="flex flex-col items-end shrink-0 space-y-1">
                  <div className="flex items-center gap-1 text-[11px] text-gray-400 font-medium">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>

                  {log.responseTimeSeconds !== undefined && log.responseTimeSeconds > 0 && (
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-black px-2 py-0.5 rounded-md">
                      ⚡ {log.responseTimeSeconds}s Latency
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
