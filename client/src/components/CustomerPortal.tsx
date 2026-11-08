import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../services/socket';
import { api } from '../services/api';
import type { Customer, Message } from '../types';
import { CornerDownLeft, LogOut, Eye, EyeOff } from 'lucide-react';
import logoImg from '../assets/xochat-logo.png';
import networkBg from '../assets/network-bg.png';
import xochatWatermark from '../assets/xochat-watermark.png';
import { ThemedModal } from './ThemedNotification';
import { DatePickerPill } from './DatePickerPill';
import { formatChatTime, formatChatDate, formatMessageTime } from '../utils/dateTime';

type ViewMode = 'WELCOME' | 'LOGIN' | 'SIGNUP' | 'CHAT';

// Logo Component using official transparent PNG asset
export const XochatLogo: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const hClass = size === 'sm' ? 'h-7' : size === 'lg' ? 'h-11' : 'h-8';
  return (
    <div className="flex items-center select-none cursor-pointer">
      <img src={logoImg} alt="Xochat" className={`${hClass} w-auto object-contain`} />
    </div>
  );
};

// Official background asset
export const NetworkBackground: React.FC = () => (
  <div
    className="fixed inset-0 pointer-events-none opacity-90 z-0 bg-repeat bg-center"
    style={{
      backgroundImage: `url(${networkBg})`,
      backgroundSize: 'cover',
      backgroundAttachment: 'fixed',
    }}
  />
);

// Official geometric X watermark from user asset
export const XWatermark: React.FC<{ opacity?: string; size?: string; className?: string }> = ({
  opacity = 'opacity-30',
  size = 'w-[420px] max-w-[85%]',
  className = '',
}) => (
  <div className={`absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden ${className}`}>
    <img
      src={xochatWatermark}
      alt="Xochat Background Effect"
      className={`${size} object-contain ${opacity}`}
    />
  </div>
);

const createWelcomeMessage = (): Message => ({
  id: 'welcome_init',
  conversationId: 'conv_pending_1',
  senderType: 'AGENT',
  senderName: 'Xochat Team',
  text: 'Welcome Xochat!\nHow Can I help you?',
  timestamp: new Date().toISOString(),
  timeFormatted: formatChatTime(new Date()),
  dateFormatted: formatChatDate(new Date()),
});

