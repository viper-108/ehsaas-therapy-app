import nodemailer from 'nodemailer';
import { Resend } from 'resend';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'therapy.ehsaas@gmail.com,shukla.amitedcjss@gmail.com,Pdsethia17@gmail.com').split(',').map(e => e.trim());
const FROM_NAME = process.env.EMAIL_FROM_NAME || 'Ehsaas Therapy Centre';

// === RESEND (preferred — reliable on Railway) ===
let _resend = null;
const getResend = () => {
  if (!process.env.RESEND_API_KEY) return null;
  if (_resend) return _resend;
  _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
};

// === NODEMAILER / SMTP (fallback) ===
let _cachedTransporter = null;
const createTransporter = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) return null;
  if (_cachedTransporter) return _cachedTransporter;

  const port = Number(process.env.SMTP_PORT || 587);
  _cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
  });
  return _cachedTransporter;
};

const FROM_EMAIL_SMTP = process.env.EMAIL_USER || 'noreply@ehsaastherapy.com';
// Resend's default `onboarding@resend.dev` ONLY delivers to the Resend
// account owner email — every other recipient is silently dropped. So
// when RESEND_FROM isn't explicitly set, we log a loud warning and treat
// it as "Resend-only-to-owner" rather than a fully working provider.
const RESEND_FROM = process.env.RESEND_FROM || 'onboarding@resend.dev';
const RESEND_FROM_IS_DEFAULT = !process.env.RESEND_FROM;
if (RESEND_FROM_IS_DEFAULT && process.env.RESEND_API_KEY) {
  console.warn('[EMAIL] RESEND_FROM is unset — using `onboarding@resend.dev` which only delivers to the Resend account owner. Set RESEND_FROM=<verified domain> to deliver to everyone.');
}

// Resend attachments require `content` to be a Buffer or base64 string;
// many of our callers pass UTF-8 strings (e.g. .ics generated client-side).
// Normalise so a string is wrapped as a Buffer before sending.
const normaliseAttachment = (a) => ({
  filename: a.filename,
  content: typeof a.content === 'string' && !/^[A-Za-z0-9+/=\r\n]+$/.test(a.content)
    ? Buffer.from(a.content, 'utf8')
    : a.content,
});

export const sendEmail = async (to, subject, html, attachments = []) => {
  // 1. Try Resend first (configured + verified-domain FROM).
  const resend = getResend();
  let resendError = null;
  if (resend) {
    try {
      const payload = {
        from: `${FROM_NAME} <${RESEND_FROM}>`,
        to: Array.isArray(to) ? to : to.split(',').map(s => s.trim()),
        subject,
        html,
      };
      if (attachments.length) {
        payload.attachments = attachments.map(normaliseAttachment);
      }
      const { data, error } = await resend.emails.send(payload);
      if (error) {
        resendError = error.message || JSON.stringify(error);
        console.error(`[EMAIL ERROR] Resend failed for ${to}: ${resendError}`);
        // Fall through to SMTP below — Resend's free tier rejects every
        // non-owner recipient when RESEND_FROM=onboarding@resend.dev, so
        // SMTP is the only viable path until the domain is verified.
      } else {
        console.log(`[EMAIL] Sent (resend) to ${to}: ${subject}${attachments.length ? ` (${attachments.length} attachments)` : ''}`);
        return { success: true, id: data?.id };
      }
    } catch (error) {
      resendError = error.message;
      console.error(`[EMAIL ERROR] Resend threw for ${to}:`, error.message);
      // Fall through to SMTP.
    }
  }

  // 2. SMTP fallback (Gmail / other) — runs when Resend is not configured
  //    OR when Resend errored above. This is the safety net that fixes the
  //    "therapist isn't receiving email" reports caused by Resend's
  //    onboarding-only sandbox.
  const transporter = createTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"${FROM_NAME}" <${FROM_EMAIL_SMTP}>`,
        to,
        subject,
        html,
        attachments,
      });
      console.log(`[EMAIL] Sent (smtp${resendError ? ' fallback' : ''}) to ${to}: ${subject}${attachments.length ? ` (${attachments.length} attachments)` : ''}`);
      return { success: true };
    } catch (error) {
      console.error(`[EMAIL ERROR] SMTP failed to send to ${to}:`, error.message);
      return { success: false, error: error.message, resendError };
    }
  }

  // 3. No email provider configured at all — mock log so dev still works.
  if (resendError) {
    console.error(`[EMAIL] Resend failed and no SMTP fallback configured — email to ${to} NOT sent.`);
  }
  console.log(`[EMAIL MOCK] To: ${to}`);
  console.log(`[EMAIL MOCK] Subject: ${subject}`);
  console.log(`[EMAIL MOCK] Body preview: ${html.substring(0, 200)}...`);
  if (attachments.length) console.log(`[EMAIL MOCK] Attachments: ${attachments.map(a => a.filename).join(', ')}`);
  return { success: true, mock: true };
};

// Notify admins about a new therapist onboarding request.
// Includes a clear "Therapist hasn't selected any price range yet" status
// message when servicesOffered is empty (admin should ask during interview).
export const sendOnboardingNotification = async (therapist) => {
  const services = Array.isArray(therapist.servicesOffered) ? therapist.servicesOffered : [];
  const label = (t) => t === 'couple' ? 'Couples' : (t || 'service').charAt(0).toUpperCase() + (t || '').slice(1);
  const servicesHtml = services.length
    ? `<p><strong>Services & pricing therapist asked for:</strong></p><ul>${services.map(s => {
        const dps = Array.isArray(s.durationPricing) ? s.durationPricing : [];
        if (dps.length === 0) {
          return `<li>${label(s.type)} Therapy — ₹${s.minPrice ?? 0} to ₹${s.maxPrice ?? 0}</li>`;
        }
        const inner = dps.map(dp => `<li>${dp.duration} min — ₹${dp.minPrice ?? 0} to ₹${dp.maxPrice ?? 0}</li>`).join('');
        return `<li>${label(s.type)} Therapy<ul>${inner}</ul></li>`;
      }).join('')}</ul>`
    : `<div style="background:#fffbeb;border-left:4px solid #d97706;padding:12px 16px;margin:16px 0;border-radius:4px;">
         <strong>Status:</strong> Therapist hasn't selected any price range yet.
         <p style="margin:6px 0 0 0;color:#92400e;font-size:13px;">No services or pricing were submitted during onboarding. Ask during the interview, then set per-service prices from the admin dashboard after approval.</p>
       </div>`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2563eb;">New Therapist Onboarding Request</h2>
      <p>A new therapist has completed their onboarding and is awaiting approval.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Name</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${therapist.name}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Email</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${therapist.email}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Phone</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${therapist.phone || 'Not provided'}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Title</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${therapist.title}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Experience</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${therapist.experience} years</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Highest Education</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${therapist.highestEducation || 'Not provided'}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Specializations</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${(therapist.specializations || []).join(', ')}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Languages</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${(therapist.languages || []).join(', ')}</td></tr>
      </table>
      ${therapist.educationBackground ? `<p><strong>Education background:</strong> ${therapist.educationBackground}</p>` : ''}
      ${therapist.bio ? `<p><strong>Bio:</strong> ${therapist.bio}</p>` : ''}
      ${servicesHtml}
      <p style="margin-top: 20px; color: #666;">Please log in to the admin dashboard to review and approve/reject this application.</p>
    </div>
  `;

  const results = [];
  for (const email of ADMIN_EMAILS) {
    const result = await sendEmail(email, `New Therapist Request: ${therapist.name}`, html);
    results.push(result);
  }
  return results;
};

