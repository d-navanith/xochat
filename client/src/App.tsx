import { useState, useEffect, useMemo, useRef } from 'react';
import type { User, Conversation, LockState, Message } from './types';
import { Header } from './components/Header';
import { LeftSidebar, type SidebarActiveTab } from './components/LeftSidebar';
import { NavigationFilter } from './components/NavigationFilter';
import { ConversationCard } from './components/ConversationCard';
import { BottomReplyDock } from './components/BottomReplyDock';
import { LoginDashboardScreen } from './components/LoginDashboardScreen';
import { AdminWorkspaceView } from './components/AdminWorkspaceView';
import { CustomerPortal, NetworkBackground } from './components/CustomerPortal';
import { ThemedToast, ThemedModal } from './components/ThemedNotification';
import { DeleteMessageModal } from './components/DeleteMessageModal';
import type { NotificationItem } from './components/ThemedNotification';
import { api } from './services/api';
import { socket } from './services/socket';

export function App() {
  const currentPort = window.location.port;
  const rawPath = window.location.pathname.toLowerCase().replace(/\/+$/, '');
  const searchParams = new URLSearchParams(window.location.search);
  const portalParam = searchParams.get('portal')?.toLowerCase();
  const hash = window.location.hash.toLowerCase();

  // 1. ADMIN PORTAL (Explicit Admin URLs or Local Admin Dev Ports 5720 / 5120)
  const isAdminPort =
    currentPort === '5720' ||
    currentPort === '5120' ||
    rawPath === '/admin' ||
    rawPath.startsWith('/admin/') ||
    rawPath === '/super' ||
    rawPath.startsWith('/super/') ||
    portalParam === 'admin' ||
    portalParam === 'super' ||
    hash === '#admin' ||
    hash === '#super';

  // 2. TEAM MEMBERS PORTAL (Explicit Team URLs or Local Team Dev Port 5121)
  const isTeamPortal =
    !isAdminPort &&
    (currentPort === '5121' ||
      rawPath === '/team' ||
      rawPath.startsWith('/team/') ||
      rawPath === '/agent' ||
      rawPath.startsWith('/agent/') ||
      rawPath === '/staff' ||
      rawPath.startsWith('/staff/') ||
      portalParam === 'team' ||
      portalParam === 'agent' ||
      portalParam === 'staff' ||
      hash === '#team' ||
      hash === '#agent' ||
      hash === '#staff');

  // 3. CLIENT / CUSTOMER PORTAL (DEFAULT for root "/" and all public visitor traffic, or Local Port 3002)
  // Both Team Members and Admin portals are 100% hidden from clients!
  const isCustomerPortal = !isAdminPort && !isTeamPortal;
  const portalRole: 'ADMIN' | 'TEAM' = isAdminPort ? 'ADMIN' : 'TEAM';

  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Left sidebar is the unified navigation bar for all commands (Inbox, Replied, Admin Commands)
  const [sidebarActiveTab, setSidebarActiveTab] = useState<SidebarActiveTab>(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam) return tabParam as SidebarActiveTab;
    return 'inbox';
  });
  const [currentTab, setCurrentTab] = useState<'all' | 'replied' | 'mine'>(() => {
    const params = new URLSearchParams(window.location.search);
    const filterParam = params.get('filter');
    if (filterParam === 'mine' || filterParam === 'all' || filterParam === 'replied') {
      return filterParam;
    }
    return 'all';
  });
  const [selectedDate, setSelectedDate] = useState('10.28.2026');
  const [inboxAllConvs, setInboxAllConvs] = useState<Conversation[]>([]);
  const [inboxMineConvs, setInboxMineConvs] = useState<Conversation[]>([]);
  const [repliedConvs, setRepliedConvs] = useState<Conversation[]>([]);

  // Computed displayed list: 100% deterministic, instant (0ms), and immune to async race conditions
  const conversations = useMemo(() => {
    if (sidebarActiveTab === 'replied') {
      const isAdminUser = isAdminPort || currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'CORE_ADMIN';
      return isAdminUser ? repliedConvs : inboxMineConvs;
    }
    return currentTab === 'mine' ? inboxMineConvs : inboxAllConvs;
  }, [sidebarActiveTab, currentTab, isAdminPort, currentUser, repliedConvs, inboxMineConvs, inboxAllConvs]);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingDates, setPendingDates] = useState<{ date: string; count: number }[]>([]);
  const [repliedCount, setRepliedCount] = useState(0);
  const [mineCount, setMineCount] = useState(0);
  const [myRepliedCount, setMyRepliedCount] = useState(0);
  const [activeLocks, setActiveLocks] = useState<Record<string, LockState>>({});
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Themed Notification & Modal System
  const [activeToast, setActiveToast] = useState<NotificationItem | null>(null);
  const [modalAlert, setModalAlert] = useState<{
    isOpen: boolean;
    type?: 'collision' | 'error' | 'warning' | 'success';
    title: string;
    message: string;
  } | null>(null);

  // Super Admin Immediate Message Delete Confirmation State
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    conversationId: string;
    message: Message | null;
    customerName?: string;
  }>({
    isOpen: false,
    conversationId: '',
    message: null,
    customerName: '',
  });
  const [isDeletingMessage, setIsDeletingMessage] = useState(false);

  const showToast = (item: Omit<NotificationItem, 'id'>) => {
    const id = `toast_${Date.now()}`;
    const notification = { ...item, id };
    setActiveToast(notification);

    const duration = item.duration || 4500;
    setTimeout(() => {
      setActiveToast((prev) => (prev?.id === id ? null : prev));
    }, duration);
  };

  const handleSidebarTabChange = (tab: SidebarActiveTab) => {
    setSidebarActiveTab(tab);
    const isAdminUser = isAdminPort || currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'CORE_ADMIN';
    if (!isAdminUser && tab === 'replied') {
      setCurrentTab('mine');
    } else {
      setCurrentTab('all');
    }
  };

  // Initial Auth Check
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.getMe()
        .then(({ user }) => {
          setCurrentUser(user);
          socket.emit('agent:register', {
            agentId: user.id,
            username: user.username,
            name: user.name,
            avatarUrl: user.avatarUrl,
          });
        })
        .catch(() => {
          localStorage.removeItem('token');
          setCurrentUser(null);
        });
    }
  }, [currentPort, rawPath, portalParam, hash]);

  // Fetch conversations
  const fetchConversations = async (isManual = false) => {
    if (isManual) {
      setIsRefreshing(true);
    }
    try {
      let activeFilterTab: 'all' | 'replied' | 'replied_mine' | 'mine';
      const isAdminUser = isAdminPort || currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'CORE_ADMIN';
      if (isAdminUser) {
        activeFilterTab = sidebarActiveTab === 'replied' ? 'replied' : 'all';
      } else if (sidebarActiveTab === 'replied') {
        // Team member on Replied: strictly their own replied inquiries (cannot see other agents' replies)
        activeFilterTab = 'replied_mine';
      } else {
        // Team member on Inbox: 'all' (pending queue) or 'mine' (strictly their own replies)
        activeFilterTab = currentTab === 'mine' ? 'mine' : 'all';
      }

      const agentKey = currentUser?.username || currentUser?.id;
      const data = await api.getConversations(activeFilterTab, selectedDate, agentKey);

      // Pre-cache collections in memory so switching between All & Mine is instant (0ms)
      if (data.inboxAll) setInboxAllConvs(data.inboxAll);
      if (data.inboxMine) setInboxMineConvs(data.inboxMine);
      if (data.repliedAll) setRepliedConvs(data.repliedAll);

      setPendingCount(data.stats.pendingCount);
      setPendingDates(data.stats.pendingDates ?? []);
      setRepliedCount(data.stats.repliedCount);
      setMineCount(data.stats.mineCount);
      setMyRepliedCount(data.stats.myRepliedCount ?? 0);
      setActiveLocks(data.activeLocks || {});
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      if (isManual) {
        setTimeout(() => setIsRefreshing(false), 400);
      }
    }
  };

  const handleManualRefresh = () => {
    fetchConversations(true);
  };

  // Instant 0ms Tab Switching: pure state switch immediately reflected by derived conversations
  const handleNavTabChange = (tab: 'all' | 'replied' | 'mine') => {
    setCurrentTab(tab);
  };

  useEffect(() => {
    if (!isCustomerPortal && currentUser && (sidebarActiveTab === 'inbox' || sidebarActiveTab === 'replied')) {
      fetchConversations();
    }
  }, [sidebarActiveTab, selectedDate, currentUser, isCustomerPortal]);

  const selectedDateRef = useRef(selectedDate);
  selectedDateRef.current = selectedDate;

  const allConvsRef = useRef<Conversation[]>([]);
  allConvsRef.current = [...inboxAllConvs, ...inboxMineConvs, ...repliedConvs];

  // Stable WebSocket Subscriptions (Never torn down on tab or date changes)
  useEffect(() => {
    socket.on('connect', () => {
      if (currentUser) {
        socket.emit('agent:register', {
          agentId: currentUser.id,
          username: currentUser.username,
          name: currentUser.name,
          avatarUrl: currentUser.avatarUrl,
        });
      }
    });

    socket.on('locks:sync', (locks: Record<string, LockState>) => {
      setActiveLocks(locks);
    });

    socket.on('conversation:locked', ({ conversationId, lock }: { conversationId: string; lock: LockState }) => {
      setActiveLocks((prev) => ({ ...prev, [conversationId]: lock }));
    });

    socket.on('conversation:unlocked', ({ conversationId }: { conversationId: string }) => {
      setActiveLocks((prev) => {
        const next = { ...prev };
        delete next[conversationId];
        return next;
      });
    });

    socket.on('conversation:replied_and_closed', () => {
      fetchConversations();
      showToast({
        type: 'success',
        title: 'Reply Delivered & Closed',
        message: 'The inquiry was answered. Customer green mark removed and chat moved to Replied Box.',
      });
    });

    socket.on('conversation:updated', ({ conversation }: { conversation: Conversation }) => {
      setInboxAllConvs((prev) => prev.map((c) => (c.id === conversation.id ? conversation : c)));
      setInboxMineConvs((prev) => prev.map((c) => (c.id === conversation.id ? conversation : c)));
      setRepliedConvs((prev) => prev.map((c) => (c.id === conversation.id ? conversation : c)));
      fetchConversations();
    });

    socket.on('message:deleted', ({ conversationId, messageId, conversation }: { conversationId: string; messageId: string; conversation?: Conversation }) => {
      const updater = (prev: Conversation[]) => prev.map((c) => {
        if (c.id !== conversationId) return c;
        if (conversation) return conversation;
        return { ...c, messages: c.messages.filter((m) => m.id !== messageId) };
      });
      setInboxAllConvs(updater);
      setInboxMineConvs(updater);
      setRepliedConvs(updater);
      fetchConversations();
    });

    socket.on('conversation:new_pending', ({ conversation }: { conversation: Conversation }) => {
      // Auto-focus the date of the incoming customer inquiry so agents never miss it
      if (conversation?.dateStr && conversation.dateStr !== selectedDateRef.current) {
        setSelectedDate(conversation.dateStr);
      } else {
        fetchConversations();
      }
    });

    socket.on('stats:updated', () => {
      fetchConversations();
    });

    socket.on('claim:success', ({ conversationId }: { conversationId: string; lock: LockState }) => {
      const target = allConvsRef.current.find((c) => c.id === conversationId);
      if (target) {
        setSelectedConversation(target);
        showToast({
          type: 'info',
          title: 'Inquiry Claimed',
          message: `Exclusive reply lock acquired for ${target.customerName}.`,
        });
      }
    });

    socket.on('claim:failed', ({ message }: { message: string }) => {
      showToast({
        type: 'collision',
        title: 'Collision Prevention Active',
        message,
      });
    });

    return () => {
      socket.off('connect');
      socket.off('locks:sync');
      socket.off('conversation:locked');
      socket.off('conversation:unlocked');
      socket.off('conversation:replied_and_closed');
      socket.off('conversation:updated');
      socket.off('message:deleted');
      socket.off('conversation:new_pending');
      socket.off('stats:updated');
      socket.off('claim:success');
      socket.off('claim:failed');
    };
  }, [currentUser]);

  const handleSelectForReply = (conv: Conversation) => {
    // Single reply rule enforcement
    if (conv.hasReplied || conv.replyCount >= 1 || conv.status === 'REPLIED') {
      setModalAlert({
        isOpen: true,
        type: 'warning',
        title: 'Single Reply Limit Enforced',
        message: 'Team members can send only 1 reply per customer inquiry. This inquiry has already received its reply and has moved to the Replied Box.',
      });
      return;
    }

    socket.emit('claim:lock', { conversationId: conv.id });
    setSelectedConversation(conv);
  };

  const handleCancelLock = (conversationId: string) => {
    socket.emit('claim:release', { conversationId });
    if (selectedConversation?.id === conversationId) {
      setSelectedConversation(null);
    }
  };

  const handleSendReply = (conversationId: string, text: string) => {
    const target = conversations.find((c) => c.id === conversationId);
    if (target && (target.hasReplied || target.replyCount >= 1)) {
      setModalAlert({
        isOpen: true,
        type: 'warning',
        title: 'Single Reply Limit Enforced',
        message: 'Team members can send only 1 reply per customer inquiry. Further replies are blocked by the system.',
      });
      return;
    }

    socket.emit('message:send', { conversationId, text });
    setSelectedConversation(null);
  };

  const handleRequestDeleteMessage = (conversationId: string, message: Message) => {
    if (currentUser?.role !== 'SUPER_ADMIN') {
      showToast({
        type: 'error',
        title: 'Access Restricted',
        message: 'Only Super Admin has authorization to delete team member messages.',
      });
      return;
    }

    // Immediate time window check: within 10 minutes (600 seconds)
    const elapsedSeconds = Math.abs((Date.now() - new Date(message.timestamp).getTime()) / 1000);
    if (elapsedSeconds > 600) {
      showToast({
        type: 'warning',
        title: 'Immediate Recall Expired',
        message: 'Team member messages can only be deleted immediately after sending (within 10 minutes).',
      });
      return;
    }

    const targetConv = conversations.find((c) => c.id === conversationId);
    setDeleteModalState({
      isOpen: true,
      conversationId,
      message,
      customerName: targetConv?.customerName || '',
    });
  };

  const handleConfirmDeleteMessage = async () => {
    if (!deleteModalState.conversationId || !deleteModalState.message) return;
    setIsDeletingMessage(true);
    try {
      await api.deleteAgentMessage(deleteModalState.conversationId, deleteModalState.message.id);
      setDeleteModalState({ isOpen: false, conversationId: '', message: null, customerName: '' });
      showToast({
        type: 'success',
        title: 'Message Recalled',
        message: 'Team member message was deleted immediately without client trace.',
      });
      await fetchConversations();
    } catch (err: any) {
      console.error('Delete message failed:', err);
      showToast({
        type: 'error',
        title: 'Deletion Failed',
        message: err.message || 'Could not delete message.',
      });
    } finally {
      setIsDeletingMessage(false);
    }
  };

  const handleLogin = async (username: string, pass: string) => {
    const data = await api.login(username, pass);
    localStorage.setItem('token', data.token);
    setCurrentUser(data.user);
    setSidebarActiveTab('inbox');

    socket.emit('agent:register', {
      agentId: data.user.id,
      username: data.user.username,
      name: data.user.name,
      avatarUrl: data.user.avatarUrl,
    });

    showToast({
      type: 'success',
      title: 'Authenticated Successfully',
      message: `Welcome, ${data.user.name} (@${data.user.username}). Role: ${data.user.role}`,
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
    setSelectedConversation(null);
  };

  // If on customer port (3002), render Customer Portal
  if (isCustomerPortal) {
    return <CustomerPortal />;
  }

  // Show login dashboard screen when unauthenticated / logged out
  if (!currentUser) {
    return (
      <LoginDashboardScreen
        portalRole={portalRole}
        onLogin={handleLogin}
      />
    );
  }

  const isConversationsMode = sidebarActiveTab === 'inbox' || sidebarActiveTab === 'replied';

  return (
    <div className="h-screen text-gray-900 flex flex-col font-sans relative overflow-hidden bg-[#fafafa]">
      {/* Official Network Background */}
      <NetworkBackground />

      {/* Global Themed Toast Notification System */}
      <ThemedToast
        notification={activeToast}
        onClose={() => setActiveToast(null)}
      />

      {/* Global Themed Modal Alert System */}
      {modalAlert && (
        <ThemedModal
          isOpen={modalAlert.isOpen}
          type={modalAlert.type}
          title={modalAlert.title}
          message={modalAlert.message}
          onConfirm={() => setModalAlert(null)}
          onClose={() => setModalAlert(null)}
        />
      )}

      {/* Top Header matching Mockup - strictly unified with active date pending count */}
      <Header
        pendingCount={pendingCount}
        currentUser={currentUser}
        currentSidebarTab={sidebarActiveTab}
        onOpenLogin={() => {}}
        onLogout={handleLogout}
        onOpenAdmin={() => setSidebarActiveTab('surveillance')}
      />

      {/* Main Workspace Layout with Fixed Left Sidebar and Scrollable Chat Feed */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 mt-3 flex-1 flex gap-4 relative z-10 overflow-hidden pb-24 min-h-0">
        {/* Left Sidebar Nav Bar - strictly unified with active date pending count */}
        <LeftSidebar
          activeTab={sidebarActiveTab}
          onTabChange={handleSidebarTabChange}
          pendingCount={pendingCount}
          currentUser={currentUser}
          onRefresh={handleManualRefresh}
          isRefreshing={isRefreshing}
        />

        {/* Center / Feed Area */}
        <main className="flex-1 min-w-0 bg-white/95 rounded-2xl border border-gray-200/90 shadow-2xs p-3 sm:p-5 backdrop-blur-xs flex flex-col h-full overflow-hidden min-h-0">
          {!isConversationsMode ? (
            <AdminWorkspaceView
              activeTab={sidebarActiveTab as any}
              onBackToConversations={() => setSidebarActiveTab('inbox')}
              currentUser={currentUser}
              onShowNotification={(item) => showToast(item)}
              onSelectForReply={(lead) => {
                setSidebarActiveTab('inbox');
                handleSelectForReply(lead);
              }}
            />
          ) : (
            /* Standard Live Conversations Feed (Inbox or Replied) */
            <>
              {/* Sub Navigation Bar: All 10 | Mine 16 on Inbox, All 4 | Mine on Replied */}
              <NavigationFilter
                isAdmin={currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'CORE_ADMIN' || isAdminPort}
                sidebarTab={sidebarActiveTab === 'replied' ? 'replied' : 'inbox'}
                currentTab={currentTab}
                onTabChange={handleNavTabChange}
                allCount={pendingCount}
                repliedCount={repliedCount}
                mineCount={mineCount}
                myRepliedCount={myRepliedCount}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
              />

              {/* Conversation Cards Feed - ONLY this section scrolls down */}
              <div className="mt-4 space-y-3 flex-1 overflow-y-auto min-h-0 pr-1.5">
                {conversations.length === 0 ? (
                  <div className="bg-gray-50/50 rounded-xl p-12 text-center border border-gray-200/80 text-gray-500">
                    <p className="font-semibold text-gray-700">No conversations on {selectedDate}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {sidebarActiveTab === 'replied'
                        ? 'Inquiries that have received a reply for this date appear here.'
                        : 'No pending inquiries found for this selected date.'}
                    </p>
                    {/* Pending inquiries waiting on OTHER dates: one-click jump so no customer is ever stuck */}
                    {sidebarActiveTab === 'inbox' &&
                      pendingDates.filter((p) => p.date !== selectedDate).length > 0 && (
                        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                          {pendingDates
                            .filter((p) => p.date !== selectedDate)
                            .map((p) => (
                              <button
                                key={p.date}
                                type="button"
                                onClick={() => setSelectedDate(p.date)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-[#0066ff] bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                              >
                                <span>
                                  {p.count} pending on {p.date} → View
                                </span>
                              </button>
                            ))}
                        </div>
                      )}
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <ConversationCard
                      key={conv.id}
                      conversation={conv}
                      currentUserId={currentUser?.id}
                      currentUserRole={currentUser?.role}
                      activeLock={activeLocks[conv.id]}
                      isSelected={selectedConversation?.id === conv.id}
                      onSelectForReply={handleSelectForReply}
                      onCancelLock={handleCancelLock}
                      onRequestDeleteMessage={handleRequestDeleteMessage}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Super Admin Message Deletion Confirmation Modal */}
      <DeleteMessageModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ isOpen: false, conversationId: '', message: null, customerName: '' })}
        onConfirm={handleConfirmDeleteMessage}
        message={deleteModalState.message}
        customerName={deleteModalState.customerName}
        isDeleting={isDeletingMessage}
      />

      {/* Bottom Reply Composer Dock (shown during conversations view) */}
      {isConversationsMode && (
        <BottomReplyDock
          selectedConversation={selectedConversation}
          currentUser={currentUser}
          onSendReply={handleSendReply}
          onCancelSelection={() => {
            if (selectedConversation) {
              handleCancelLock(selectedConversation.id);
            }
          }}
          onOpenLogin={() => {}}
        />
      )}
    </div>
  );
}
