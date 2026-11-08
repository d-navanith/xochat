import React, { useState, useEffect } from 'react';
import type { User, AgentMetrics, AuditLog } from '../types';
import { api } from '../services/api';
import { AdminScrapeActivityPanel } from './AdminScrapeActivityPanel';
import { X, UserPlus, BarChart3, History, Shield, CheckCircle2, Radar } from 'lucide-react';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'metrics' | 'surveillance' | 'add_user' | 'audit'>('surveillance');
  const [metrics, setMetrics] = useState<AgentMetrics[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  // New user form state
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'AGENT' | 'CORE_ADMIN'>('AGENT');
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    try {
      await api.createTeamUser({
        username: newUsername,
        password: newPassword,
        name: newName,
        role: newRole,
      });

      setCreateSuccess(`Team member @${newUsername} created successfully! They can now log in with their credentials.`);
      setNewUsername('');
      setNewPassword('');
      setNewName('');
      loadData();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create user');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 rounded-lg">
              <Shield className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {currentUser.role === 'SUPER_ADMIN' ? 'Super Admin Command Center' : 'Admin Management'}
              </h2>
              <p className="text-xs text-slate-400">
                Team supervision, message counting, agent scraping & audits
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-gray-200 bg-gray-50 px-6 pt-2 overflow-x-auto">
          {/* Surveillance / Scraping Tab */}
          <button
            onClick={() => setActiveTab('surveillance')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer shrink-0 ${
              activeTab === 'surveillance'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Radar className="w-4 h-4 text-indigo-600" />
            <span>Agent Surveillance & Scraping</span>
          </button>

          {/* Metrics Tab */}
          <button
            onClick={() => setActiveTab('metrics')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer shrink-0 ${
              activeTab === 'metrics'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Team Message Counts</span>
          </button>

          {/* Add User Tab */}
          <button
            onClick={() => setActiveTab('add_user')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer shrink-0 ${
              activeTab === 'add_user'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Team Member</span>
          </button>

          {currentUser.role === 'SUPER_ADMIN' && (
            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer shrink-0 ${
                activeTab === 'audit'
                  ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Full Audit Trail</span>
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {loading && (
            <div className="text-center py-6 text-xs text-gray-400">Loading admin data...</div>
          )}

          {activeTab === 'surveillance' && (
            <AdminScrapeActivityPanel />
          )}

          {activeTab === 'metrics' && (
            <div className="space-y-6">
              {/* Summary stat cards */}
              {summary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <div className="text-xs font-semibold text-amber-700 uppercase">Pending Inquiries</div>
                    <div className="text-2xl font-black text-amber-800 mt-1">{summary.pendingCount}</div>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                    <div className="text-xs font-semibold text-emerald-700 uppercase">In Replied Box</div>
                    <div className="text-2xl font-black text-emerald-800 mt-1">{summary.repliedCount}</div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <div className="text-xs font-semibold text-blue-700 uppercase">Total Conversations</div>
                    <div className="text-2xl font-black text-blue-800 mt-1">{summary.totalConversations}</div>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
                    <div className="text-xs font-semibold text-purple-700 uppercase">Total Agent Replies</div>
                    <div className="text-2xl font-black text-purple-800 mt-1">{summary.totalAgentMessages}</div>
                  </div>
                </div>
              )}

              {/* Per-Agent Message Counts Breakdown */}
              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-3">
                  Individual Team Member Performance & Message Counts
                </h3>

                <div className="space-y-4">
                  {metrics.map((agent) => (
                    <div
                      key={agent.userId}
                      className="border border-gray-200 rounded-xl p-4 bg-white shadow-2xs hover:border-gray-300"
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <img
                            src={agent.avatarUrl}
                            alt={agent.name}
                            className="w-10 h-10 rounded-full border border-gray-200 bg-gray-50"
                          />
                          <div>
                            <div className="font-bold text-sm text-gray-900">{agent.name}</div>
                            <div className="text-xs text-gray-500">
                              @{agent.username} • <span className="font-semibold text-indigo-600">{agent.role}</span>
                            </div>
                          </div>
                        </div>

                        {/* Badges */}
                        <div className="flex items-center gap-4">
                          {agent.averageResponseTimeSeconds > 0 && (
                            <div className="text-right">
                              <div className="text-xs text-gray-400 uppercase">Avg Response</div>
                              <div className="text-sm font-bold text-emerald-600">{agent.averageResponseTimeSeconds}s</div>
                            </div>
                          )}
                          <div className="text-right">
                            <div className="text-xs text-gray-400 uppercase">Sent Messages</div>
                            <div className="text-base font-extrabold text-blue-600">{agent.messagesSentCount}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-400 uppercase">Chats Handled</div>
                            <div className="text-base font-extrabold text-gray-800">
                              {agent.conversationsHandledCount}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Recent messages sent by this agent */}
                      <div className="mt-3">
                        <div className="text-xs font-semibold text-gray-500 mb-2">
                          Recent customer replies sent by @{agent.username}:
                        </div>
                        {agent.recentMessages.length === 0 ? (
                          <div className="text-xs text-gray-400 italic">No replies recorded yet.</div>
                        ) : (
                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {agent.recentMessages.slice(0, 5).map((m) => (
                              <div
                                key={m.messageId}
                                className="text-xs bg-gray-50 p-2 rounded-md border border-gray-100 flex items-start justify-between gap-3"
                              >
                                <div className="min-w-0">
                                  <span className="font-semibold text-gray-700">To {m.customerName}: </span>
                                  <span className="text-gray-600 truncate">{m.text}</span>
                                </div>
                                <span className="text-[10px] text-gray-400 shrink-0">
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

          {activeTab === 'add_user' && (
            <div className="max-w-lg mx-auto py-2">
              <h3 className="text-base font-bold text-gray-900 mb-1">Provision New Team Member</h3>
              <p className="text-xs text-gray-500 mb-5">
                Assign a unique username and initial password so the agent can log into the system.
              </p>

              {createSuccess && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{createSuccess}</span>
                </div>
              )}

              {createError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg">
                  {createError}
                </div>
              )}

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Marcus Bradley"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Assigned Username</label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="e.g. mbradley"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Initial Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">System Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="AGENT">Agent / Team Member (Chat & Reply Access)</option>
                    {currentUser.role === 'SUPER_ADMIN' && (
                      <option value="CORE_ADMIN">Admin (Team Management & Message Audits)</option>
                    )}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors shadow-xs cursor-pointer"
                >
                  Create Team Member
                </button>
              </form>
            </div>
          )}

          {activeTab === 'audit' && (
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-3">System-Wide Real-Time Audit Log</h3>
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Timestamp</th>
                      <th className="py-2.5 px-4">Actor</th>
                      <th className="py-2.5 px-4">Action</th>
                      <th className="py-2.5 px-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50/60">
                        <td className="py-2.5 px-4 text-gray-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-gray-800 whitespace-nowrap">
                          @{log.actorUsername} ({log.actorName})
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-gray-600">
                          {log.targetDescription || JSON.stringify(log.targetId)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
