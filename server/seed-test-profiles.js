/**
 * seed-test-profiles.js
 *
 * Wipes all clients + therapists + admins from DB and creates a fresh, well-curated
 * set of 10 clients + 10 therapists + 1 admin to exercise EVERY feature in the app.
 *
 * Usage:
 *   MONGODB_URI="<atlas-uri>" node server/seed-test-profiles.js
 *
 * Common password (all accounts):
 *   Test@123
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Therapist from './models/Therapist.js';
import Client from './models/Client.js';
import Admin from './models/Admin.js';
import Session from './models/Session.js';
import Payment from './models/Payment.js';
import GroupTherapy from './models/GroupTherapy.js';
import GroupEnrollment from './models/GroupEnrollment.js';
import Workshop from './models/Workshop.js';
import WorkshopRegistration from './models/WorkshopRegistration.js';
import TrainingProgram from './models/TrainingProgram.js';
import TrainingRegistration from './models/TrainingRegistration.js';
import SupervisionGroup from './models/SupervisionGroup.js';
import SupervisionNotes from './models/SupervisionNotes.js';
import PriceNegotiation from './models/PriceNegotiation.js';
import Notification from './models/Notification.js';
import Review from './models/Review.js';
import ClientHistory from './models/ClientHistory.js';
import ClientTherapistRelationship from './models/ClientTherapistRelationship.js';

const PASSWORD = 'Test@123';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('Set MONGODB_URI environment variable.');
  process.exit(1);
}

// NOTE: each model has a pre('save') hook that hashes password automatically.
// Pass the PLAIN password — model hashes once. Pre-hashing here would double-hash
// and break login.

const wipe = async () => {
  console.log('Wiping existing test data…');
  await Promise.all([
    Therapist.deleteMany({}),
    Client.deleteMany({}),
    Admin.deleteMany({}),
    Session.deleteMany({}),
    Payment.deleteMany({}),
    GroupTherapy.deleteMany({}),
    GroupEnrollment.deleteMany({}),
    Workshop.deleteMany({}),
    WorkshopRegistration.deleteMany({}),
    TrainingProgram.deleteMany({}),
    TrainingRegistration.deleteMany({}),
    SupervisionGroup.deleteMany({}),
    SupervisionNotes.deleteMany({}),
    PriceNegotiation.deleteMany({}),
    Notification.deleteMany({}),
    Review.deleteMany({}),
    ClientHistory.deleteMany({}),
    ClientTherapistRelationship.deleteMany({}),
  ]);
};

// ============================================================
// 10 THERAPIST PROFILES
// ============================================================
//
// Mix designed for end-to-end testing:
//   1  PENDING ADMIN APPROVAL (just registered, services not finalized)
//   2  IN INTERVIEW (admin set onboardingStatus='interview_scheduled')
//   3  APPROVED — Individual only
//   4  APPROVED — Individual + Couples
//   5  APPROVED — Individual + Group (group accepted) -> can create group therapy
//   6  APPROVED — Individual + Couples + Group + Supervision (also a Supervisor!)
//   7  APPROVED — Group + Supervision (group + individual supervision)
//   8  APPROVED — Couples + Family + Supervision (also requesting group supervision)
//   9  APPROVED — Individual; Has SLIDING SCALE enabled with min/max
//   10 APPROVED — Psychiatrist (individual + supervision)
//
const seedTherapists = async () => {
  const baseAvailability = [
    { dayOfWeek: 1, startTime: '09:00', endTime: '18:00', isAvailable: true, chunks: [{ startTime: '09:00', endTime: '12:00' }, { startTime: '14:00', endTime: '18:00' }] },
    { dayOfWeek: 2, startTime: '09:00', endTime: '18:00', isAvailable: true, chunks: [{ startTime: '09:00', endTime: '18:00' }] },
    { dayOfWeek: 3, startTime: '09:00', endTime: '18:00', isAvailable: true, chunks: [{ startTime: '09:00', endTime: '18:00' }] },
    { dayOfWeek: 4, startTime: '09:00', endTime: '18:00', isAvailable: true, chunks: [{ startTime: '09:00', endTime: '18:00' }] },
    { dayOfWeek: 5, startTime: '09:00', endTime: '18:00', isAvailable: true, chunks: [{ startTime: '09:00', endTime: '17:00' }] },
  ];

  const data = [
    // 1. Pending admin approval — just signed up
    {
      email: 'therapist1@ehsaas.test',
      name: 'Aanya Sharma',
      title: 'Counselling Psychologist',
      phone: '+91-9000000001',
      experience: 4,
      bio: 'I work with anxiety, burnout and identity. Recently completed M.Phil from NIMHANS.',
      specializations: ['Anxiety', 'Burnout', 'Identity'],
      languages: ['English', 'Hindi'],
      pricing: { '50': 800 },
      isApproved: false,
      isOnboarded: true,
      onboardingStatus: 'pending_approval',
      servicesOffered: [
        { type: 'individual', minPrice: 600, maxPrice: 900 },
        { type: 'couple', minPrice: 800, maxPrice: 1200 },
      ],
      approvedServices: [],
      servicesFinalized: false,
      availability: baseAvailability,
    },
    // 2. Interview scheduled
    {
      email: 'therapist2@ehsaas.test',
      name: 'Bhavna Roy',
      title: 'Clinical Psychologist',
      phone: '+91-9000000002',
      experience: 6,
      bio: 'Trauma-informed practice; I work in EMDR and somatic frameworks.',
      specializations: ['Trauma', 'PTSD', 'Grief'],
      languages: ['English', 'Bengali'],
      pricing: { '50': 1200 },
      isApproved: false,
      isOnboarded: true,
      onboardingStatus: 'interview_scheduled',
      interviewLink: 'https://meet.google.com/abc-defg-hij',
      interviewScheduledAt: new Date(Date.now() + 2 * 86400000),
      interviewNotes: 'Discuss EMDR certification and supervisor preferences.',
      servicesOffered: [
        { type: 'individual', minPrice: 1000, maxPrice: 1500 },
        { type: 'group', minPrice: 600, maxPrice: 800 },
      ],
      approvedServices: [],
      servicesFinalized: false,
      availability: baseAvailability,
    },
    // 3. Approved — Individual only
    {
      email: 'therapist3@ehsaas.test',
      name: 'Chetan Iyer',
      title: 'Psychotherapist',
      phone: '+91-9000000003',
      experience: 8,
      bio: 'Existential and humanistic perspectives. I help clients find meaning and direction.',
      specializations: ['Anxiety', 'Depression', 'Life transitions'],
      languages: ['English', 'Tamil', 'Hindi'],
      pricing: { '50': 1500 },
      pricingMin: { '50': 900 },
      isApproved: true,
      isOnboarded: true,
      onboardingStatus: 'approved',
      slidingScaleAvailable: false,
      servicesOffered: [{ type: 'individual', minPrice: 1000, maxPrice: 1500 }],
      approvedServices: [
        { type: 'individual', minPrice: 1000, maxPrice: 1500, therapistAccepted: true, therapistRejected: false, acceptedAt: new Date(), approvedByAdminAt: new Date() },
      ],
      servicesFinalized: true,
      availability: baseAvailability,
    },
    // 4. Approved — Individual + Couples
    {
      email: 'therapist4@ehsaas.test',
      name: 'Devika Menon',
      title: 'Couple & Family Therapist',
      phone: '+91-9000000004',
      experience: 10,
      bio: 'Specialised in couples & family work. EFT-trained, queer-affirmative.',
      specializations: ['Couples', 'Communication', 'Affairs', 'LGBTQ+'],
      languages: ['English', 'Malayalam'],
      pricing: { '50': 1800, '90': 3000 },
      pricingMin: { '50': 1200 },
      isApproved: true,
      isOnboarded: true,
      onboardingStatus: 'approved',
      servicesOffered: [
        { type: 'individual', minPrice: 1300, maxPrice: 1800 },
        { type: 'couple', minPrice: 2200, maxPrice: 3000 },
      ],
      approvedServices: [
        { type: 'individual', minPrice: 1300, maxPrice: 1800, therapistAccepted: true, approvedByAdminAt: new Date(), acceptedAt: new Date() },
        { type: 'couple', minPrice: 2200, maxPrice: 3000, therapistAccepted: true, approvedByAdminAt: new Date(), acceptedAt: new Date() },
      ],
      servicesFinalized: true,
      availability: baseAvailability,
    },
    // 5. Approved — Individual + Group (can create groups)
    {
      email: 'therapist5@ehsaas.test',
      name: 'Esha Kapoor',
      title: 'Group Facilitator & Psychologist',
      phone: '+91-9000000005',
      experience: 9,
      bio: 'Group-work specialist. I run process groups and support circles.',
      specializations: ['Group dynamics', 'Anxiety', 'Self-esteem'],
      languages: ['English', 'Hindi'],
      pricing: { '50': 1400 },
      pricingMin: { '50': 900 },
      isApproved: true,
      isOnboarded: true,
      onboardingStatus: 'approved',
      servicesOffered: [
        { type: 'individual', minPrice: 1000, maxPrice: 1400 },
        { type: 'group', minPrice: 500, maxPrice: 700 },
      ],
      approvedServices: [
        { type: 'individual', minPrice: 1000, maxPrice: 1400, therapistAccepted: true, approvedByAdminAt: new Date(), acceptedAt: new Date() },
        { type: 'group', minPrice: 500, maxPrice: 700, therapistAccepted: true, approvedByAdminAt: new Date(), acceptedAt: new Date() },
      ],
      servicesFinalized: true,
      availability: baseAvailability,
    },
    // 6. Approved — Individual + Couples + Group + Supervision (also a Supervisor)
    {
      email: 'therapist6@ehsaas.test',
      name: 'Farhan Ali',
      title: 'Senior Psychotherapist & Supervisor',
      phone: '+91-9000000006',
      experience: 14,
      bio: 'Multidisciplinary practitioner — individual, couples, group, and supervision.',
      specializations: ['Anxiety', 'Couples', 'Supervision', 'Trauma'],
      languages: ['English', 'Urdu', 'Hindi'],
      pricing: { '50': 2200, '90': 3500 },
      pricingMin: { '50': 1500 },
      isApproved: true,
      isOnboarded: true,
      onboardingStatus: 'approved',
      slidingScaleAvailable: true,
      servicesOffered: [
        { type: 'individual', minPrice: 1500, maxPrice: 2200 },
        { type: 'couple', minPrice: 2500, maxPrice: 3500 },
        { type: 'group', minPrice: 700, maxPrice: 900 },
        { type: 'supervision', minPrice: 1500, maxPrice: 2500 },
      ],
      approvedServices: [
        { type: 'individual', minPrice: 1500, maxPrice: 2200, therapistAccepted: true, approvedByAdminAt: new Date(), acceptedAt: new Date() },
        { type: 'couple', minPrice: 2500, maxPrice: 3500, therapistAccepted: true, approvedByAdminAt: new Date(), acceptedAt: new Date() },
        { type: 'group', minPrice: 700, maxPrice: 900, therapistAccepted: true, approvedByAdminAt: new Date(), acceptedAt: new Date() },
        { type: 'supervision', minPrice: 1500, maxPrice: 2500, therapistAccepted: true, approvedByAdminAt: new Date(), acceptedAt: new Date() },
      ],
      servicesFinalized: true,
      supervisorProfile: {
        isApplied: true, isApproved: true, isRejected: false,
        appliedAt: new Date(), approvedAt: new Date(),
        therapyExperienceYears: 14, supervisionExperienceYears: 6,
        audience: 'Early-career therapists, M.Phil interns',
        focusBio: 'Case discussion, ethics, skill building',
        approach: 'Integrative; psychodynamic-oriented',
        durationOptions: [50, 90],
        individualPrice50: 1800, individualPrice90: 2700,
        openTo: 'both',
      },
      availability: baseAvailability,
    },
    // 7. Approved — Group + Supervision
    {
      email: 'therapist7@ehsaas.test',
      name: 'Gauri Joshi',
      title: 'Process-Group & Supervision Specialist',
      phone: '+91-9000000007',
      experience: 12,
      bio: 'I run weekly process groups and offer supervision in group dynamics.',
      specializations: ['Group dynamics', 'Supervision', 'Interpersonal therapy'],
      languages: ['English', 'Marathi'],
      pricing: { '50': 1700 },
      pricingMin: { '50': 1100 },
      isApproved: true,
      isOnboarded: true,
      onboardingStatus: 'approved',
      servicesOffered: [
        { type: 'group', minPrice: 600, maxPrice: 850 },
        { type: 'supervision', minPrice: 1300, maxPrice: 2000 },
      ],
      approvedServices: [
        { type: 'group', minPrice: 600, maxPrice: 850, therapistAccepted: true, approvedByAdminAt: new Date(), acceptedAt: new Date() },
        { type: 'supervision', minPrice: 1300, maxPrice: 2000, therapistAccepted: true, approvedByAdminAt: new Date(), acceptedAt: new Date() },
      ],
      servicesFinalized: true,
      supervisorProfile: {
        isApplied: true, isApproved: true,
        appliedAt: new Date(), approvedAt: new Date(),
        therapyExperienceYears: 12, supervisionExperienceYears: 5,
        audience: 'Group-work practitioners',
        focusBio: 'Group dynamics, process tracking, ethics in group settings',
        approach: 'Yalom-influenced; process-oriented',
        durationOptions: [50, 90], individualPrice50: 1500, individualPrice90: 2200,
        openTo: 'both',
      },
      availability: baseAvailability,
    },
    // 8. Approved — Couples + Family + Supervision (requested group supervision)
    {
      email: 'therapist8@ehsaas.test',
      name: 'Hemant Bhattacharya',
      title: 'Family Systems Therapist & Supervisor',
      phone: '+91-9000000008',
      experience: 16,
      bio: 'Family-systems & couples; I supervise interns at multiple programs.',
      specializations: ['Family Systems', 'Couples', 'Supervision'],
      languages: ['English', 'Bengali', 'Hindi'],
      pricing: { '50': 2000, '90': 3200 },
      pricingMin: { '50': 1400 },
      isApproved: true,
      isOnboarded: true,
      onboardingStatus: 'approved',
      servicesOffered: [
        { type: 'couple', minPrice: 2200, maxPrice: 3200 },
        { type: 'family', minPrice: 2400, maxPrice: 3500 },
        { type: 'supervision', minPrice: 1800, maxPrice: 2500 },
      ],
      approvedServices: [
        { type: 'couple', minPrice: 2200, maxPrice: 3200, therapistAccepted: true, approvedByAdminAt: new Date(), acceptedAt: new Date() },
        { type: 'family', minPrice: 2400, maxPrice: 3500, therapistAccepted: true, approvedByAdminAt: new Date(), acceptedAt: new Date() },
        { type: 'supervision', minPrice: 1800, maxPrice: 2500, therapistAccepted: true, approvedByAdminAt: new Date(), acceptedAt: new Date() },
      ],
      servicesFinalized: true,
      supervisorProfile: {
        isApplied: true, isApproved: true,
        appliedAt: new Date(), approvedAt: new Date(),
        therapyExperienceYears: 16, supervisionExperienceYears: 8,
        audience: 'Family-systems practitioners, advanced interns',
        focusBio: 'Family dynamics, multi-generational patterns, ethical practice',
        approach: 'Bowen + Structural Family Therapy',
        durationOptions: [50, 90], individualPrice50: 2000, individualPrice90: 3000,
        openTo: 'both',
      },
      availability: baseAvailability,
    },
    // 9. Approved — Individual + SLIDING SCALE ON
    {
      email: 'therapist9@ehsaas.test',
      name: 'Indira Pillai',
      title: 'Counselling Psychologist (Sliding Scale)',
      phone: '+91-9000000009',
      experience: 7,
      bio: 'Affirmative practice. I offer sliding-scale rates for clients in financial need.',
      specializations: ['Anxiety', 'Depression', 'LGBTQ+'],
      languages: ['English', 'Hindi', 'Telugu'],
      pricing: { '50': 1200 },
      pricingMin: { '50': 600 },
      isApproved: true,
      isOnboarded: true,
      onboardingStatus: 'approved',
      slidingScaleAvailable: true,
      servicesOffered: [{ type: 'individual', minPrice: 800, maxPrice: 1200 }],
      approvedServices: [
        { type: 'individual', minPrice: 800, maxPrice: 1200, therapistAccepted: true, approvedByAdminAt: new Date(), acceptedAt: new Date() },
      ],
      servicesFinalized: true,
      availability: baseAvailability,
    },
    // 10. Psychiatrist (individual + supervision)
    {
      email: 'therapist10@ehsaas.test',
      name: 'Dr. Jitendra Rao',
      title: 'Consultant Psychiatrist',
      phone: '+91-9000000010',
      experience: 18,
      bio: 'MD Psychiatry. I work with mood disorders, ADHD, and provide medication management.',
      specializations: ['Psychiatry', 'ADHD', 'Bipolar', 'Anxiety'],
      languages: ['English', 'Hindi', 'Kannada'],
      pricing: { '50': 2500 },
      pricingMin: { '50': 1800 },
      isApproved: true,
      isOnboarded: true,
      onboardingStatus: 'approved',
      therapistType: 'psychiatrist',
      servicesOffered: [
        { type: 'individual', minPrice: 1800, maxPrice: 2500 },
        { type: 'supervision', minPrice: 2000, maxPrice: 3000 },
      ],
      approvedServices: [
        { type: 'individual', minPrice: 1800, maxPrice: 2500, therapistAccepted: true, approvedByAdminAt: new Date(), acceptedAt: new Date() },
        { type: 'supervision', minPrice: 2000, maxPrice: 3000, therapistAccepted: true, approvedByAdminAt: new Date(), acceptedAt: new Date() },
      ],
      servicesFinalized: true,
      supervisorProfile: {
        isApplied: true, isApproved: true,
        appliedAt: new Date(), approvedAt: new Date(),
        therapyExperienceYears: 18, supervisionExperienceYears: 10,
        audience: 'Mental health professionals across modalities',
        focusBio: 'Diagnostic clarity, medication coordination, ethics',
        approach: 'Bio-psychosocial', durationOptions: [50, 90],
        individualPrice50: 2500, individualPrice90: 3500, openTo: 'individual',
      },
      availability: baseAvailability,
    },
  ];

  const therapists = [];
  for (const d of data) {
    const t = await Therapist.create({ ...d, password: PASSWORD, accountStatus: 'active' });
    therapists.push(t);
    console.log(`  ✓ Therapist ${d.email} (${d.name}) — ${d.onboardingStatus}`);
  }
  return therapists;
};

// ============================================================
// 10 CLIENT PROFILES
// ============================================================
//
// Mix:
//   1  PENDING couples profile (just submitted, partner not yet registered)
//   2  PENDING couples profile (partner is client #3, both pending admin approval)
//   3  PENDING couples profile (partner of #2, both pending admin approval)
//   4  Approved couples profile (alone — partner not registered yet)
//   5  Regular client — flagged for high cancellations (testing flag system)
//   6  Regular client — preferredServiceType=group (will apply to group therapy)
//   7  Regular client — used for sliding scale negotiation testing
//   8  Regular client — used for waitlist testing
//   9  Regular client — has had multiple sessions (used for past-sessions UI)
//   10 Brand new client — no preference set (lands on /services after login)
//
const seedClients = async () => {
  const data = [
    // 1. Pending couples profile, partner not yet registered
    {
      email: 'client1@ehsaas.test', name: 'Riya Mehta', phone: '+91-8000000001',
      preferredServiceType: 'couple',
      couplesProfile: {
        partnerEmail: 'unregistered.partner@example.com', partnerName: 'Karan Mehta',
        polyamorousNote: '',
        dateOfBirth: new Date('1995-03-12'), age: 30, languagePreference: 'English',
        assignedSex: 'female', pronouns: 'she/her', occupation: 'Designer', highestEducation: 'MA',
        medicationsRegular: '', substancesUsed: ['Alcohol'], teaCoffeeFrequency: '2 cups/day',
        relationshipStatus: 'married', relationshipDuration: '4 years', livingSituation: 'Living together',
        children: [],
        primaryConcerns: 'Communication has worsened in the last 6 months.',
        expectationsFutureRelationship: 'Want to feel close again and aligned on future planning.',
        expectationsTherapyGoals: 'Better communication; tools to handle conflict.',
        selfDiagnoses: '', partnerDiagnoses: '',
        emotionalIntimacyRating: 4, physicalIntimacyRating: 5,
        selfHandlesConflict: 'I tend to withdraw and avoid.',
        partnerHandlesConflict: 'He raises voice and walks away.',
        admireInPartner: 'His sense of humor.',
        partnerAdmiresInMe: 'My patience.',
        funTogether: 'Cooking, hiking weekends.',
        heardAboutEhsaasFrom: 'Instagram',
        profileCompletedAt: new Date(),
        isApprovedByAdmin: false,
        partnerInvitedAt: new Date(),
      },
    },
    // 2. Pending couples profile, partner is #3
    {
      email: 'client2@ehsaas.test', name: 'Neha Iyer', phone: '+91-8000000002',
      preferredServiceType: 'couple',
      couplesProfile: {
        partnerEmail: 'client3@ehsaas.test', partnerName: 'Arjun Iyer',
        dateOfBirth: new Date('1992-07-21'), age: 33, languagePreference: 'English',
        assignedSex: 'female', pronouns: 'she/her', occupation: 'Lawyer', highestEducation: 'LLB',
        medicationsRegular: '', substancesUsed: [], teaCoffeeFrequency: '1 coffee/day',
        relationshipStatus: 'married', relationshipDuration: '6 years', livingSituation: 'Living together',
        children: [{ name: 'Ananya', age: 3, gender: 'female' }],
        primaryConcerns: 'Recurring fights about parenting and work-life balance.',
        expectationsFutureRelationship: 'Want a more equal partnership.',
        expectationsTherapyGoals: 'Build alignment on parenting; reduce reactive arguments.',
        emotionalIntimacyRating: 5, physicalIntimacyRating: 6,
        selfHandlesConflict: 'I try to talk it through but get frustrated.',
        partnerHandlesConflict: 'He shuts down.',
        admireInPartner: 'His commitment to family.',
        partnerAdmiresInMe: 'My career drive.',
        funTogether: 'Watching shows, weekend brunches.',
        heardAboutEhsaasFrom: 'Therapist referral',
        profileCompletedAt: new Date(),
        isApprovedByAdmin: false,
      },
    },
    // 3. Partner of #2
    {
      email: 'client3@ehsaas.test', name: 'Arjun Iyer', phone: '+91-8000000003',
      preferredServiceType: 'couple',
      couplesProfile: {
        partnerEmail: 'client2@ehsaas.test', partnerName: 'Neha Iyer',
        dateOfBirth: new Date('1990-01-15'), age: 35, languagePreference: 'English',
        assignedSex: 'male', pronouns: 'he/him', occupation: 'Engineer', highestEducation: 'B.Tech',
        medicationsRegular: '', substancesUsed: ['Alcohol'], teaCoffeeFrequency: '3 cups tea/day',
        relationshipStatus: 'married', relationshipDuration: '6 years', livingSituation: 'Living together',
        children: [{ name: 'Ananya', age: 3, gender: 'female' }],
        primaryConcerns: 'I feel criticised often. We argue about division of labour.',
        expectationsFutureRelationship: 'Less conflict; better team work.',
        expectationsTherapyGoals: 'Learn to express disagreement without escalation.',
        emotionalIntimacyRating: 5, physicalIntimacyRating: 6,
        selfHandlesConflict: 'I tend to shut down.',
        partnerHandlesConflict: 'She wants to talk things out immediately.',
        admireInPartner: 'Her intelligence.',
        partnerAdmiresInMe: 'My calmness.',
        funTogether: 'TV shows, brunches.',
        heardAboutEhsaasFrom: 'Therapist referral',
        profileCompletedAt: new Date(),
        isApprovedByAdmin: false,
      },
    },
    // 4. Approved couples profile (partner not registered)
    {
      email: 'client4@ehsaas.test', name: 'Tara Singh', phone: '+91-8000000004',
      preferredServiceType: 'couple',
      couplesProfile: {
        partnerEmail: 'partner4@unreg.test', partnerName: 'Vikram Singh',
        dateOfBirth: new Date('1988-11-04'), age: 36,
        relationshipStatus: 'married', relationshipDuration: '8 years',
        primaryConcerns: 'Lost emotional closeness. Want to rebuild.',
        expectationsTherapyGoals: 'Reconnect emotionally and physically.',
        emotionalIntimacyRating: 3, physicalIntimacyRating: 4,
        profileCompletedAt: new Date(Date.now() - 7 * 86400000),
        isApprovedByAdmin: true, approvedAt: new Date(Date.now() - 5 * 86400000),
      },
    },
    // 5. Flagged client (high cancellations)
    {
      email: 'client5@ehsaas.test', name: 'Rohit Bansal', phone: '+91-8000000005',
      preferredServiceType: 'individual',
      cancellationCount: 4,
      flags: { highCancellations: true, highNoShows: false, frequentTherapistChanges: false },
    },
    // 6. Group therapy interested
    {
      email: 'client6@ehsaas.test', name: 'Aarti Desai', phone: '+91-8000000006',
      preferredServiceType: 'group',
    },
    // 7. Sliding scale tester
    {
      email: 'client7@ehsaas.test', name: 'Sanjay Kulkarni', phone: '+91-8000000007',
      preferredServiceType: 'individual',
    },
    // 8. Waitlist tester
    {
      email: 'client8@ehsaas.test', name: 'Pooja Verma', phone: '+91-8000000008',
      preferredServiceType: 'individual',
    },
    // 9. Active client with sessions history
    {
      email: 'client9@ehsaas.test', name: 'Kavita Reddy', phone: '+91-8000000009',
      preferredServiceType: 'individual',
    },
    // 10. Brand new — no preference set
    {
      email: 'client10@ehsaas.test', name: 'Mohan Lal', phone: '+91-8000000010',
    },
  ];

  const clients = [];
  for (const d of data) {
    const c = await Client.create({ ...d, password: PASSWORD });
    clients.push(c);
    console.log(`  ✓ Client ${d.email} (${d.name})`);
  }
  // Cross-link partners 2 ↔ 3
  await Client.findByIdAndUpdate(clients[1]._id, { 'couplesProfile.partnerId': clients[2]._id });
  await Client.findByIdAndUpdate(clients[2]._id, { 'couplesProfile.partnerId': clients[1]._id });
  console.log('  ✓ Linked partners (client2 ↔ client3)');
  return clients;
};

// ============================================================
// ADMIN
// ============================================================
const seedAdmin = async () => {
  // Two admins: the test one + the canonical operations email.
  const admins = await Promise.all([
    Admin.create({ email: 'admin@ehsaas.test',         password: PASSWORD, name: 'Ehsaas Admin (test)' }),
    Admin.create({ email: 'therapy.ehsaas@gmail.com',  password: PASSWORD, name: 'Ehsaas Therapy Centre' }),
  ]);
  for (const a of admins) console.log(`  ✓ Admin ${a.email}`);
  return admins[0];
};

// ============================================================
const main = async () => {
  await mongoose.connect(MONGODB_URI);
  console.log(`Connected to ${MONGODB_URI.split('@')[1]?.split('/')[0] || 'MongoDB'}`);

  await wipe();

  console.log('\nCreating accounts (password: Test@123)…\n');

  console.log('Therapists:');
  const therapists = await seedTherapists();

  console.log('\nClients:');
  const clients = await seedClients();

  console.log('\nAdmin:');
  await seedAdmin();

  // Summary
  console.log('\n=================================================================');
  console.log('SEED COMPLETE — All accounts use password: Test@123');
  console.log('=================================================================\n');

  console.log('ADMIN');
  console.log('  admin@ehsaas.test\n');

  console.log('THERAPISTS (10 total)');
  console.log('  therapist1@ehsaas.test     Aanya Sharma         — pending admin approval');
  console.log('  therapist2@ehsaas.test     Bhavna Roy           — interview scheduled');
  console.log('  therapist3@ehsaas.test     Chetan Iyer          — approved (individual only)');
  console.log('  therapist4@ehsaas.test     Devika Menon         — approved (individual + couples)');
  console.log('  therapist5@ehsaas.test     Esha Kapoor          — approved (individual + group, can lead groups)');
  console.log('  therapist6@ehsaas.test     Farhan Ali           — approved (individual+couple+group+supervision; supervisor)');
  console.log('  therapist7@ehsaas.test     Gauri Joshi          — approved (group + supervision)');
  console.log('  therapist8@ehsaas.test     Hemant Bhattacharya  — approved (couple+family+supervision)');
  console.log('  therapist9@ehsaas.test     Indira Pillai        — approved (individual; SLIDING SCALE on)');
  console.log('  therapist10@ehsaas.test    Dr. Jitendra Rao     — approved (psychiatrist; supervision)\n');

  console.log('CLIENTS (10 total)');
  console.log('  client1@ehsaas.test        Riya Mehta           — couples profile pending; partner unregistered');
  console.log('  client2@ehsaas.test        Neha Iyer            — couples profile pending; partner=client3');
  console.log('  client3@ehsaas.test        Arjun Iyer           — couples profile pending; partner=client2');
  console.log('  client4@ehsaas.test        Tara Singh           — couples profile APPROVED (partner unregistered)');
  console.log('  client5@ehsaas.test        Rohit Bansal         — flagged: high cancellations');
  console.log('  client6@ehsaas.test        Aarti Desai          — preference: group therapy');
  console.log('  client7@ehsaas.test        Sanjay Kulkarni      — for sliding-scale negotiation testing');
  console.log('  client8@ehsaas.test        Pooja Verma          — for waitlist testing');
  console.log('  client9@ehsaas.test        Kavita Reddy         — has session history (you can book to populate)');
  console.log('  client10@ehsaas.test       Mohan Lal            — brand new (lands on /services after login)\n');

  console.log('TESTING FLOWS:');
  console.log('  • Pending therapist approval     → log in as admin, approve therapist1 / therapist2');
  console.log('  • Couples profile approval       → log in as admin, approve client1, client2, client3');
  console.log('  • Group therapy creation         → log in as therapist5/6/7 → Group Therapy tab → request');
  console.log('  • Group therapy enrollment       → log in as client6 → /group-therapy → apply');
  console.log('  • Couples therapy booking        → log in as client4 (already approved) → /team?service=couple');
  console.log('  • Sliding scale negotiation      → log in as therapist9 → enable for client7');
  console.log('  • Supervision: become supervisor → log in as therapist3 → Supervision tab → apply');
  console.log('  • Supervision: as supervisee     → log in as therapist3 → Supervision → apply as supervisee');
  console.log('  • Workshop creation              → any approved therapist → Workshops tab');
  console.log('  • Training programs              → any approved therapist → /trainings → request');
  console.log('  • Service change request         → log in as therapist3 → Approvals → Manage Services\n');

  await mongoose.disconnect();
};

main().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
