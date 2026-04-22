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

// GET /api/messages/contacts — list all users I can message (based on session history)
router.get('/contacts', protect, async (req, res) => {
  try {
    const Client = (await import('../models/Client.js')).default;
    const Therapist = (await import('../models/Therapist.js')).default;

    let contacts = [];

    const userOid = new mongoose.Types.ObjectId(req.userId);

    if (req.userRole === 'client') {
      // Client sees all therapists they've booked/had sessions with
      const sessions = await Session.find({ clientId: userOid }).distinct('therapistId');
      const therapists = await Therapist.find({ _id: { $in: sessions }, isApproved: true })
        .select('name title image specializations');

      // Check block status for each
      for (const t of therapists) {
        const blocked = await isBlocked(req.userId, t._id.toString());
        const iBlockedThem = !!(await Block.findOne({ blockerId: req.userId, blockedId: t._id }));
        contacts.push({
          _id: t._id,
          name: t.name,
          title: t.title,
          image: t.image,
          role: 'therapist',
          specializations: t.specializations,
          isBlocked: blocked,
          iBlockedThem,
        });
      }
    } else if (req.userRole === 'therapist') {
      // Therapist sees all clients who booked/had sessions with them
      const sessions = await Session.find({ therapistId: userOid }).distinct('clientId');
      const clients = await Client.find({ _id: { $in: sessions } })
        .select('name email phone');

      for (const c of clients) {
        const blocked = await isBlocked(req.userId, c._id.toString());
        const iBlockedThem = !!(await Block.findOne({ blockerId: req.userId, blockedId: c._id }));
        contacts.push({
          _id: c._id,
          name: c.name,
          email: c.email,
          role: 'client',
          isBlocked: blocked,
          iBlockedThem,
        });
      }
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

    // Verify session relationship
    const hasRelation = await hasSessionRelationship(req.userId, req.userRole, receiverId);
    if (!hasRelation) {
      // Also allow if there's already an existing conversation
      const convKey = Message.getConversationKey(req.userId, receiverId);
      const existingConv = await Message.findOne({ conversationKey: convKey });
      if (!existingConv) {
        return res.status(403).json({ message: 'You can only message therapists you have booked sessions with.' });
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
