import React from 'react';
import type { Conversation, LockState, Message } from '../types';
import { CornerDownLeft, Lock, ShieldAlert, Trash2 } from 'lucide-react';
import { formatMessageTime, formatMessageDate } from '../utils/dateTime';

interface ConversationCardProps {
  conversation: Conversation;
  currentUserId?: string;
  currentUserRole?: string;
  activeLock?: LockState;
  isSelected: boolean;
  onSelectForReply: (conversation: Conversation) => void;
  onCancelLock: (conversationId: string) => void;
  onRequestDeleteMessage?: (conversationId: string, message: Message) => void;
}

export const ConversationCard = React.memo<ConversationCardProps>(({
  conversation,
  currentUserId,
  currentUserRole,
  activeLock,
  isSelected,
  onSelectForReply,
  onCancelLock,
  onRequestDeleteMessage,
}) => {
  const isLockedByMe = activeLock && activeLock.agentId === currentUserId;
  const isLockedByOther = activeLock && activeLock.agentId !== currentUserId;

  const firstMsg = conversation.messages[0];
  const agentReplies = conversation.messages.filter((m) => m.senderType === 'AGENT');
  const hasAlreadyReplied = conversation.hasReplied || conversation.replyCount >= 1;

  return (
    <div
      className={`bg-white rounded-xl p-4 transition-all duration-150 border ${
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-100 shadow-sm'
          : isLockedByOther
          ? 'border-amber-300 bg-amber-50/20 shadow-2xs'
          : 'border-gray-200/90 hover:border-gray-300 shadow-2xs'
      }`}
    >
      {/* Real-time Collision Banner if locked by colleague */}
      {isLockedByOther && !hasAlreadyReplied && (
        <div className="mb-3 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs text-amber-800 animate-pulse">
          <div className="flex items-center gap-1.5 font-medium">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            <span>
              Collision Lock Active: <strong>@{activeLock.agentUsername}</strong> is actively replying to this customer.
            </span>
          </div>
          <span className="text-[11px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full font-semibold">
            Locked
          </span>
        </div>
      )}

      {/* Collision Banner if locked by me */}
      {isLockedByMe && (
        <div className="mb-3 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-xs text-blue-800">
          <div className="flex items-center gap-1.5 font-medium">
            <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />
            <span>You are drafting a reply to this customer. Collision lock active.</span>
          </div>
          <button
            onClick={() => onCancelLock(conversation.id)}
            className="text-blue-700 hover:text-blue-900 underline font-medium text-[11px] cursor-pointer"
          >
            Release Lock
          </button>
        </div>
      )}

      {/* Main Customer Message Block */}
      <div className="flex items-start gap-4">
        {/* Customer Avatar matching Image 3, 4, 5:
            Unanswered inquiries have bright green dot!
            Answered inquiries have NO green dot!
        */}
        <div className="relative shrink-0">
          <img
            src={conversation.customerAvatar}
            alt={conversation.customerName}
            loading="lazy"
            decoding="async"
            className="w-12 h-12 rounded-full bg-slate-100 border border-gray-200 object-cover"
          />
          {/* Green dot active ONLY if not replied! */}
          {conversation.isUnansweredGreen && !hasAlreadyReplied && (
            <span
              title="Awaiting Reply (Online)"
              className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#84cc16] border-2 border-white rounded-full shadow-2xs"
            ></span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header row: Customer name + chat time + chat date */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-gray-900 text-sm">
                {conversation.customerName}
              </span>
              <span className="text-xs text-gray-400 font-medium">
                • {formatMessageTime(firstMsg?.timeFormatted || conversation.lastMessageTime, firstMsg?.timestamp)}
              </span>
            </div>
            <span className="text-xs text-gray-400 font-bold shrink-0 bg-gray-50 border border-gray-200/80 px-2 py-0.5 rounded-md">
              {formatMessageDate(conversation.dateFormatted, conversation.createdAt)}
            </span>
          </div>

          {/* Customer message bubble snippet */}
          <div className="mt-1.5 bg-[#f1f3f5] text-gray-800 text-sm px-4 py-2.5 rounded-lg leading-relaxed break-words">
            {firstMsg ? firstMsg.text : conversation.lastMessageText}
          </div>

          {/* Nested Agent Replies matching Image 3, 4, 5 */}
          {agentReplies.length > 0 && (
            <div className="mt-2.5 space-y-2">
              {agentReplies.map((reply) => (
                <div key={reply.id} className="text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-800">
                        @{reply.senderUsername || 'agent'}
                      </span>
                      <span className="text-gray-400 font-medium">
                        • {formatMessageTime(reply.timeFormatted, reply.timestamp)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Team Member reply date proof badge matching user request & screenshot */}
                      <span className="text-xs text-gray-400 font-bold shrink-0 bg-gray-50 border border-gray-200/80 px-2 py-0.5 rounded-md">
                        {formatMessageDate(reply.dateFormatted, reply.timestamp)}
                      </span>

                      {/* Super Admin ONLY: Immediate Delete Button */}
                      {currentUserRole === 'SUPER_ADMIN' && onRequestDeleteMessage && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRequestDeleteMessage(conversation.id, reply);
                          }}
                          title="Delete team member message for client (Immediate recall)"
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200/80 rounded-md transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3 text-red-600" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-1 bg-[#f1f3f5] text-gray-800 px-4 py-2.5 rounded-lg leading-relaxed text-sm">
                    {reply.text}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action Row: Blue Reply Button matching Image 3, 4, 5 */}
          <div className="mt-2.5 flex items-center gap-2">
            {isLockedByOther && !hasAlreadyReplied ? (
              <button
                disabled
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-200 text-gray-500 text-xs font-semibold rounded-md cursor-not-allowed"
                title={`Locked by @${activeLock?.agentUsername}`}
              >
                <Lock className="w-3 h-3" />
                <span>Locked by @{activeLock?.agentUsername}</span>
              </button>
            ) : isLockedByMe && !hasAlreadyReplied ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-md">
                  <CornerDownLeft className="w-3 h-3" />
                  <span>Drafting Reply</span>
                </span>
                <button
                  onClick={() => onCancelLock(conversation.id)}
                  className="px-2.5 py-1 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : !hasAlreadyReplied ? (
              <button
                onClick={() => onSelectForReply(conversation)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-[#0055ff] hover:bg-blue-700 text-white text-xs font-semibold rounded-md transition-colors shadow-2xs cursor-pointer"
              >
                <CornerDownLeft className="w-3.5 h-3.5" />
                <span>Reply</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
});
