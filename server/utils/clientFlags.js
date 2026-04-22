import Client from '../models/Client.js';
import Session from '../models/Session.js';
import Notification from '../models/Notification.js';
import Admin from '../models/Admin.js';
import { sendEmail } from './email.js';

const FLAG_THRESHOLD = 3;

// Notify all admins about a flagged client
async function notifyAdmins(client, flagType) {
  const admins = await Admin.find({}).select('_id name email');
  const messages = {
    highCancellations: `Client "${client.name}" has cancelled ${client.cancellationCount} sessions`,
    highNoShows: `Client "${client.name}" has ${client.noShowCount} no-show sessions`,
    frequentTherapistChanges: `Client "${client.name}" has switched therapists ${FLAG_THRESHOLD}+ times`,
  };
  const title = 'Client Flagged';
  const body = messages[flagType] || `Client "${client.name}" was flagged`;
  const link = `/admin-dashboard?tab=clients&clientId=${client._id}`;

  for (const admin of admins) {
    await Notification.notify(admin._id, 'admin', 'client_flagged', title, body, link);
  }
  // Best-effort email
  const toList = admins.map(a => a.email).filter(Boolean).join(',');
  if (toList) {
    const html = `<p>${body}.</p><p>View in admin dashboard: <a href="${process.env.CLIENT_URL || ''}${link}">Open client</a></p>`;
    await sendEmail(toList, `[Ehsaas] ${title}: ${client.name}`, html);
  }
}

// Check and flag for high cancellations
export async function checkCancellationFlag(clientId) {
  const client = await Client.findById(clientId);
  if (!client) return;
  const count = await Session.countDocuments({ clientId, status: 'cancelled' });
  client.cancellationCount = count;
  if (count >= FLAG_THRESHOLD && !client.flags?.highCancellations) {
    client.flags = { ...(client.flags || {}), highCancellations: true };
    await client.save();
    await notifyAdmins(client, 'highCancellations');
  } else {
    await client.save();
  }
}

// Check and flag for high no-shows
export async function checkNoShowFlag(clientId) {
  const client = await Client.findById(clientId);
  if (!client) return;
  const count = await Session.countDocuments({ clientId, status: 'no-show' });
  client.noShowCount = count;
  if (count >= FLAG_THRESHOLD && !client.flags?.highNoShows) {
    client.flags = { ...(client.flags || {}), highNoShows: true };
    await client.save();
    await notifyAdmins(client, 'highNoShows');
  } else {
    await client.save();
  }
}

// Check and flag for frequent therapist changes (3+ distinct therapists)
export async function checkTherapistChangeFlag(clientId) {
  const client = await Client.findById(clientId);
  if (!client) return;
  const distinct = await Session.distinct('therapistId', { clientId });
  if (distinct.length >= FLAG_THRESHOLD && !client.flags?.frequentTherapistChanges) {
    client.flags = { ...(client.flags || {}), frequentTherapistChanges: true };
    await client.save();
    await notifyAdmins(client, 'frequentTherapistChanges');
  }
}
