import React, { useState, useEffect, useRef } from 'react';
import type { Conversation, User } from '../types';
import { CornerDownLeft, Send, X } from 'lucide-react';

interface BottomReplyDockProps {
  selectedConversation: Conversation | null;
  currentUser: User | null;
  onSendReply: (conversationId: string, text: string) => void;
  onCancelSelection: () => void;
  onOpenLogin: () => void;
}

export const BottomReplyDock: React.FC<BottomReplyDockProps> = ({
  selectedConversation,
  currentUser,
  onSendReply,
  onCancelSelection,
  onOpenLogin,
}) => {
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedConversation) {
      inputRef.current?.focus();
    }
  }, [selectedConversation]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) {
      onOpenLogin();
      return;
    }
    if (!selectedConversation) return;
    if (!inputText.trim()) return;

    onSendReply(selectedConversation.id, inputText.trim());
    setInputText('');
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-[#e9ecef]/90 backdrop-blur-md border-t border-gray-300 px-8 py-3.5 shadow-lg z-30">
      <div className="max-w-6xl mx-auto">
        {/* If a conversation is selected for reply */}
        {selectedConversation && (
          <div className="mb-2 flex items-center justify-between text-xs text-gray-600 bg-white/70 px-3 py-1 rounded-md border border-gray-200">
            <div className="flex items-center gap-2 flex-wrap">
              <CornerDownLeft className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>
                Replying to <strong>{selectedConversation.customerName}</strong>
              </span>
              <span className="text-gray-400 font-medium">
                • {selectedConversation.lastMessageTime}
              </span>
              <span className="text-[10px] font-bold text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">
                {selectedConversation.dateFormatted}
              </span>
            </div>
            <button
              onClick={onCancelSelection}
              className="text-gray-400 hover:text-gray-700 flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          {/* Main Input Box matching mockup */}
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              disabled={!currentUser}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                !currentUser
                  ? 'Please login to claim and reply to customer inquiries...'
                  : selectedConversation
                  ? `Type your reply to ${selectedConversation.customerName} (Press Enter to send)...`
                  : 'Select any customer card above to draft and send a reply...'
              }
              className="w-full bg-[#ced4da]/70 focus:bg-white text-gray-800 placeholder-gray-500 rounded-md px-4 py-2.5 text-sm outline-none transition-all border border-transparent focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-75 disabled:cursor-not-allowed"
            />
          </div>

          {/* Blue SEND button matching mockup */}
          <button
            type="submit"
            disabled={!currentUser || (!selectedConversation && !inputText.trim())}
            className="inline-flex items-center gap-2 bg-[#0052cc] hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-400 text-white font-semibold text-sm px-6 py-2.5 rounded-md transition-all shadow-xs cursor-pointer disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            <span>SEND</span>
          </button>
        </form>
      </div>
    </footer>
  );
};
