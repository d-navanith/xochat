import React, { useState } from 'react';
import { X, Maximize2, Paperclip, Smile, Image as ImageIcon, Link as LinkIcon, Send } from 'lucide-react';
import type { Conversation, User } from '../types';

interface LeadEmailComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Conversation | null;
  currentUser: User | null;
  onSend: (payload: { subject: string; toEmail: string; bodyText: string; createFollowUpTask: boolean }) => Promise<void>;
}

export const LeadEmailComposerModal: React.FC<LeadEmailComposerModalProps> = ({
  isOpen,
  onClose,
  lead,
  currentUser,
  onSend,
}) => {
  if (!isOpen || !lead) return null;

  const [subject, setSubject] = useState(`Re: Inquiries & Load Information - ${lead.customerName}`);
  const [toEmail] = useState(lead.customerEmail || `${lead.customerName.toLowerCase().replace(/\s+/g, '.')}@example.com`);
  const [bodyText, setBodyText] = useState(
    `Hi ${lead.customerName},\n\nThank you for reaching out to us. We have reviewed your request regarding:\n"${lead.lastMessageText}"\n\nOur operations team has confirmed your status and lane schedule. Please let us know if you require any revisions or additional documentation.\n\nBest regards,\n${currentUser?.name || 'Administrator'}\nXochat Logistics & Operations`
  );
  const [createFollowUpTask, setCreateFollowUpTask] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [fontFamily, setFontFamily] = useState('Strawford');
  const [fontSize, setFontSize] = useState('Body');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

  const templates = [
    {
      title: 'Order Status & Tracking',
      subject: `Order Status & Live Tracking Update - ${lead.customerName}`,
      body: `Hi ${lead.customerName},\n\nFollowing up on your inquiry, your shipment has been successfully inspected and is scheduled for transit.\n\nLet us know if you have any questions.\n\nBest,\n${currentUser?.name || 'Admin'}`,
    },
    {
      title: 'Customs Clearance Manifest',
      subject: `Customs Clearance Documentation for ${lead.customerName}`,
      body: `Hello ${lead.customerName},\n\nYour freight documents have been submitted to customs for clearance. The manifest is attached below for your records.\n\nBest regards,\n${currentUser?.name || 'Admin'}`,
    },
    {
      title: 'Rate Quote & Confirmation',
      subject: `Expedited Rate Confirmation - Load Ref #${Math.floor(1000 + Math.random() * 9000)}`,
      body: `Dear ${lead.customerName},\n\nWe are pleased to provide the revised rate confirmation for your inquiry. Please review the breakdown and let us know if you are ready to confirm dispatch.\n\nRegards,\n${currentUser?.name || 'Admin'}`,
    },
  ];

  const handleApplyTemplate = (idx: number) => {
    const t = templates[idx];
    if (t) {
      setSubject(t.subject);
      setBodyText(t.body);
    }
  };

  const handleSend = async () => {
    if (!bodyText.trim()) return;
    setIsSending(true);
    try {
      await onSend({
        subject,
        toEmail,
        bodyText,
        createFollowUpTask,
      });
      onClose();
    } catch (err) {
      console.error('Failed to dispatch email:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-200 flex flex-col max-h-[90vh]">
        {/* Top Dark Header matching Frame 20 in Video */}
        <div className="bg-[#1e232e] text-white px-5 py-3.5 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight">Create email</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="text-gray-400 hover:text-white transition-colors cursor-pointer"
              title="Maximize"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sender & Template Toolbar */}
        <div className="p-5 pb-3 space-y-3.5 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <img
                src={currentUser?.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=admin'}
                alt={currentUser?.name || 'Admin'}
                className="w-8 h-8 rounded-full border border-gray-200 bg-gray-50 object-cover"
              />
              <div>
                <div className="text-xs font-black text-gray-900 leading-none">
                  {currentUser?.name || 'Administrator'}
                </div>
                <div className="text-[11px] text-gray-400 font-medium">
                  @{currentUser?.username || 'admin'} • {currentUser?.role || 'SUPER_ADMIN'}
                </div>
              </div>
            </div>

            {/* Template Dropdown */}
            <div className="flex items-center gap-1.5">
              <select
                onChange={(e) => handleApplyTemplate(Number(e.target.value))}
                defaultValue=""
                className="text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-2.5 py-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="" disabled>Insert template ▾</option>
                {templates.map((t, idx) => (
                  <option key={idx} value={idx}>{t.title}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Recipient To Bar matching Frame 20 */}
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-gray-400 w-8">To</span>
            <div className="flex-1 flex items-center gap-2 flex-wrap bg-gray-50/80 px-3 py-1.5 rounded-lg border border-gray-200/80">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-xs">
                {lead.customerName} ({toEmail})
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400 font-medium px-1">
              <span className="hover:text-gray-700 cursor-pointer">Cc</span>
              <span className="hover:text-gray-700 cursor-pointer">Bcc</span>
            </div>
          </div>

          {/* Subject Line */}
          <div className="flex items-center gap-2 text-xs border-b border-gray-100 pb-2">
            <span className="font-semibold text-gray-400 w-8">Sub</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="flex-1 text-sm font-bold text-gray-900 focus:outline-none px-1"
            />
          </div>

          {/* Text Message Area */}
          <div className="relative">
            <textarea
              rows={8}
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              placeholder="Write your email message..."
              className={`w-full text-xs sm:text-sm text-gray-800 leading-relaxed p-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none ${
                isBold ? 'font-bold' : ''
              } ${isItalic ? 'italic' : ''} ${isUnderline ? 'underline' : ''}`}
            />
          </div>

          {/* Rich Editor Toolbar matching Frame 20 in Video */}
          <div className="bg-gray-50/90 border border-gray-200 rounded-xl px-3 py-2 flex items-center justify-between flex-wrap gap-2 text-xs text-gray-600 select-none">
            <div className="flex items-center gap-2">
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="bg-white border border-gray-200 rounded px-2 py-0.5 text-xs font-medium cursor-pointer"
              >
                <option value="Strawford">Strawford</option>
                <option value="Inter">Inter</option>
                <option value="Roboto">Roboto</option>
              </select>

              <select
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value)}
                className="bg-white border border-gray-200 rounded px-2 py-0.5 text-xs font-medium cursor-pointer"
              >
                <option value="Body">Body</option>
                <option value="Heading">Heading</option>
                <option value="Small">Small</option>
              </select>

              <div className="h-4 w-px bg-gray-200 mx-1" />

              <button
                type="button"
                onClick={() => setIsBold(!isBold)}
                className={`px-1.5 py-0.5 rounded font-black text-xs cursor-pointer ${
                  isBold ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200 text-gray-700'
                }`}
              >
                B
              </button>

              <button
                type="button"
                onClick={() => setIsItalic(!isItalic)}
                className={`px-1.5 py-0.5 rounded italic font-serif text-xs cursor-pointer ${
                  isItalic ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200 text-gray-700'
                }`}
              >
                I
              </button>

              <button
                type="button"
                onClick={() => setIsUnderline(!isUnderline)}
                className={`px-1.5 py-0.5 rounded underline text-xs cursor-pointer ${
                  isUnderline ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200 text-gray-700'
                }`}
              >
                U
              </button>

              <div className="h-4 w-px bg-gray-200 mx-1" />

              <button type="button" className="p-1 hover:bg-gray-200 rounded text-gray-600 cursor-pointer">
                <LinkIcon className="w-3.5 h-3.5" />
              </button>
              <button type="button" className="p-1 hover:bg-gray-200 rounded text-gray-600 cursor-pointer">
                <Paperclip className="w-3.5 h-3.5" />
              </button>
              <button type="button" className="p-1 hover:bg-gray-200 rounded text-gray-600 cursor-pointer">
                <ImageIcon className="w-3.5 h-3.5" />
              </button>
              <button type="button" className="p-1 hover:bg-gray-200 rounded text-gray-600 cursor-pointer">
                <Smile className="w-3.5 h-3.5" />
              </button>
            </div>

            <span className="text-[11px] text-gray-400 font-medium">
              Associated with 1 customer record
            </span>
          </div>
        </div>

        {/* Footer with Checkbox & Orange/Blue Send button matching Frame 20 */}
        <div className="px-6 py-4 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-gray-700">
            <input
              type="checkbox"
              checked={createFollowUpTask}
              onChange={(e) => setCreateFollowUpTask(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
            />
            <span>Create a task to follow up</span>
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={isSending || !bodyText.trim()}
              className="px-5 py-2 rounded-xl text-xs font-black text-white bg-[#f95738] hover:bg-[#e0482b] active:scale-95 transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <span>{isSending ? 'Sending...' : 'Send'}</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};