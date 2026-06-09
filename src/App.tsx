import { useState, useEffect, FormEvent } from 'react';
import {
  Sparkles,
  Users,
  Search,
  Plus,
  ArrowRight,
  TrendingUp,
  CreditCard,
  History,
  Coins,
  ChevronRight,
  ChevronLeft,
  Mail,
  Lock,
  User as UserIcon,
  PieChart as PieChartIcon,
  Flame,
  ArrowLeft,
  DollarSign,
  Landmark,
  Image as ImageIcon,
  CheckCircle,
  X,
  MapPin,
  Calendar,
  LogOut,
  Sliders,
  Wallet,
  Calculator,
  Loader2,
  Trash2,
  Edit2,
  Bell,
  QrCode,
  Check,
  BellRing,
  MessageSquare,
  Sun,
  Moon,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  AlertTriangle
} from 'lucide-react';

import { 
  User, 
  GroupMember, 
  Expense, 
  Settlement, 
  DetailedGroup, 
  SimplifiedDebt,
  ParticipantBalance,
  Notification
} from './types';

// Importing our high-fidelity system modules
import { BalanceCard } from './components/BalanceCard';
import { DebtGraph } from './components/DebtGraph';
import { AIParseInput } from './components/AIParseInput';
import { ReceiptUploader } from './components/ReceiptUploader';
import { InsightsChat } from './components/InsightsChat';
import { GroupChat } from './components/GroupChat';
import { SpendingTrendChart } from './components/SpendingTrendChart';
import { exportSingleExpenseToPDF, exportGroupLedgerToPDF } from './lib/pdfExport';

