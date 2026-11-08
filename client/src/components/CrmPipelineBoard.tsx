import React, { useState, useEffect } from 'react';
import {
  Kanban,
  Table as TableIcon,
  Search,
  Download,
  Plus,
  Mail,
  User,
  Building,
  Clock,
  ExternalLink,
  X,
} from 'lucide-react';
import type { Conversation, User as AppUser } from '../types';
import { api } from '../services/api';
import { LeadPreviewDrawer } from './LeadPreviewDrawer';
import { LeadEmailComposerModal } from './LeadEmailComposerModal';
import { LeadWorkspace360Modal } from './LeadWorkspace360Modal';

interface CrmPipelineBoardProps {
  currentUser: AppUser | null;
  onShowNotification?: (item: { type: 'success' | 'error' | 'warning' | 'info'; title: string; message: string }) => void;
  onSelectForReply?: (lead: Conversation) => void;
}

export const CrmPipelineBoard: React.FC<CrmPipelineBoardProps> = ({
  currentUser,
  onShowNotification,
  onSelectForReply,
}) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [leads, setLeads] = useState<Conversation[]>([]);
  const [agents, setAgents] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOwner, setSelectedOwner] = useState('ALL');
  const [selectedStageFilter, setSelectedStageFilter] = useState('ALL');

  // Modals & Drawer State
  const [selectedLeadForDrawer, setSelectedLeadForDrawer] = useState<Conversation | null>(null);
  const [selectedLeadForEmail, setSelectedLeadForEmail] = useState<Conversation | null>(null);
  const [selectedLeadFor360, setSelectedLeadFor360] = useState<Conversation | null>(null);

  // Drag & Drop State
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Create Lead Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustCompany, setNewCustCompany] = useState('');
  const [newCustText, setNewCustText] = useState('');
  const [newCustValue, setNewCustValue] = useState('3500');

  const fetchPipeline = async () => {
    setLoading(true);
    try {
      const data = await api.getPipelineData();
      setLeads(data.leads);
      setAgents(data.agents);
    } catch (err) {
      console.error('Failed to load pipeline:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipeline();
  }, []);

  // Update lead stage
  const handleUpdateStage = async (leadId: string, stage: string) => {
    try {
      const res = await api.updateLeadStage(leadId, stage);
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, ...res.conversation, stage } : l))
      );
      if (selectedLeadForDrawer?.id === leadId) {
        setSelectedLeadForDrawer((prev) => (prev ? { ...prev, ...res.conversation, stage } : null));
      }
      if (selectedLeadFor360?.id === leadId) {
        setSelectedLeadFor360((prev) => (prev ? { ...prev, ...res.conversation, stage } : null));
      }
      onShowNotification?.({
        type: 'success',
        title: 'Stage Updated',
        message: `Lead transitioned to ${stage} stage.`,
      });
    } catch (err) {
      console.error('Failed to update stage:', err);
    }
  };

  // Add Note
  const handleAddNote = async (leadId: string, text: string) => {
    try {
      const author = currentUser?.name || 'Admin Manager';
      const res = await api.addLeadNote(leadId, text, author);
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, ...res.conversation } : l))
      );
      if (selectedLeadForDrawer?.id === leadId) {
        setSelectedLeadForDrawer((prev) => (prev ? { ...prev, ...res.conversation } : null));
      }
      onShowNotification?.({
        type: 'success',
        title: 'Note Logged',
        message: 'Internal note saved to lead record.',
      });
    } catch (err) {
      console.error('Failed to add note:', err);
    }
  };

  // Add Task
  const handleAddTask = async (leadId: string, task: { title: string; assignedTo?: string; dueDate?: string; priority?: string }) => {
    try {
      const res = await api.addLeadTask(leadId, task);
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, ...res.conversation } : l))
      );
      if (selectedLeadForDrawer?.id === leadId) {
        setSelectedLeadForDrawer((prev) => (prev ? { ...prev, ...res.conversation } : null));
      }
      onShowNotification?.({
        type: 'success',
        title: 'Task Created',
        message: `Scheduled task: "${task.title}".`,
      });
    } catch (err) {
      console.error('Failed to add task:', err);
    }
  };

  // Toggle Task
  const handleToggleTask = async (leadId: string, taskId: string) => {
    try {
      const res = await api.toggleLeadTask(leadId, taskId);
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, ...res.conversation } : l))
      );
      if (selectedLeadForDrawer?.id === leadId) {
        setSelectedLeadForDrawer((prev) => (prev ? { ...prev, ...res.conversation } : null));
      }
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  // Reassign Lead
  const handleReassign = async (leadId: string, agent: { agentId: string; username: string; name: string; avatarUrl?: string }) => {
    try {
      const res = await api.reassignLead(leadId, agent);
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, ...res.conversation } : l))
      );
      if (selectedLeadForDrawer?.id === leadId) {
        setSelectedLeadForDrawer((prev) => (prev ? { ...prev, ...res.conversation } : null));
      }
      onShowNotification?.({
        type: 'info',
        title: 'Lead Reassigned',
        message: `Assigned to @${agent.username} (${agent.name}).`,
      });
    } catch (err) {
      console.error('Failed to reassign:', err);
    }
  };

  // Send Email
  const handleSendEmail = async (payload: { subject: string; toEmail: string; bodyText: string; createFollowUpTask: boolean }) => {
    if (!selectedLeadForEmail) return;
    try {
      const res = await api.sendLeadEmail(selectedLeadForEmail.id, payload);
      setLeads((prev) =>
        prev.map((l) => (l.id === selectedLeadForEmail.id ? { ...l, ...res.conversation } : l))
      );
      if (selectedLeadForDrawer?.id === selectedLeadForEmail.id) {
        setSelectedLeadForDrawer((prev) => (prev ? { ...prev, ...res.conversation } : null));
      }
      onShowNotification?.({
        type: 'success',
        title: 'Email Dispatched',
        message: `Message dispatched to ${payload.toEmail}.`,
      });
    } catch (err) {
      console.error('Failed to send email:', err);
    }
  };

  // Create Lead
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustText.trim()) return;
    try {
      const sim = await api.simulateCustomerMessage(newCustName.trim(), newCustText.trim());
      setShowCreateModal(false);
      setNewCustName('');
      setNewCustEmail('');
      setNewCustCompany('');
      setNewCustText('');
      await fetchPipeline();
      onShowNotification?.({
        type: 'success',
        title: 'Lead Created',
        message: `Created lead record for ${sim.conversation.customerName}.`,
      });
    } catch (err) {
      console.error('Failed to create lead:', err);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('text/plain', leadId);
    setDraggedLeadId(leadId);
  };

  const handleDragOver = (e: React.DragEvent, colKey: string) => {
    e.preventDefault();
    setDragOverColumn(colKey);
  };

  const handleDrop = async (e: React.DragEvent, targetColKey: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
    if (leadId) {
      await handleUpdateStage(leadId, targetColKey);
    }
    setDraggedLeadId(null);
  };

  // Filter leads
  const filteredLeads = leads.filter((lead) => {
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const matchName = lead.customerName.toLowerCase().includes(q);
      const matchComp = (lead.company || '').toLowerCase().includes(q);
      const matchText = (lead.lastMessageText || '').toLowerCase().includes(q);
      const matchEmail = (lead.customerEmail || '').toLowerCase().includes(q);
      if (!matchName && !matchComp && !matchText && !matchEmail) return false;
    }
    if (selectedOwner !== 'ALL') {
      if (lead.claimedByUsername !== selectedOwner) return false;
    }
    if (selectedStageFilter !== 'ALL') {
      const leadSt = (lead.stage || (lead.hasReplied ? 'REPLIED' : 'NEW')).toUpperCase();
      if (leadSt !== selectedStageFilter) return false;
    }
    return true;
  });

  // Kanban Columns configuration matching video Frames 05, 09, 10
  const columns = [
    {
      key: 'NEW',
      title: 'New / Inbound',
      dotColor: 'bg-blue-500',
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      key: 'IN_PROGRESS',
      title: 'In Progress',
      dotColor: 'bg-emerald-500',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      key: 'OPEN_DEAL',
      title: 'Open Deal',
      dotColor: 'bg-amber-500',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
      key: 'REPLIED',
      title: 'Replied / Resolved',
      dotColor: 'bg-indigo-500',
      badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
  ];

  const getColumnLeads = (colKey: string) => {
    return filteredLeads.filter((l) => {
      const st = (l.stage || (l.hasReplied ? 'REPLIED' : 'NEW')).toUpperCase();
      if (colKey === 'REPLIED') {
        return st === 'REPLIED' || st === 'CLOSED' || l.hasReplied;
      }
      return st === colKey;
    });
  };

  const exportToCSV = () => {
    const headers = 'ID,Customer,Company,Email,Phone,Stage,Owner,DealValue,Date\n';
    const rows = filteredLeads
      .map(
        (l) =>
          `"${l.id}","${l.customerName}","${l.company || ''}","${l.customerEmail || ''}","${l.customerPhone || ''}","${l.stage || 'NEW'}","${l.claimedByName || ''}",${l.dealValue || 0},"${l.dateStr}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xochat_crm_leads_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col space-y-4">
      {/* Top CRM Toolbar matching Frames 05, 08 in Video */}
      <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-2xs flex items-center justify-between flex-wrap gap-4">
        {/* Left: Title & Quick Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <h2 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-2">
              <span>{filteredLeads.length} Leads & Deals</span>
              <span className="text-xs font-bold text-gray-400">Pipeline CRM</span>
            </h2>
            <p className="text-[11px] text-gray-500 font-medium">
              Multi-stage inquiry lifecycle, drag-and-drop progression & customer 360 preview.
            </p>
          </div>

          <div className="h-6 w-px bg-gray-200 hidden sm:block mx-1" />

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search leads, company, email..."
              className="pl-8 pr-3 py-1.5 text-xs bg-gray-50 hover:bg-gray-100/80 focus:bg-white border border-gray-200 rounded-xl w-48 sm:w-60 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium transition-all"
            />
          </div>

          {/* Owner Filter */}
          <select
            value={selectedOwner}
            onChange={(e) => setSelectedOwner(e.target.value)}
            className="text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 cursor-pointer focus:outline-none"
          >
            <option value="ALL">Contact Owner: All</option>
            {agents.map((a) => (
              <option key={a.id} value={a.username}>{a.name} (@{a.username})</option>
            ))}
          </select>

          {/* Stage Filter */}
          <select
            value={selectedStageFilter}
            onChange={(e) => setSelectedStageFilter(e.target.value)}
            className="text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 cursor-pointer focus:outline-none"
          >
            <option value="ALL">Stage: All</option>
            <option value="NEW">New</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="OPEN_DEAL">Open Deal</option>
            <option value="REPLIED">Replied</option>
          </select>
        </div>

        {/* Right: View Switcher & Action Buttons matching Frame 08 */}
        <div className="flex items-center gap-2.5">
          {/* Dual View Toggle matching Frame 08: [ = Table | ☷ Kanban Board ] */}
          <div className="flex items-center bg-gray-100 p-0.5 rounded-xl border border-gray-200">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              title="Table List View"
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'table'
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              title="Kanban Board View"
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'kanban'
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Board</span>
            </button>
          </div>

          {/* Export Button */}
          <button
            type="button"
            onClick={exportToCSV}
            title="Export CSV"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Create Leads Button matching Orange button in video */}
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black text-white bg-[#f95738] hover:bg-[#e0482b] active:scale-95 transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create lead</span>
          </button>
        </div>
      </div>

      {/* Main Viewport: Kanban Board Mode or Table Mode */}
      <div className="flex-1 overflow-x-auto min-h-[500px]">
        {loading ? (
          <div className="py-20 text-center text-xs text-gray-400 font-semibold">
            Loading pipeline data...
          </div>
        ) : viewMode === 'kanban' ? (
          /* =========================================================
             1. KANBAN BOARD VIEW (matching Frames 05, 09, 10 in Video)
             ========================================================= */
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start min-w-[900px] pb-6">
            {columns.map((col) => {
              const colLeads = getColumnLeads(col.key);
              const colValue = colLeads.reduce((acc, curr) => acc + (curr.dealValue || 2500), 0);
              const isOver = dragOverColumn === col.key;

              return (
                <div
                  key={col.key}
                  onDragOver={(e) => handleDragOver(e, col.key)}
                  onDrop={(e) => handleDrop(e, col.key)}
                  className={`bg-[#f8f9fa] rounded-2xl border p-3 flex flex-col space-y-3 transition-colors min-h-[480px] ${
                    isOver ? 'border-blue-400 bg-blue-50/30' : 'border-gray-200/80 shadow-2xs'
                  }`}
                >
                  {/* Column Header */}
                  <div className="px-2 py-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                      <span className="text-xs font-black text-gray-900 tracking-tight">
                        {col.title}
                      </span>
                      <span className="text-[11px] font-bold text-gray-400">
                        {colLeads.length}
                      </span>
                    </div>

                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      ${colValue.toLocaleString('en-US')}
                    </span>
                  </div>

                  {/* Cards Feed */}
                  <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[650px] pr-0.5">
                    {colLeads.length === 0 ? (
                      <div className="py-8 text-center text-[11px] text-gray-400 border border-dashed border-gray-200 rounded-xl bg-white/50">
                        Drop inquiries here
                      </div>
                    ) : (
                      colLeads.map((lead) => (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead.id)}
                          onClick={() => setSelectedLeadForDrawer(lead)}
                          className="bg-white rounded-xl p-3.5 border border-gray-200/90 hover:border-blue-400 shadow-2xs hover:shadow-xs transition-all cursor-pointer group space-y-2.5 select-none"
                        >
                          {/* Card Header: Avatar + Customer Name + Time */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="relative shrink-0">
                                <img
                                  src={lead.customerAvatar}
                                  alt={lead.customerName}
                                  className="w-8 h-8 rounded-full border border-gray-200 bg-gray-50 object-cover"
                                />
                                {lead.isUnansweredGreen && !lead.hasReplied && (
                                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-lime-500 border border-white rounded-full" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-black text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                                  {lead.customerName}
                                </h4>
                                <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  <span>{lead.lastMessageTime} • {lead.dateFormatted}</span>
                                </div>
                              </div>
                            </div>

                            <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 shrink-0">
                              ${(lead.dealValue || 2500).toLocaleString('en-US')}
                            </span>
                          </div>

                          {/* Company & Email Snippet */}
                          <div className="text-[11px] text-gray-500 flex items-center gap-2 truncate">
                            <span className="flex items-center gap-1 font-semibold text-gray-700">
                              <Building className="w-3 h-3 text-gray-400 shrink-0" />
                              <span className="truncate">{lead.company || 'Google inc.'}</span>
                            </span>
                          </div>

                          {/* Inquiry Text Bubble */}
                          <p className="text-xs text-gray-700 leading-snug line-clamp-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                            {lead.messages[0]?.text || lead.lastMessageText}
                          </p>

                          {/* Card Footer: Assigned Owner & Quick Actions */}
                          <div className="pt-1.5 border-t border-gray-100 flex items-center justify-between text-[11px]">
                            <span className="flex items-center gap-1 text-gray-600 font-semibold truncate">
                              <User className="w-3 h-3 text-gray-400 shrink-0" />
                              <span className="truncate">{lead.claimedByName || 'Unassigned'}</span>
                            </span>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedLeadForEmail(lead);
                                }}
                                title="Quick Email"
                                className="p-1 hover:bg-blue-50 text-blue-600 rounded cursor-pointer"
                              >
                                <Mail className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedLeadFor360(lead);
                                }}
                                title="360 Workspace"
                                className="p-1 hover:bg-gray-100 text-gray-600 rounded cursor-pointer"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* =========================================================
             2. TABLE / LIST VIEW (matching Frame 08 in Video)
             ========================================================= */
          <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8f9fa] text-gray-500 font-bold uppercase tracking-wider text-[10px] border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <input type="checkbox" className="rounded border-gray-300" />
                    </th>
                    <th className="px-4 py-3">LEAD NAME</th>
                    <th className="px-4 py-3">CONTACT</th>
                    <th className="px-4 py-3">LEAD SOURCE</th>
                    <th className="px-4 py-3">LEAD STATUS</th>
                    <th className="px-4 py-3">LEAD OWNER</th>
                    <th className="px-4 py-3">DEAL VALUE</th>
                    <th className="px-4 py-3 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLeads.map((lead) => {
                    const st = (lead.stage || (lead.hasReplied ? 'REPLIED' : 'NEW')).toUpperCase();
                    return (
                      <tr
                        key={lead.id}
                        onClick={() => setSelectedLeadForDrawer(lead)}
                        className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                      >
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" className="rounded border-gray-300 cursor-pointer" />
                        </td>

                        {/* Customer Avatar & Name */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="relative shrink-0">
                              <img
                                src={lead.customerAvatar}
                                alt={lead.customerName}
                                className="w-8 h-8 rounded-full border border-gray-200 object-cover"
                              />
                              {lead.isUnansweredGreen && !lead.hasReplied && (
                                <span className="absolute bottom-0 right-0 w-2 h-2 bg-lime-500 border border-white rounded-full" />
                              )}
                            </div>
                            <div>
                              <div className="font-black text-gray-900 group-hover:text-blue-600 transition-colors">
                                {lead.customerName}
                              </div>
                              <div className="text-[10px] text-gray-400">
                                {lead.lastMessageTime} • {lead.dateFormatted}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Contact Email & Phone */}
                        <td className="px-4 py-3 text-gray-600">
                          <div className="font-medium text-gray-800">{lead.customerEmail || 'customer@example.com'}</div>
                          <div className="text-[10px] text-gray-400">{lead.customerPhone || '(405) 555-0128'}</div>
                        </td>

                        {/* Lead Source */}
                        <td className="px-4 py-3">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            Customer Portal
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="px-4 py-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                              st === 'NEW'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : st === 'IN_PROGRESS'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : st === 'OPEN_DEAL'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}
                          >
                            • {st.replace('_', ' ')}
                          </span>
                        </td>

                        {/* Owner */}
                        <td className="px-4 py-3 text-gray-800 font-semibold">
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-gray-700">
                              {(lead.claimedByName || 'U')[0]}
                            </span>
                            <span>{lead.claimedByName || 'Unassigned'}</span>
                          </div>
                        </td>

                        {/* Deal Value */}
                        <td className="px-4 py-3 font-black text-emerald-700">
                          ${(lead.dealValue || 2500).toLocaleString('en-US')}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setSelectedLeadForEmail(lead)}
                              title="Send Email"
                              className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-600 text-xs font-bold transition-colors cursor-pointer"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedLeadForDrawer(lead)}
                              title="Preview Lead"
                              className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-colors cursor-pointer"
                            >
                              Preview
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Slide-over Drawer (Frame 06) */}
      <LeadPreviewDrawer
        isOpen={selectedLeadForDrawer !== null}
        onClose={() => setSelectedLeadForDrawer(null)}
        lead={selectedLeadForDrawer}
        currentUser={currentUser}
        agents={agents}
        onUpdateStage={handleUpdateStage}
        onAddNote={handleAddNote}
        onAddTask={handleAddTask}
        onToggleTask={handleToggleTask}
        onReassign={handleReassign}
        onOpenEmailModal={(l) => setSelectedLeadForEmail(l)}
        onOpenWorkspace360={(l) => setSelectedLeadFor360(l)}
        onSelectForReply={onSelectForReply}
      />

      {/* Quick Email Composer Modal (Frame 20) */}
      <LeadEmailComposerModal
        isOpen={selectedLeadForEmail !== null}
        onClose={() => setSelectedLeadForEmail(null)}
        lead={selectedLeadForEmail}
        currentUser={currentUser}
        onSend={handleSendEmail}
      />

      {/* Lead 360 Full Workspace Modal (Frame 11) */}
      <LeadWorkspace360Modal
        isOpen={selectedLeadFor360 !== null}
        onClose={() => setSelectedLeadFor360(null)}
        lead={selectedLeadFor360}
        currentUser={currentUser}
        agents={agents}
        onUpdateStage={handleUpdateStage}
        onOpenEmailModal={(l) => setSelectedLeadForEmail(l)}
      />

      {/* Create Lead Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 border border-gray-200">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="text-base font-black text-gray-900">Create New Lead</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Customer Full Name</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Rachel Adams"
                  className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Company / Organization</label>
                <input
                  type="text"
                  value={newCustCompany}
                  onChange={(e) => setNewCustCompany(e.target.value)}
                  placeholder="e.g. Swell Global Logistics"
                  className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Customer Email</label>
                  <input
                    type="email"
                    value={newCustEmail}
                    onChange={(e) => setNewCustEmail(e.target.value)}
                    placeholder="customer@example.com"
                    className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Deal Value ($)</label>
                  <input
                    type="number"
                    value={newCustValue}
                    onChange={(e) => setNewCustValue(e.target.value)}
                    placeholder="3500"
                    className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Inquiry / Query Text</label>
                <textarea
                  rows={3}
                  required
                  value={newCustText}
                  onChange={(e) => setNewCustText(e.target.value)}
                  placeholder="e.g. Inquiring about shipping rates for transatlantic freight..."
                  className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black text-white bg-[#f95738] hover:bg-[#e0482b] rounded-xl shadow-xs"
                >
                  Create Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};