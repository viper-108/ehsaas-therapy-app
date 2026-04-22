import nodemailer from 'nodemailer';
import { Resend } from 'resend';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'shukla.amitedcjss@gmail.com,Pdsethia17@gmail.com').split(',').map(e => e.trim());
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
// Resend default is onboarding@resend.dev — only delivers to account owner.
// Set RESEND_FROM=sessions@ehsaastherapycentre.com once you verify the domain in Resend dashboard.
const RESEND_FROM = process.env.RESEND_FROM || 'onboarding@resend.dev';

export const sendEmail = async (to, subject, html, attachments = []) => {
  // 1. Prefer Resend if configured
  const resend = getResend();
  if (resend) {
    try {
      const payload = {
        from: `${FROM_NAME} <${RESEND_FROM}>`,
        to: Array.isArray(to) ? to : to.split(',').map(s => s.trim()),
        subject,
        html,
      };
      if (attachments.length) {
        payload.attachments = attachments.map(a => ({
          filename: a.filename,
          content: a.content, // Buffer or base64 string
        }));
      }
      const { data, error } = await resend.emails.send(payload);
      if (error) {
        console.error(`[EMAIL ERROR] Resend failed for ${to}: ${error.message || JSON.stringify(error)}`);
        return { success: false, error: error.message || 'Resend error' };
      }
      console.log(`[EMAIL] Sent (resend) to ${to}: ${subject}${attachments.length ? ` (${attachments.length} attachments)` : ''}`);
      return { success: true, id: data?.id };
    } catch (error) {
      console.error(`[EMAIL ERROR] Resend threw for ${to}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  // 2. Fall back to SMTP (Gmail)
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
      console.log(`[EMAIL] Sent (smtp) to ${to}: ${subject}${attachments.length ? ` (${attachments.length} attachments)` : ''}`);
      return { success: true };
    } catch (error) {
      console.error(`[EMAIL ERROR] SMTP failed to send to ${to}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  // 3. No email provider configured — mock log
  console.log(`[EMAIL MOCK] To: ${to}`);
  console.log(`[EMAIL MOCK] Subject: ${subject}`);
  console.log(`[EMAIL MOCK] Body preview: ${html.substring(0, 200)}...`);
  if (attachments.length) console.log(`[EMAIL MOCK] Attachments: ${attachments.map(a => a.filename).join(', ')}`);
  return { success: true, mock: true };
};

// Notify admins about a new therapist onboarding request
export const sendOnboardingNotification = async (therapist) => {
  const pricing = therapist.pricing instanceof Map
    ? Object.fromEntries(therapist.pricing)
    : therapist.pricing || {};

  const pricingHtml = Object.entries(pricing)
    .map(([d, p]) => `<li>₹${p} / ${d} minutes</li>`)
    .join('');

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
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Specializations</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${(therapist.specializations || []).join(', ')}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Languages</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${(therapist.languages || []).join(', ')}</td></tr>
      </table>
      ${therapist.bio ? `<p><strong>Bio:</strong> ${therapist.bio}</p>` : ''}
      ${pricingHtml ? `<p><strong>Pricing:</strong></p><ul>${pricingHtml}</ul>` : ''}
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

// Notify therapist that they've been rejected
export const sendRejectionEmail = async (therapist, reason) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #dc2626;">Profile Update — ${therapist.name}</h2>
      <p>Thank you for your interest in joining Ehsaas Therapy Centre.</p>
      <p>After reviewing your profile, we are unable to approve your application at this time.</p>
      ${reason ? `<div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 16px; margin: 16px 0; border-radius: 4px;"><strong>Reason:</strong> ${reason}</div>` : ''}
      <p>If you believe this was a mistake or would like to update your profile and reapply, please contact us at <a href="mailto:sessions.ehsaas@gmail.com">sessions.ehsaas@gmail.com</a>.</p>
      <br/>
      <p style="color: #666; font-size: 12px; margin-top: 30px;">— Ehsaas Therapy Centre Team</p>
    </div>
  `;

  return sendEmail(therapist.email, 'Ehsaas Profile Review Update', html);
};