export default function App() {
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('fairshare_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    localStorage.setItem('fairshare_theme', theme);
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Token state
  const [token, setToken] = useState<string | null>(localStorage.getItem('fairshare_token'));
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Router state
  const [currentPath, setCurrentPath] = useState(window.location.hash || '#/');
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  // DB Context states
  const [groups, setGroups] = useState<any[]>([]);
  const [detailedGroup, setDetailedGroup] = useState<DetailedGroup | null>(null);
  
  // Loading & error trackers
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // App Modals & Input trackers
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupCurrency, setNewGroupCurrency] = useState('EUR');

  // New Expense form triggers
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Food');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expensePayer, setExpensePayer] = useState('');
  const [expenseSplitType, setExpenseSplitType] = useState<'equal' | 'percentage' | 'custom' | 'shares'>('equal');
  const [expenseNotes, setExpenseNotes] = useState('');
  const [expenseReceiptUrl, setExpenseReceiptUrl] = useState('');
  const [expenseSplitsInput, setExpenseSplitsInput] = useState<any[]>([]);

  // Settle Up form triggers (who pays who)
  const [settlePayer, setSettlePayer] = useState('');
  const [settleReceiver, setSettleReceiver] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [settleMethod, setSettleMethod] = useState('Cash');
  const [settleNote, setSettleNote] = useState('Settlement transfer');

  // Member invite inputs
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Group sidebar panel tabs & chat states
  const [sidebarTab, setSidebarTab] = useState<'settlement' | 'chats' | 'advisor'>('settlement');
  const [chatMessages, setChatMessages] = useState<any[]>([]);

  // Auth Inputs
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  // Notifications states
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [activeToast, setActiveToast] = useState<{ title: string; message: string; type: string } | null>(null);

  // Profile settings inputs
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState('');
  const [profileUpiId, setProfileUpiId] = useState('');
  const [profileUpiQrUrl, setProfileUpiQrUrl] = useState('');
  const [profileUpdateSuccess, setProfileUpdateSuccess] = useState(false);
  const [showScannerPopup, setShowScannerPopup] = useState<any | null>(null);
  const [settleReceiverUpiField, setSettleReceiverUpiField] = useState('');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const triggerConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText = 'Yes, Delete',
    cancelText = 'Cancel'
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
      confirmText,
      cancelText
    });
  };

  // Show a temporary banner toast
  const showLiveToast = (toast: { title: string; message: string; type: string }) => {
    setActiveToast(toast);
    setTimeout(() => {
      setActiveToast(null);
    }, 5500); // clear after 5.5s
  };

  const fetchNotifications = async () => {
    try {
      if (!token) return;
      const res = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Error loading notifications:', err);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      }
    } catch (err) {
      console.error('Error marking read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch(`/api/notifications/read-all`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        showLiveToast({
          title: 'All Cleared',
          message: 'All notifications successfully marked as read.',
          type: 'info'
        });
      }
    } catch (err) {
      console.error('Error marking bulk read:', err);
    }
  };

  // Request settlement
  const requestSettlement = async (debtorId: string, amount: number) => {
    try {
      const res = await fetch(`/api/groups/${activeGroupId}/settlements/request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ debtor_id: debtorId, amount })
      });
      if (res.ok) {
        showLiveToast({
          title: 'Settle-up Requested',
          message: 'A settlement request was successfully fired to the group member.',
          type: 'success'
        });
      } else {
        const data = await res.json();
        showLiveToast({
          title: 'Request Failed',
          message: data.error || 'Unable to fire settlement request.',
          type: 'error'
        });
      }
    } catch (err) {
      console.error('Error requesting settlement:', err);
    }
  };

  // Whenever token & currentUser is authenticated, fetch notifications initially
  useEffect(() => {
    if (token && currentUser) {
      fetchNotifications();
    }
  }, [token, currentUser?.id]);

  // WebSocket sync effects
  useEffect(() => {
    if (!token || !currentUser || !currentUser.id) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    console.log('Connecting to WebSocket sync server:', wsUrl);

    let socket: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connect = () => {
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('WebSocket connection successfully opened.');
        const groupIds = groups.map(g => g.id);
        socket?.send(JSON.stringify({
          type: 'auth',
          userId: currentUser.id,
          groupIds: groupIds
        }));
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          console.log('WS Message received:', payload);

          if (payload.type === 'notification_received') {
            const notif = payload.data;
            setNotifications(prev => [notif, ...prev]);
            showLiveToast({
              title: notif.title,
              message: notif.message,
              type: notif.type
            });
          }

          if (payload.type === 'group_joined') {
            fetchGroups();
            showLiveToast({
              title: '🎒 New Group Invitation',
              message: `You were added to the group "${payload.data.name}". It is now available in your sidebar!`,
              type: 'sync'
            });
          }

          if (payload.type === 'member_added' || payload.type === 'member_removed') {
            if (activeGroupId && activeGroupId === payload.groupId) {
              fetchDetailedGroup(activeGroupId);
            }
            showLiveToast({
              title: '👥 Group Registry Synced',
              message: payload.type === 'member_added'
                ? `${payload.data.user.name} has been added to the traveler list.`
                : 'A traveler was removed from the list.',
              type: 'sync'
            });
          }

          if (payload.type === 'chat_message') {
            if (activeGroupId && payload.data.group_id === activeGroupId) {
              setChatMessages(prev => {
                if (prev.some(m => m.id === payload.data.id)) return prev;
                return [...prev, payload.data];
              });
            }
          }

          if (
            payload.type === 'expense_added' || 
            payload.type === 'expense_edited' || 
            payload.type === 'expense_deleted' || 
            payload.type === 'settlement_added'
          ) {
            // Trigger refetches
            if (activeGroupId && activeGroupId === payload.groupId) {
              fetchDetailedGroup(activeGroupId);
            }
            fetchGroups();

            let toastMessage = '';
            if (payload.type === 'expense_added') {
              toastMessage = `New expense "${payload.data.title}" of ${payload.data.currency} ${payload.data.amount} logged by ${payload.data.paid_by_name || 'group member'}.`;
            } else if (payload.type === 'expense_edited') {
              toastMessage = `Expense "${payload.data.title}" was updated.`;
            } else if (payload.type === 'expense_deleted') {
              toastMessage = `Expense "${payload.data.title}" was removed from registry.`;
            } else if (payload.type === 'settlement_added') {
              toastMessage = `Settle payment: ${payload.data.from_name} paid ${payload.data.to_name} ${payload.data.currency} ${payload.data.amount}.`;
            }

            showLiveToast({
              title: '🔄 Ledger Synced',
              message: toastMessage,
              type: 'sync'
            });
          }
        } catch (err) {
          console.error('Error parsing WS frame:', err);
        }
      };

      socket.onclose = () => {
        console.log('WebSocket connection closed. Reconnecting in 3s...');
        reconnectTimeout = setTimeout(connect, 3000);
      };

      socket.onerror = (err) => {
        console.error('WebSocket connection error:', err);
        socket?.close();
      };
    };

    connect();

    return () => {
      if (socket) {
        socket.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [currentUser?.id, groups.length, activeGroupId]);

  // Synchronize dynamic client paths
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash || '#/';
      setCurrentPath(hash);
      
      // Parse group dynamic variables if applicable
      const groupMatch = hash.match(/^#\/groups\/([a-zA-Z0-9-]+)$/);
      if (groupMatch) {
        setActiveGroupId(groupMatch[1]);
      } else {
        const expenseMatch = hash.match(/^#\/groups\/([a-zA-Z0-9-]+)\/expenses\/new$/);
        const settleMatch = hash.match(/^#\/groups\/([a-zA-Z0-9-]+)\/settle$/);
        if (expenseMatch) {
          setActiveGroupId(expenseMatch[1]);
        } else if (settleMatch) {
          setActiveGroupId(settleMatch[1]);
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Run once initially

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Fetch current profile & load index variables if token is verified
  useEffect(() => {
    if (token) {
      localStorage.setItem('fairshare_token', token);
      fetchProfile();
      fetchGroups();
    } else {
      localStorage.removeItem('fairshare_token');
      setCurrentUser(null);
    }
  }, [token]);

  // Read matching group specifications when activeGroupId changes
  useEffect(() => {
    if (activeGroupId && token) {
      fetchDetailedGroup(activeGroupId);
    }
  }, [activeGroupId, token]);

  // Pre-populate receiver VPA / UPI ID when selected receiver changes
  useEffect(() => {
    if (settleReceiver && detailedGroup) {
      const rec = detailedGroup.members.find(m => m.user_id === settleReceiver);
      setSettleReceiverUpiField(rec?.upi_id || '');
    } else {
      setSettleReceiverUpiField('');
    }
  }, [settleReceiver, detailedGroup]);

  const navigateTo = (hash: string) => {
    window.location.hash = hash;
  };

  // Helper values to show custom currency formats
  const getSymbol = (code: string) => {
    switch (code) {
      case 'EUR': return '€';
      case 'INR': return '₹';
      case 'USD': return '$';
      case 'GBP': return '£';
      default: return code;
    }
  };

  // -----------------------------------------
  // REST API WRAPPERS
  // -----------------------------------------

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        if (data.user) {
          setProfileName(data.user.name || '');
          setProfileAvatarUrl(data.user.avatar_url || '');
          setProfileUpiId(data.user.upi_id || '');
          setProfileUpiQrUrl(data.user.upi_qr_url || '');
        }
      } else {
        // expired token
        setToken(null);
      }
    } catch (e) {
      console.error('Error fetching user meta', e);
    }
  };

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: profileName,
          avatar_url: profileAvatarUrl,
          upi_id: profileUpiId,
          upi_qr_url: profileUpiQrUrl
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        setProfileUpdateSuccess(true);
        setTimeout(() => setProfileUpdateSuccess(false), 3000);
        showLiveToast({
          title: 'Settings Synced',
          message: 'Your personal scanner and UPI details are now stored securely.',
          type: 'success'
        });
        setShowProfileSettings(false);
        if (activeGroupId) {
          fetchDetailedGroup(activeGroupId);
        }
      } else {
        const err = await res.json();
        showLiveToast({
          title: 'Update Failed',
          message: err.error || 'Failed to update payment profiles.',
          type: 'error'
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/groups', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
      }
    } catch (e) {
      console.error('Error loading groups list', e);
    }
  };

  const fetchDetailedGroup = async (gId: string) => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch(`/api/groups/${gId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDetailedGroup(data);
        
        // Fetch matching chat history
        fetchChatMessages(gId);
        
        // Populate standard default splits inputs
        setExpensePayer(token ? currentUser?.id || data.members[0]?.user_id : data.members[0]?.user_id);
        
        // Initialize splits structure with equal split value
        const initialSplits = data.members.map((m: any) => ({
          user_id: m.user_id,
          name: m.name,
          percentage: Number((100 / data.members.length).toFixed(2)),
          shares: 1,
          amount: 0
        }));
        setExpenseSplitsInput(initialSplits);
      } else {
        const err = await res.json();
        setApiError(err.error || 'Failed to download group files');
        navigateTo('#/dashboard');
      }
    } catch (e) {
      setApiError('Network connection failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setApiError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setCurrentUser(data.user);
        navigateTo('#/dashboard');
      } else {
        setApiError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setApiError('Connection failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setApiError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: registerName, email: registerEmail, password: registerPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setCurrentUser(data.user);
        navigateTo('#/dashboard');
      } else {
        setApiError(data.error || 'Email already exists or invalid entry');
      }
    } catch (err) {
      setApiError('Signing up failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const triggerSkipLogin = async () => {
    setAuthLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'alex@example.com', password: 'password' })
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setCurrentUser(data.user);
        navigateTo('#/dashboard');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCreateGroup = async (e: FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newGroupName,
          description: newGroupDesc,
          currency: newGroupCurrency
        })
      });

      if (res.ok) {
        const created = await res.json();
        setNewGroupName('');
        setNewGroupDesc('');
        setShowCreateGroup(false);
        fetchGroups();
        navigateTo(`#/groups/${created.id}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!groupId) return;
    const groupName = detailedGroup && detailedGroup.id === groupId ? detailedGroup.name : 'this group';
    
    triggerConfirm(
      'Delete Group Ledger',
      `⚠️ ARE YOU ABSOLUTELY SURE?\n\nThis will permanently delete the sharing group "${groupName}" along with all logged expenses, settlement history records, and analytical graphs.\n\nThis action cannot be undone.`,
      async () => {
        try {
          const res = await fetch(`/api/groups/${groupId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (res.ok) {
            showLiveToast({
              title: 'Group Deleted',
              message: `The group "${groupName}" has been permanently purged.`,
              type: 'success'
            });
            fetchGroups();
            navigateTo('#/');
          } else {
            const err = await res.json();
            showLiveToast({
              title: 'Deletion Failed',
              message: err.error || 'Failed to delete group.',
              type: 'error'
            });
          }
        } catch (e: any) {
          console.error(e);
          showLiveToast({
            title: 'Connection Error',
            message: 'Network error trying to delete group.',
            type: 'error'
          });
        }
      },
      'Yes, Purge Group'
    );
  };

  const handleInviteUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !activeGroupId) return;

    setInviteSuccess(null);
    setInviteError(null);
    try {
      const res = await fetch(`/api/groups/${activeGroupId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: inviteEmail, name: inviteName })
      });

      const data = await res.json();
      if (res.ok) {
        setInviteSuccess(`Successfully added ${data.user.name} directly to trip ledger!`);
        setInviteEmail('');
        setInviteName('');
        fetchDetailedGroup(activeGroupId);
      } else {
        setInviteError(data.error || 'Failed to add traveler');
      }
    } catch (err) {
      setInviteError('Networking failed. Please check your internet connection.');
    }
  };

  const fetchChatMessages = async (groupId: string) => {
    try {
      if (!token) return;
      const res = await fetch(`/api/groups/${groupId}/chats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data);
      }
    } catch (err) {
      console.error('Error loading group chats:', err);
    }
  };

  const handleSendMessage = async (msgText: string) => {
    try {
      if (!token || !activeGroupId) return;
      const res = await fetch(`/api/groups/${activeGroupId}/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: msgText })
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(prev => {
          if (prev.some(m => m.id === data.id)) return prev;
          return [...prev, data];
        });
      } else {
        const errData = await res.json();
        showLiveToast({
          title: 'Message Unsent',
          message: errData.error || 'Check access rights.',
          type: 'error'
        });
      }
    } catch (err) {
      console.error('Error sending chat message:', err);
    }
  };

  const handleDeleteMember = async (userId: string) => {
    if (!activeGroupId) return;

    triggerConfirm(
      'Remove Group Member',
      'Are you sure you want to remove this member from the sharing group ledger?',
      async () => {
        try {
          const res = await fetch(`/api/groups/${activeGroupId}/members/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            showLiveToast({
              title: 'Member Removed',
              message: 'This traveler was successfully removed from the group.',
              type: 'info'
            });
            fetchDetailedGroup(activeGroupId);
          } else {
            const err = await res.json();
            showLiveToast({
              title: 'Removal Failed',
              message: err.error || 'Failed to remove member.',
              type: 'error'
            });
          }
        } catch (e) {
          console.error(e);
        }
      },
      'Yes, Remove Member'
    );
  };

  // Pre-fill fields from AI parsed descriptions
  const handleAIParsed = (data: any) => {
    setExpenseTitle(data.title || '');
    setExpenseAmount(data.amount ? String(data.amount) : '');
    setExpenseCategory(mapToCategory(data.title || ''));
    if (data.currency) {
      setNewGroupCurrency(data.currency);
    }

    if (data.paid_by_id && detailedGroup) {
      // Find matching member
      const match = detailedGroup.members.find(m => m.user_id === data.paid_by_id);
      if (match) {
        setExpensePayer(match.user_id);
      }
    }

    // Adapt split details
    if (detailedGroup && data.participants && data.participants.length > 0) {
      const refreshedSplits = detailedGroup.members.map((m) => {
        const isIncluded = data.participants.includes(m.user_id);
        return {
          user_id: m.user_id,
          name: m.name,
          percentage: isIncluded ? Number((100 / data.participants.length).toFixed(2)) : 0,
          shares: isIncluded ? 1 : 0,
          amount: 0
        };
      });
      setExpenseSplitsInput(refreshedSplits);
      setExpenseSplitType(data.split_type || 'equal');
    }
  };

  // Pre-fill fields from Image vision scanned receipt details
  const handleVisionScanned = (data: any) => {
    setExpenseTitle(data.title || 'Receipt Scan');
    setExpenseAmount(data.amount ? String(data.amount) : '');
    setExpenseCategory('Utilities'); // Lodging & utilities categorizations

    // Concat detailed item listings if found for notes block!
    if (data.line_items && data.line_items.length > 0) {
      const itemsList = data.line_items.map((it: any) => `- ${it.name}: ${it.amount}`).join('\n');
      setExpenseNotes(`Extracted Line Items:\n${itemsList}`);
    }
  };

  const mapToCategory = (title: string): string => {
    const t = title.toLowerCase();
    if (t.includes('flight') || t.includes('uber') || t.includes('ticket') || t.includes('train') || t.includes('bus') || t.includes('cab')) return 'Travel';
    if (t.includes('dinner') || t.includes('food') || t.includes('pizza') || t.includes('gelato') || t.includes('trattoria') || t.includes('burger') || t.includes('coffee') || t.includes('starbucks')) return 'Food';
    if (t.includes('airbnb') || t.includes('hotel') || t.includes('stay') || t.includes('villa') || t.includes('rent')) return 'Utilities';
    if (t.includes('museum') || t.includes('disney') || t.includes('club') || t.includes('movie') || t.includes('show')) return 'Entertainment';
    if (t.includes('souvenir') || t.includes('gift') || t.includes('mall') || t.includes('dress') || t.includes('bag')) return 'Shopping';
    return 'Other';
  };

  // Split details computation helper on manual entry change
  const handleSplitValueChange = (userId: string, field: 'percentage' | 'shares' | 'amount', val: number) => {
    const nextSplits = expenseSplitsInput.map((s) => {
      if (s.user_id === userId) {
        return {
          ...s,
          [field]: val
        };
      }
      return s;
    });
    setExpenseSplitsInput(nextSplits);
  };

  const handleCreateExpense = async (e: FormEvent) => {
    e.preventDefault();
    if (!expenseTitle.trim() || !expenseAmount || Number(expenseAmount) <= 0 || !activeGroupId) {
      alert("Please provide expense title and matching positive total cost.");
      return;
    }

    try {
      // Map splits based on selected expenseSplitType model
      const inputMapping = expenseSplitsInput.map(s => {
        return {
          user_id: s.user_id,
          percentage: Number(s.percentage || 0),
          shares: Number(s.shares || 0),
          amount: Number(s.amount || 0)
        };
      });

      const res = await fetch(`/api/groups/${activeGroupId}/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: expenseTitle,
          amount: Number(expenseAmount),
          currency: detailedGroup?.currency,
          paid_by_user_id: expensePayer,
          split_type: expenseSplitType,
          category: expenseCategory,
          date: expenseDate,
          notes: expenseNotes,
          receipt_url: expenseReceiptUrl,
          splitsInput: inputMapping
        })
      });

      if (res.ok) {
        // Clear fields
        setExpenseTitle('');
        setExpenseAmount('');
        setExpenseNotes('');
        setExpenseReceiptUrl('');
        fetchDetailedGroup(activeGroupId);
        navigateTo(`#/groups/${activeGroupId}`);
      } else {
        const err = await res.json();
        alert("Failed to save expense: " + err.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteExpense = async (eId: string) => {
    triggerConfirm(
      'Delete Expense Entry',
      'Are you sure you want to delete this bill? This will permanently remove the logged expense and its corresponding splits from the ledger.',
      async () => {
        try {
          const res = await fetch(`/api/expenses/${eId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            showLiveToast({
              title: 'Expense Erased',
              message: 'The transaction has been successfully removed from the group ledger.',
              type: 'success'
            });
            if (activeGroupId) fetchDetailedGroup(activeGroupId);
          } else {
            const err = await res.json();
            showLiveToast({
              title: 'Deletion Failed',
              message: err.error || 'Failed to remove expense.',
              type: 'error'
            });
          }
        } catch (e) {
          console.error(e);
        }
      }
    );
  };

  const handleQuickSettleTrigger = (debt: SimplifiedDebt) => {
    setSettlePayer(debt.from_user_id);
    setSettleReceiver(debt.to_user_id);
    setSettleAmount(String(debt.amount));
    setSettleNote(`Settled up optimized balance`);
    navigateTo(`#/groups/${activeGroupId}/settle`);
  };

  const handleRecordSettlement = async (e?: FormEvent, bypassPopup = false) => {
    if (e) e.preventDefault();
    if (!settlePayer || !settleReceiver || !settleAmount || Number(settleAmount) <= 0 || !activeGroupId) {
      alert("Invalid payments settlement entries.");
      return;
    }

    const receiverMember = detailedGroup?.members?.find(m => m.user_id === settleReceiver);
    const hasUpi = receiverMember && (receiverMember.upi_id || receiverMember.upi_qr_url);

    // Trigger visual scanner popup if receiver has UPI set up, and bypass is false
    if (hasUpi && !bypassPopup) {
      setShowScannerPopup({
        payerName: detailedGroup?.members?.find(m => m.user_id === settlePayer)?.name || 'You',
        receiverName: receiverMember?.name || 'Recipent',
        upiId: receiverMember?.upi_id || '',
        upiQrUrl: receiverMember?.upi_qr_url || '',
        amount: Number(settleAmount),
        currency: detailedGroup?.currency || 'INR'
      });
      return;
    }

    try {
      const res = await fetch(`/api/groups/${activeGroupId}/settlements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          from_user_id: settlePayer,
          to_user_id: settleReceiver,
          amount: Number(settleAmount),
          currency: detailedGroup?.currency,
          method: hasUpi ? 'UPI' : settleMethod,
          note: settleNote
        })
      });

      if (res.ok) {
        setShowScannerPopup(null);
        fetchDetailedGroup(activeGroupId);
        navigateTo(`#/groups/${activeGroupId}`);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to settle accounts.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSignout = () => {
    setToken(null);
    navigateTo('#/');
  };

  // UI calculations metrics helpers
  const getSumOfSpends = (exps: Expense[]) => exps.reduce((acc, current) => acc + current.amount, 0);

  const getRecentActivities = () => {
    if (!detailedGroup) return [];
    
    // Combine logs
    const activities = [
      ...detailedGroup.expenses.map(e => ({
        type: 'expense' as const,
        title: `${e.paid_by_name} added "${e.title}"`,
        subtitle: `${getSymbol(e.currency)}${e.amount.toLocaleString()} - Category: ${e.category}`,
        date: e.created_at || e.date,
        icon: '💵',
        color: 'text-purple-400 bg-purple-500/10'
      })),
      ...detailedGroup.settlements.map(s => ({
        type: 'settle' as const,
        title: `${s.from_name} settled with ${s.to_name}`,
        subtitle: `Transferred ${getSymbol(s.currency)}${s.amount.toLocaleString()} via ${s.method}`,
        date: s.settled_at,
        icon: '🤝',
        color: 'text-green-400 bg-green-500/10'
      }))
    ];

    return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);
  };

  // Inline Category visualization builder
  const getCategoryWeights = (exps: Expense[]) => {
    const weights: { [cat: string]: number } = {};
    let total = 0;

    exps.forEach(e => {
      weights[e.category] = (weights[e.category] || 0) + e.amount;
      total += e.amount;
    });

    return Object.entries(weights).map(([category, amount]) => ({
      category,
      amount,
      pct: total > 0 ? Math.round((amount / total) * 100) : 0
    })).sort((a, b) => b.amount - a.amount);
  };

  // Color matching categorizations helper
  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Food': return { bg: 'bg-amber-500', text: 'text-amber-400', ring: 'ring-amber-500/10 bg-amber-500/10' };
      case 'Travel': return { bg: 'bg-purple-500', text: 'text-purple-400', ring: 'ring-purple-500/10 bg-purple-500/10' };
      case 'Entertainment': return { bg: 'bg-teal-500', text: 'text-teal-400', ring: 'ring-teal-500/10 bg-teal-500/10' };
      case 'Utilities': return { bg: 'bg-blue-500', text: 'text-blue-400', ring: 'ring-blue-500/10 bg-blue-500/10' };
      case 'Shopping': return { bg: 'bg-pink-500', text: 'text-pink-400', ring: 'ring-pink-500/10 bg-pink-500/10' };
      default: return { bg: 'bg-gray-500', text: 'text-gray-400', ring: 'ring-gray-500/10 bg-gray-500/10' };
    }
  };

  const renderNotificationTray = () => {
    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
      <div className="relative">
        {/* Toggle Button */}
        <button
          onClick={() => {
            setShowNotificationCenter(!showNotificationCenter);
            fetchNotifications();
          }}
          className="relative p-2 hover:bg-white/5 rounded-xl text-slate-450 hover:text-white transition cursor-pointer flex items-center justify-center border border-white/0 hover:border-white/5"
          title="Notifications Hub"
        >
          {unreadCount > 0 ? (
            <>
              <BellRing className="w-5 h-5 text-indigo-400 animate-pulse" />
              <span className="absolute -top-1 -right-1 w-4 h-3.5 bg-rose-550 text-white rounded-full text-[8px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            </>
          ) : (
            <Bell className="w-5 h-5" />
          )}
        </button>

        {/* Dropdown Container */}
        {showNotificationCenter && (
          <>
            <div 
              className="fixed inset-0 z-45" 
              onClick={() => setShowNotificationCenter(false)}
            />
            <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-[#121214] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
              {/* Header */}
              <div className="p-4 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
                <div>
                  <h4 className="font-display font-semibold text-xs uppercase tracking-wider text-white">Alerts & Sync</h4>
                  <p className="text-[10px] text-slate-500 font-mono">{unreadCount} unread currently</p>
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[10px] font-medium text-indigo-400 hover:text-indigo-305 transition hover:underline cursor-pointer"
                    >
                      Clear all
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotificationCenter(false)}
                    className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="max-h-96 overflow-y-auto divide-y divide-white/5">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <CheckCircle className="w-8 h-8 text-slate-650 mx-auto opacity-50" />
                    <p className="text-xs text-slate-400">All caught up! No recent alerts.</p>
                  </div>
                ) : (
                  notifications.map(n => {
                    let dotColor = 'bg-indigo-400';
                    if (n.type === 'settlement_paid') dotColor = 'bg-[#10b981]';
                    if (n.type === 'settlement_request') dotColor = 'bg-[#f59e0b]';
                    if (n.type === 'tagged_expense') dotColor = 'bg-[#a78bfa]';

                    return (
                      <div 
                        key={n.id}
                        onClick={() => {
                          if (!n.is_read) markAsRead(n.id);
                          setShowNotificationCenter(false);
                          if (n.group_id) {
                            navigateTo(`#/groups/${n.group_id}`);
                          }
                        }}
                        className={`p-4 hover:bg-white/[0.02] transition cursor-pointer text-left relative flex gap-3 ${!n.is_read ? 'bg-indigo-500/[0.02]' : ''}`}
                      >
                        {/* Status Icon Marker */}
                        <div className="mt-1 flex-shrink-0">
                          <span className={`flex w-2 h-2 rounded-full ${dotColor}`}></span>
                        </div>

                        {/* Content text */}
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <span className="text-xs font-semibold text-white leading-relaxed truncate block">
                              {n.title}
                            </span>
                            {!n.is_read && (
                              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full flex-shrink-0 mt-1"></span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 leading-normal break-words">
                            {n.message}
                          </p>
                          <div className="flex items-center justify-between pt-1 gap-2">
                            <span className="text-[9px] font-mono text-indigo-455 bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10 uppercase tracking-widest leading-none truncate">
                              {n.group_name || 'Group'}
                            </span>
                            <span className="text-[8px] font-mono text-slate-500 leading-none">
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderThemeToggle = () => {
    return (
      <button
        onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
        className="p-1.5 hover:bg-fog dark:hover:bg-fog/10 rounded-lg text-forest-ink transition-all cursor-pointer flex items-center justify-center"
        title={theme === 'light' ? 'Switch to Dark Theme' : 'Switch to Light Theme'}
      >
        {theme === 'light' ? (
          <Moon className="w-4.5 h-4.5" />
        ) : (
          <Sun className="w-4.5 h-4.5 text-lime-voltage" />
        )}
      </button>
    );
  };

  const renderActiveToast = () => {
    if (!activeToast) return null;
    return (
      <div className="fixed bottom-5 right-5 z-55 max-w-sm w-full bg-[#121214] border border-white/10 rounded-2xl shadow-2xl p-4 flex gap-3.5 items-start">
        <div className="mt-0.5 flex-shrink-0">
          {activeToast.type === 'error' ? (
            <span className="flex w-3.5 h-3.5 rounded-full bg-rose-500 animate-pulse"></span>
          ) : activeToast.type === 'success' || activeToast.type === 'settlement_paid' ? (
            <span className="flex w-3.5 h-3.5 rounded-full bg-emerald-500"></span>
          ) : activeToast.type === 'sync' ? (
            <span className="flex w-3.5 h-3.5 rounded-full bg-indigo-505"></span>
          ) : (
            <span className="flex w-3.5 h-3.5 rounded-full bg-indigo-400"></span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-semibold text-white uppercase tracking-wider">{activeToast.title}</h4>
          <p className="text-[11px] text-slate-400 mt-1 leading-normal leading-relaxed">{activeToast.message}</p>
        </div>
        <button 
          onClick={() => setActiveToast(null)}
          className="p-1 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  const renderScannerPopup = () => {
    if (!showScannerPopup) return null;
    const { payerName, receiverName, upiId, upiQrUrl, amount, currency } = showScannerPopup;
    const sSymbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : currency;

    const upiDeepLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(receiverName)}&am=${amount}&cu=${currency === 'INR' ? 'INR' : 'INR'}`;
    const generatedQr = upiQrUrl || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=8&data=${encodeURIComponent(upiDeepLink)}`;

    return (
      <div className="fixed inset-0 bg-forest-ink/75 flex items-center justify-center p-4 z-55 backdrop-blur-md select-auto text-forest-ink dark:text-forest-ink">
        <div className="bg-fog border-2 border-forest-ink/20 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative text-center">
          <button
            onClick={() => setShowScannerPopup(null)}
            className="absolute top-4 right-4 p-1.5 hover:bg-linen-mist rounded-lg text-slate hover:text-obsidian transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-12 h-12 bg-lime-voltage border border-forest-ink/15 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <QrCode className="w-6 h-6 text-forest-ink dark:text-spruce animate-pulse" />
          </div>

          <h3 className="font-sans font-extrabold text-sm uppercase tracking-wider text-obsidian">Instant UPI Payment Dispatcher</h3>
          <p className="text-[11px] text-charcoal max-w-xs mx-auto mt-1 mb-5">
            You are settling up with <strong>{receiverName}</strong>. Scan this QR code using Google Pay, PhonePe, Paytm, or any BHIM UPI application on your mobile device.
          </p>

          <div className="bg-paper p-4 rounded-xl border border-forest-ink/10 space-y-4 max-w-[280px] mx-auto shadow-md">
            <span className="text-[9px] font-mono tracking-widest uppercase font-bold text-slate block font-sans">
              Verified UPI Secure Transfer
            </span>
            
            <div className="p-2 bg-white rounded-lg inline-block border border-pebble/20">
              <img
                src={generatedQr}
                alt="Active UPI Scan code"
                referrerPolicy="no-referrer"
                className="w-44 h-44 object-contain mx-auto"
              />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-slate font-sans block">Transfer Amount</span>
              <h1 className="text-xl font-mono font-black text-obsidian tracking-tight">
                {sSymbol}{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h1>
            </div>
            
            <div className="pt-2.5 border-t border-forest-ink/5">
              <span className="text-[9px] text-slate uppercase font-bold tracking-wider block mb-0.5">Recipient VPA Address</span>
              <span className="text-[10px] font-mono text-forest-ink font-semibold bg-fog px-2.5 py-1 rounded-md border border-forest-ink/5 select-all inline-block break-all max-w-full">
                {upiId}
              </span>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-forest-ink/10 space-y-3.5">
            <div className="flex items-start gap-2 max-w-xs mx-auto text-[10px] text-charcoal leading-snug text-left bg-linen-mist/50 p-2.5 rounded-lg border border-forest-ink/5">
              <CheckCircle className="w-4 h-4 text-forest-ink flex-shrink-0 mt-0.5" />
              <span>
                Once scanned or dispatched, click <strong>"Done, Record Payment"</strong> below. FairShare will permanently log this settlement record in your shared ledger.
              </span>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowScannerPopup(null)}
                className="w-1/3 py-2 bg-paper hover:bg-fog text-[10px] uppercase tracking-wider font-bold rounded-full border border-forest-ink/10 text-slate cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRecordSettlement(undefined, true)}
                className="w-2/3 py-2 bg-lime-voltage hover:opacity-90 text-[10px] uppercase tracking-wider font-extrabold text-forest-ink border border-forest-ink/15 rounded-full cursor-pointer flex items-center justify-center gap-1"
              >
                <Check className="w-4 h-4" />
                Done, Record Payment
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderProfileSettingsModal = () => {
    if (!showProfileSettings) return null;
    return (
      <div className="fixed inset-0 bg-forest-ink/65 flex items-center justify-center p-4 z-50 backdrop-blur-sm select-auto">
        <div className="bg-fog dark:bg-fog border border-forest-ink/10 dark:border-white/10 rounded-[10px] p-6 max-w-lg w-full shadow-lg relative select-text">
          <button
            onClick={() => setShowProfileSettings(false)}
            className="absolute top-4 right-4 p-1.5 hover:bg-linen-mist rounded-lg text-slate -slate opacity-80 hover:text-obsidian transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <QrCode className="w-5 h-5 text-forest-ink dark:text-lime-voltage animate-pulse" />
            <h3 className="font-sans font-bold text-xs uppercase tracking-wider text-obsidian">My Profile & Payment Scanner</h3>
          </div>
          <p className="text-[11px] text-charcoal mb-5">
            Configure your personal identity and UPI/GPay addresses so friends can scan and pay you back instantly.
          </p>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] text-slate uppercase tracking-widest font-bold mb-1 block">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Your full name"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full bg-paper border border-forest-ink/12 rounded-[10px] py-2 px-3 text-xs text-obsidian focus:outline-none focus:ring-1 focus:ring-forest-ink"
                />
              </div>

              <div>
                <label className="text-[9px] text-slate uppercase tracking-widest font-bold mb-1 block">Profile Avatar URL</label>
                <input
                  type="text"
                  placeholder="URL to profile avatar"
                  value={profileAvatarUrl}
                  onChange={(e) => setProfileAvatarUrl(e.target.value)}
                  className="w-full bg-paper border border-forest-ink/12 rounded-[10px] py-2 px-3 text-xs text-obsidian focus:outline-none focus:ring-1 focus:ring-forest-ink font-mono"
                />
              </div>
            </div>

            <div className="bg-paper dark:bg-spruce/10 p-4 rounded-lg border border-forest-ink/5 dark:border-white/5 space-y-3.5 font-sans">
              <span className="text-[10px] font-bold uppercase tracking-wider text-forest-ink dark:text-lime-voltage block border-b border-forest-ink/5 dark:border-white/5 pb-1">
                UPI / GPay / PhonePe Scan Config
              </span>

              <div>
                <label className="text-[9px] text-slate uppercase tracking-widest font-bold mb-1 block">UPI ID / VPA Address</label>
                <input
                  type="text"
                  placeholder="E.g., name@okaxis, user@upi, googlepay@pay"
                  value={profileUpiId}
                  onChange={(e) => setProfileUpiId(e.target.value)}
                  className="w-full bg-paper border border-forest-ink/12 rounded-[10px] py-2 px-3 text-xs text-obsidian focus:outline-none focus:ring-1 focus:ring-forest-ink font-mono"
                />
                <span className="text-[9px] text-slate mt-1 block">
                  If provided, an automatic visual UPI QR Code will generate live for other users when they repay you.
                </span>
              </div>

              <div>
                <label className="text-[9px] text-slate uppercase tracking-widest font-bold mb-1 block">Backup Direct QR Image URL (Optional)</label>
                <input
                  type="text"
                  placeholder="E.g., custom uploads, cloud links..."
                  value={profileUpiQrUrl}
                  onChange={(e) => setProfileUpiQrUrl(e.target.value)}
                  className="w-full bg-paper border border-forest-ink/12 rounded-[10px] py-2 px-3 text-xs text-obsidian focus:outline-none focus:ring-1 focus:ring-forest-ink font-mono"
                />
              </div>

              {profileUpiId && (
                <div className="pt-3 border-t border-forest-ink/5 dark:border-white/5 flex items-center gap-4">
                  <div className="p-1 bg-white inline-block border border-pebble/20 rounded-md">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&margin=4&data=${encodeURIComponent(`upi://pay?pa=${profileUpiId}&pn=${profileName || 'Payee'}`)}`}
                      alt="Live Scanner Preview"
                      title="Live Verified UPI Setup Preview"
                      className="w-20 h-20"
                    />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="text-[10px] font-extrabold text-obsidian uppercase block">Live UPI Preview ready</span>
                    <span className="text-[9px] text-charcoal mt-0.5 block leading-tight">
                      Generates matching payment values during settlements instantly.
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowProfileSettings(false)}
                className="w-1/2 py-2 bg-paper hover:bg-fog text-[10px] uppercase tracking-wider font-bold rounded-full text-center border border-forest-ink/10 text-slate cursor-pointer"
              >
                Close Window
              </button>
              <button
                type="submit"
                className="w-1/2 py-2 bg-lime-voltage hover:opacity-90 text-[10px] uppercase tracking-wider font-extrabold text-forest-ink dark:text-spruce border border-forest-ink/15 rounded-full cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Save My Profile
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };


  // -----------------------------------------
  // PAGE RENDERERS
  // -----------------------------------------

  // Landing Page view
  if (currentPath === '#/' && !token) {
    return (
      <div className="min-h-screen bg-paper text-forest-ink antialiased">
        {/* Navigation Head */}
        <header className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between border-b border-forest-ink/10 sticky top-0 bg-paper/85 backdrop-blur-md z-40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-forest-ink/10 shadow-sm shrink-0">
              <img src="/favicon.svg" alt="FairShare" className="w-full h-full object-cover" />
            </div>
            <span className="font-sans font-black text-lg tracking-tight text-forest-ink uppercase">
              FairShare
            </span>
          </div>

          <div className="flex items-center gap-4">
            {renderThemeToggle()}
            <button
              onClick={() => navigateTo('#/login')}
              className="text-xs font-extrabold uppercase tracking-wider text-forest-ink hover:underline px-4 py-2 transition cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={() => navigateTo('#/register')}
              className="py-2 px-4 bg-lime-voltage hover:opacity-90 text-xs font-extrabold uppercase tracking-wider text-forest-ink dark:text-spruce rounded-full border border-forest-ink/15 transition cursor-pointer"
            >
              Join Free
            </button>
          </div>
        </header>

        {/* Hero Area */}
        <section className="max-w-5xl mx-auto px-6 pt-20 pb-24 text-center relative">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-wider text-forest-ink uppercase bg-linen-mist py-1.5 px-4 rounded-full border border-forest-ink/10 mb-8">
            <Coins className="w-3.5 h-3.5 text-forest-ink" />
            Intelligent Multi-Split Ledger System
          </span>

          <h1 className="font-sans text-4xl sm:text-7xl font-black tracking-tight text-forest-ink mb-6 uppercase leading-none max-w-4xl mx-auto">
            Bespoke Bill Sharing<br />
            <span className="bg-lime-voltage text-forest-ink dark:text-spruce px-4 py-1.5 inline-block transform -rotate-1 rounded-sm tracking-tight mt-3">
              Optimized for zero weight.
            </span>
          </h1>

          <p className="text-charcoal text-sm sm:text-base max-w-2xl mx-auto mb-10 mt-6 leading-relaxed font-sans">
            Invite friends, snap bills, type logs in plain text or write with absolute luxury. Our intelligent engine handles the conversions, parses line items, and simplifies complex debts instantly.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
            <button
               onClick={triggerSkipLogin}
               className="w-full py-3 px-6 bg-forest-ink dark:bg-lime-voltage text-lime-voltage dark:text-spruce font-extrabold text-xs uppercase tracking-wider rounded-full flex items-center justify-center gap-2 hover:opacity-95 transition-all cursor-pointer shadow-sm"
             >
               <Flame className="w-4 h-4 text-lime-voltage dark:text-spruce animate-pulse" />
               Skip to Demo Account
             </button>
            <button
              onClick={() => navigateTo('#/register')}
              className="w-full py-3 px-6 bg-fog hover:bg-linen-mist text-xs uppercase tracking-wider font-extrabold text-forest-ink border border-forest-ink/10 rounded-full transition"
            >
              Setup New Account
            </button>
          </div>

          {/* Value Bento grid overview */}
          <div className="mt-24 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
            <div className="p-6 rounded-[10px] border border-forest-ink/10 bg-fog">
              <div className="w-8 h-8 rounded-full bg-paper border border-forest-ink/10 text-forest-ink flex items-center justify-center mb-4 shadow-sm">
                <Calculator className="w-4 h-4" />
              </div>
              <h4 className="font-sans font-bold text-xs text-obsidian tracking-wide uppercase mb-1.5">No-Transaction Complexity</h4>
              <p className="text-[11px] text-charcoal leading-relaxed font-sans">
                Our greedy algorithm runs complex relational graphs and consolidates balances down to the absolute minimal transactions required.
              </p>
            </div>
            <div className="p-6 rounded-[10px] border border-forest-ink/10 bg-fog">
              <div className="w-8 h-8 rounded-full bg-paper border border-forest-ink/10 text-forest-ink flex items-center justify-center mb-4 shadow-sm">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h4 className="font-sans font-bold text-xs text-obsidian tracking-wide uppercase mb-1.5">Natural NLP Parsing</h4>
              <p className="text-[11px] text-charcoal leading-relaxed font-sans">
                Just type: "Rahul paid ₹450 for lunch Priya shared" and let our model map users, amounts, titles, and currencies immediately.
              </p>
            </div>
            <div className="p-6 rounded-[10px] border border-forest-ink/10 bg-fog">
              <div className="w-8 h-8 rounded-full bg-paper border border-forest-ink/10 text-forest-ink flex items-center justify-center mb-4 shadow-sm">
                <ImageIcon className="w-4 h-4" />
              </div>
              <h4 className="font-sans font-bold text-xs text-obsidian tracking-wide uppercase mb-1.5">Dual-mode Scan Receipts</h4>
              <p className="text-[11px] text-charcoal leading-relaxed font-sans">
                Drop your dinner bills directly inside the receipt vision model. Within seconds, line items are extracted cleanly for splits.
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // Auth pages view
  if ((currentPath === '#/login' || currentPath === '#/register') && !token) {
    const isLogin = currentPath === '#/login';
    return (
      <div className="min-h-screen bg-paper text-forest-ink flex items-center justify-center px-4 relative antialiased">
        <div className="absolute top-6 left-6 flex items-center gap-2 cursor-pointer" onClick={() => navigateTo('#/')}>
          <div className="w-8 h-8 rounded-xl overflow-hidden border border-forest-ink/10 shadow-sm shrink-0">
            <img src="/favicon.svg" alt="FairShare" className="w-full h-full object-cover" />
          </div>
          <span className="font-sans font-black text-sm text-forest-ink tracking-tight uppercase">FairShare</span>
        </div>

        <div className="absolute top-6 right-6">
          {renderThemeToggle()}
        </div>

        <div className="w-full max-w-sm bg-fog rounded-[10px] p-6 sm:p-8 border border-forest-ink/10 relative z-10 shadow-sm">
          <div className="text-center mb-6">
            <h2 className="font-sans text-xl font-bold text-obsidian mb-1.5 uppercase tracking-tight">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-[11px] text-charcoal">
              {isLogin ? 'Manage combined bills, trips, and balances' : 'Access natural language bill parsing and scanning'}
            </p>
          </div>

          {apiError && (
            <div className="mb-4 p-3 bg-alarm-red/10 border border-alarm-red/20 rounded-[10px] text-xs leading-relaxed text-alarm-red flex items-start gap-2 select-none animate-pulse">
              <span className="font-bold text-sm leading-none">⚠️</span>
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="text-[9px] text-slate uppercase tracking-widest font-bold mb-1 block">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-2.5 w-3.5 h-3.5 text-forest-ink/40" />
                  <input
                    type="text"
                    required
                    placeholder="E.g., Alex Mercer"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    className="w-full bg-paper border border-forest-ink/12 rounded-[10px] py-2 pl-9 pr-4 text-xs font-medium text-obsidian placeholder-pebble focus:outline-none focus:ring-1 focus:ring-forest-ink transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[9px] text-slate uppercase tracking-widest font-bold mb-1 block">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-forest-ink/40" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={isLogin ? loginEmail : registerEmail}
                  onChange={(e) => isLogin ? setLoginEmail(e.target.value) : setRegisterEmail(e.target.value)}
                  className="w-full bg-paper border border-forest-ink/12 rounded-[10px] py-2 pl-9 pr-4 text-xs font-medium text-obsidian placeholder-pebble focus:outline-none focus:ring-1 focus:ring-forest-ink transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-[9px] text-slate uppercase tracking-widest font-bold mb-1 block">Security Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-forest-ink/40" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={isLogin ? loginPassword : registerPassword}
                  onChange={(e) => isLogin ? setLoginPassword(e.target.value) : setRegisterPassword(e.target.value)}
                  className="w-full bg-paper border border-forest-ink/12 rounded-[10px] py-2 pl-9 pr-4 text-xs font-medium text-obsidian placeholder-pebble focus:outline-none focus:ring-1 focus:ring-forest-ink transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-2.5 bg-forest-ink dark:bg-lime-voltage hover:opacity-90 disabled:opacity-50 text-[11px] uppercase tracking-wider font-extrabold text-lime-voltage dark:text-spruce rounded-full flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              {authLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating session token...
                </>
              ) : (
                isLogin ? 'Sign In' : 'Sign Up Ledger'
              )}
            </button>
          </form>

          {/* Quick-Skip account preset for immediate sandbox test! */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-forest-ink/10"></div>
            </div>
            <div className="relative flex justify-center text-[9px] uppercase tracking-widest font-bold">
              <span className="bg-fog px-2.5 text-slate font-sans">Fast Demo Account</span>
            </div>
          </div>

          <button
            onClick={triggerSkipLogin}
            className="w-full py-2.5 px-4 bg-lime-voltage hover:opacity-90 text-[11px] uppercase tracking-wider font-extrabold text-forest-ink dark:text-spruce rounded-full flex items-center justify-center gap-1.5 border border-forest-ink/10 transition-all text-center cursor-pointer shadow-sm"
          >
            <Flame className="w-3.5 h-3.5 text-forest-ink dark:text-spruce animate-pulse" />
            Bypass Auth & Quick Login
          </button>

          <div className="text-center mt-5 text-[11px] text-charcoal">
            {isLogin ? "New to the platform?" : "Already registered?"} &nbsp;
            <button
              onClick={() => navigateTo(isLogin ? '#/register' : '#/login')}
              className="text-forest-ink hover:underline font-bold cursor-pointer"
            >
              {isLogin ? 'Create one now' : 'Sign in instead'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard Overview View
  if (currentPath === '#/dashboard' || (token && !activeGroupId)) {
    return (
      <div className="min-h-screen bg-paper text-forest-ink animate-fade-in antialiased font-sans">
        <header className="border-b border-forest-ink/10 bg-paper/85 p-4 sticky top-0 backdrop-blur-md z-40">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl overflow-hidden border border-forest-ink/10 shadow-sm shrink-0">
                <img src="/favicon.svg" alt="FairShare" className="w-full h-full object-cover" />
              </div>
              <span className="font-sans font-black text-sm tracking-tight text-forest-ink uppercase">FairShare</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2.5">
                <img
                  src={currentUser?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'}
                  alt={currentUser?.name}
                  className="w-7 h-7 rounded-full object-cover border border-forest-ink/10"
                />
                <div>
                  <h4 className="text-xs font-bold text-obsidian">{currentUser?.name}</h4>
                  <span className="text-[9px] text-slate font-mono font-bold uppercase">My Account</span>
                </div>
              </div>
              {renderNotificationTray()}
              {renderThemeToggle()}
              <button
                onClick={() => {
                  setProfileName(currentUser?.name || '');
                  setProfileAvatarUrl(currentUser?.avatar_url || '');
                  setProfileUpiId(currentUser?.upi_id || '');
                  setProfileUpiQrUrl(currentUser?.upi_qr_url || '');
                  setShowProfileSettings(true);
                }}
                className="p-1.5 hover:bg-fog rounded-lg text-slate hover:text-forest-ink transition cursor-pointer flex items-center justify-center animate-pulse"
                title="Google Pay / UPI Scanner & Profile Settings"
              >
                <QrCode className="w-4 h-4 text-forest-ink" />
              </button>
              <button
                onClick={handleSignout}
                className="p-1.5 hover:bg-fog rounded-lg text-slate hover:text-alarm-red transition cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          {/* Bento stats header */}
          <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4">

            <div className="bg-fog p-5 rounded-[10px] border border-forest-ink/10 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[9px] font-mono font-bold text-slate tracking-wider block uppercase mb-1">Active Ledger groups</span>
                <h3 className="font-sans text-xl font-extrabold text-obsidian">
                  {groups.length} Group{groups.length !== 1 ? 's' : ''}
                </h3>
                <span className="text-[10px] text-charcoal font-sans">tracking split expenses</span>
              </div>
              <div className="p-2.5 bg-paper text-forest-ink rounded-full border border-forest-ink/5 shadow-sm">
                <Users className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-fog p-5 rounded-[10px] border border-forest-ink/10 flex items-center justify-between shadow-sm h-full">
              <div className="h-full w-full flex flex-col justify-between">
                <span className="text-[9px] font-mono font-bold text-slate tracking-wider block uppercase mb-2">Configure space</span>
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="w-full text-left py-2 px-4 bg-forest-ink dark:bg-lime-voltage hover:opacity-90 font-extrabold tracking-wider uppercase text-[10px] text-white dark:text-spruce rounded-full transition flex items-center justify-between cursor-pointer"
                >
                  Create Bill Group
                  <Plus className="w-4 h-4 text-lime-voltage dark:text-spruce" />
                </button>
              </div>
            </div>
          </div>

          {/* Spending Trend Line Chart */}
          <SpendingTrendChart groups={groups} />

          {/* Create group dialog */}
          {showCreateGroup && (
            <div className="fixed inset-0 bg-forest-ink/65 flex items-center justify-center p-4 z-50 backdrop-blur-sm select-auto">
              <div className="bg-fog border border-forest-ink/10 rounded-[10px] p-6 max-w-md w-full shadow-lg relative select-text">
                <button
                  onClick={() => setShowCreateGroup(false)}
                  className="absolute top-4 right-4 p-1.5 hover:bg-linen-mist rounded-lg text-slate hover:text-obsidian transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                <h3 className="font-sans font-bold text-xs uppercase tracking-wider text-obsidian mb-1">Start Expense Space</h3>
                <p className="text-[11px] text-charcoal mb-5">Establish group categories (trips, events, household logs)</p>

                <form onSubmit={handleCreateGroup} className="space-y-4">
                  <div>
                    <label className="text-[9px] text-slate uppercase tracking-widest font-bold mb-1 block">Group Name</label>
                    <input
                      type="text"
                      required
                      placeholder="E.g., Europe Trip 2026, Rent Share..."
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="w-full bg-paper border border-forest-ink/12 rounded-[10px] py-2 px-3 text-xs text-obsidian placeholder-pebble focus:outline-none focus:ring-1 focus:ring-forest-ink"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] text-slate uppercase tracking-widest font-bold mb-1 block">Description</label>
                    <textarea
                      placeholder="What is this group split for?"
                      value={newGroupDesc}
                      onChange={(e) => setNewGroupDesc(e.target.value)}
                      className="w-full bg-paper border border-forest-ink/12 rounded-[10px] py-2 px-3 h-16 text-xs text-obsidian placeholder-pebble focus:outline-none focus:ring-1 focus:ring-forest-ink resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] text-slate uppercase tracking-widest font-bold mb-1 block">Base Group Currency</label>
                    <select
                      value={newGroupCurrency}
                      onChange={(e) => setNewGroupCurrency(e.target.value)}
                      className="w-full bg-paper border border-forest-ink/12 rounded-[10px] py-2 px-3 text-xs text-obsidian focus:outline-none focus:ring-1 focus:ring-forest-ink cursor-pointer"
                    >
                      <option value="EUR">€ - Euro (EUR)</option>
                      <option value="INR">₹ - Indian Rupee (INR)</option>
                      <option value="USD">$ - Dollar (USD)</option>
                      <option value="GBP">£ - British Pound (GBP)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-forest-ink dark:bg-lime-voltage hover:opacity-90 font-extrabold uppercase tracking-wider text-[11px] text-lime-voltage dark:text-spruce rounded-full transition cursor-pointer"
                  >
                    Establish Group
                  </button>
                </form>
              </div>
            </div>
          )}

          {renderProfileSettingsModal()}

          {/* Main groups panel */}
          <div className="mb-6 flex justify-between items-center bg-fog p-3.5 rounded-[10px] border border-forest-ink/5">
            <h2 className="font-sans text-xs font-bold uppercase tracking-wider text-obsidian flex items-center gap-2">
              <Users className="w-4 h-4 text-forest-ink" />
              Shared Bill Groups
            </h2>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="py-1.5 px-3 bg-lime-voltage border border-forest-ink/15 text-forest-ink dark:text-spruce hover:opacity-90 text-[10px] uppercase tracking-wider font-extrabold rounded-full flex items-center gap-1 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              New Group
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {groups.map((g) => {
              const membersList = g.members || [];
              return (
                <div
                  key={g.id}
                  onClick={() => navigateTo(`#/groups/${g.id}`)}
                  className="bg-paper border border-forest-ink/5 hover:border-forest-ink/15 transition-all p-5 rounded-[10px] flex flex-col justify-between cursor-pointer group hover:bg-fog/30"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-mono text-forest-ink bg-linen-mist px-2 py-0.5 rounded-full border border-forest-ink/10 font-bold">
                        {g.currency}
                      </span>
                      <span className="text-[9px] text-slate font-mono font-bold">
                        {new Date(g.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="font-sans font-bold text-sm text-obsidian group-hover:text-forest-ink transition-colors mb-2">
                      {g.name}
                    </h3>

                    <p className="text-xs text-charcoal line-clamp-2 h-8 leading-relaxed mb-4">
                      {g.description || 'No description listed.'}
                    </p>
                  </div>

                  <div className="border-t border-forest-ink/5 pt-4 flex items-center justify-between">
                    {/* Avatars pile */}
                    <div className="flex items-center -space-x-1.5 overflow-hidden">
                      {membersList.slice(0, 4).map((m: any, idx: number) => {
                        return (
                          <img
                            key={idx}
                            src={m.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${m.name}`}
                            alt={m.name}
                            className="inline-block h-6 w-6 rounded-full ring-2 ring-paper object-cover"
                            title={m.name}
                          />
                        );
                      })}
                      {membersList.length > 4 && (
                        <div className="inline-block h-6 w-6 rounded-full ring-2 ring-paper bg-linen-mist text-[8px] font-bold text-forest-ink flex items-center justify-center">
                          +{membersList.length - 4}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center text-xs text-forest-ink font-bold gap-0.5 group-hover:translate-x-1 transition-transform">
                      View ledger
                      <ChevronRight className="w-3.5 h-3.5 text-forest-ink" />
                    </div>
                  </div>
                </div>
              );
            })}

            {groups.length === 0 && (
              <div className="col-span-full text-center py-16 bg-fog border border-dashed border-forest-ink/10 rounded-[10px] p-6 flex flex-col items-center justify-center">
                <Users className="w-12 h-12 text-slate mb-3" />
                <h3 className="font-sans font-bold text-obsidian uppercase tracking-wider text-xs">No Sharing Groups Found</h3>
                <p className="text-xs text-charcoal max-w-sm mt-1 mb-5 font-sans">
                  To split restaurant bills, household rents, or flight tickets with friends, establish your first shared group space!
                </p>
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="py-2.5 px-5 bg-lime-voltage hover:opacity-90 text-xs font-extrabold uppercase tracking-wider text-forest-ink dark:text-spruce rounded-full border border-forest-ink/15 shadow-sm transition"
                >
                  <Plus className="w-4 h-4" />
                  Establish Initial Group
                </button>
              </div>
            )}
          </div>
        </main>
        {renderActiveToast()}
        {renderScannerPopup()}
      </div>
    );
  }

  // Group detailed routing screen
  if (detailedGroup && activeGroupId && currentPath === `#/groups/${activeGroupId}`) {
    const recentActivities = getRecentActivities();
    const categoriesPieList = getCategoryWeights(detailedGroup.expenses);

    return (
      <div className="min-h-screen bg-paper text-forest-ink antialiased font-sans">
        {/* Navigation Head */}
        <header className="border-b border-forest-ink/10 bg-paper/85 p-4 sticky top-0 backdrop-blur-md z-45 flex items-center gap-4">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigateTo('#/dashboard')}
                className="p-1.5 hover:bg-fog rounded-lg text-slate hover:text-forest-ink transition cursor-pointer"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-4.5 h-4.5" />
              </button>

              <div className="border-l border-forest-ink/10 pl-4">
                <h3 className="font-sans font-extrabold text-sm uppercase tracking-tight text-obsidian flex items-center gap-2">
                  {detailedGroup.name}
                  <span className="text-[9px] font-mono font-extrabold bg-linen-mist text-forest-ink border border-forest-ink/10 py-0.5 px-2 rounded-full">
                    {detailedGroup.currency}
                  </span>
                </h3>
                <p className="text-xs text-charcoal line-clamp-1">{detailedGroup.description || 'No description provided'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {renderNotificationTray()}
              {renderThemeToggle()}
              <button
                onClick={() => {
                  setProfileName(currentUser?.name || '');
                  setProfileAvatarUrl(currentUser?.avatar_url || '');
                  setProfileUpiId(currentUser?.upi_id || '');
                  setProfileUpiQrUrl(currentUser?.upi_qr_url || '');
                  setShowProfileSettings(true);
                }}
                className="p-1.5 hover:bg-fog rounded-lg text-slate hover:text-forest-ink transition cursor-pointer flex items-center justify-center"
                title="Google Pay / UPI Scanner & Profile Settings"
              >
                <QrCode className="w-4 h-4 text-forest-ink" />
              </button>
              <button
                onClick={() => exportGroupLedgerToPDF(detailedGroup.name, detailedGroup.currency, detailedGroup.expenses)}
                disabled={detailedGroup.expenses.length === 0}
                title="Export Group Ledger as PDF Statement"
                className="p-1.5 hover:bg-fog dark:hover:bg-fog/10 rounded-lg text-slate hover:text-forest-ink dark:hover:text-lime-voltage transition cursor-pointer disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <Printer className="w-4.5 h-4.5" />
              </button>
              <button
                onClick={() => handleDeleteGroup(activeGroupId)}
                title="Permanently Delete This Sharing Group"
                className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-slate hover:text-red-500 dark:hover:text-red-400 transition cursor-pointer"
              >
                <Trash2 className="w-4.5 h-4.5" />
              </button>
              <button
                onClick={() => navigateTo(`#/groups/${activeGroupId}/expenses/new`)}
                className="py-1.5 px-3.5 bg-forest-ink dark:bg-lime-voltage hover:opacity-90 text-[10px] uppercase tracking-wider font-extrabold text-lime-voltage dark:text-spruce rounded-full flex items-center gap-1.5 border border-forest-ink/15 transition shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4 text-lime-voltage dark:text-spruce" />
                Record Bill
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          {/* Quick Stats overview panel */}
          <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-fog p-5 rounded-[10px] border border-forest-ink/10 relative overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 p-3 opacity-5">
                <TrendingUp className="w-20 h-20 text-forest-ink" />
              </div>
              <span className="text-[9px] uppercase font-mono tracking-wider font-bold text-slate block mb-1">Combined Expense Pool</span>
              <h2 className="font-sans text-xl font-extrabold text-obsidian">
                {getSymbol(detailedGroup.currency)}{getSumOfSpends(detailedGroup.expenses).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
              <span className="text-[10px] font-mono text-charcoal">Across {detailedGroup.expenses.length} bills detailed</span>
            </div>

            {/* Dynamic category high bar */}
            <div className="bg-fog p-5 rounded-[10px] border border-forest-ink/10 shadow-sm">
              <span className="text-[9px] uppercase font-mono tracking-wider font-bold text-slate block mb-1">Top Category segment</span>
              {categoriesPieList.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="font-sans text-xs uppercase tracking-wider font-bold text-obsidian flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${getCategoryColor(categoriesPieList[0].category).bg}`}></span>
                      {categoriesPieList[0].category}
                    </h3>
                    <span className="text-[11px] text-charcoal font-mono font-bold">
                      {categoriesPieList[0].pct}% ({getSymbol(detailedGroup.currency)}{categoriesPieList[0].amount.toLocaleString()})
                    </span>
                  </div>
                  {/* Progress Line */}
                  <div className="w-full bg-linen-mist h-1.5 rounded-full overflow-hidden border border-forest-ink/5">
                    <div 
                      className={`h-full rounded-full ${getCategoryColor(categoriesPieList[0].category).bg}`}
                      style={{ width: `${categoriesPieList[0].pct}%` }}
                    />
                  </div>
                </>
              ) : (
                <div className="text-xs text-charcoal py-3 font-mono">No category data logged.</div>
              )}
            </div>

            {/* Members ledger */}
            <div className="bg-fog p-4 rounded-[10px] border border-forest-ink/10 shadow-sm">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[9px] uppercase font-mono tracking-widest font-bold text-slate border-forest-ink/10">Invite new traveler</span>
              </div>
              <form onSubmit={handleInviteUser} className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="friend@email.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1 bg-paper border border-forest-ink/12 rounded-[10px] px-3 py-1.5 text-xs text-obsidian placeholder-pebble focus:ring-1 focus:ring-forest-ink focus:outline-none"
                />
                <button
                  type="submit"
                  className="py-1.5 px-3 bg-forest-ink dark:bg-lime-voltage hover:opacity-90 font-extrabold text-xs text-lime-voltage dark:text-spruce border border-forest-ink/15 rounded-full shrink-0 cursor-pointer"
                >
                  Invite
                </button>
              </form>
              {inviteSuccess && (
                <div className="mt-1.5 text-[10px] text-forest-ink font-bold">✓ {inviteSuccess}</div>
              )}
              {inviteError && (
                <div className="mt-1.5 text-[10px] text-alarm-red font-bold">⚠️ {inviteError}</div>
              )}
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-forest-ink animate-spin" />
            </div>
          )}

          {!loading && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Group Expenses List */}
              <div className="lg:col-span-7 space-y-6">
                <div className="flex justify-between items-center border-b border-forest-ink/10 pb-3">
                  <h3 className="font-sans text-xs uppercase tracking-widest font-extrabold text-obsidian flex items-center gap-2">
                    <CreditCard className="w-4.5 h-4.5 text-forest-ink" />
                    Bill Register ({detailedGroup.expenses.length})
                  </h3>
                  <button
                    onClick={() => exportGroupLedgerToPDF(detailedGroup.name, detailedGroup.currency, detailedGroup.expenses)}
                    disabled={detailedGroup.expenses.length === 0}
                    className="flex items-center gap-1.5 py-1 px-3 bg-linen-mist dark:bg-forest-ink/20 hover:opacity-90 disabled:opacity-40 text-[10px] font-mono font-bold uppercase tracking-wider text-forest-ink dark:text-lime-voltage rounded-full border border-forest-ink/10 transition cursor-pointer"
                    title="Export all group expenses as a PDF document"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Export PDF
                  </button>
                </div>

                <div className="space-y-4">
                  {detailedGroup.expenses.map((exp) => {
                    const sym = getSymbol(exp.currency);
                    return (
                      <div
                        key={exp.id}
                        className="p-4 bg-paper rounded-[10px] border border-forest-ink/5 hover:border-forest-ink/15 transition-all flex items-start justify-between gap-4 shadow-sm"
                      >
                        <div className="flex items-start gap-3.5">
                          {/* Visual category dot */}
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border border-forest-ink/10 bg-fog`}>
                            <span className="text-sm">{exp.category === 'Food' ? '🍔' : exp.category === 'Travel' ? '✈️' : exp.category === 'Entertainment' ? '🎟️' : exp.category === 'Shopping' ? '🛍️' : exp.category === 'Utilities' ? '🏠' : '📦'}</span>
                          </div>

                          <div>
                            <h4 className="font-bold text-sm text-obsidian leading-tight">
                              {exp.title}
                            </h4>
                            {/* Meta */}
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-charcoal font-mono font-medium">
                              <span>Paid by <strong className="text-forest-ink font-mono font-extrabold">{exp.paid_by_name}</strong></span>
                              <span>•</span>
                              <span>{new Date(exp.date).toLocaleDateString()}</span>
                              <span>•</span>
                              <span className="text-[10px] bg-linen-mist border border-forest-ink/10 px-1.5 py-0.5 rounded-full font-mono uppercase text-forest-ink">
                                {exp.split_type} split
                              </span>
                            </div>

                            {/* Splits breakdown summary */}
                            {exp.splits && exp.splits.length > 0 && (
                              <div className="mt-2.5 pt-2 border-t border-forest-ink/5 flex flex-wrap gap-2 text-[10px] text-charcoal font-sans">
                                <span className="font-bold text-[9px] uppercase tracking-wider text-slate font-mono">Splits:</span>
                                {exp.splits.map((sp) => {
                                  return (
                                    <span key={sp.id} className="bg-fog px-2.5 py-0.5 rounded-full border border-forest-ink/10 font-mono text-[9px] text-forest-ink">
                                      {sp.name}: {sym}{sp.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  );
                                })}
                              </div>
                            )}

                            {exp.notes && (
                              <p className="mt-2 text-[11px] font-mono text-charcoal bg-fog p-2 rounded-lg border border-forest-ink/10 whitespace-pre-wrap">
                                {exp.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Amount & action controls */}
                        <div className="text-right flex flex-col items-end shrink-0 justify-between h-full">
                          <span className="text-base font-extrabold font-mono text-obsidian">
                            {sym}{exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          
                          <div className="flex items-center gap-1.5 mt-4">
                            <button
                              onClick={() => exportSingleExpenseToPDF(exp, detailedGroup.name)}
                              title="Export Expense Receipt to PDF"
                              className="p-1 text-slate hover:text-forest-ink dark:hover:text-lime-voltage hover:bg-forest-ink/5 dark:hover:bg-lime-voltage/5 rounded transition cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteExpense(exp.id)}
                              title="Delete Expense"
                              className="p-1 text-slate hover:text-alarm-red hover:bg-alarm-red/10 rounded transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {detailedGroup.expenses.length === 0 && (
                    <div className="text-center py-12 p-6 border border-dashed border-forest-ink/10 rounded-[10px] bg-fog flex flex-col items-center justify-center shadow-sm">
                      <Calculator className="w-10 h-10 text-slate mb-2" />
                      <h4 className="font-sans font-bold text-obsidian uppercase tracking-wider text-xs">Register is empty</h4>
                      <p className="text-xs text-charcoal mt-0.5 mb-4 max-w-sm">
                        Keep tabs on every meal, flight, or hotel share by adding a beautiful structured bill now.
                      </p>
                      <button
                        onClick={() => navigateTo(`#/groups/${activeGroupId}/expenses/new`)}
                        className="py-1.5 px-3.5 bg-lime-voltage hover:opacity-90 font-extrabold uppercase tracking-wider text-[10px] text-forest-ink dark:text-spruce border border-forest-ink/15 rounded-full cursor-pointer shadow-sm"
                      >
                        Log Initial Expense
                      </button>
                    </div>
                  )}
                </div>

                {/* Sub Tab: Recent Historical Audit Activity */}
                <div className="mt-8 border-t border-forest-ink/10 pt-6">
                  <h3 className="font-sans font-bold text-xs text-charcoal uppercase tracking-widest mb-4 flex items-center gap-1.5 border-b border-forest-ink/10 pb-2">
                    <History className="w-4 h-4 text-forest-ink" />
                    Activity Log Timeline
                  </h3>
                  <div className="space-y-3">
                    {recentActivities.map((act, idx) => {
                      return (
                        <div key={idx} className="flex gap-3 text-xs leading-relaxed">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 border border-forest-ink/10 bg-fog text-xs">
                            <span>{act.icon}</span>
                          </div>
                          <div>
                            <span className="text-obsidian font-bold block">{act.title}</span>
                            <span className="text-slate font-mono text-[9px] block">{act.subtitle}</span>
                          </div>
                        </div>
                      );
                    })}

                    {recentActivities.length === 0 && (
                      <div className="text-xs font-mono text-charcoal">No activity recorded logs.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Calculations Sidebars, Balances and optimizations */}
              <div className="lg:col-span-5 space-y-5">
                {/* Tabs switcher bar */}
                <div className="bg-fog border border-forest-ink/10 rounded-full p-1 flex">
                  <button
                    onClick={() => setSidebarTab('settlement')}
                    className={`flex-1 py-1.5 text-center text-[10px] uppercase font-extrabold tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      sidebarTab === 'settlement'
                        ? 'bg-forest-ink dark:bg-lime-voltage text-lime-voltage dark:text-spruce shadow-sm border border-forest-ink/5'
                        : 'text-slate hover:text-forest-ink hover:bg-linen-mist'
                    }`}
                  >
                    <Coins className="w-3.5 h-3.5" />
                    Ledger
                  </button>
                  <button
                    onClick={() => setSidebarTab('chats')}
                    className={`flex-1 py-1.5 text-center text-[10px] uppercase font-extrabold tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      sidebarTab === 'chats'
                        ? 'bg-forest-ink dark:bg-lime-voltage text-lime-voltage dark:text-spruce shadow-sm border border-forest-ink/5'
                        : 'text-slate hover:text-forest-ink hover:bg-linen-mist'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Chats
                  </button>
                  <button
                    onClick={() => setSidebarTab('advisor')}
                    className={`flex-1 py-1.5 text-center text-[10px] uppercase font-extrabold tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      sidebarTab === 'advisor'
                        ? 'bg-forest-ink dark:bg-lime-voltage text-lime-voltage dark:text-spruce shadow-sm border border-forest-ink/5'
                        : 'text-slate hover:text-forest-ink hover:bg-linen-mist'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    Ledger Insights
                  </button>
                </div>

                {/* Render active Tab Panel */}
                <div className="space-y-5">
                  {sidebarTab === 'settlement' && (
                    <>
                      {/* 1. Balance visual mapping */}
                      <BalanceCard balances={detailedGroup.balances} baseCurrency={detailedGroup.currency} />

                      {/* 2. Debt simplified network mappings */}
                      <DebtGraph 
                        debts={detailedGroup.simplifiedDebts} 
                        baseCurrency={detailedGroup.currency} 
                        onQuickSettle={handleQuickSettleTrigger}
                        onPingRequest={(debt) => requestSettlement(debt.from_user_id, debt.amount)}
                        currentUserId={currentUser?.id}
                      />
                    </>
                  )}

                  {sidebarTab === 'chats' && (
                    <GroupChat 
                      groupId={detailedGroup.id} 
                      token={token} 
                      currentUser={currentUser} 
                      messages={chatMessages} 
                      onSendMessage={handleSendMessage} 
                    />
                  )}

                  {sidebarTab === 'advisor' && (
                    <InsightsChat groupId={detailedGroup.id} token={token} />
                  )}
                </div>

                {/* Group members directory */}
                <div className="bg-fog p-4 rounded-[10px] border border-forest-ink/10 shadow-sm">
                  <h4 className="font-sans text-[9px] font-bold uppercase tracking-widest text-slate mb-3 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-forest-ink" />
                    Safe members registry
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {detailedGroup.members.map((m) => {
                      const isOwner = m.role === 'owner';
                      return (
                        <div key={m.id} className="flex items-center gap-2 p-2 rounded-lg bg-paper border border-forest-ink/8 justify-between group">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <img
                              src={m.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${m.name}`}
                              alt={m.name}
                              className="w-5.5 h-5.5 rounded-full object-cover shrink-0"
                            />
                            <div className="truncate">
                              <span className="text-obsidian font-extrabold block leading-none text-[11px]">{m.name.split(' ')[0]}</span>
                              <span className="text-[9px] text-forest-ink font-mono font-bold leading-none block uppercase">{isOwner ? 'Leader' : 'SPLITTER'}</span>
                            </div>
                          </div>

                          {!isOwner && currentUser?.id !== m.user_id && (
                            <button
                              onClick={() => handleDeleteMember(m.user_id)}
                              title="Remove member"
                              className="text-slate hover:text-alarm-red hover:bg-alarm-red/10 p-0.5 rounded opacity-0 group-hover:opacity-100 transition cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
        {renderActiveToast()}
        {renderProfileSettingsModal()}
        {renderScannerPopup()}
      </div>
    );
  }

  // Create Expense view
  if (detailedGroup && activeGroupId && currentPath === `#/groups/${activeGroupId}/expenses/new`) {
    const sSymbol = getSymbol(detailedGroup.currency);
    return (
      <div className="min-h-screen bg-paper text-forest-ink font-sans antialiased">
        <header className="border-b border-forest-ink/10 bg-paper/85 p-4 sticky top-0 backdrop-blur-md z-45 flex items-center justify-between">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigateTo(`#/groups/${activeGroupId}`)}
                className="p-1.5 hover:bg-fog rounded-lg text-slate-400 hover:text-forest-ink transition cursor-pointer"
              >
                <ArrowLeft className="w-4.5 h-4.5" />
              </button>
              <div className="border-l border-forest-ink/10 pl-4">
                <h3 className="font-sans font-extrabold text-sm uppercase tracking-wider text-obsidian">Log Multi-Split Expense</h3>
                <p className="text-xs text-charcoal">{detailedGroup.name}</p>
              </div>
            </div>
            {renderThemeToggle()}
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            
            {/* Left NLP/Vision assistances column */}
            <div className="md:col-span-12 lg:col-span-5 space-y-6">
              <AIParseInput groupId={activeGroupId} onParsed={handleAIParsed} token={token} />
              <ReceiptUploader groupId={activeGroupId} token={token} onScanned={handleVisionScanned} />
            </div>

            {/* Right Form column core values */}
            <form onSubmit={handleCreateExpense} className="md:col-span-12 lg:col-span-7 bg-fog p-6 rounded-[10px] border border-forest-ink/10 shadow-sm space-y-4">
              <h3 className="font-sans font-bold text-xs text-obsidian uppercase tracking-widest border-b border-forest-ink/10 pb-2 mb-4">
                Structured Expense Information
              </h3>

              <div>
                <label className="text-[9px] text-slate uppercase tracking-widest font-bold mb-1 block">Expense Title Merchant</label>
                <input
                  type="text"
                  required
                  placeholder="E.g., Flight Tickets, Trattoria Restaurant Dinner"
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                  className="w-full bg-paper border border-forest-ink/12 rounded-[10px] py-2 px-3 text-xs text-obsidian placeholder-pebble focus:outline-none focus:ring-1 focus:ring-forest-ink"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] text-slate uppercase tracking-widest font-bold mb-1 block">Total Cost ({detailedGroup.currency})</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-mono font-bold text-slate">{sSymbol}</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      className="w-full bg-paper border border-forest-ink/12 rounded-[10px] py-2 pl-7 pr-3 text-xs font-mono font-bold text-obsidian focus:outline-none focus:ring-1 focus:ring-forest-ink"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] text-slate uppercase tracking-widest font-bold mb-1 block">Category</label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full bg-paper border border-forest-ink/12 rounded-[10px] py-2 px-3 text-xs text-obsidian focus:outline-none focus:ring-1 focus:ring-forest-ink cursor-pointer"
                  >
                    <option value="Food">Food (🍔)</option>
                    <option value="Travel">Travel (✈️)</option>
                    <option value="Entertainment">Entertainment (🎟️)</option>
                    <option value="Utilities">Accommodation (🏠)</option>
                    <option value="Shopping">Shopping (🛍️)</option>
                    <option value="Other">Other (📦)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] text-slate uppercase tracking-widest font-bold mb-1 block">Expense Date</label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full bg-paper border border-forest-ink/12 rounded-[10px] py-2 px-3 text-xs text-obsidian focus:outline-none focus:ring-1 focus:ring-forest-ink"
                  />
                </div>

                <div>
                  <label className="text-[9px] text-slate uppercase tracking-widest font-bold mb-1 block">Paid By</label>
                  <select
                    value={expensePayer}
                    onChange={(e) => setExpensePayer(e.target.value)}
                    className="w-full bg-paper border border-forest-ink/12 rounded-[10px] py-2 px-3 text-xs text-obsidian focus:outline-none focus:ring-1 focus:ring-forest-ink cursor-pointer"
                  >
                    {detailedGroup.members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Split Distribution logic section */}
              <div className="p-4 rounded-[10px] bg-paper border border-forest-ink/10 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="text-[9px] font-bold text-obsidian uppercase tracking-wider font-sans">Split Method</span>
                  <div className="flex gap-1">
                    {(['equal', 'percentage', 'shares', 'custom'] as const).map((mode) => {
                      return (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => {
                            setExpenseSplitType(mode);
                          }}
                          className={`text-[9px] px-2.5 py-1 font-bold rounded-full uppercase tracking-wider transition-all border ${
                            expenseSplitType === mode 
                              ? 'bg-forest-ink dark:bg-lime-voltage text-lime-voltage dark:text-spruce border-forest-ink/5' 
                              : 'bg-fog text-slate border-forest-ink/10 hover:text-forest-ink'
                          }`}
                        >
                          {mode}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sub Splits items loop input configuration based on type */}
                <div className="space-y-2 pt-3 border-t border-forest-ink/10 text-xs">
                  {expenseSplitsInput.map((sp) => {
                    return (
                      <div key={sp.user_id} className="flex items-center justify-between gap-4 p-2 rounded-lg bg-fog border border-forest-ink/8">
                        <span className="font-extrabold text-obsidian text-xs">{sp.name}</span>

                        {expenseSplitType === 'equal' && (
                          <div className="text-[10px] text-charcoal font-sans">
                            Shares equally in expense pool
                          </div>
                        )}

                        {expenseSplitType === 'percentage' && (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={sp.percentage || 0}
                              onChange={(e) => handleSplitValueChange(sp.user_id, 'percentage', Number(e.target.value))}
                              className="w-16 bg-paper border border-forest-ink/10 rounded px-2 py-0.5 text-xs text-right font-mono text-obsidian"
                            />
                            <span className="text-[10px] text-charcoal font-bold">%</span>
                          </div>
                        )}

                        {expenseSplitType === 'shares' && (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              value={sp.shares || 0}
                              onChange={(e) => handleSplitValueChange(sp.user_id, 'shares', Number(e.target.value))}
                              className="w-16 bg-paper border border-forest-ink/10 rounded px-2 py-0.5 text-xs text-right font-mono text-obsidian"
                            />
                            <span className="text-[10px] text-charcoal font-bold">shares</span>
                          </div>
                        )}

                        {expenseSplitType === 'custom' && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono font-bold text-slate">{sSymbol}</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={sp.amount || 0}
                              onChange={(e) => handleSplitValueChange(sp.user_id, 'amount', Number(e.target.value))}
                              className="w-20 bg-paper border border-forest-ink/10 rounded px-2 py-0.5 text-xs text-right font-mono text-obsidian"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-[9px] text-slate uppercase tracking-widest font-bold mb-1 block">Additional Notes</label>
                <textarea
                  placeholder="Items list, flight numbers, receipt details..."
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  className="w-full bg-paper border border-forest-ink/12 rounded-[10px] p-3 h-16 text-xs text-obsidian placeholder-pebble focus:outline-none focus:ring-1 focus:ring-forest-ink resize-none"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => navigateTo(`#/groups/${activeGroupId}`)}
                  className="w-1/2 py-2 bg-fog hover:bg-linen-mist text-[10px] uppercase tracking-wider font-extrabold rounded-full text-center border border-forest-ink/10 text-slate cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 bg-forest-ink dark:bg-lime-voltage hover:opacity-90 text-[10px] uppercase tracking-wider font-extrabold text-lime-voltage dark:text-spruce rounded-full shadow-sm cursor-pointer transition-all border border-forest-ink/5"
                >
                  Save Bill Entry
                </button>
              </div>
            </form>
          </div>
        </main>
        {renderActiveToast()}
        {renderProfileSettingsModal()}
        {renderScannerPopup()}
      </div>
    );
  }

  // Settle Accounts view page
  if (detailedGroup && activeGroupId && currentPath === `#/groups/${activeGroupId}/settle`) {
    const sSymbol = getSymbol(detailedGroup.currency);
    return (
      <div className="min-h-screen bg-paper text-forest-ink font-sans antialiased">
        <header className="border-b border-forest-ink/10 bg-paper/85 p-4 sticky top-0 backdrop-blur-md z-45 flex items-center justify-between">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigateTo(`#/groups/${activeGroupId}`)}
                className="p-1.5 hover:bg-fog rounded-lg text-slate-400 hover:text-forest-ink transition cursor-pointer"
              >
                <ArrowLeft className="w-4.5 h-4.5" />
              </button>
              <div className="border-l border-forest-ink/10 pl-4">
                <h3 className="font-sans font-extrabold text-sm uppercase tracking-wider text-obsidian">Record Settlement Payment</h3>
                <p className="text-xs text-charcoal">Balance reductions / {detailedGroup.name}</p>
              </div>
            </div>
            {renderThemeToggle()}
          </div>
        </header>

        <main className="max-w-md mx-auto px-4 py-12">
          <form onSubmit={handleRecordSettlement} className="bg-fog p-6 rounded-[10px] border border-forest-ink/10 shadow-sm space-y-4">
            <h3 className="font-sans font-bold text-xs text-obsidian uppercase tracking-widest flex items-center gap-2 mb-2">
              <Coins className="w-5 h-5 text-forest-ink animate-spin" style={{ animationDuration: '4s' }} />
              Log Financial Transfer
            </h3>
            <p className="text-xs text-charcoal block leading-relaxed pb-3 border-b border-forest-ink/10">
              Direct peer-to-peer transfers (Cash, UPI, or Bank) to settle up optimized balances in the group ledger.
            </p>

            <div>
              <label className="text-[9px] text-slate uppercase tracking-widest font-bold mb-1 block">Debtor (Who is paying)</label>
              <select
                value={settlePayer}
                onChange={(e) => setSettlePayer(e.target.value)}
                className="w-full bg-paper border border-forest-ink/12 rounded-[10px] py-2 px-3 text-xs text-obsidian focus:outline-none focus:ring-1 focus:ring-forest-ink cursor-pointer"
              >
                <option value="">Select payer...</option>
                {detailedGroup.members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[9px] text-slate uppercase tracking-widest font-bold mb-1 block">Creditor (Who is receiving)</label>
              <select
                value={settleReceiver}
                onChange={(e) => setSettleReceiver(e.target.value)}
                className="w-full bg-paper border border-forest-ink/12 rounded-[10px] py-2 px-3 text-xs text-obsidian focus:outline-none focus:ring-1 focus:ring-forest-ink cursor-pointer"
              >
                <option value="">Select receiver...</option>
                {detailedGroup.members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] text-slate uppercase tracking-widest font-bold mb-1 block">Transfer Cost ({detailedGroup.currency})</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-mono font-bold text-slate">{sSymbol}</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    className="w-full bg-paper border border-forest-ink/12 rounded-[10px] py-2 pl-7 pr-3 text-xs font-mono font-bold text-obsidian focus:outline-none focus:ring-1 focus:ring-forest-ink"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] text-slate uppercase tracking-widest font-bold mb-1 block">Method</label>
                <select
                  value={settleMethod}
                  onChange={(e) => setSettleMethod(e.target.value)}
                  className="w-full bg-paper border border-forest-ink/12 rounded-[10px] py-2 px-3 text-xs text-obsidian focus:outline-none focus:ring-1 focus:ring-forest-ink cursor-pointer"
                >
                  <option value="Cash">💵 Cash</option>
                  <option value="UPI">📱 UPI / GPay</option>
                  <option value="Bank Transfer">🏦 Bank Transfer</option>
                  <option value="Venmo">💬 Digital Venmo</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[9px] text-slate uppercase tracking-widest font-bold mb-1 block">Note</label>
              <input
                type="text"
                value={settleNote}
                onChange={(e) => setSettleNote(e.target.value)}
                className="w-full bg-paper border border-forest-ink/12 rounded-[10px] py-2 px-3 text-xs text-obsidian focus:outline-none"
              />
            </div>

            {(() => {
              const recMember = detailedGroup?.members?.find(m => m.user_id === settleReceiver);
              if (recMember && (recMember.upi_id || recMember.upi_qr_url)) {
                return (
                  <div className="p-3 bg-linen-mist/50 border border-forest-ink/10 rounded-lg space-y-1.5 text-forest-ink animate-pulse">
                    <div className="flex items-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5 text-forest-ink" />
                      <span className="text-[10px] font-extrabold uppercase tracking-wide">Recipient UPI scan active</span>
                    </div>
                    <p className="text-[10px] text-charcoal leading-tight">
                      When you submit, a dynamic Google Pay / Bhim UPI scanner QR code will pop up for you to pay <strong>{recMember.name}</strong> instantly.
                    </p>
                  </div>
                );
              }
              return null;
            })()}

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={() => navigateTo(`#/groups/${activeGroupId}`)}
                className="w-1/2 py-2 bg-paper hover:bg-fog text-[10px] uppercase tracking-wider font-bold rounded-full text-center border border-forest-ink/10 text-slate cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-1/2 py-2 bg-lime-voltage hover:opacity-90 text-[10px] uppercase tracking-wider font-extrabold text-forest-ink dark:text-spruce border border-forest-ink/15 rounded-full cursor-pointer transition-all flex items-center justify-center gap-1"
              >
                {(() => {
                  const recMember = detailedGroup?.members?.find(m => m.user_id === settleReceiver);
                  if (recMember && (recMember.upi_id || recMember.upi_qr_url)) {
                    return <QrCode className="w-3.5 h-3.5" />;
                  }
                  return null;
                })()}
                Complete Payment
              </button>
            </div>
          </form>
        </main>
        {renderActiveToast()}
        {renderScannerPopup()}
        {renderProfileSettingsModal()}
      </div>
    );
  }

  // Fallback loading overview screen
  return (
    <div className="min-h-screen bg-paper text-forest-ink flex flex-col items-center justify-center font-sans antialiased">
      <Loader2 className="w-8 h-8 text-forest-ink animate-spin mb-4" />
      <h3 className="font-sans font-extrabold text-obsidian text-sm uppercase tracking-widest">Synchronizing Ledger Engine...</h3>
      <p className="text-xs text-charcoal mt-1">Please wait while we connect your workspace container routes.</p>
    </div>
  );
}