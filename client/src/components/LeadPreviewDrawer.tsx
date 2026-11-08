import React, { useState } from 'react';
import {
  X,
  Mail,
  Building,
  DollarSign,
  Plus,
  Clock,
  User,
  CornerDownLeft,
  ExternalLink,
} from 'lucide-react';
import type { Conversation, User as AppUser } from '../types';

interface LeadPreviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Conversation | null;
  currentUser: AppUser | null;
  agents: AppUser[];
  onUpdateStage: (leadId: string, stage: string) => Promise<void>;
  onAddNote: (leadId: string, text: string) => Promise<void>;
  onAddTask: (leadId: string, task: { title: string; assignedTo?: string; dueDate?: string; priority?: string }) => Promise<void>;
  onToggleTask: (leadId: string, taskId: string) => Promise<void>;
  onReassign: (leadId: string, agent: { agentId: string; username: string; name: string; avatarUrl?: string }) => Promise<void>;
  onOpenEmailModal: (lead: Conversation) => void;
  onOpenWorkspace360: (lead: Conversation) => void;
  onSelectForReply?: (lead: Conversation) => void;
}

export const LeadPreviewDrawer: React.FC<LeadPreviewDrawerProps> = ({
  isOpen,
  onClose,
  lead,
  currentUser: _currentUser,
  agents,
  onUpdateStage,
  onAddNote,
  onAddTask,
  onToggleTask,
  onReassign,
  onOpenEmailModal,
  onOpenWorkspace360,
  onSelectForReply,
}) => {
  if (!isOpen || !lead) return null;

  const [activeTab, setActiveTab] = useState<'info' | 'activity' | 'chat'>('info');
  const [newNoteText, setNewNoteText] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState(lead.claimedByName || 'H.M. Murdock');
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  const stages = [
    { key: 'NEW', label: 'New' },
    { key: 'OPEN', label: 'Open' },
    { key: 'IN_PROGRESS', label: 'In Progress' },
    { key: 'OPEN_DEAL', label: 'Open Deal' },
    { key: 'REPLIED', label: 'Replied' },
    { key: 'CLOSED', label: 'Closed' },
  ];

  const currentStageKey = (lead.stage || (lead.hasReplied ? 'REPLIED' : 'NEW')).toUpperCase();

  const handleStageClick = async (stageKey: string) => {
    try {
      await onUpdateStage(lead.id, stageKey);
    } catch (err) {
      console.error('Failed to update stage:', err);
    }
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    setIsSubmittingNote(true);
    try {
      await onAddNote(lead.id, newNoteText.trim());
      setNewNoteText('');
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setIsSubmittingTask(true);
    try {
      await onAddTask(lead.id, {
        title: newTaskTitle.trim(),
        assignedTo: newTaskAssignee,
        dueDate: 'Today, 12:00 PM',
        priority: 'High',
      });
      setNewTaskTitle('');
      setShowAddTaskForm(false);
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const notesList = lead.notes || [];
  const tasksList = lead.tasks || [];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={onClose}
      />

      {/* Slide-over Container matching Frame 06 in Video */}
      <div className="relative w-full max-w-xl bg-white shadow-2xl h-full flex flex-col z-10 overflow-hidden border-l border-gray-200">
        {/* Drawer Header */}
        <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
              title="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-base font-black tracking-tight text-gray-900">
              Lead Preview
            </h2>
          </div>

          <button
            type="button"
            onClick={() => onOpenWorkspace360(lead)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-700 hover:text-gray-950 bg-gray-100 hover:bg-gray-200 transition-all border border-gray-200 cursor-pointer shadow-2xs"
          >
            <span>View full details</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. Customer Hero Card */}
          <div className="bg-slate-50/70 rounded-2xl p-5 border border-slate-200/80 flex flex-col items-center text-center relative shadow-2xs">
            <div className="relative mb-3">
              <img
                src={lead.customerAvatar}
                alt={lead.customerName}
                className="w-16 h-16 rounded-full bg-white border-2 border-white shadow-sm object-cover"
              />
              {lead.isUnansweredGreen && !lead.hasReplied && (
                <span className="absolute bottom-0 right-0 w-4 h-4 bg-lime-500 border-2 border-white rounded-full shadow-2xs" />
              )}
            </div>

            <h3 className="text-lg font-black text-gray-900 leading-tight">
              {lead.customerName}
            </h3>

            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 font-medium">
              <span className="flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-gray-400" />
                {lead.company || 'Google inc.'}
              </span>
              <span>•</span>
              <span className="text-gray-600 font-semibold">{lead.customerEmail || 'customer@example.com'}</span>
            </div>

            <div className="text-xs text-gray-400 mt-0.5">
              {lead.customerPhone || '(405) 555-0128'}
            </div>

            {/* Quick Action Buttons matching Frame 06 */}
            <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-slate-200/60 w-full">
              <button
                type="button"
                onClick={() => onOpenEmailModal(lead)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 text-xs font-bold text-gray-800 transition-all shadow-2xs cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                <span>Email</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('activity')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 text-xs font-bold text-gray-800 transition-all shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-amber-600" />
                <span>Log Note</span>
              </button>

              {onSelectForReply && !lead.hasReplied && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSelectForReply(lead);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0066ff] hover:bg-blue-700 text-xs font-black text-white transition-all shadow-2xs cursor-pointer"
                >
                  <CornerDownLeft className="w-3.5 h-3.5" />
                  <span>Reply in Chat</span>
                </button>
              )}
            </div>
          </div>

          {/* 2. Pipeline Stage Progression Pills matching Frame 06 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-gray-500">
                Pipeline Stage
              </span>
              <span className="text-[11px] font-bold text-blue-600">
                Click to advance stage
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {stages.map((st, i) => {
                const isActive = currentStageKey === st.key;
                const isPassed = stages.findIndex((s) => s.key === currentStageKey) > i;
                return (
                  <button
                    key={st.key}
                    type="button"
                    onClick={() => handleStageClick(st.key)}
                    className={`py-2 px-1 rounded-xl text-center text-[11px] font-bold transition-all cursor-pointer flex flex-col items-center justify-center border ${
                      isActive
                        ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-200 font-black'
                        : isPassed
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <span>{isPassed ? '✓ ' : ''}{st.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Key Lead Metadata Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Lead Owner
              </span>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs font-black text-gray-900">
                  {lead.claimedByName || 'Unassigned'}
                </span>
                <select
                  value={lead.claimedByAgentId || ''}
                  onChange={(e) => {
                    const agent = agents.find((a) => a.id === e.target.value);
                    if (agent) {
                      onReassign(lead.id, {
                        agentId: agent.id,
                        username: agent.username,
                        name: agent.name,
                        avatarUrl: agent.avatarUrl,
                      });
                    }
                  }}
                  className="text-[11px] font-bold text-blue-600 bg-transparent cursor-pointer focus:outline-none"
                >
                  <option value="" disabled>Reassign ▾</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>@{a.username} ({a.name})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Deal / Annual Value
              </span>
              <div className="mt-1 text-xs font-black text-emerald-700 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" />
                <span>{(lead.dealValue || 2500).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* 4. Tab Navigation matching Frame 06 */}
          <div className="flex items-center gap-2 border-b border-gray-200">
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`pb-2.5 px-3 text-xs font-bold transition-colors cursor-pointer border-b-2 ${
                activeTab === 'info'
                  ? 'border-blue-600 text-blue-600 font-black'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Customer Inquiry
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('activity')}
              className={`pb-2.5 px-3 text-xs font-bold transition-colors cursor-pointer border-b-2 ${
                activeTab === 'activity'
                  ? 'border-blue-600 text-blue-600 font-black'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Upcoming Tasks ({tasksList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={`pb-2.5 px-3 text-xs font-bold transition-colors cursor-pointer border-b-2 ${
                activeTab === 'chat'
                  ? 'border-blue-600 text-blue-600 font-black'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              Internal Notes ({notesList.length})
            </button>
          </div>

          {/* 5. Tab Content: Customer Inquiry & Chat */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <span className="font-bold text-gray-800">Original Inquiry Message:</span>
                  <span>{lead.lastMessageTime} • {lead.dateFormatted}</span>
                </div>
                <div className="bg-white p-3.5 rounded-lg border border-gray-200 text-xs sm:text-sm text-gray-800 leading-relaxed font-medium">
                  {lead.messages[0]?.text || lead.lastMessageText}
                </div>
              </div>

              {/* Replies if any */}
              {lead.messages.filter((m) => m.senderType === 'AGENT').length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-wider text-gray-500">
                    Agent Dispatch History
                  </span>
                  {lead.messages
                    .filter((m) => m.senderType === 'AGENT')
                    .map((reply) => (
                      <div key={reply.id} className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200/70 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-blue-900">@{reply.senderUsername || 'agent'}</span>
                          <span className="text-[11px] text-blue-500">{reply.timeFormatted}</span>
                        </div>
                        <p className="text-gray-800 leading-relaxed text-xs sm:text-sm">{reply.text}</p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* 6. Tab Content: Upcoming Tasks matching Frame 06 */}
          {activeTab === 'activity' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-700">
                  Upcoming Activity ({tasksList.length})
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddTaskForm(!showAddTaskForm)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add task</span>
                </button>
              </div>

              {/* Add Task Quick Form */}
              {showAddTaskForm && (
                <form onSubmit={handleCreateTask} className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2.5">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Task title (e.g. Prepare quote for customer)"
                    className="w-full text-xs p-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    autoFocus
                  />
                  <div className="flex items-center justify-between gap-2">
                    <select
                      value={newTaskAssignee}
                      onChange={(e) => setNewTaskAssignee(e.target.value)}
                      className="text-xs p-1.5 bg-white border border-gray-200 rounded-lg"
                    >
                      {agents.map((a) => (
                        <option key={a.id} value={a.name}>{a.name}</option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddTaskForm(false)}
                        className="px-2.5 py-1 text-xs text-gray-500 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingTask || !newTaskTitle.trim()}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50"
                      >
                        {isSubmittingTask ? 'Adding...' : 'Save Task'}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Tasks List */}
              <div className="space-y-2.5">
                {tasksList.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs flex items-start gap-3 hover:border-gray-300 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={task.isCompleted}
                      onChange={() => onToggleTask(lead.id, task.id)}
                      className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-bold ${task.isCompleted ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        {task.title}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          {task.dueDate}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-semibold text-gray-700">
                          <User className="w-3 h-3 text-gray-400" />
                          {task.assignedTo}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          {task.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. Tab Content: Notes matching Frame 06 */}
          {activeTab === 'chat' && (
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-700">
                CRM Notes ({notesList.length})
              </h4>

              {/* Add Note Input */}
              <form onSubmit={handleCreateNote} className="space-y-2">
                <textarea
                  rows={3}
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Log an internal note about this customer..."
                  className="w-full text-xs p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingNote || !newNoteText.trim()}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
                  >
                    {isSubmittingNote ? 'Saving...' : 'Add Note'}
                  </button>
                </div>
              </form>

              {/* Notes Timeline */}
              <div className="space-y-2.5">
                {notesList.map((note) => (
                  <div key={note.id} className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs">
                    <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                      <span className="font-bold text-gray-800">{note.author}</span>
                      <span>{new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed font-medium">
                      {note.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};