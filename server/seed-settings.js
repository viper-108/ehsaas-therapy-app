import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Settings from './models/Settings.js';
import connectDB from './config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const defaults = [
  // Therapy config
  { key: 'therapyTypes', value: ['Individual Therapy', 'Couple Therapy', 'Group Therapy', 'Family Therapy'], category: 'therapy', description: 'Types of therapy offered' },
  { key: 'therapyConcerns', value: ['Anxiety', 'Depression', 'Trauma', 'Relationship Issues', 'Self-esteem', 'Grief', 'LGBTQ+', 'Stress', 'Life Transitions', 'Identity', 'Anger Management', 'OCD', 'PTSD', 'Eating Disorders', 'Addiction'], category: 'therapy', description: 'Client concern tags for matching' },

  // Session config
  { key: 'defaultMaxSessionsPerDay', value: 8, category: 'session', description: 'Default max sessions a therapist can take per day' },
  { key: 'cancellationWindowHours', value: 24, category: 'session', description: 'Hours before session when cancellation closes' },
  { key: 'defaultPricing', value: { '30': 600, '50': 900 }, category: 'session', description: 'Default session pricing for new therapists' },

  // Platform
  { key: 'platformName', value: 'Ehsaas Therapy Centre', category: 'platform', description: 'Platform display name' },
  { key: 'contactEmail', value: 'sessions.ehsaas@gmail.com', category: 'platform', description: 'Support email' },
  { key: 'contactWhatsApp', value: '+91-7411948161', category: 'platform', description: 'Support WhatsApp number' },
  { key: 'contactInstagram', value: '@ehsaas.therapy.centre', category: 'platform', description: 'Instagram handle' },
  { key: 'adminEmails', value: ['shukla.amitedcjss@gmail.com', 'Pdsethia17@gmail.com'], category: 'platform', description: 'Admin notification emails' },

  // Terms & Conditions - Client
  { key: 'clientTermsAndConditions', value: `EHSAAS THERAPY CENTRE — CLIENT TERMS & CONDITIONS

Last Updated: April 2026

By creating an account and using the services of Ehsaas Therapy Centre ("Ehsaas", "we", "us"), you ("Client") agree to the following terms and conditions:

1. SERVICES
Ehsaas Therapy Centre is an online platform that connects clients with licensed and qualified therapists. We facilitate the scheduling and payment of therapy sessions but do not directly provide therapy services.

2. ELIGIBILITY
You must be at least 18 years of age to create an account and use our services. By registering, you confirm that the information provided is accurate and complete.

3. BOOKING & SESSIONS
- Sessions can be booked based on therapist availability displayed on the platform.
- Session durations and pricing vary by therapist and are clearly displayed before booking.
- You are expected to join your session on time. Late arrivals may result in a shortened session.
- Sessions are conducted via secure online video platforms unless otherwise arranged.

4. CANCELLATION & RESCHEDULING POLICY
- Sessions may be cancelled or rescheduled free of charge up to 24 hours before the scheduled time.
- Cancellations made within 24 hours of the session are not permitted and the full session fee will be charged.
- No-shows will be charged the full session fee.

5. PAYMENTS
- All payments are processed securely through our integrated payment gateway.
- Payment must be completed at the time of booking to confirm your session.
- Refunds for eligible cancellations will be processed within 5-7 business days.

6. CONFIDENTIALITY & PRIVACY
- All session content is strictly confidential between you and your therapist.
- Your personal information is stored securely and will not be shared with third parties without your explicit consent, except as required by law.

7. LIMITATIONS
- Ehsaas is not a crisis or emergency service. If you are experiencing a mental health emergency, please contact local emergency services (112) or a crisis helpline immediately.
- Our therapists provide professional guidance but cannot guarantee specific outcomes.

8. CODE OF CONDUCT
- Clients are expected to treat therapists with respect and professionalism.
- Any form of harassment, abuse, or inappropriate behaviour may result in immediate account termination without refund.
- Recording sessions without consent is strictly prohibited.

9. ACCOUNT SECURITY
- You are responsible for maintaining the confidentiality of your login credentials.
- Notify us immediately if you suspect unauthorized access.

10. MODIFICATIONS
- Ehsaas reserves the right to modify these terms at any time. Continued use constitutes acceptance.

11. LIMITATION OF LIABILITY
- Ehsaas acts as a facilitator and is not liable for the quality or outcomes of therapy provided by individual therapists.

12. CONTACT
Email: sessions.ehsaas@gmail.com | WhatsApp: +91-7411948161 | Instagram: @ehsaas.therapy.centre`, category: 'content', description: 'Client Terms & Conditions text' },

  // Terms & Conditions - Therapist
  { key: 'therapistTermsAndConditions', value: `EHSAAS THERAPY CENTRE — THERAPIST TERMS & CONDITIONS

Last Updated: April 2026

By registering as a therapist on Ehsaas Therapy Centre ("Ehsaas", "we", "us"), you ("Therapist") agree to the following:

1. ELIGIBILITY & QUALIFICATIONS
- You must hold valid qualifications in psychology, counselling, or a related field.
- You must provide accurate credentials and documentation during onboarding.
- Ehsaas reserves the right to verify your qualifications.

2. PROFESSIONAL CONDUCT
- Maintain the highest standards of professional ethics and conduct.
- Provide therapy services within your scope of competence.
- Maintain appropriate therapeutic boundaries with all clients.

3. CONFIDENTIALITY
- All client information and session content must be kept strictly confidential.
- Clinical notes and records must be maintained securely.
- Comply with all applicable data protection regulations.

4. SESSION MANAGEMENT
- Honour all scheduled sessions and arrive on time.
- Provide adequate notice for cancellations or schedule changes.
- Maintain accurate records of sessions conducted.

5. FEES & PAYMENTS
- Session fees are set in consultation with Ehsaas management.
- Payments are processed through the platform. Direct payments from clients are not permitted.
- Platform fees and payment schedules will be communicated separately.

6. PLATFORM USAGE
- Use the platform features responsibly and as intended.
- Respond to client messages and booking requests in a timely manner.
- Keep your profile and availability information up to date.

7. QUALITY ASSURANCE
- Participate in periodic reviews and feedback processes.
- Engage in continuing professional development.
- Report any concerns about client safety promptly.

8. LIABILITY & INSURANCE
- You are responsible for your own professional liability insurance.
- Ehsaas is not liable for clinical decisions or therapeutic outcomes.

9. TERMINATION
- Either party may terminate the arrangement with reasonable notice.
- Ehsaas reserves the right to suspend or remove therapists who violate these terms.

10. MODIFICATIONS
- These terms may be updated periodically. Continued use constitutes acceptance.`, category: 'content', description: 'Therapist Terms & Conditions text' },
];

const seedSettings = async () => {
  try {
    await connectDB();
    console.log('Seeding settings...');

    for (const s of defaults) {
      await Settings.findOneAndUpdate(
        { key: s.key },
        { value: s.value, category: s.category, description: s.description },
        { upsert: true, new: true }
      );
      console.log(`  ✓ ${s.key}`);
    }

    console.log(`\nSeeded ${defaults.length} settings.`);
    process.exit(0);
  } catch (error) {
    console.error('Seed settings error:', error);
    process.exit(1);
  }
};

seedSettings();
