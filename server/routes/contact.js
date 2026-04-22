import express from 'express';
import { sendEmail } from '../utils/email.js';

const router = express.Router();

const CONTACT_TO = 'sessions@ehsaastherapycentre.com';

// POST /api/contact — receive "Leave us a message" form submissions
router.post('/', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, subject, message } = req.body || {};

    if (!firstName || !lastName || !email || !subject || !message) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const fullName = `${firstName} ${lastName}`.trim();
    const emailSubject = `[Contact Form] ${subject}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #D97706; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">New Contact Form Submission</h2>
          <p style="margin: 4px 0 0;">Ehsaas Therapy Centre</p>
        </div>
        <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; width: 120px;"><strong>From:</strong></td>
              <td style="padding: 8px 0;">${fullName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;"><strong>Email:</strong></td>
              <td style="padding: 8px 0;"><a href="mailto:${email}">${email}</a></td>
            </tr>
            ${phone ? `
            <tr>
              <td style="padding: 8px 0; color: #6b7280;"><strong>Phone:</strong></td>
              <td style="padding: 8px 0;">${phone}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 8px 0; color: #6b7280;"><strong>Subject:</strong></td>
              <td style="padding: 8px 0;">${subject}</td>
            </tr>
          </table>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
          <h3 style="color: #374151; margin-bottom: 8px;">Message</h3>
          <div style="background: #f9fafb; padding: 16px; border-radius: 6px; white-space: pre-wrap;">${message}</div>
          <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
            Reply to this email directly to respond to ${fullName}.
          </p>
        </div>
      </div>
    `;

    const result = await sendEmail(CONTACT_TO, emailSubject, html);

    if (!result.success) {
      console.error('[CONTACT] Failed to send email:', result.error);
      return res.status(500).json({ message: 'Failed to send message. Please try again later.' });
    }

    res.json({ message: "Thanks! We'll get back to you soon." });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