export const CustomerPortal: React.FC = () => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('WELCOME');

  // Form states
  const [loginFullName, setLoginFullName] = useState('Theodore');
  const [loginPassword, setLoginPassword] = useState('password123');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [signupFullName, setSignupFullName] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showCredsModal, setShowCredsModal] = useState(false);

  // Chat states
  const [chatDate, setChatDate] = useState('10.28.2026');
  const [inputText, setInputText] = useState('');
  const [isWaitingForReply, setIsWaitingForReply] = useState(false);
  const [messages, setMessages] = useState<Message[]>([createWelcomeMessage()]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Live real-time clock tick for real-time responsiveness
  const [, setLiveTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTick((t) => t + 1);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('customer_token');
    if (token) {
      api.getCustomerMe()
        .then(({ customer: c }) => {
          setCustomer(c);
          setViewMode('CHAT');
          socket.emit('customer:register', { customerName: c.name, customerId: c.id });
          loadHistory(c.name);
        })
        .catch(() => {
          localStorage.removeItem('customer_token');
        });
    }
  }, []);

  const loadHistory = async (name: string) => {
    try {
      const data = await api.getCustomerConversations(name);
      if (data.conversations && data.conversations.length > 0) {
        const allMsgs: Message[] = [];
        data.conversations.forEach((conv) => {
          allMsgs.push(...conv.messages);
        });
        if (allMsgs.length > 0) {
          allMsgs.sort((a, b) => {
            const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return ta - tb;
          });
          setMessages(allMsgs);
        } else {
          setMessages([createWelcomeMessage()]);
        }
      } else {
        setMessages([createWelcomeMessage()]);
      }
      setIsWaitingForReply(data.isWaitingForReply ?? false);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    socket.on('customer:sync_status', (data: { isWaitingForReply: boolean; messages?: Message[] }) => {
      setIsWaitingForReply(data.isWaitingForReply ?? false);
      if (data.messages && data.messages.length > 0) {
        const msgs = [...data.messages];
        msgs.sort((a, b) => {
          const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return ta - tb;
        });
        setMessages(msgs);
      } else {
        setMessages([createWelcomeMessage()]);
      }
    });

    socket.on('customer:reply_received', (data: { reply: Message; isWaitingForReply?: boolean }) => {
      setMessages((prev) => [...prev, data.reply]);
      setIsWaitingForReply(data.isWaitingForReply ?? false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    socket.on('customer:message_sent', (data: { isWaitingForReply?: boolean }) => {
      setIsWaitingForReply(data.isWaitingForReply ?? true);
    });

    socket.on('customer:message_blocked', () => {
      setIsWaitingForReply(true);
    });

    socket.on('customer:message_deleted', (data: { messageId: string; isWaitingForReply?: boolean }) => {
      // User rule: Client side we do NOT show "this message was deleted" - message completely vanishes
      setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
      if (data.isWaitingForReply !== undefined) {
        setIsWaitingForReply(data.isWaitingForReply);
      }
    });

    socket.on('message:deleted', (data: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
    });

    return () => {
      socket.off('customer:sync_status');
      socket.off('customer:reply_received');
      socket.off('customer:message_sent');
      socket.off('customer:message_blocked');
      socket.off('customer:message_deleted');
      socket.off('message:deleted');
    };
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const data = await api.customerLogin(loginFullName.trim(), loginPassword);
      localStorage.setItem('customer_token', data.token);
      setCustomer(data.customer);
      setViewMode('CHAT');
      socket.emit('customer:register', { customerName: data.customer.name, customerId: data.customer.id });
      loadHistory(data.customer.name);
    } catch (err: any) {
      setAuthError(err.message || 'Login failed. Please check your credentials.');
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (signupPassword !== signupConfirmPassword) {
      setAuthError('Passwords do not match');
      return;
    }
    try {
      const data = await api.customerSignup(signupFullName.trim(), signupPassword);
      localStorage.setItem('customer_token', data.token);
      setCustomer(data.customer);
      setViewMode('CHAT');
      socket.emit('customer:register', { customerName: data.customer.name, customerId: data.customer.id });
    } catch (err: any) {
      setAuthError(err.message || 'Signup failed');
    }
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !customer) return;
    if (isWaitingForReply) return; // Prevent repeated messages!

    const now = new Date();
    const timeFormatted = formatChatTime(now);
    const dateFormatted = formatChatDate(now);

    const newMsg: Message = {
      id: `msg_${Date.now()}`,
      conversationId: 'conv_active',
      senderType: 'CUSTOMER',
      senderName: customer.name,
      senderAvatar: customer.avatarUrl,
      text: inputText.trim(),
      timestamp: now.toISOString(),
      timeFormatted,
      dateFormatted,
    };

    setMessages((prev) => [...prev, newMsg]);
    setIsWaitingForReply(true); // Locked until team member replies!

    socket.emit('customer:send_message', {
      customerName: customer.name,
      text: inputText.trim(),
      timestamp: now.toISOString(),
      timeFormatted,
      dateFormatted,
    });

    setInputText('');
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleLogout = () => {
    localStorage.removeItem('customer_token');
    setCustomer(null);
    setViewMode('WELCOME');
  };

  return (
    <div className="min-h-screen text-gray-900 flex flex-col font-sans relative overflow-x-hidden bg-[#fafafa]">
      <NetworkBackground />
      <XWatermark opacity="opacity-[0.06]" size="w-[680px]" />

      {/* Top Navbar */}
      <header className="relative z-10 bg-white/95 backdrop-blur-xs border-b border-gray-200 px-8 py-3.5 flex items-center justify-between shadow-2xs">
        <div onClick={() => setViewMode(customer ? 'CHAT' : 'WELCOME')}>
          <XochatLogo size="md" />
        </div>

        <div>
          {customer ? (
            <div className="flex items-center gap-3">
              <span className="font-bold text-gray-800 text-sm">{customer.name}</span>
              <div className="relative">
                <img
                  src={customer.avatarUrl || 'https://api.dicebear.com/7.x/personas/svg?seed=Theodore'}
                  alt={customer.name}
                  className="w-9 h-9 rounded-full border-2 border-amber-300 bg-amber-50 object-cover"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
              </div>
              <button
                onClick={handleLogout}
                title="Logout"
                className="text-gray-400 hover:text-red-600 p-1 rounded-md transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setViewMode('LOGIN')}
              className="px-6 py-1.5 border border-[#0066ff] text-[#0066ff] hover:bg-blue-50 font-semibold text-sm rounded-lg transition-colors cursor-pointer"
            >
              Login
            </button>
          )}
        </div>
      </header>

      {/* 1. WELCOME SCREEN */}
      {viewMode === 'WELCOME' && (
        <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white rounded-2xl border-[1.5px] border-[#ef4444] shadow-xl max-w-xl w-full p-4 flex flex-col">
            <div className="mb-3 px-2 flex flex-col items-start">
              <XochatLogo size="sm" />
              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500 font-medium pl-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Online</span>
              </div>
            </div>

            <div className="bg-[#9faab0] rounded-xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[360px]">
              <XWatermark />

              <div className="relative z-10 max-w-xs">
                <div className="bg-[#dbe4ff] text-gray-900 rounded-2xl rounded-bl-xs px-5 py-3.5 shadow-sm text-sm font-medium leading-relaxed">
                  Hi there 👋, We are from Xochat!
                  <br />
                  How Can I help You.
                </div>
                <div className="flex items-center gap-1 mt-2.5 pl-2 text-white/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce delay-150"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-white/70 animate-bounce delay-300"></span>
                </div>
              </div>

              <div className="relative z-10 bg-white rounded-2xl p-6 shadow-lg text-center max-w-xs sm:max-w-sm w-full mx-auto mt-8">
                <button
                  onClick={() => {
                    if (customer) {
                      setViewMode('CHAT');
                    } else {
                      setViewMode('LOGIN');
                    }
                  }}
                  className="w-full bg-[#10b981] hover:bg-[#059669] active:bg-[#047857] text-white font-extrabold text-lg py-3.5 px-6 rounded-full shadow-md tracking-wider transition-transform active:scale-98 cursor-pointer uppercase"
                >
                  CHAT NOW
                </button>

                <div className="mt-3">
                  <button
                    onClick={() => setViewMode('LOGIN')}
                    className="text-[#0066ff] hover:text-blue-800 underline text-xs font-bold tracking-wide uppercase cursor-pointer"
                  >
                    LOGIN TO CONTINUE
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* 2. LOGIN SCREEN */}
      {viewMode === 'LOGIN' && (
        <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white rounded-2xl border-[1.5px] border-[#ef4444] shadow-xl max-w-md w-full p-4 flex flex-col">
            <div className="mb-3 px-2 flex flex-col items-start">
              <XochatLogo size="sm" />
              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500 font-medium pl-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Online</span>
              </div>
            </div>

            <div className="bg-[#9faab0] rounded-xl p-8 relative overflow-hidden">
              <XWatermark />

              <div className="relative z-10">
                <h2 className="text-center font-bold text-gray-800 text-base uppercase tracking-wider mb-6">
                  LOGIN
                </h2>

                {authError && (
                  <div className="mb-4 p-2.5 bg-red-100 border border-red-300 text-red-800 text-xs rounded-lg">
                    {authError}
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <input
                      type="text"
                      required
                      value={loginFullName}
                      onChange={(e) => setLoginFullName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full bg-white text-gray-800 placeholder-gray-400 rounded-md px-4 py-2.5 text-sm outline-none shadow-xs border border-transparent focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <div className="relative">
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter Password"
                        className="w-full bg-white text-gray-800 placeholder-gray-400 rounded-md px-4 py-2.5 text-sm outline-none shadow-xs border border-transparent focus:border-blue-500 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        aria-label={showLoginPassword ? 'Hide password' : 'View password'}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="text-left">
                    <button
                      type="button"
                      onClick={() => setShowCredsModal(true)}
                      className="text-[#0066ff] hover:underline text-xs cursor-pointer font-semibold"
                    >
                      Forgot password / Demo Account
                    </button>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full bg-[#10b981] hover:bg-[#059669] text-white font-extrabold text-base py-3 rounded-full shadow-md tracking-wider uppercase transition-transform active:scale-98 cursor-pointer"
                    >
                      LOGIN
                    </button>
                  </div>

                  <div className="pt-3 text-center">
                    <div className="text-xs text-gray-800 font-medium mb-3">
                      Don't have an account
                    </div>
                    <div className="w-full border-t border-gray-400/60 mb-3"></div>
                    <button
                      type="button"
                      onClick={() => setViewMode('SIGNUP')}
                      className="text-[#0066ff] hover:underline text-xs font-bold uppercase tracking-wider cursor-pointer"
                    >
                      SIGN UP
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* 3. SIGN UP SCREEN */}
      {viewMode === 'SIGNUP' && (
        <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white rounded-2xl border-[1.5px] border-[#ef4444] shadow-xl max-w-md w-full p-4 flex flex-col">
            <div className="mb-3 px-2 flex flex-col items-start">
              <XochatLogo size="sm" />
              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500 font-medium pl-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Online</span>
              </div>
            </div>

            <div className="bg-[#9faab0] rounded-xl p-8 relative overflow-hidden">
              <XWatermark />

              <div className="relative z-10">
                <h2 className="text-center font-bold text-gray-800 text-base uppercase tracking-wider mb-6">
                  SIGN UP
                </h2>

                {authError && (
                  <div className="mb-4 p-2.5 bg-red-100 border border-red-300 text-red-800 text-xs rounded-lg">
                    {authError}
                  </div>
                )}

                <form onSubmit={handleSignupSubmit} className="space-y-4">
                  <div>
                    <input
                      type="text"
                      required
                      value={signupFullName}
                      onChange={(e) => setSignupFullName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full bg-white text-gray-800 placeholder-gray-400 rounded-md px-4 py-2.5 text-sm outline-none shadow-xs border border-transparent focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <div className="relative">
                      <input
                        type={showSignupPassword ? 'text' : 'password'}
                        required
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        placeholder="New Password"
                        className="w-full bg-white text-gray-800 placeholder-gray-400 rounded-md px-4 py-2.5 text-sm outline-none shadow-xs border border-transparent focus:border-blue-500 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        aria-label={showSignupPassword ? 'Hide password' : 'View password'}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="relative">
                      <input
                        type={showSignupConfirmPassword ? 'text' : 'password'}
                        required
                        value={signupConfirmPassword}
                        onChange={(e) => setSignupConfirmPassword(e.target.value)}
                        placeholder="Confirm Password"
                        className="w-full bg-white text-gray-800 placeholder-gray-400 rounded-md px-4 py-2.5 text-sm outline-none shadow-xs border border-transparent focus:border-blue-500 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                        aria-label={showSignupConfirmPassword ? 'Hide password' : 'View password'}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        {showSignupConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full bg-[#10b981] hover:bg-[#059669] text-white font-extrabold text-base py-3 rounded-full shadow-md tracking-wider uppercase transition-transform active:scale-98 cursor-pointer"
                    >
                      SIGN UP
                    </button>
                  </div>

                  <div className="pt-3 text-center">
                    <div className="text-xs text-gray-800 font-medium mb-3">
                      Already have an account
                    </div>
                    <div className="w-full border-t border-gray-400/60 mb-3"></div>
                    <button
                      type="button"
                      onClick={() => setViewMode('LOGIN')}
                      className="text-[#0066ff] hover:underline text-xs font-bold uppercase tracking-wider cursor-pointer"
                    >
                      LOGIN
                    </button>
                  </div>

                  <div className="pt-2 text-center text-[11px] text-gray-700/80 font-medium">
                    Once you sign up you can't edit your details...!
                  </div>
                </form>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* 4. CHAT SCREEN matching Attachment 1 (media_1793194316061_42f54847.png) */}
      {viewMode === 'CHAT' && (
        <div className="relative z-10 flex-1 flex flex-col max-w-6xl w-full mx-auto p-4 sm:px-6 pt-2 pb-6">
          {/* Subheader: Date Option aligned directly above right side of chat card */}
          <div className="flex items-center justify-end mb-1.5">
            <DatePickerPill
              value={chatDate}
              onChange={(newDate) => setChatDate(newDate)}
            />
          </div>

          <div className="flex-1 flex gap-4 items-stretch min-h-[520px]">
            {/* Left sidebar placeholder strip matching Attachment 1 */}
            <div className="hidden lg:block w-32 bg-[#f4f5f7] rounded-xl border border-gray-200/50 shrink-0"></div>

            {/* Right Column: Main Chat Box Card + Input Dock directly below */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Main White Chat Box Card */}
              <div className="flex-1 bg-white rounded-xl border border-gray-300 shadow-xs relative overflow-hidden flex flex-col p-6 min-h-[480px]">
                {/* Dual-quadrilateral tilted X watermark matching Attachment 2 */}
                <XWatermark opacity="opacity-[0.14]" size="w-[480px] max-w-[85%]" />

                {/* Header inside chat box */}
                <div className="relative z-10 pb-2 flex items-center justify-between">
                  <span className="font-bold text-gray-900 text-base tracking-tight">Xochat Team</span>
                </div>

                {/* Scrollable Chat Area */}
                <div className="relative z-10 flex-1 overflow-y-auto py-2 space-y-4">
                  {/* Chat Date Divider */}
                  <div className="flex items-center justify-center my-2">
                    <div className="flex items-center gap-2">
                      <span className="h-px w-12 bg-gray-200" />
                      <span className="text-[11px] font-bold text-gray-500 bg-gray-100/90 border border-gray-200 px-3 py-0.5 rounded-full shadow-2xs">
                        {messages.length > 0 && messages[messages.length - 1].dateFormatted
                          ? messages[messages.length - 1].dateFormatted
                          : (chatDate === '10.28.2026' ? '28th OCT 2026' : chatDate)}
                      </span>
                      <span className="h-px w-12 bg-gray-200" />
                    </div>
                  </div>

                  {messages.map((m) => {
                    const isAgent = m.senderType === 'AGENT';
                    const displayTime = formatMessageTime(m.timeFormatted, m.timestamp);

                    if (isAgent) {
                      return (
                        <div key={m.id} className="max-w-md">
                          <div className="bg-[#e5edff] text-gray-900 rounded-2xl rounded-bl-xs px-5 py-3.5 shadow-2xs text-base leading-relaxed whitespace-pre-line border border-blue-100/50">
                            {m.text}
                          </div>
                          <div className="mt-1 text-xs text-gray-400 font-medium text-right pr-2">
                            • {displayTime}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={m.id} className="flex flex-col items-end">
                        <div className="text-sm font-bold text-gray-900 mb-1 pr-14">
                          {m.senderName || customer?.name || 'Theodore T.C. Calvin'}
                        </div>

                        <div className="flex items-start gap-3 max-w-lg">
                          <div className="flex flex-col items-end">
                            <div className="bg-[#e5edff] text-gray-900 rounded-2xl rounded-br-xs px-5 py-3.5 shadow-2xs text-base leading-relaxed border border-blue-100/50">
                              {m.text}
                            </div>
                            <div className="mt-1 text-xs text-gray-400 font-medium pr-1">
                              • {displayTime}
                            </div>
                          </div>

                          <div className="relative shrink-0 mt-0.5">
                            <img
                              src={m.senderAvatar || customer?.avatarUrl || 'https://api.dicebear.com/7.x/personas/svg?seed=Theodore'}
                              alt={m.senderName}
                              className="w-10 h-10 rounded-full border border-gray-200 bg-slate-100 object-cover"
                            />
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Prominent Center Waiting Notice Card matching Attachment 1 */}
                  {isWaitingForReply && (
                    <div className="my-8 mx-auto max-w-xl w-full bg-[#fbd488] border border-[#f5a720] rounded-2xl py-8 px-10 text-center shadow-xs animate-in fade-in zoom-in-95 duration-200">
                      <p className="font-bold text-gray-900 text-lg leading-relaxed select-none">
                        Wait for a minute our team will contact you soon...
                      </p>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Bottom Composer Dock positioned directly underneath chat card matching Attachment 1 */}
              <div className="bg-[#eceef0] rounded-xl p-2.5 flex items-center gap-3 mt-3.5 shadow-2xs">
                <input
                  type="text"
                  disabled={isWaitingForReply}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendMessage();
                  }}
                  placeholder="Type your message here"
                  className="flex-1 bg-[#d6d9de] disabled:bg-[#d6d9de]/60 disabled:cursor-not-allowed focus:bg-white text-gray-800 placeholder-gray-500 rounded-lg px-4 py-3 text-sm outline-none transition-all border border-transparent focus:border-blue-500"
                />

                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={isWaitingForReply || !inputText.trim()}
                  className="inline-flex items-center gap-2 bg-[#0052cc] hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white font-bold text-sm px-6 py-3 rounded-lg transition-all shadow-xs cursor-pointer uppercase shrink-0"
                >
                  <CornerDownLeft className="w-4 h-4" />
                  <span>SEND</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Themed Customer Credentials Help Modal */}
      <ThemedModal
        isOpen={showCredsModal}
        type="info"
        title="Customer Demo Access"
        message="The Theodore account is pre-provisioned for live testing:"
        confirmLabel="Autofill Theodore & Continue"
        onConfirm={() => {
          setLoginFullName('Theodore');
          setLoginPassword('password123');
          setShowCredsModal(false);
        }}
        onClose={() => setShowCredsModal(false)}
      >
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500 font-semibold">Full Name:</span>
            <span className="font-bold text-gray-900">Theodore</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 font-semibold">Password:</span>
            <span className="font-bold text-gray-900 font-mono">password123</span>
          </div>
        </div>
      </ThemedModal>
    </div>
  );
};
