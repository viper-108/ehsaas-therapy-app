import express from 'express';
import mongoose from 'mongoose';
import Message from '../models/Message.js';
import Session from '../models/Session.js';
import Block from '../models/Block.js';
import Therapist from '../models/Therapist.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Check if either user blocked the other
const isBlocked = async (userId1, userId2) => {
  const block = await Block.findOne({
    $or: [
      { blockerId: userId1, blockedId: userId2 },
      { blockerId: userId2, blockedId: userId1 },
    ]
  });
  return !!block;
};

// Verify users have a session/booking relationship
const hasSessionRelationship = async (userId, userRole, otherUserId) => {
  if (userRole === 'client') {
    return !!(await Session.findOne({ clientId: userId, therapistId: otherUserId }));
  } else {
    return !!(await Session.findOne({ therapistId: userId, clientId: otherUserId }));
  }
};

// GET /api/messages/contacts — list users I can message
//   default — only people I have a session relationship with (used by ConversationList)
//   ?scope=all — full directory used by "Start a chat" picker:
//     - client: all approved therapists + admins
//     - therapist: all approved therapists (peer chat) + their own clients + admins
//     - admin: all approved therapists + all clients
router.get('/contacts', protect, async (req, res) => {
  try {
    const Client = (await import('../models/Client.js')).default;
    const Therapist = (await import('../models/Therapist.js')).default;
    const Admin = (await import('../models/Admin.js')).default;

    const scope = req.query.scope || 'sessions';
    const contacts = [];
    const userOid = new mongoose.Types.ObjectId(req.userId);

    const pushTherapist = async (t) => {
      const blocked = await isBlocked(req.userId, t._id.toString());
      const iBlockedThem = !!(await Block.findOne({ blockerId: req.userId, blockedId: t._id }));
      contacts.push({
        _id: t._id, name: t.name, title: t.title, image: t.image, role: 'therapist',
        specializations: t.specializations, isBlocked: blocked, iBlockedThem,
      });
    };
    const pushClient = async (c) => {
      const blocked = await isBlocked(req.userId, c._id.toString());
      const iBlockedThem = !!(await Block.findOne({ blockerId: req.userId, blockedId: c._id }));
      contacts.push({
        _id: c._id, name: c.name, email: c.email, role: 'client',
        isBlocked: blocked, iBlockedThem,
      });
    };
    const pushAdmin = async (a) => {
      contacts.push({ _id: a._id, name: a.name || 'Ehsaas Admin', role: 'admin', email: a.email });
    };

    if (req.userRole === 'client') {
      if (scope === 'all') {
        const therapists = await Therapist.find({ isApproved: true, accountStatus: { $ne: 'past' } }).select('name title image specializations');
        for (const t of therapists) await pushTherapist(t);
      } else {
        const sessions = await Session.find({ clientId: userOid }).distinct('therapistId');
        const therapists = await Therapist.find({ _id: { $in: sessions }, isApproved: true }).select('name title image specializations');
        for (const t of therapists) await pushTherapist(t);
      }
      // Admin always available for support
      const admins = await Admin.find({}).select('name email');
      for (const a of admins) await pushAdmin(a);
    } else if (req.userRole === 'therapist') {
      if (scope === 'all') {
        const peerTherapists = await Therapist.find({ _id: { $ne: userOid }, isApproved: true, accountStatus: { $ne: 'past' } }).select('name title image specializations');
        for (const t of peerTherapists) await pushTherapist(t);
      }
      // Their own clients (always)
      const sessions = await Session.find({ therapistId: userOid }).distinct('clientId');
      const clients = await Client.find({ _id: { $in: sessions } }).select('name email phone');
      for (const c of clients) await pushClient(c);
      // Admin (so therapists can message admin during onboarding/anytime)
      const admins = await Admin.find({}).select('name email');
      for (const a of admins) await pushAdmin(a);
    } else if (req.userRole === 'admin') {
      const therapists = await Therapist.find({ accountStatus: { $ne: 'past' } }).select('name title image');
      for (const t of therapists) await pushTherapist(t);
      const clients = await Client.find({}).select('name email');
      for (const c of clients) await pushClient(c);
    }

    res.json(contacts);
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/messages/conversations — list all conversations
router.get('/conversations', protect, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);

    const messages = await Message.aggregate([
      { $match: { $or: [{ senderId: userId }, { receiverId: userId }] } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$conversationKey',
          lastMessage: { $first: '$content' },
          lastMessageAt: { $first: '$createdAt' },
          senderRole: { $first: '$senderRole' },
          senderId: { $first: '$senderId' },
          receiverId: { $first: '$receiverId' },
        }
      },
      { $sort: { lastMessageAt: -1 } }
    ]);

    const Client = (await import('../models/Client.js')).default;
    const Therapist = (await import('../models/Therapist.js')).default;

    const conversations = [];
    for (const msg of messages) {
      const ids = msg._id.split('_');
      const otherUserId = ids[0] === req.userId.toString() ? ids[1] : ids[0];

      let otherUser = await Therapist.findById(otherUserId).select('name title image');
      let otherRole = 'therapist';
      if (!otherUser) {
        otherUser = await Client.findById(otherUserId).select('name email');
        otherRole = 'client';
      }
      if (!otherUser) {
        const Admin = (await import('../models/Admin.js')).default;
        otherUser = await Admin.findById(otherUserId).select('name email');
        if (otherUser) otherRole = 'admin';
      }

      const unreadCount = await Message.countDocuments({
        conversationKey: msg._id,
        receiverId: userId,
        read: false,
      });

      // Check block status
      const blocked = await isBlocked(req.userId, otherUserId);
      const iBlockedThem = !!(await Block.findOne({ blockerId: req.userId, blockedId: otherUserId }));

      conversations.push({
        conversationKey: msg._id,
        otherUser: otherUser ? { _id: otherUserId, name: otherUser.name, title: otherUser.title, image: otherUser.image, role: otherRole } : null,
        lastMessage: msg.lastMessage,
        lastMessageAt: msg.lastMessageAt,
        unreadCount,
        isBlocked: blocked,
        iBlockedThem,
      });
    }

    res.json(conversations);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/messages/unread/count — total unread count (MUST be before /:conversationKey)
router.get('/unread/count', protect, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiverId: new mongoose.Types.ObjectId(req.userId),
      read: false,
    });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/messages/:conversationKey — get message history
router.get('/:conversationKey', protect, async (req, res) => {
  try {
    const { conversationKey } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const before = req.query.before;

    let query = { conversationKey };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/messages — send a message
router.post('/', protect, async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    if (!receiverId || !content?.trim()) {
      return res.status(400).json({ message: 'receiverId and content are required' });
    }

    // Check block status first
    const blocked = await isBlocked(req.userId, receiverId);
    if (blocked) {
      return res.status(403).json({ message: 'Cannot send messages. This user is blocked.' });
    }

    // If receiver is a soft-deleted therapist, block the message
    const receiverTherapist = await Therapist.findById(receiverId).select('accountStatus');
    if (receiverTherapist && receiverTherapist.accountStatus === 'past') {
      return res.status(400).json({ message: 'This therapist is no longer available.' });
    }

    // Determine receiver role to allow flexible chat permissions:
    // - Anyone ↔ admin: always allowed (for #17 onboarding/support)
    // - Client ↔ Therapist: allowed (booking relationship not required for first message)
    // - Therapist ↔ Therapist: allowed (peer support / referrals)
    // - Therapist ↔ Client: allowed for the therapist's existing clients OR if conversation already exists
    const Admin = (await import('../models/Admin.js')).default;
    const ClientModel = (await import('../models/Client.js')).default;
    const TherapistModel = (await import('../models/Therapist.js')).default;
    const isAdminReceiver = !!(await Admin.findById(receiverId).select('_id'));
    const isClientReceiver = !!(await ClientModel.findById(receiverId).select('_id'));
    const isTherapistReceiver = !!(await TherapistModel.findById(receiverId).select('_id'));
    const isAdminSender = req.userRole === 'admin';

    // Reject if receiver doesn't exist anywhere
    if (!isAdminReceiver && !isClientReceiver && !isTherapistReceiver) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    // Allow chat in these scenarios; otherwise fall back to session relationship check
    const allowed =
      isAdminSender || isAdminReceiver ||                                  // admin chats with anyone
      (req.userRole === 'client' && isTherapistReceiver) ||                 // client → therapist (any)
      (req.userRole === 'therapist' && isTherapistReceiver);                // therapist → therapist (peer)

    if (!allowed) {
      // Therapist → client requires existing session, or pre-existing conversation
      const hasRelation = await hasSessionRelationship(req.userId, req.userRole, receiverId);
      if (!hasRelation) {
        const convKey = Message.getConversationKey(req.userId, receiverId);
        const existingConv = await Message.findOne({ conversationKey: convKey });
        if (!existingConv) {
          return res.status(403).json({ message: 'You can only message clients you have a session with.' });
        }
      }
    }

    const conversationKey = Message.getConversationKey(req.userId, receiverId);

    const message = await Message.create({
      senderId: req.userId,
      senderRole: req.userRole,
      receiverId,
      conversationKey,
      content: content.trim(),
    });

    // Emit via socket.io if available
    if (req.app.get('io')) {
      const io = req.app.get('io');
      io.to(`user_${receiverId}`).emit('new_message', {
        ...message.toObject(),
        conversationKey,
      });
    }

    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============== GROUP CHAT ROUTES ==============

// POST /api/messages/groups — therapist creates a new group with selected clients
router.post('/groups', protect, async (req, res) => {
  try {
    if (req.userRole !== 'therapist') return res.status(403).json({ message: 'Only therapists can create groups' });
    const { name, description, clientIds } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ message: 'Group name is required' });
    if (!Array.isArray(clientIds) || clientIds.length === 0) {
      return res.status(400).json({ message: 'At least one client must be added to the group' });
    }

    // Verify all clients are this therapist's clients (have at least one session together)
    const ownsClients = await Session.find({
      therapistId: req.userId,
      clientId: { $in: clientIds },
    }).distinct('clientId').then(arr => new Set(arr.map(String)));
    const invalid = clientIds.filter(id => !ownsClients.has(String(id)));
    if (invalid.length > 0) {
      return res.status(400).json({ message: 'You can only add your own clients to a group' });
    }

    const ChatGroup = (await import('../models/ChatGroup.js')).default;
    const group = await ChatGroup.create({
      name: name.trim(),
      description: description || '',
      ownerTherapistId: req.userId,
      members: [
        { userId: req.userId, role: 'therapist' },
        ...clientIds.map(cid => ({ userId: cid, role: 'client' })),
      ],
    });

    // Notify clients
    try {
      const Notification = (await import('../models/Notification.js')).default;
      for (const cid of clientIds) {
        Notification.notify(cid, 'client', 'group_added',
          'Added to a new group chat',
          `Your therapist created a new group "${group.name}". Open Messages to chat with the group.`,
          '/client-dashboard?tab=messages'
        ).catch(() => {});
      }
    } catch {}

    res.status(201).json(group);
  } catch (e) {
    console.error('Create group error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/messages/groups/my — list groups this user is a member of
router.get('/groups/my', protect, async (req, res) => {
  try {
    const ChatGroup = (await import('../models/ChatGroup.js')).default;
    const Client = (await import('../models/Client.js')).default;
    const TherapistModel = (await import('../models/Therapist.js')).default;
    const userOid = new mongoose.Types.ObjectId(req.userId);
    const groups = await ChatGroup.find({ 'members.userId': userOid, isActive: true }).sort({ updatedAt: -1 });

    // Hydrate member names
    const allMemberIds = new Set();
    groups.forEach(g => g.members.forEach(m => allMemberIds.add(String(m.userId))));
    const ids = Array.from(allMemberIds);
    const [therapists, clients] = await Promise.all([
      TherapistModel.find({ _id: { $in: ids } }).select('name title'),
      Client.find({ _id: { $in: ids } }).select('name email'),
    ]);
    const nameMap = new Map();
    therapists.forEach(t => nameMap.set(String(t._id), { name: t.name, title: t.title, role: 'therapist' }));
    clients.forEach(c => nameMap.set(String(c._id), { name: c.name, email: c.email, role: 'client' }));

    const hydrated = groups.map(g => ({
      ...g.toObject(),
      members: g.members.map(m => ({
        userId: m.userId,
        role: m.role,
        ...(nameMap.get(String(m.userId)) || { name: 'Unknown' }),
      })),
    }));

    res.json(hydrated);
  } catch (e) {
    console.error('Get my groups error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/messages/groups/:groupId/messages — send a message to a group
router.post('/groups/:groupId/messages', protect, async (req, res) => {
  try {
    const { content } = req.body || {};
    if (!content?.trim()) return res.status(400).json({ message: 'Message content required' });

    const ChatGroup = (await import('../models/ChatGroup.js')).default;
    const group = await ChatGroup.findById(req.params.groupId);
    if (!group || !group.isActive) return res.status(404).json({ message: 'Group not found' });

    const isMember = group.members.some(m => String(m.userId) === String(req.userId));
    if (!isMember) return res.status(403).json({ message: 'You are not a member of this group' });

    const conversationKey = `group_${group._id}`;
    const message = await Message.create({
      senderId: req.userId,
      senderRole: req.userRole,
      receiverId: null,
      groupId: group._id,
      conversationKey,
      content: content.trim(),
    });

    // Emit to all other members via socket.io
    if (req.app.get('io')) {
      const io = req.app.get('io');
      for (const m of group.members) {
        if (String(m.userId) === String(req.userId)) continue;
        io.to(`user_${m.userId}`).emit('new_message', { ...message.toObject(), conversationKey });
      }
    }

    res.status(201).json(message);
  } catch (e) {
    console.error('Group send error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/messages/groups/:groupId/messages — message history
router.get('/groups/:groupId/messages', protect, async (req, res) => {
  try {
    const ChatGroup = (await import('../models/ChatGroup.js')).default;
    const group = await ChatGroup.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    const isMember = group.members.some(m => String(m.userId) === String(req.userId));
    if (!isMember) return res.status(403).json({ message: 'Not a member' });
    const messages = await Message.find({ groupId: group._id }).sort({ createdAt: 1 }).limit(200);
    res.json(messages);
  } catch (e) {
    console.error('Group messages error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/messages/:conversationKey/read — mark messages as read
router.put('/:conversationKey/read', protect, async (req, res) => {
  try {
    await Message.updateMany(
      { conversationKey: req.params.conversationKey, receiverId: new mongoose.Types.ObjectId(req.userId), read: false },
      { read: true }
    );
    res.json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
