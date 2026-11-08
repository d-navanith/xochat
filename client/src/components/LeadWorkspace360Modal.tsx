import React, { useState } from 'react';
import {
  X,
  Building,
  Mail,
  Phone,
  DollarSign,
  CheckCircle2,
} from 'lucide-react';
import type { Conversation, User as AppUser } from '../types';

interface LeadWorkspace360ModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Conversation | null;
  currentUser: AppUser | null;
  agents: AppUser[];
  onUpdateStage: (leadId: string, stage: string) => Promise<void>;
  onOpenEmailModal: (lead: Conversation) => void;
}

export const LeadWorkspace360Modal: React.FC<LeadWorkspace360ModalProps> = ({
  isOpen,
  onClose,
  lead,
  currentUser: _currentUser,
  agents: _agents,
  onUpdateStage,
  onOpenEmailModal,
}) => {
  if (!isOpen || !lead) return null;

  const [activeCenterTab, setActiveCenterTab] = useState<'activity' | 'notes' | 'emails' | 'tasks'>('activity');

  const chevronStages = [
    { key: 'NEW', label: 'Lead / Inbound' },
    { key: 'IN_PROGRESS', label: 'Proposal' },
    { key: 'OPEN_DEAL', label: 'Negotiation' },
    { key: 'REPLIED', label: 'Contract Sent' },
    { key: 'CLOSED', label: 'Closed Deal' },
  ];

  const currentStageKey = (lead.stage || (lead.hasReplied ? 'REPLIED' : 'NEW')).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#f8f9fa] rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-300">
        {/* Top Dark Header matching Frame 11 in Video */}
        <div className="bg-[#111827] text-white px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors cursor-pointer text-xs font-bold flex items-center gap-1"
            >
              <span>← Back to Pipeline</span>
            </button>
            <span className="text-gray-600">|</span>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400">Leads / Deals</span>
              <span className="text-gray-600">›</span>
              <span className="font-bold text-white">{lead.customerName}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-gray-400">
              Last activity: {lead.lastMessageTime} • {lead.dateFormatted}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 3-Column Body matching Frame 11 */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column (3 cols): Lead / Deal Summary */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
              <div>
                <h3 className="text-lg font-black text-gray-900 leading-tight">
                  {lead.company || 'Enterprise Account'}
                </h3>
                <div className="text-xs font-bold text-emerald-700 mt-1 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>{(lead.dealValue || 12500).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="text-[11px] text-gray-400 mt-0.5">
                  Target Close: {lead.dateFormatted}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => onOpenEmailModal(lead)}
                  className="flex-1 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email</span>
                </button>
                <button
                  type="button"
                  className="flex-1 py-1.5 px-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Call</span>
                </button>
              </div>

              {/* Deal Info Section */}
              <div className="space-y-3 pt-3 border-t border-gray-100 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Owner</span>
                  <div className="font-bold text-gray-800 mt-0.5">{lead.claimedByName || 'H.M. Murdock'}</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Deal Type</span>
                  <div className="font-bold text-gray-800 mt-0.5">Existing Business Logistics</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Priority</span>
                  <div className="mt-0.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800">
                      {lead.priority || 'High'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Column (6 cols): Pipeline Chevron Bar & Activity Timeline */}
          <div className="lg:col-span-6 space-y-4">
            {/* Pipeline Stage Chevron Bar matching Frame 11 */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black uppercase tracking-wider text-gray-700">Deal Stage Progress</span>
                <span className="text-gray-400 font-medium">Click chevron to advance</span>
              </div>

              {/* Chevrons */}
              <div className="grid grid-cols-5 gap-1 select-none">
                {chevronStages.map((st, idx) => {
                  const isActive = currentStageKey === st.key;
                  const isPassed = chevronStages.findIndex((s) => s.key === currentStageKey) > idx;

                  return (
                    <button
                      key={st.key}
                      type="button"
                      onClick={() => onUpdateStage(lead.id, st.key)}
                      className={`py-2 px-1 text-center text-[10px] font-black rounded-lg transition-all cursor-pointer truncate ${
                        isActive
                          ? 'bg-[#0055ff] text-white shadow-sm ring-2 ring-blue-300'
                          : isPassed
                          ? 'bg-blue-100 text-blue-900 font-bold'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                      title={st.label}
                    >
                      {st.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Activity History Tabs */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
              <div className="flex items-center gap-3 border-b border-gray-100 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveCenterTab('activity')}
                  className={`text-xs font-bold pb-2 transition-colors cursor-pointer border-b-2 ${
                    activeCenterTab === 'activity'
                      ? 'border-blue-600 text-blue-600 font-black'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Activity History
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCenterTab('notes')}
                  className={`text-xs font-bold pb-2 transition-colors cursor-pointer border-b-2 ${
                    activeCenterTab === 'notes'
                      ? 'border-blue-600 text-blue-600 font-black'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Notes ({lead.notes?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCenterTab('tasks')}
                  className={`text-xs font-bold pb-2 transition-colors cursor-pointer border-b-2 ${
                    activeCenterTab === 'tasks'
                      ? 'border-blue-600 text-blue-600 font-black'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Tasks ({lead.tasks?.length || 0})
                </button>
              </div>

              {/* Timeline Items matching Frame 11 */}
              <div className="space-y-3">
                {/* 1. Customer Message */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="font-bold text-gray-900">Inbound Customer Inquiry</span>
                    <span>{lead.lastMessageTime} • {lead.dateFormatted}</span>
                  </div>
                  <p className="text-xs text-gray-800 leading-relaxed font-medium">
                    "{lead.messages[0]?.text || lead.lastMessageText}"
                  </p>
                </div>

                {/* 2. Tasks Timeline */}
                {lead.tasks?.map((task) => (
                  <div key={task.id} className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`w-4 h-4 ${task.isCompleted ? 'text-emerald-600' : 'text-gray-400'}`} />
                      <span className="font-bold text-gray-900">{task.title}</span>
                    </div>
                    <span className="text-[11px] text-gray-500 font-medium">Assigned to {task.assignedTo}</span>
                  </div>
                ))}

                {/* 3. Notes */}
                {lead.notes?.map((n) => (
                  <div key={n.id} className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-1 text-xs">
                    <div className="flex items-center justify-between text-[11px] text-gray-500 font-bold">
                      <span>{n.author}</span>
                      <span>{new Date(n.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-gray-700 leading-relaxed">{n.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column (3 cols): Contacts, Company & Line Items matching Frame 11 */}
          <div className="lg:col-span-3 space-y-4">
            {/* Contact Box */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-gray-500">
                <span>Contact</span>
                <span className="text-blue-600 font-bold cursor-pointer hover:underline">+ Add</span>
              </div>
              <div className="flex items-center gap-2.5 pt-1">
                <img
                  src={lead.customerAvatar}
                  alt={lead.customerName}
                  className="w-9 h-9 rounded-full border border-gray-200 bg-gray-50 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-gray-900 truncate">{lead.customerName}</div>
                  <div className="text-[11px] text-gray-400 truncate">{lead.customerEmail || 'customer@example.com'}</div>
                  <div className="text-[11px] text-gray-400 truncate">{lead.customerPhone || '(405) 555-0128'}</div>
                </div>
              </div>
            </div>

            {/* Company Box */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-gray-500">Company</span>
              <div className="flex items-center gap-2 pt-1 text-xs font-bold text-gray-800">
                <Building className="w-4 h-4 text-blue-600" />
                <span>{lead.company || 'Google inc.'}</span>
              </div>
            </div>

            {/* Financial Line Item Box matching Frame 11 */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-gray-500">
                <span>Line Items (1)</span>
                <span className="text-gray-400 font-medium">Estimated</span>
              </div>
              <div className="flex items-center justify-between text-xs font-bold text-gray-800 pt-1">
                <span>Expedited Freight Cargo</span>
                <span className="text-emerald-700 font-black">
                  ${(lead.dealValue || 2500).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};