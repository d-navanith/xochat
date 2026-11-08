import React, { useState, useEffect } from 'react';
import type { User, AgentMetrics, AuditLog } from '../types';
import { api } from '../services/api';
import { AdminScrapeActivityPanel } from './AdminScrapeActivityPanel';
import { CrmPipelineBoard } from './CrmPipelineBoard';
import { AiTeamAssistantView } from './AiTeamAssistantView';
import { UserPlus, BarChart3, History, Shield, ArrowLeft, Kanban, Sparkles } from 'lucide-react';
import type { NotificationItem } from './ThemedNotification';

interface AdminWorkspaceViewProps {
  activeTab: 'surveillance' | 'metrics' | 'add_user' | 'audit' | 'crm_pipeline' | 'ai_assistant' | string;
  onBackToConversations: () => void;
  currentUser: User;
  onShowNotification: (notification: Omit<NotificationItem, 'id'>) => void;
  onSelectForReply?: (lead: any) => void;
}

export const AdminWorkspaceView: React.FC<AdminWorkspaceViewProps> = ({
  activeTab,
  onBackToConversations,
  currentUser,
  onShowNotification,
  onSelectForReply,
}) => {
  const [metrics, setMetrics] = useState<AgentMetrics[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  // New user form state
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'AGENT' | 'CORE_ADMIN'>('AGENT');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const metricsData = await api.getMetrics();
      setMetrics(metricsData.teamMetrics);
      setSummary(metricsData.summary);

      if (currentUser.role === 'SUPER_ADMIN') {
        const auditData = await api.getAuditLogs();
        setAuditLogs(auditData.logs);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.createTeamUser({
        username: newUsername,
        password: newPassword,
        name: newName,
        role: newRole,
      });

      onShowNotification({
        type: 'success',
        title: 'Team Member Provisioned',
        message: `Team member @${newUsername} (${newName}) was successfully created! They can log in immediately at port 5121.`,
        meta: {
          actorUsername: newUsername,
          actorName: newName,
        },
      });

      setNewUsername('');
      setNewPassword('');
      setNewName('');
      loadData();
    } catch (err: any) {
      onShowNotification({
        type: 'error',
        title: 'Provisioning Failed',
        message: err.message || 'Could not create team member. Check username uniqueness.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col space-y-4 min-h-0 overflow-hidden">
      {/* Workspace Header matching Xochat System Design */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-4 flex items-center justify-between flex-wrap gap-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shadow-2xs">
            {activeTab === 'surveillance' && <Shield className="w-5 h-5 text-gray-900" />}
            {activeTab === 'metrics' && <BarChart3 className="w-5 h-5 text-gray-900" />}
            {activeTab === 'add_user' && <UserPlus className="w-5 h-5 text-gray-900" />}
            {activeTab === 'audit' && <History className="w-5 h-5 text-gray-900" />}
            {activeTab === 'crm_pipeline' && <Kanban className="w-5 h-5 text-gray-900" />}
            {activeTab === 'ai_assistant' && <Sparkles className="w-5 h-5 text-gray-900" />}
          </div>
          <div>
            <h2 className="text-base font-black text-gray-900 tracking-tight">
              {activeTab === 'surveillance' && 'Agent Surveillance & Scraping'}
              {activeTab === 'metrics' && 'Team Message Counts'}
              {activeTab === 'add_user' && 'Add Team Member'}
              {activeTab === 'audit' && 'Full Audit Trail'}
              {activeTab === 'crm_pipeline' && 'Leads & CRM Pipeline'}
              {activeTab === 'ai_assistant' && 'Team Member Performance & Activity'}
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              {activeTab === 'surveillance' && 'Real-time extraction of live team interventions, response latencies & conversation states.'}
              {activeTab === 'metrics' && 'Operational message throughput and individual response metrics.'}
              {activeTab === 'add_user' && 'Provision team members and administrators.'}
              {activeTab === 'audit' && 'Ledger of security claims, collision events, and message dispatches.'}
              {activeTab === 'crm_pipeline' && 'Visual Kirrivan Kanban & Table deal flow with multi-stage progression and customer intelligence.'}
              {activeTab === 'ai_assistant' && 'Monitor team member activity, response speeds, and handled live chat conversations.'}
            </p>
          </div>
        </div>

        <button
          onClick={onBackToConversations}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors border border-gray-300 shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Inbox</span>
        </button>
      </div>

      {/* Main Command Body */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="py-6 text-center text-xs text-gray-400 font-medium">
            Syncing system state...
          </div>
        )}

        {/* 1. AGENT SURVEILLANCE & SCRAPING */}
        {activeTab === 'surveillance' && <AdminScrapeActivityPanel />}

        {/* 2. TEAM MESSAGE COUNTS */}
        {activeTab === 'metrics' && (
          <div className="space-y-6">
            {summary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-[#fef3c7] border border-[#fde68a] rounded-2xl p-4 shadow-2xs">
                  <div className="text-xs font-black text-[#b45309] uppercase tracking-wider">Pending Inquiries</div>
                  <div className="text-3xl font-black text-gray-900 mt-1">{summary.pendingCount}</div>
                </div>
                <div className="bg-[#ecfdf5] border border-[#a7f3d0] rounded-2xl p-4 shadow-2xs">
                  <div className="text-xs font-black text-emerald-800 uppercase tracking-wider">In Replied Box</div>
                  <div className="text-3xl font-black text-gray-900 mt-1">{summary.repliedCount}</div>
                </div>
                <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-2xl p-4 shadow-2xs">
                  <div className="text-xs font-black text-blue-800 uppercase tracking-wider">Total Inquiries</div>
                  <div className="text-3xl font-black text-gray-900 mt-1">{summary.totalConversations}</div>
                </div>
                <div className="bg-[#fdf4ff] border border-[#f0abfc] rounded-2xl p-4 shadow-2xs">
                  <div className="text-xs font-black text-purple-800 uppercase tracking-wider">Agent Replies Sent</div>
                  <div className="text-3xl font-black text-gray-900 mt-1">{summary.totalAgentMessages}</div>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-black text-gray-900 mb-4 tracking-tight">
                Team Member Performance & Message Counts
              </h3>

              <div className="space-y-3">
                {metrics.map((agent) => (
                  <div
                    key={agent.userId}
                    className="border border-gray-200/90 rounded-2xl p-4 bg-white shadow-2xs hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={agent.avatarUrl}
                          alt={agent.name}
                          className="w-11 h-11 rounded-full border-2 border-amber-300 bg-amber-50 object-cover"
                        />
                        <div>
                          <div className="font-bold text-sm text-gray-900">{agent.name}</div>
                          <div className="text-xs text-gray-500 font-medium">
                            @{agent.username} •{' '}
                            <span className="font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md text-[11px]">
                              {agent.role}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-5">
                        {agent.averageResponseTimeSeconds > 0 && (
                          <div className="text-right">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                              Avg Speed
                            </div>
                            <div className="text-sm font-black text-emerald-600">
                              {agent.averageResponseTimeSeconds}s
                            </div>
                          </div>
                        )}
                        <div className="text-right">
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            Replies Sent
                          </div>
                          <div className="text-lg font-black text-[#0066ff]">
                            {agent.messagesSentCount}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            Handled
                          </div>
                          <div className="text-lg font-black text-gray-900">
                            {agent.conversationsHandledCount}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                        Recent Inquiries Answered by @{agent.username}:
                      </div>
                      {agent.recentMessages.length === 0 ? (
                        <div className="text-xs text-gray-400 italic">No replies recorded yet.</div>
                      ) : (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {agent.recentMessages.map((m) => (
                            <div
                              key={m.messageId}
                              className="text-xs bg-gray-50 p-2.5 rounded-xl border border-gray-200/70 flex items-start justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <span className="font-bold text-gray-900">To {m.customerName}: </span>
                                <span className="text-gray-700">{m.text}</span>
                              </div>
                              <span className="text-[11px] font-medium text-gray-400 shrink-0">
                                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. ADD TEAM MEMBER */}
        {activeTab === 'add_user' && (
          <div className="max-w-xl mx-auto py-4">
            <div className="bg-white rounded-2xl border-[1.5px] border-[#ef4444] shadow-xl p-4 flex flex-col">
              <div className="bg-[#9faab0] rounded-xl p-6 relative overflow-hidden">
                <h3 className="text-center font-bold text-gray-900 text-sm uppercase tracking-wider mb-4">
                  PROVISION NEW TEAM MEMBER
                </h3>

                <form onSubmit={handleCreateUser} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      User Name (Unique Identifier)
                    </label>
                    <input
                      type="text"
                      required
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="e.g. sarah"
                      className="w-full bg-white text-gray-800 placeholder-gray-400 rounded-md px-4 py-2.5 text-sm outline-none shadow-xs border border-transparent focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      Full Display Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Sarah Connor"
                      className="w-full bg-white text-gray-800 placeholder-gray-400 rounded-md px-4 py-2.5 text-sm outline-none shadow-xs border border-transparent focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      Initial Password
                    </label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter secure password"
                      className="w-full bg-white text-gray-800 placeholder-gray-400 rounded-md px-4 py-2.5 text-sm outline-none shadow-xs border border-transparent focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      Role & Permissions
                    </label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as any)}
                      className="w-full bg-white text-gray-800 rounded-md px-4 py-2.5 text-sm outline-none shadow-xs border border-transparent focus:border-blue-500 cursor-pointer"
                    >
                      <option value="AGENT">Team Member (Port 5121)</option>
                      <option value="CORE_ADMIN">Admin (Port 5120)</option>
                    </select>
                  </div>

                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-[#10b981] hover:bg-[#059669] text-white font-extrabold text-sm py-3 px-6 rounded-full shadow-md tracking-wider uppercase transition-transform active:scale-98 cursor-pointer disabled:opacity-50"
                    >
                      {submitting ? 'PROVISIONING...' : 'CREATE TEAM MEMBER'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* 4. FULL AUDIT TRAIL (Super Admin Only - Restricted for Core Admin) */}
        {activeTab === 'audit' && (
          currentUser?.role !== 'SUPER_ADMIN' ? (
            <div className="bg-white rounded-2xl border border-gray-200/90 p-10 text-center shadow-2xs space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Access Restricted</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
                Full Audit Trail is restricted to Super Admin only. Administrators do not have permission to view the cryptographic security audit ledger.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onBackToConversations}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-2xs"
                >
                  Back to Conversations
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
                <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-200/80 flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider text-gray-700">
                    Cryptographic Security Audit Log ({auditLogs.length} Records)
                  </span>
                  <span className="text-xs text-gray-400 font-medium">
                    Immutable Memory Store
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-100 text-gray-600 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-4 py-2.5">Timestamp</th>
                        <th className="px-4 py-2.5">Action</th>
                        <th className="px-4 py-2.5">Actor</th>
                        <th className="px-4 py-2.5">Target</th>
                        <th className="px-4 py-2.5">Role</th>
                        <th className="px-4 py-2.5">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2.5 font-mono text-gray-500 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="px-4 py-2.5 font-bold text-gray-900">
                            {log.action}
                          </td>
                          <td className="px-4 py-2.5 text-gray-700 font-semibold">
                            @{log.actorUsername}
                          </td>
                          <td className="px-4 py-2.5 text-gray-600">
                            {log.customerName || log.targetDescription || log.targetId || '-'}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-800">
                              {log.actorRole}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-500 truncate max-w-xs">
                            {log.replyText || log.targetDescription || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )
        )}

        {/* 5. LEADS & CRM PIPELINE */}
        {activeTab === 'crm_pipeline' && (
          <CrmPipelineBoard
            currentUser={currentUser}
            onShowNotification={onShowNotification}
            onSelectForReply={onSelectForReply}
          />
        )}

        {/* 6. AI TEAM INTELLIGENCE ASSISTANT (Super Admin Only) */}
        {activeTab === 'ai_assistant' && (
          <AiTeamAssistantView
            currentUser={currentUser}
            onShowNotification={onShowNotification}
            onBackToConversations={onBackToConversations}
          />
        )}
      </div>
    </div>
  );
};
