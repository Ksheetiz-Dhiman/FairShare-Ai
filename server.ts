import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';
import { dbStore, User, Group, GroupMember, Expense, ExpenseSplit, Settlement, AIConversation, Notification } from './src/db/dbStore.js';
import { hashPassword, generateToken, verifyToken } from './src/lib/authCrypto.js';
import { parseExpenseWithAI, scanReceiptWithAI, generateGroupInsights } from './src/lib/gemini.js';
import { calculateBalancesAndDebts } from './src/lib/debtSim.js';

// Extend Express Request interface to hold authenticated user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // WebSockets client tracking
  const clients = new Map<WebSocket, { userId?: string; groupIds: Set<string> }>();

  // Send realtime websocket update to a group
  const sendRealtimeUpdate = (groupId: string, event: { type: string; data: any }) => {
    const payload = JSON.stringify({ groupId, ...event });
    clients.forEach((metadata, ws) => {
      if (ws.readyState === 1 && metadata.groupIds.has(groupId)) { // 1 = WebSocket.OPEN
        try {
          ws.send(payload);
        } catch (err) {
          console.error("WS send group error:", err);
        }
      }
    });
  };

  // Send direct notification event to a specific online user
  const sendUserNotification = (userId: string, event: { type: string; data: any }) => {
    const payload = JSON.stringify(event);
    clients.forEach((metadata, ws) => {
      if (ws.readyState === 1 && metadata.userId === userId) { // 1 = WebSocket.OPEN
        try {
          ws.send(payload);
        } catch (err) {
          console.error("WS send user error:", err);
        }
      }
    });
  };

  // Create core notification in DB, log interactive visual email simulation, and push through WS
  const createNotification = (
    userId: string,
    type: 'new_expense' | 'tagged_expense' | 'settlement_request' | 'settlement_paid',
    title: string,
    message: string,
    groupId: string,
    groupName: string
  ) => {
    try {
      const db = dbStore.get();
      const recipientUser = db.users.find(u => u.id === userId);
      if (!recipientUser) return null;

      const newNotif: Notification = {
        id: 'n-' + Math.random().toString(36).substr(2, 9),
        user_id: userId,
        type,
        title,
        message,
        group_id: groupId,
        group_name: groupName,
        created_at: new Date().toISOString(),
        is_read: false,
        email_sent: true,
        email_recipient: recipientUser.email
      };

      dbStore.update(data => {
        if (!data.notifications) {
          data.notifications = [];
        }
        data.notifications.push(newNotif);
      });

      console.log(`
=========================================
📧 [SIMULATED EMAIL NOTIFICATION SENT]
To: ${recipientUser.email} (${recipientUser.name})
Subject: FairShare Tracker - ${title}
-----------------------------------------
Hello ${recipientUser.name},

We wanted to notify you about some recent activity:

"${message}"

Review the details in your dashboard at your convenience.
=========================================
      `);

      // Realtime notification broadcast
      sendUserNotification(userId, { type: 'notification_received', data: newNotif });

      return newNotif;
    } catch (err) {
      console.error('Error creating notification:', err);
      return null;
    }
  };

  // Body parser setup - 10MB limit for receipt scans
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Request logger helper
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });

  // JWT Authentication Middleware
  const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Authorization header is missing' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(403).json({ error: 'Session expired or invalid token' });
    }

    req.user = decoded;
    next();
  };

  // -----------------------------------------
  // AUTH ROUTES
  // -----------------------------------------

  // Register
  app.post('/api/auth/register', (req: Request, res: Response) => {
    try {
      const { name, email, password, avatar_url } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
      }

      const db = dbStore.get();
      const existingUser = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      const defaultAvatar = `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80`;

      const newUser: User = {
        id: 'u-' + Math.random().toString(36).substr(2, 9),
        name,
        email: email.toLowerCase(),
        avatar_url: avatar_url || defaultAvatar,
        password_hash: hashPassword(password),
        created_at: new Date().toISOString()
      };

      dbStore.update(data => {
        data.users.push(newUser);
      });

      const token = generateToken({ id: newUser.id, email: newUser.email, name: newUser.name });

      res.status(201).json({
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          avatar_url: newUser.avatar_url,
          created_at: newUser.created_at
        }
      });
    } catch (e: any) {
      res.status(500).json({ error: 'Registration failed: ' + e.message });
    }
  });

  // Login
  app.post('/api/auth/login', (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const db = dbStore.get();
      const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const targetHash = hashPassword(password);
      if (user.password_hash !== targetHash) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = generateToken({ id: user.id, email: user.email, name: user.name });

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar_url: user.avatar_url,
          created_at: user.created_at
        }
      });
    } catch (e: any) {
      res.status(500).json({ error: 'Login failed: ' + e.message });
    }
  });

  // Get current user profile
  app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const uId = req.user?.id;
      const db = dbStore.get();
      const user = db.users.find(u => u.id === uId);

      if (!user) {
        return res.status(404).json({ error: 'User profile not found' });
      }

      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar_url: user.avatar_url,
          created_at: user.created_at,
          upi_id: user.upi_id || '',
          upi_qr_url: user.upi_qr_url || ''
        }
      });
    } catch (e: any) {
      res.status(500).json({ error: 'Profile lookup failed' });
    }
  });

  // Update current user profile
  app.put('/api/auth/profile', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const uId = req.user?.id;
      const { name, avatar_url, upi_id, upi_qr_url } = req.body;

      if (!uId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      let updatedUser: any = null;

      dbStore.update(data => {
        const idx = data.users.findIndex(u => u.id === uId);
        if (idx !== -1) {
          if (name !== undefined) data.users[idx].name = name;
          if (avatar_url !== undefined) data.users[idx].avatar_url = avatar_url;
          if (upi_id !== undefined) data.users[idx].upi_id = upi_id;
          if (upi_qr_url !== undefined) data.users[idx].upi_qr_url = upi_qr_url;
          updatedUser = { ...data.users[idx] };
        }
      });

      if (!updatedUser) {
        return res.status(404).json({ error: 'User profile not found' });
      }

      res.json({
        message: 'Profile updated successfully',
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          avatar_url: updatedUser.avatar_url,
          created_at: updatedUser.created_at,
          upi_id: updatedUser.upi_id || '',
          upi_qr_url: updatedUser.upi_qr_url || ''
        }
      });
    } catch (e: any) {
      res.status(500).json({ error: 'Profile update failed: ' + e.message });
    }
  });

  // -----------------------------------------
  // GROUPS ROUTES
  // -----------------------------------------

  // Read all user groups
  app.get('/api/groups', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const uId = req.user?.id;
      const db = dbStore.get();

      // Find group membership lists
      const memberships = db.group_members.filter(m => m.user_id === uId);
      const groupIds = memberships.map(m => m.group_id);

      // Fetch matching groups & populate member avatars/names
      const filteredGroups = db.groups
        .filter(g => groupIds.includes(g.id))
        .map(g => {
          const membersList = db.group_members
            .filter(gm => gm.group_id === g.id)
            .map(gm => {
              const u = db.users.find(user => user.id === gm.user_id);
              return {
                user_id: gm.user_id,
                name: u?.name || 'Unknown',
                avatar_url: u?.avatar_url || '',
                role: gm.role,
                upi_id: u?.upi_id || '',
                upi_qr_url: u?.upi_qr_url || ''
              };
            });

          return {
            ...g,
            members: membersList,
            expenses: db.expenses.filter(e => e.group_id === g.id)
          };
        });

      res.json(filteredGroups);
    } catch (e: any) {
      res.status(500).json({ error: 'Error fetching groups: ' + e.message });
    }
  });

  // Create group
  app.post('/api/groups', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const uId = req.user?.id || '';
      const { name, description, currency } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Group name is required' });
      }

      const newGroup: Group = {
        id: 'g-' + Math.random().toString(36).substr(2, 9),
        name,
        description: description || '',
        currency: currency || 'USD',
        created_by: uId,
        created_at: new Date().toISOString()
      };

      const newMembership: GroupMember = {
        id: 'gm-' + Math.random().toString(36).substr(2, 9),
        group_id: newGroup.id,
        user_id: uId,
        role: 'owner',
        joined_at: new Date().toISOString()
      };

      dbStore.update(data => {
        data.groups.push(newGroup);
        data.group_members.push(newMembership);
      });

      res.status(201).json({
        ...newGroup,
        members: [{ user_id: uId, role: 'owner' }]
      });
    } catch (e: any) {
      res.status(500).json({ error: 'Group creation failed' });
    }
  });

  // Read detailed single group
  app.get('/api/groups/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const gId = req.params.id;
      const db = dbStore.get();
      const group = db.groups.find(g => g.id === gId);

      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }

      // Check if user is a member
      const isMember = db.group_members.some(gm => gm.group_id === gId && gm.user_id === req.user?.id);
      if (!isMember) {
        return res.status(403).json({ error: 'You are not a member of this expense group' });
      }

      // Populate group members information
      const members = db.group_members
        .filter(gm => gm.group_id === gId)
        .map(gm => {
          const u = db.users.find(user => user.id === gm.user_id);
          return {
            id: gm.id,
            user_id: gm.user_id,
            name: u?.name || 'Unknown',
            email: u?.email || 'unknown@example.com',
            avatar_url: u?.avatar_url || '',
            role: gm.role,
            joined_at: gm.joined_at,
            upi_id: u?.upi_id || '',
            upi_qr_url: u?.upi_qr_url || ''
          };
        });

      // Prepare core group expenses
      const expenses = db.expenses
        .filter(e => e.group_id === gId)
        .map(e => {
          const payer = db.users.find(user => user.id === e.paid_by_user_id);
          const splits = db.expense_splits.filter(es => es.expense_id === e.id);
          return {
            ...e,
            paid_by_name: payer?.name || 'Unknown',
            paid_by_avatar: payer?.avatar_url || '',
            splits: splits.map(s => {
              const u = db.users.find(user => user.id === s.user_id);
              return {
                ...s,
                name: u?.name || 'Unknown'
              };
            })
          };
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Get debt simplification output
      const settlements = db.settlements.filter(s => s.group_id === gId);
      const settlementHistory = settlements.map(s => {
        const fromU = db.users.find(u => u.id === s.from_user_id);
        const toU = db.users.find(u => u.id === s.to_user_id);
        return {
          ...s,
          from_name: fromU?.name || 'Unknown',
          from_avatar: fromU?.avatar_url || '',
          to_name: toU?.name || 'Unknown',
          to_avatar: toU?.avatar_url || ''
        };
      }).sort((a, b) => new Date(b.settled_at).getTime() - new Date(a.settled_at).getTime());

      // Compute balances and calculations
      const rawMembers = db.group_members.filter(gm => gm.group_id === gId).map(gm => {
        const u = db.users.find(user => user.id === gm.user_id)!;
        return {
          user_id: gm.user_id,
          name: u?.name || 'Unknown',
          email: u?.email || '',
          avatar_url: u?.avatar_url || ''
        };
      });

      // We pass the splits relevant to this group
      const allExpenseIds = db.expenses.filter(e => e.group_id === gId).map(e => e.id);
      const relevantSplits = db.expense_splits.filter(es => allExpenseIds.includes(es.expense_id));

      const { balances, simplifiedDebts } = calculateBalancesAndDebts(
        rawMembers,
        db.expenses.filter(e => e.group_id === gId),
        relevantSplits,
        settlements
      );

      res.json({
        ...group,
        members,
        expenses,
        settlements: settlementHistory,
        balances,
        simplifiedDebts
      });
    } catch (e: any) {
      res.status(500).json({ error: 'Error reading group: ' + e.message });
    }
  });

  // Add member to group by email or name (fluid registration fallback included)
  app.post('/api/groups/:id/members', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const gId = req.params.id;
      const { email, name } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'User email is required' });
      }

      const db = dbStore.get();
      const group = db.groups.find(g => g.id === gId);
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }

      // Check if user exists. If not, auto-create a placeholder account to ensure seamless workflow
      let targetUser = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());

      if (!targetUser) {
        // Build beautiful guest account profile
        const guestName = name || email.split('@')[0];
        const randomId = Math.floor(Math.random() * 1000);
        const randAvatar = `https://images.unsplash.com/photo-${1500000000000 + randomId}?auto=format&fit=crop&w=120&h=120&q=80`;

        targetUser = {
          id: 'u-' + Math.random().toString(36).substr(2, 9),
          name: guestName,
          email: email.toLowerCase(),
          avatar_url: randAvatar,
          password_hash: hashPassword('password'), // default standard
          created_at: new Date().toISOString()
        };

        dbStore.update(data => {
          data.users.push(targetUser!);
        });
        console.log(`Auto-created placeholder user account for ${email}`);
      }

      // Check if user is already a member
      const alreadyMember = db.group_members.some(gm => gm.group_id === gId && gm.user_id === targetUser!.id);
      if (alreadyMember) {
        return res.status(400).json({ error: `${targetUser.name} is already a member of this group` });
      }

      const newMembership: GroupMember = {
        id: 'gm-' + Math.random().toString(36).substr(2, 9),
        group_id: gId,
        user_id: targetUser.id,
        role: 'member',
        joined_at: new Date().toISOString()
      };

      dbStore.update(data => {
        data.group_members.push(newMembership);
      });

      // Send real-time notification to the invited user
      try {
        const inviterName = req.user?.name || 'Someone';
        createNotification(
          targetUser.id,
          'new_expense',
          `Added to team: "${group.name}"`,
          `${inviterName} added you to the expense sharing group "${group.name}".`,
          gId,
          group.name
        );

        // Instant sidebar sync push via WebSocket to newly invited user
        sendUserNotification(targetUser.id, {
          type: 'group_joined',
          data: {
            id: group.id,
            name: group.name,
            description: group.description,
            currency: group.currency,
            created_by: group.created_by,
            created_at: group.created_at
          }
        });

        // Sync broadcast to current group listing so members update
        sendRealtimeUpdate(gId, {
          type: 'member_added',
          data: {
            group_id: gId,
            user: {
              id: targetUser.id,
              name: targetUser.name,
              email: targetUser.email,
              avatar_url: targetUser.avatar_url
            }
          }
        });
      } catch (err) {
        console.error('WS real-time invite dispatch error:', err);
      }

      res.status(201).json({
        membershipId: newMembership.id,
        user: {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          avatar_url: targetUser.avatar_url
        }
      });
    } catch (e: any) {
      res.status(500).json({ error: 'Error adding member' });
    }
  });

  // Remove member from group
  app.delete('/api/groups/:id/members/:userId', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const gId = req.params.id;
      const targetUserId = req.params.userId;

      const db = dbStore.get();
      const membership = db.group_members.find(gm => gm.group_id === gId && gm.user_id === targetUserId);

      if (!membership) {
        return res.status(404).json({ error: 'Member is not in this group' });
      }

      dbStore.update(data => {
        data.group_members = data.group_members.filter(gm => gm.id !== membership.id);
        // Clean up splits or handles associated if any
      });

      // WebSocket Sync member deletion
      try {
        sendRealtimeUpdate(gId, {
          type: 'member_removed',
          data: {
            group_id: gId,
            user_id: targetUserId
          }
        });
      } catch (err) {
        console.error('WS real-time member removal dispatch error:', err);
      }

      res.json({ success: true, message: 'Member removed successfully' });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to remove member' });
    }
  });

  // -----------------------------------------
  // GROUP REAL-TIME CHAT ROUTES
  // -----------------------------------------

  // Read chat messages for a group
  app.get('/api/groups/:id/chats', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const gId = req.params.id;
      const db = dbStore.get();
      
      // Verify membership
      const isMember = db.group_members.some(gm => gm.group_id === gId && gm.user_id === req.user?.id);
      if (!isMember) {
        return res.status(403).json({ error: 'Access denied: not a group member' });
      }

      const messages = (db.chat_messages || [])
        .filter(msg => msg.group_id === gId)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      res.json(messages);
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to fetch chats: ' + e.message });
    }
  });

  // Post a new chat message to a group
  app.post('/api/groups/:id/chats', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const gId = req.params.id;
      const { message } = req.body;
      const uId = req.user?.id;
      const uName = req.user?.name || 'Someone';

      if (!message || message.trim() === '') {
        return res.status(400).json({ error: 'Message content is required' });
      }

      const db = dbStore.get();
      const group = db.groups.find(g => g.id === gId);
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }

      // Verify membership
      const isMember = db.group_members.some(gm => gm.group_id === gId && gm.user_id === uId);
      if (!isMember) {
        return res.status(403).json({ error: 'Access denied: not a group member' });
      }

      const userProfile = db.users.find(u => u.id === uId);

      const newMsg = {
        id: 'chat-' + Math.random().toString(36).substr(2, 9),
        group_id: gId,
        user_id: uId || '',
        user_name: uName,
        user_avatar: userProfile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
        message: message,
        created_at: new Date().toISOString()
      };

      dbStore.update(data => {
        if (!data.chat_messages) {
          data.chat_messages = [];
        }
        data.chat_messages.push(newMsg);
      });

      // WebSocket Broadcast to group channel
      try {
        sendRealtimeUpdate(gId, {
          type: 'chat_message',
          data: newMsg
        });
      } catch (err) {
        console.error('WS chat broadcast error:', err);
      }

      // Mention tag checks in Chat Message
      try {
        const otherMembers = db.group_members.filter(gm => gm.group_id === gId && gm.user_id !== uId);
        otherMembers.forEach(m => {
          const mUser = db.users.find(u => u.id === m.user_id);
          if (mUser) {
            const cleanFullName = mUser.name.toLowerCase();
            const cleanFirstName = mUser.name.split(' ')[0].toLowerCase();
            if (message.toLowerCase().includes(`@${cleanFullName}`) || message.toLowerCase().includes(`@${cleanFirstName}`)) {
              createNotification(
                mUser.id,
                'tagged_expense',
                `Mentioned in "${group.name}" chat`,
                `${uName} mentioned you in the chat: "${message}"`,
                gId,
                group.name
              );
            }
          }
        });
      } catch (err) {
        console.error('Error handling mentions in chat message:', err);
      }

      res.status(201).json(newMsg);
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to send chat: ' + e.message });
    }
  });

  // -----------------------------------------
  // EXPENSES ROUTES
  // -----------------------------------------

  // Read expenses
  app.get('/api/groups/:id/expenses', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const gId = req.params.id;
      const db = dbStore.get();

      const expenses = db.expenses
        .filter(e => e.group_id === gId)
        .map(e => {
          const payer = db.users.find(u => u.id === e.paid_by_user_id);
          const splits = db.expense_splits.filter(es => es.expense_id === e.id);
          return {
            ...e,
            paid_by_name: payer?.name || 'Unknown',
            paid_by_avatar: payer?.avatar_url || '',
            splits: splits.map(s => {
              const u = db.users.find(user => user.id === s.user_id);
              return {
                ...s,
                name: u?.name || 'Unknown'
              };
            })
          };
        });

      res.json(expenses);
    } catch (e: any) {
      res.status(500).json({ error: 'Error reading expenses' });
    }
  });

  // Create expense with intelligent automatic splits compute
  app.post('/api/groups/:id/expenses', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const gId = req.params.id;
      const uId = req.user?.id || '';
      const {
        title,
        amount,
        currency,
        paid_by_user_id,
        split_type, // equal, percentage, custom, shares
        category,
        date,
        notes,
        receipt_url,
        splitsInput // array of { user_id, percentage, shares, amount }
      } = req.body;

      if (!title || !amount || Number(amount) <= 0) {
        return res.status(400).json({ error: 'Title and positive amount are required' });
      }

      const db = dbStore.get();
      const group = db.groups.find(g => g.id === gId);
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }

      const totalAmount = Number(amount);
      const payerId = paid_by_user_id || uId;

      const newExpense: Expense = {
        id: 'e-' + Math.random().toString(36).substr(2, 9),
        group_id: gId,
        title,
        amount: totalAmount,
        currency: currency || group.currency,
        exchange_rate: 1.0, // base rate relative to groupcurrency
        paid_by_user_id: payerId,
        split_type: split_type || 'equal',
        category: category || 'Other',
        date: date || new Date().toISOString().split('T')[0],
        notes: notes || '',
        receipt_url: receipt_url || '',
        created_by: uId,
        created_at: new Date().toISOString()
      };

      // Get active members to split among if none provided
      const members = db.group_members.filter(gm => gm.group_id === gId);
      let targetSplits: Array<{ user_id: string; amount: number; percentage?: number; shares?: number }> = [];

      if (split_type === 'equal') {
        // Split equally among the selected list of users OR all group members
        const participants = (splitsInput && splitsInput.length > 0)
          ? splitsInput.map((s: any) => s.user_id)
          : members.map(m => m.user_id);

        const count = participants.length || 1;
        const splitVal = Number((totalAmount / count).toFixed(2));

        // Adjust for floating-point rounding division remainder on the first payer
        let remainder = totalAmount - (splitVal * count);

        targetSplits = participants.map((userId: string, idx: number) => {
          const personalSplit = idx === 0 ? Number((splitVal + remainder).toFixed(2)) : splitVal;
          return {
            user_id: userId,
            amount: personalSplit,
            percentage: Number((100 / count).toFixed(2))
          };
        });
      } else if (split_type === 'percentage') {
        // Percentage splits
        let currentTotal = 0;
        targetSplits = splitsInput.map((s: any, idx: number) => {
          const pct = Number(s.percentage || 0);
          const rawAmt = Number((totalAmount * (pct / 100)).toFixed(2));
          currentTotal += rawAmt;

          // rounding adjustment
          let computedAmt = rawAmt;
          if (idx === splitsInput.length - 1) {
            const diff = totalAmount - currentTotal;
            if (Math.abs(diff) < 1.0) {
              computedAmt += diff;
            }
          }

          return {
            user_id: s.user_id,
            amount: Number(computedAmt.toFixed(2)),
            percentage: pct
          };
        });
      } else if (split_type === 'shares') {
        // Shares split
        const totalShares = splitsInput.reduce((acc: number, s: any) => acc + Number(s.shares || 0), 0) || 1;
        let currentTotal = 0;

        targetSplits = splitsInput.map((s: any, idx: number) => {
          const shares = Number(s.shares || 0);
          const rawAmt = Number((totalAmount * (shares / totalShares)).toFixed(2));
          currentTotal += rawAmt;

          let computedAmt = rawAmt;
          if (idx === splitsInput.length - 1) {
            const diff = totalAmount - currentTotal;
            if (Math.abs(diff) < 1.0) {
              computedAmt += diff;
            }
          }

          return {
            user_id: s.user_id,
            amount: Number(computedAmt.toFixed(2)),
            shares: shares
          };
        });
      } else {
        // Custom fixed amounts split
        targetSplits = splitsInput.map((s: any) => {
          return {
            user_id: s.user_id,
            amount: Number(s.amount || 0)
          };
        });
      }

      // Record final DB insert operations
      dbStore.update(data => {
        data.expenses.push(newExpense);
        targetSplits.forEach(ts => {
          data.expense_splits.push({
            id: 'es-' + Math.random().toString(36).substr(2, 9),
            expense_id: newExpense.id,
            user_id: ts.user_id,
            amount: ts.amount,
            percentage: ts.percentage,
            shares: ts.shares,
            settled: false
          });
        });
      });

      try {
        const payerName = db.users.find(u => u.id === payerId)?.name || 'Someone';
        const membersList = db.group_members.filter(gm => gm.group_id === gId);

        // 1. Notify other players there is a new bill
        membersList.forEach(m => {
          if (m.user_id !== payerId) {
            createNotification(
              m.user_id,
              'new_expense',
              `New shared bill: "${title}"`,
              `${payerName} registered a new bill of ${newExpense.currency} ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} in group "${group.name}".`,
              gId,
              group.name
            );
          }
        });

        // 2. Notify users who are part of the target split pool
        targetSplits.forEach(split => {
          if (split.user_id !== payerId && split.amount > 0) {
            createNotification(
              split.user_id,
              'tagged_expense',
              `You owe ${newExpense.currency} ${split.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
              `Your individual share of "${title}" logged by ${payerName} is calculated as ${newExpense.currency} ${split.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}.`,
              gId,
              group.name
            );
          }
        });

        // 3. Mentions tag checks in description
        if (notes) {
          membersList.forEach(m => {
            const mUser = db.users.find(u => u.id === m.user_id);
            if (mUser && mUser.id !== payerId) {
              const cleanFullName = mUser.name.toLowerCase();
              const cleanFirstName = mUser.name.split(' ')[0].toLowerCase();
              if (notes.toLowerCase().includes(`@${cleanFullName}`) || notes.toLowerCase().includes(`@${cleanFirstName}`)) {
                createNotification(
                  mUser.id,
                  'tagged_expense',
                  `Mentioned in "${title}" notes`,
                  `${payerName} mentioned you in notes: "${notes}"`,
                  gId,
                  group.name
                );
              }
            }
          });
        }

        // 4. WebSocket sync update to group
        sendRealtimeUpdate(gId, {
          type: 'expense_added',
          data: {
            id: newExpense.id,
            title: newExpense.title,
            amount: newExpense.amount,
            currency: newExpense.currency,
            paid_by_name: payerName
          }
        });
      } catch (err) {
        console.error('Error during live notifications dispatch:', err);
      }

      res.status(201).json({
        ...newExpense,
        splits: targetSplits
      });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to create expense: ' + e.message });
    }
  });

  // Edit Expense
  app.put('/api/expenses/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const eId = req.params.id;
      const { title, amount, currency, paid_by_user_id, split_type, category, date, notes, splitsInput } = req.body;

      const db = dbStore.get();
      const expense = db.expenses.find(e => e.id === eId);

      if (!expense) {
        return res.status(404).json({ error: 'Expense not found' });
      }

      const gId = expense.group_id;
      const group = db.groups.find(g => g.id === gId);
      const totalAmount = Number(amount || expense.amount);

      dbStore.update(data => {
        const item = data.expenses.find(e => e.id === eId)!;
        item.title = title || item.title;
        item.amount = totalAmount;
        item.currency = currency || item.currency;
        item.paid_by_user_id = paid_by_user_id || item.paid_by_user_id;
        item.split_type = split_type || item.split_type;
        item.category = category || item.category;
        item.date = date || item.date;
        item.notes = notes || item.notes;

        // Clean and update splits associated
        data.expense_splits = data.expense_splits.filter(es => es.expense_id !== eId);

        // Map splitsInput similarly
        if (splitsInput && splitsInput.length > 0) {
          splitsInput.forEach((s: any) => {
            data.expense_splits.push({
              id: 'es-' + Math.random().toString(36).substr(2, 9),
              expense_id: eId,
              user_id: s.user_id,
              amount: Number(s.amount || 0),
              percentage: s.percentage,
              shares: s.shares,
              settled: false
            });
          });
        } else {
          // split equally fallback across all members
          const members = data.group_members.filter(gm => gm.group_id === item.group_id);
          const count = members.length || 1;
          const splitAmount = Number((totalAmount / count).toFixed(2));
          members.forEach((m, idx) => {
            const addedVal = idx === 0 ? totalAmount - (splitAmount * count) : 0;
            data.expense_splits.push({
              id: 'es-' + Math.random().toString(36).substr(2, 9),
              expense_id: eId,
              user_id: m.user_id,
              amount: Number((splitAmount + addedVal).toFixed(2)),
              settled: false
            });
          });
        }
      });

      try {
        const updaterName = req.user?.name || 'Someone';
        const updatedTitle = title || expense.title;
        const membersList = db.group_members.filter(gm => gm.group_id === gId);

        membersList.forEach(m => {
          if (m.user_id !== req.user?.id) {
            createNotification(
              m.user_id,
              'new_expense',
              `Bill Edited: "${updatedTitle}"`,
              `${updaterName} updated the bill "${updatedTitle}" to ${expense.currency} ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}.`,
              gId,
              group?.name || 'Group'
            );
          }
        });

        // WS Sync broadcast to group
        sendRealtimeUpdate(gId, {
          type: 'expense_edited',
          data: {
            id: eId,
            title: updatedTitle,
            amount: totalAmount,
            currency: expense.currency
          }
        });
      } catch (err) {
        console.error('Notification edit error:', err);
      }

      res.json({ success: true, message: 'Expense updated successfully' });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to update expense' });
    }
  });

  // Delete Group
  app.delete('/api/groups/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const gId = req.params.id;
      const uId = req.user?.id || '';
      const db = dbStore.get();
      const group = db.groups.find(g => g.id === gId);

      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }

      // Check if user is a member of the group
      const userMember = db.group_members.find(gm => gm.group_id === gId && gm.user_id === uId);
      if (!userMember) {
        return res.status(403).json({ error: 'You are not a member of this group' });
      }

      // Extract all expense IDs for this group
      const groupExpenses = db.expenses.filter(e => e.group_id === gId);
      const groupExpenseIds = groupExpenses.map(e => e.id);

      dbStore.update(data => {
        // Remove group
        data.groups = data.groups.filter(g => g.id !== gId);
        // Remove members
        data.group_members = data.group_members.filter(gm => gm.group_id !== gId);
        // Remove expenses
        data.expenses = data.expenses.filter(e => e.group_id !== gId);
        // Remove splits associated with group's expenses
        data.expense_splits = data.expense_splits.filter(es => !groupExpenseIds.includes(es.expense_id));
        // Remove settlements
        data.settlements = data.settlements.filter(s => s.group_id !== gId);
        // Remove conversations/chat messages
        if (data.ai_conversations) {
          data.ai_conversations = data.ai_conversations.filter(ac => ac.group_id !== gId);
        }
        if (data.chat_messages) {
          data.chat_messages = data.chat_messages.filter(cm => cm.group_id !== gId);
        }
      });

      res.json({ success: true, message: 'Group deleted successfully' });
    } catch (e: any) {
      res.status(500).json({ error: 'Group deletion failed: ' + e.message });
    }
  });

  // Delete Expense
  app.delete('/api/expenses/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const eId = req.params.id;

      const db = dbStore.get();
      const expense = db.expenses.find(e => e.id === eId);

      if (!expense) {
        return res.status(404).json({ error: 'Expense not found' });
      }

      const gId = expense.group_id;
      const group = db.groups.find(g => g.id === gId);

      dbStore.update(data => {
        const idx = data.expenses.findIndex(e => e.id === eId);
        if (idx !== -1) {
          data.expenses.splice(idx, 1);
          data.expense_splits = data.expense_splits.filter(es => es.expense_id !== eId);
        }
      });

      try {
        const deleterName = req.user?.name || 'Someone';
        const membersList = db.group_members.filter(gm => gm.group_id === gId);

        membersList.forEach(m => {
          if (m.user_id !== req.user?.id) {
            createNotification(
              m.user_id,
              'new_expense',
              `Bill Removed: "${expense.title}"`,
              `${deleterName} removed the bill "${expense.title}" from the group registry.`,
              gId,
              group?.name || 'Group'
            );
          }
        });

        // WS Sync broadcast to group
        sendRealtimeUpdate(gId, {
          type: 'expense_deleted',
          data: {
            id: eId,
            title: expense.title
          }
        });
      } catch (err) {
        console.error('Notification delete error:', err);
      }

      res.json({ success: true, message: 'Expense deleted successfully' });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to delete expense' });
    }
  });

  // -----------------------------------------
  // SETTLEMENTS ROUTES
  // -----------------------------------------

  // Read direct group balances & debt simplification engine
  app.get('/api/groups/:id/balances', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const gId = req.params.id;
      const db = dbStore.get();

      const groupMembers = db.group_members.filter(gm => gm.group_id === gId).map(gm => {
        const u = db.users.find(user => user.id === gm.user_id)!;
        return {
          user_id: gm.user_id,
          name: u?.name || 'Unknown',
          email: u?.email || '',
          avatar_url: u?.avatar_url || ''
        };
      });

      const expenses = db.expenses.filter(e => e.group_id === gId);
      const allExpenseIds = expenses.map(e => e.id);
      const relevantSplits = db.expense_splits.filter(es => allExpenseIds.includes(es.expense_id));
      const settlements = db.settlements.filter(s => s.group_id === gId);

      const results = calculateBalancesAndDebts(groupMembers, expenses, relevantSplits, settlements);
      res.json(results);
    } catch (e: any) {
      res.status(500).json({ error: 'Error calculating balances: ' + e.message });
    }
  });

  // Create direct settlement
  app.post('/api/groups/:id/settlements', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const gId = req.params.id;
      const { from_user_id, to_user_id, amount, currency, method, note } = req.body;

      if (!from_user_id || !to_user_id || !amount || Number(amount) <= 0) {
        return res.status(400).json({ error: 'From member, to member, and payment amount are required' });
      }

      const db = dbStore.get();
      const group = db.groups.find(g => g.id === gId);
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }

      const newSettlement: Settlement = {
        id: 's-' + Math.random().toString(36).substr(2, 9),
        group_id: gId,
        from_user_id,
        to_user_id,
        amount: Number(amount),
        currency: currency || group.currency,
        method: method || 'Cash',
        note: note || `Settlement transfer`,
        settled_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      dbStore.update(data => {
        data.settlements.push(newSettlement);
      });

      try {
        const fromUser = db.users.find(u => u.id === from_user_id);
        const toUser = db.users.find(u => u.id === to_user_id);
        const fromUserName = fromUser?.name || 'Someone';
        const toUserName = toUser?.name || 'Someone';

        // 1. Notify Creditor (Recipient user)
        createNotification(
          to_user_id,
          'settlement_paid',
          `Payment Received from ${fromUserName}`,
          `${fromUserName} logged a transaction of ${newSettlement.currency} ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} to your account via ${method}.`,
          gId,
          group.name
        );

        // 2. Notify Debtor (Sender user)
        createNotification(
          from_user_id,
          'settlement_paid',
          `Payment of ${newSettlement.currency} ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} Settle-Recorded`,
          `Your transfer of ${newSettlement.currency} ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} to ${toUserName} has been successfully recorded in the ledger.`,
          gId,
          group.name
        );

        // 3. WS Sync broadcast to group
        sendRealtimeUpdate(gId, {
          type: 'settlement_added',
          data: {
            id: newSettlement.id,
            from_name: fromUserName,
            to_name: toUserName,
            amount: newSettlement.amount,
            currency: newSettlement.currency,
            method: newSettlement.method
          }
        });
      } catch (err) {
        console.error('Settlement notification routing error:', err);
      }

      res.status(201).json(newSettlement);
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to record settlement: ' + e.message });
    }
  });

  // Read settlements history
  app.get('/api/groups/:id/settlements', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const gId = req.params.id;
      const db = dbStore.get();

      const settlements = db.settlements
        .filter(s => s.group_id === gId)
        .map(s => {
          const fromU = db.users.find(u => u.id === s.from_user_id);
          const toU = db.users.find(u => u.id === s.to_user_id);
          return {
            ...s,
            from_name: fromU?.name || 'Unknown',
            from_avatar: fromU?.avatar_url || '',
            to_name: toU?.name || 'Unknown',
            to_avatar: toU?.avatar_url || ''
          };
        })
        .sort((a, b) => new Date(b.settled_at).getTime() - new Date(a.settled_at).getTime());

      res.json(settlements);
    } catch (e: any) {
      res.status(500).json({ error: 'Error reading settlements' });
    }
  });

  // -----------------------------------------
  // NOTIFICATIONS ROUTES
  // -----------------------------------------

  // Read notifications
  app.get('/api/notifications', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const uId = req.user?.id;
      const db = dbStore.get();
      const notifs = (db.notifications || [])
        .filter(n => n.user_id === uId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      res.json(notifs);
    } catch (e: any) {
      res.status(500).json({ error: 'Error reading notifications' });
    }
  });

  // Mark single notification as read
  app.post('/api/notifications/:id/read', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const nId = req.params.id;
      const uId = req.user?.id;
      
      let found = false;
      dbStore.update(data => {
        if (!data.notifications) data.notifications = [];
        const item = data.notifications.find(n => n.id === nId && n.user_id === uId);
        if (item) {
          item.is_read = true;
          found = true;
        }
      });

      if (!found) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: 'Error updating notification status' });
    }
  });

  // Mark all notifications as read
  app.post('/api/notifications/read-all', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const uId = req.user?.id;
      
      dbStore.update(data => {
        if (!data.notifications) data.notifications = [];
        data.notifications.forEach(n => {
          if (n.user_id === uId) {
            n.is_read = true;
          }
        });
      });

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: 'Error bulk updating notifications' });
    }
  });

  // Send settlement ping/request notification
  app.post('/api/groups/:id/settlements/request', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const gId = req.params.id;
      const { debtor_id, amount } = req.body;
      const creditorId = req.user?.id || '';

      if (!debtor_id || !amount || Number(amount) <= 0) {
        return res.status(400).json({ error: 'Debtor and positive debt amount are required' });
      }

      const db = dbStore.get();
      const group = db.groups.find(g => g.id === gId);
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }

      const debtorUser = db.users.find(u => u.id === debtor_id);
      const creditorUser = db.users.find(u => u.id === creditorId);

      if (!debtorUser) {
        return res.status(404).json({ error: 'Debtor user profile not found' });
      }

      const creditorName = creditorUser?.name || 'Someone';

      // Record 'settlement_request' notification
      createNotification(
        debtor_id,
        'settlement_request',
        `Settle up request from ${creditorName}`,
        `${creditorName} requested that you settle your pending balance of ${group.currency} ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} with them.`,
        gId,
        group.name
      );

      res.status(201).json({ success: true, message: 'Settlement request dispatched successfully' });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to request settlement: ' + e.message });
    }
  });

  // -----------------------------------------
  // AI ROUTES (Gemini-powered)
  // -----------------------------------------

  // 1. Natural Language Parse of Expense
  app.post('/api/ai/parse-expense', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { text, groupId } = req.body;
      if (!text || !groupId) {
        return res.status(400).json({ error: "Text prompt and groupId are required" });
      }

      const db = dbStore.get();
      const group = db.groups.find(g => g.id === groupId);

      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }

      // Fetch group members mapping IDs to names beautifully
      const groupMembersRaw = db.group_members.filter(gm => gm.group_id === groupId);
      const members = groupMembersRaw.map(gm => {
        const u = db.users.find(user => user.id === gm.user_id)!;
        return {
          id: gm.user_id,
          name: u?.name || 'Unknown User',
          email: u?.email || ''
        };
      });

      console.log(`[AI Parser] parsing text: "${text}" with ${members.length} members.`);
      const result = await parseExpenseWithAI(text, members, group.currency);

      res.json(result);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: 'Intelligent parsing failed: ' + e.message });
    }
  });

  // 2. Spending insights and analytics panel
  app.post('/api/ai/insights', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { groupId, query, messageHistory } = req.body;
      if (!groupId || !query) {
        return res.status(400).json({ error: "groupId and message query are required" });
      }

      const db = dbStore.get();
      const group = db.groups.find(g => g.id === groupId);
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }

      const groupMembersList = db.group_members.filter(gm => gm.group_id === groupId).map(gm => {
        const u = db.users.find(user => user.id === gm.user_id)!;
        return {
          user_id: gm.user_id,
          name: u?.name || 'Unknown',
          avatar_url: u?.avatar_url || ''
        };
      });

      const expenses = db.expenses.filter(e => e.group_id === groupId).map(e => {
        const payer = db.users.find(user => user.id === e.paid_by_user_id);
        return {
          ...e,
          paid_by_name: payer?.name || 'Unknown'
        };
      });

      const settlements = db.settlements.filter(s => s.group_id === groupId).map(s => {
        const fromU = db.users.find(u => u.id === s.from_user_id);
        const toU = db.users.find(u => u.id === s.to_user_id);
        return {
          ...s,
          from_name: fromU?.name || 'Unknown',
          to_name: toU?.name || 'Unknown'
        };
      });

      // Prepare conversation array
      const history = messageHistory || [];
      const conversation = [...history, { role: 'user', content: query }];

      const insightsText = await generateGroupInsights(
        conversation,
        group,
        expenses,
        groupMembersList,
        settlements
      );

      res.json({ reply: insightsText });
    } catch (e: any) {
  console.error("AI INSIGHTS ERROR");
  console.error(e);

  res.status(500).json({
    error: e?.message,
    stack: e?.stack,
    details: e
  });
}
  });

  // 3. Receipt photo scanning using Vision (Base64)
  app.post('/api/ai/scan-receipt', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { image, mimeType, groupId } = req.body;
      if (!image) {
        return res.status(400).json({ error: "Base64 encoded photo is required" });
      }

      const db = dbStore.get();
      const group = db.groups.find(g => g.id === groupId);
      const currency = group ? group.currency : 'USD';

      const scanResult = await scanReceiptWithAI(image, mimeType || "image/jpeg", currency);
      res.json(scanResult);
    } catch (e: any) {
      console.error("Receipt scanning failed:", e);
      res.status(500).json({ error: 'Receipt photo recognition failed: ' + e.message });
    }
  });


  // -----------------------------------------
  // SERVE VITE FRONTEND OR COMPILED ASSETS
  // -----------------------------------------

  if (process.env.NODE_ENV !== "production") {
    // Development server proxy for Vite HMR
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server started. Listening on http://0.0.0.0:${PORT}`);
  });

  // Attach WebSocketServer directly to the HTTP handler
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket) => {
    // Register temporary empty subscription
    clients.set(ws, { groupIds: new Set() });

    ws.on('message', (message: string) => {
      try {
        const payload = JSON.parse(message);
        if (payload.type === 'auth') {
          const { userId, groupIds } = payload;
          const currentMetadata = clients.get(ws) || { groupIds: new Set() };
          currentMetadata.userId = userId;
          if (groupIds && Array.isArray(groupIds)) {
            currentMetadata.groupIds = new Set(groupIds);
          }
          clients.set(ws, currentMetadata);
          console.log(`WS User Online Sync: user ${userId}, watching groups: ${Array.from(currentMetadata.groupIds).join(', ')}`);
        } else if (payload.type === 'join_group') {
          const { groupId } = payload;
          const currentMetadata = clients.get(ws) || { groupIds: new Set() };
          currentMetadata.groupIds.add(groupId);
          clients.set(ws, currentMetadata);
          console.log(`WS User joined group channel: ${groupId}`);
        }
      } catch (err) {
        console.error('Error handling WebSocket message payload:', err);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      console.log('WS User connection terminated');
    });

    ws.on('error', (err) => {
      console.error('WS Connection error:', err);
      clients.delete(ws);
    });
  });
}

startServer().catch(err => {
  console.error("Error launching FairShare AI Service:", err);
});