// Notify therapist that they've been approved
export const sendApprovalEmail = async (therapist) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #16a34a;">Congratulations, ${therapist.name}! 🎉</h2>
      <p>Your profile has been <strong>approved</strong> by the Ehsaas Therapy Centre team.</p>
      <p>You can now log in to your dashboard to:</p>
      <ul>
        <li>Set your availability for client bookings</li>
        <li>View and manage your sessions</li>
        <li>Track your earnings and performance</li>
      </ul>
      <p>Clients can now find and book sessions with you on the platform.</p>
      <br/>
      <p>Welcome to the Ehsaas family!</p>
      <p style="color: #666; font-size: 12px; margin-top: 30px;">— Ehsaas Therapy Centre Team</p>
    </div>
  `;

  return sendEmail(therapist.email, 'Your Ehsaas Profile Has Been Approved! ✅', html);
};

// Notify therapist that we're not moving forward with their profile right
// now. Per Ehsaas's preferred wording (rejection BEFORE interview): we're
// not hiring at the moment, the profile is saved, and we'd love them to
// volunteer for workshops while waiting. Rejections AFTER an interview
// carry admin's feedback in the `reason` arg and the email surfaces that
// inline as interview feedback.
export const sendRejectionEmail = async (therapist, reason) => {
  const hasFeedback = !!(reason && reason.trim());
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #dc2626;">Profile Update — ${therapist.name}</h2>
      <p>Thank you for your interest in joining Ehsaas Therapy Centre.</p>
      <p>
        We are currently not hiring but we are saving your profile for a future
        round of hiring. Until then you can volunteer to conduct workshops with us.
      </p>
      ${hasFeedback ? `<div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 16px; margin: 16px 0; border-radius: 4px;"><strong>Feedback from the review:</strong> ${reason}</div>` : ''}
      <p>
        You can keep your profile up to date from the dashboard and consider our
        supervision or training programs to grow your practice.
      </p>
      <p>If you have any questions, please reach out to <a href="mailto:therapy.ehsaas@gmail.com">therapy.ehsaas@gmail.com</a>.</p>
      <br/>
      <p style="color: #666; font-size: 12px; margin-top: 30px;">— Ehsaas Therapy Centre Team</p>
    </div>
  `;

  return sendEmail(therapist.email, 'Ehsaas Profile Review Update', html);
};
