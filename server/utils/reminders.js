import Session from '../models/Session.js';
import Reminder from '../models/Reminder.js';
import Client from '../models/Client.js';
import Therapist from '../models/Therapist.js';
import Notification from '../models/Notification.js';
import { sendEmail } from './email.js';

const REMINDER_TYPES = [
  { type: '24h', hoursBeforeSession: 24 },
  { type: '1h', hoursBeforeSession: 1 },
  { type: '15min', hoursBeforeSession: 0.25 },
];

export const checkAndSendReminders = async () => {
  try {
    const now = new Date();

    // Find upcoming scheduled sessions within the next 25 hours
    const cutoff = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    const sessions = await Session.find({
      status: 'scheduled',
      date: { $gte: now, $lte: cutoff },
    }).populate('clientId', 'name email').populate('therapistId', 'name email');

    for (const session of sessions) {
      // Calculate session datetime
      const sessionDate = new Date(session.date);
      const [h, m] = session.startTime.split(':');
      sessionDate.setHours(parseInt(h), parseInt(m), 0, 0);

      for (const { type, hoursBeforeSession } of REMINDER_TYPES) {
        const reminderTime = new Date(sessionDate.getTime() - hoursBeforeSession * 60 * 60 * 1000);

        // Skip if reminder time is in the past or more than 5 min in the future
        if (reminderTime < new Date(now.getTime() - 5 * 60 * 1000)) continue;
        if (reminderTime > new Date(now.getTime() + 5 * 60 * 1000)) continue;

        // Check if already sent
        const existing = await Reminder.findOne({ sessionId: session._id, type });
        if (existing) continue;

        // Create reminder record
        await Reminder.create({
          sessionId: session._id,
          clientId: session.clientId._id,
          therapistId: session.therapistId._id,
          type,
          scheduledAt: reminderTime,
          sentAt: now,
          status: 'sent',
        });

        // Build reminder content
        const timeLabel = type === '24h' ? '24 hours' : type === '1h' ? '1 hour' : '15 minutes';
        const dateStr = sessionDate.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' });

        const html = `
          <div style="font-family: Arial; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #E78824;">Session Reminder - ${timeLabel} to go!</h2>
            <p>Your therapy session is coming up in <strong>${timeLabel}</strong>.</p>
            <table style="width:100%; border-collapse:collapse; margin:15px 0;">
              <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Date</td><td style="padding:8px; border:1px solid #ddd;">${dateStr}</td></tr>
              <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Time</td><td style="padding:8px; border:1px solid #ddd;">${session.startTime} - ${session.endTime}</td></tr>
              <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Duration</td><td style="padding:8px; border:1px solid #ddd;">${session.duration} min</td></tr>
            </table>
            <p>Please ensure you're ready on time. Late arrivals may result in a shortened session.</p>
          </div>`;

        // Send to client
        if (session.clientId?.email) {
          sendEmail(
            session.clientId.email,
            `Reminder: Session in ${timeLabel} with ${session.therapistId?.name || 'your therapist'}`,
            html
          ).catch(e => console.error('[REMINDER] Client email error:', e.message));
        }

        // Send to therapist
        if (session.therapistId?.email) {
          const therapistHtml = html.replace('Your therapy session', `Session with ${session.clientId?.name || 'client'}`);
          sendEmail(
            session.therapistId.email,
            `Reminder: Session in ${timeLabel} with ${session.clientId?.name || 'client'}`,
            therapistHtml
          ).catch(e => console.error('[REMINDER] Therapist email error:', e.message));
        }

        // Create in-app notifications
        if (session.clientId?._id) {
          Notification.notify(session.clientId._id, 'client', 'session_reminder',
            `Session in ${timeLabel}`,
            `Your session with ${session.therapistId?.name || 'therapist'} is in ${timeLabel}`,
            '/client-dashboard?tab=upcoming'
          ).catch(() => {});
        }

        console.log(`[REMINDER] Sent ${type} reminder for session ${session._id}`);
      }
    }
  } catch (error) {
    console.error('[REMINDER] Check error:', error.message);
  }
};

// Start the reminder check interval (every 5 minutes)
export const startReminderScheduler = () => {
  console.log('[REMINDER] Scheduler started (checks every 5 minutes)');
  setInterval(checkAndSendReminders, 5 * 60 * 1000);
  // Also run once immediately
  checkAndSendReminders();
};
