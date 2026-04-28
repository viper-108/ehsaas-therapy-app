import express from 'express';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import therapistRoutes from './routes/therapists.js';
import sessionRoutes from './routes/sessions.js';
import paymentRoutes from './routes/payments.js';
import adminRoutes from './routes/admin.js';
import reviewRoutes from './routes/reviews.js';
import waitlistRoutes from './routes/waitlist.js';
import messageRoutes from './routes/messages.js';
import blockRoutes from './routes/blocks.js';
import settingsRoutes from './routes/settings.js';
import introCallRoutes from './routes/introCalls.js';
import groupSessionRoutes from './routes/groupSessions.js';
import supervisionRoutes from './routes/supervision.js';
import payoutRoutes from './routes/payouts.js';
import resourceRoutes from './routes/resources.js';
import blogPostRoutes from './routes/blogPosts.js';
import notificationRoutes from './routes/notifications.js';
import discountRoutes from './routes/discounts.js';
import contactRoutes from './routes/contact.js';
import prescriptionRoutes from './routes/prescriptions.js';
import { startReminderScheduler } from './utils/reminders.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5001;

const corsOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5174',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
];

// Socket.io
const io = new SocketIO(httpServer, {
  cors: { origin: corsOrigins, credentials: true }
});

// Store io on app for use in route handlers
app.set('io', io);

// Socket.io auth + room management
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    socket.userRole = decoded.role;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  // Join user's personal room for direct messages
  socket.join(`user_${socket.userId}`);
  console.log(`[SOCKET] ${socket.userRole} ${socket.userId} connected`);

  // Join conversation rooms
  socket.on('join_conversation', (conversationKey) => {
    socket.join(`conv_${conversationKey}`);
  });

  // Typing indicator
  socket.on('typing', ({ conversationKey, isTyping }) => {
    socket.to(`conv_${conversationKey}`).emit('user_typing', {
      userId: socket.userId,
      isTyping,
    });
  });

  socket.on('disconnect', () => {
    console.log(`[SOCKET] ${socket.userId} disconnected`);
  });
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/therapists', therapistRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/blocks', blockRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/intro-calls', introCallRoutes);
app.use('/api/group-sessions', groupSessionRoutes);
app.use('/api/supervision', supervisionRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/blog-posts', blogPostRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
import('./routes/priceNegotiations.js').then(m => app.use('/api/price-negotiations', m.default)).catch(e => console.error('priceNegotiations route load failed:', e));
import('./routes/groupTherapy.js').then(m => app.use('/api/group-therapy', m.default)).catch(e => console.error('groupTherapy route load failed:', e));

// Static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Favicon — explicit route with no-cache so browsers always pick up the latest Ehsaas icon
// (Browsers fetch /favicon.ico for any tab including PDF previews from /uploads/...)
app.get('/favicon.ico', (req, res) => {
  const distFav = path.join(__dirname, '..', 'dist', 'favicon.ico');
  const publicFav = path.join(__dirname, '..', 'public', 'favicon.ico');
  const file = fs.existsSync(distFav) ? distFav : publicFav;
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  if (fs.existsSync(file)) return res.sendFile(file);
  res.status(404).end();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend build in production (synchronous so SPA fallback is registered before httpServer.listen)
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // SPA fallback: serve index.html for any non-API, non-static-file route
  app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
  console.log('Serving frontend from dist/');
} else {
  console.log('No dist/ folder found — frontend will not be served');
}

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Start session reminder scheduler
  startReminderScheduler();
});
