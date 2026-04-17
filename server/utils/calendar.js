import Settings from '../models/Settings.js';

/**
 * Generate an ICS calendar event string
 */
export const generateICS = ({ title, description, startDate, startTime, endTime, duration, location, organizerEmail, attendees = [] }) => {
  // Parse date and times
  const date = new Date(startDate);
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  const dtStart = new Date(date);
  dtStart.setHours(startH, startM, 0, 0);
  const dtEnd = new Date(date);
  dtEnd.setHours(endH, endM, 0, 0);

  const formatDT = (d) => {
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  const uid = `ehsaas-${Date.now()}-${Math.random().toString(36).substring(2, 8)}@ehsaas.com`;
  const now = formatDT(new Date());

  let attendeeLines = '';
  for (const a of attendees) {
    attendeeLines += `ATTENDEE;CN=${a.name};RSVP=TRUE:mailto:${a.email}\r\n`;
  }

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ehsaas Therapy Centre//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${formatDT(dtStart)}`,
    `DTEND:${formatDT(dtEnd)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${(description || '').replace(/\n/g, '\\n')}`,
    location ? `LOCATION:${location}` : '',
    organizerEmail ? `ORGANIZER;CN=Ehsaas Therapy Centre:mailto:${organizerEmail}` : '',
    attendeeLines.trim(),
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Session reminder - 30 minutes',
    'END:VALARM',
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Session reminder - 1 hour',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');

  return ics;
};

/**
 * Generate ICS for a therapy session booking
 */
export const generateSessionICS = async (session, therapist, client) => {
  let tnc = '';
  try {
    tnc = await Settings.get('clientTermsAndConditions', '');
    if (tnc) tnc = '\n\n--- TERMS & CONDITIONS ---\n' + tnc.substring(0, 500) + '...\nFull T&C at ehsaastherapycentre.com/faqs';
  } catch {}

  const description = [
    `Therapy Session with ${therapist.name}`,
    `Duration: ${session.duration} minutes`,
    `Amount: ₹${session.amount}`,
    `\nPlease join on time. Late arrivals may result in a shortened session.`,
    `\nCancellation Policy: Sessions cannot be cancelled within 24 hours of the scheduled time.`,
    tnc,
  ].join('\n');

  return generateICS({
    title: `Therapy Session — ${therapist.name}`,
    description,
    startDate: session.date,
    startTime: session.startTime,
    endTime: session.endTime,
    duration: session.duration,
    organizerEmail: 'sessions.ehsaas@gmail.com',
    attendees: [
      { name: client.name, email: client.email },
      { name: therapist.name, email: therapist.email },
    ],
  });
};

/**
 * Generate ICS for an interview
 */
export const generateInterviewICS = (interview, therapist, admin) => {
  return generateICS({
    title: `Ehsaas Interview — ${therapist.name}`,
    description: `Onboarding interview for ${therapist.name}\nMeeting Link: ${interview.meetingLink}\n${interview.notes || ''}`,
    startDate: interview.scheduledDate,
    startTime: interview.scheduledTime,
    endTime: (() => {
      const [h, m] = interview.scheduledTime.split(':').map(Number);
      const endH = h + 1;
      return `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    })(),
    organizerEmail: admin.email,
    attendees: [
      { name: therapist.name, email: therapist.email },
      { name: admin.name, email: admin.email },
    ],
  });
};
