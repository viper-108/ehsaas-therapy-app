import ChatGroup from '../models/ChatGroup.js';
import Client from '../models/Client.js';
import Therapist from '../models/Therapist.js';
import Notification from '../models/Notification.js';
import { sendEmail } from './email.js';

/**
 * Ensure a 3-way couples chat group exists (therapist + both partners).
 * Idempotent — call freely after every couples session booking.
 *
 * Conditions for creation:
 *   - Both clients must have couplesProfile.isApprovedByAdmin === true
 *   - They must be linked partners (couplesProfile.partnerId points to each other)
 *
 * If a chat group already exists for this trio, no-op.
 */
export const ensureCouplesChatGroup = async (therapistId, clientId) => {
  if (!therapistId || !clientId) return null;

  const me = await Client.findById(clientId).select('name email couplesProfile');
  if (!me?.couplesProfile?.partnerId) return null;
  if (!me.couplesProfile.isApprovedByAdmin) return null;

  const partner = await Client.findById(me.couplesProfile.partnerId).select('name email couplesProfile');
  if (!partner) return null;
  if (!partner.couplesProfile?.isApprovedByAdmin) return null;
  // Verify the partner is linked back
  if (String(partner.couplesProfile?.partnerId) !== String(me._id)) return null;

  const therapist = await Therapist.findById(therapistId).select('name email');
  if (!therapist) return null;

  // Check if a chat group already exists with this trio (any matching group)
  const trio = [String(therapistId), String(me._id), String(partner._id)].sort().join('-');
  const existing = await ChatGroup.findOne({
    ownerTherapistId: therapistId,
    'members.userId': { $all: [me._id, partner._id, therapist._id] },
    isActive: true,
  });
  if (existing) return existing;

  const group = await ChatGroup.create({
    name: `Couples: ${me.name} & ${partner.name}`,
    description: `Private couples chat with ${therapist.name}`,
    ownerTherapistId: therapistId,
    members: [
      { userId: therapistId, role: 'therapist' },
      { userId: me._id, role: 'client' },
      { userId: partner._id, role: 'client' },
    ],
  });

  // Notify all 3 members
  Notification.notify(therapist._id, 'therapist', 'group_added',
    `Couples chat created: ${me.name} & ${partner.name}`,
    'A private 3-way chat has been opened with both partners.',
    '/messages'
  ).catch(() => {});
  for (const c of [me, partner]) {
    Notification.notify(c._id, 'client', 'group_added',
      `Couples chat opened with ${therapist.name}`,
      `A private 3-way chat is now open with you, your partner, and ${therapist.name}.`,
      '/messages'
    ).catch(() => {});
    if (c.email) {
      sendEmail(c.email, `Your couples chat is open — Ehsaas`,
        `<p>Hi ${c.name},</p><p>A private chat group has been opened with you, your partner ${c._id.equals(me._id) ? partner.name : me.name}, and your therapist <strong>${therapist.name}</strong>.</p><p>Open Messages on your dashboard to begin.</p>`
      ).catch(() => {});
    }
  }

  return group;
};
