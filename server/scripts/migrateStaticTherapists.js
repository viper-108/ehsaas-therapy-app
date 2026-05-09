/**
 * Idempotent migration that imports the 9 pre-existing static therapists
 * from src/data/psychologists.ts into MongoDB so clients can actually book
 * sessions with them, then backfills offeredServiceTypes on every existing
 * therapist row.
 *
 * Each migrated therapist gets:
 *   - approvedServices populated with 1-3 randomly chosen service types
 *     (always includes 'individual') with therapistAccepted=true and
 *     prices derived from their static pricing.
 *   - offeredServiceTypes auto-populated from approvedServices via the
 *     model's pre-save hook.
 *   - A reproducible default password (Test@123) so you can log in as
 *     them if needed during testing.
 *
 * Re-running the script is safe: existing therapists matched by name are
 * updated (NOT recreated) and approvedServices is only filled when empty.
 *
 *   node server/scripts/migrateStaticTherapists.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import Therapist from '../models/Therapist.js';

// Mirror of src/data/psychologists.ts (kept inline so this script doesn't
// have to import from the frontend tree). Names + pricing must match.
const STATIC_THERAPISTS = [
  { name: 'Sakshi Malagi',          title: 'Psychologist',              experience: 3, languages: ['English','Marathi','Hindi'], specializations: ['Trauma Therapy','Clinical Psychology','Healing','Self-discovery'],          pricing: { 30: 600,  50: 900  }, image: '/lovable-uploads/987e39a6-46ca-48e0-b5f4-5b9ac3eb3c89.png', bio: 'Trauma-informed Therapist | M.A. in Clinical Psychology. For the ones questioning who they are, carrying old wounds, or learning to feel again.' },
  { name: 'Prakshita Kamble',       title: 'Psychologist',              experience: 2, languages: ['English'],                   specializations: ['Emotional Support','Self-acceptance','Identity','Mental Health'],            pricing: { 30: 900,  50: 1200 }, image: '/lovable-uploads/2603e6b0-6efa-463b-83d5-bcf6a4b1b340.png', bio: 'I offer a space where your feelings are welcome and your stories matter. Come as you are.' },
  { name: 'Sejal Ketkar',           title: 'Psychologist',              experience: 4, languages: ['English','Marathi','Hindi'], specializations: ['Anxiety','Self-doubt','Relationship Therapy','Emotional Processing'],         pricing: { 30: 600,  50: 900  }, image: '/lovable-uploads/2407e90e-97a9-4180-bfcc-8f0d15c8fde5.png', bio: 'I work with adults navigating anxiety, self-doubt, and relationship struggles. A compassionate, reflective space.' },
  { name: 'Ekta Singh',             title: 'Psychologist',              experience: 3, languages: ['English','Hindi'],           specializations: ['Anxiety','Self-doubt','Counselling Psychology','Emotional Support'],          pricing: { 30: 600,  50: 900  }, image: '/lovable-uploads/15c8f76e-a7f3-457f-9904-090d4b413d5a.png', bio: 'Therapist | M.Sc Counselling Psychology. A safe space for anxious minds, sensitive souls, and self-doubt.' },
  { name: 'Rasika Godbole',         title: 'Psychologist',              experience: 5, languages: ['Marathi','Hindi','English'], specializations: ['LGBTQ+ Affirmative','Identity','Self-discovery','Queer Therapy'],              pricing: { 30: 900,  50: 1200 }, image: '/lovable-uploads/94da55a9-29ca-490c-ab5f-cfac6a49229b.png', bio: 'Queer affirmative therapist. A space for you to reimagine and rewrite your story — no scary labels.' },
  { name: 'Rohan Chandak',          title: 'Counselling Psychologist',  experience: 4, languages: ['English','Hindi'],           specializations: ['Life Transitions','Anxiety','Relationship Counselling','Emotional Well-being'], pricing: { 50: 1600 },             image: '/lovable-uploads/a17b9578-8553-49a2-a75b-78a03de25a20.png', bio: 'Over four years of experience guiding individuals through life transitions, anxiety, and relationship challenges.' },
  { name: 'Priyadarshini Sethia',   title: 'Founder & Psychologist',    experience: 6, languages: ['English','Hindi'],           specializations: ['Therapy','Mental Health','Healing','Emotional Support'],                       pricing: { 30: 1400, 50: 1700 }, image: '/lovable-uploads/77840dcc-8f17-4f1c-9278-f9b56f1efc73.png', bio: 'I believe in feeling deeply, healing gently, and leaving the world kinder than I found it.' },
  { name: 'Dr. Madalsa Agrawal',    title: 'Psychiatrist',              experience: 8, languages: ['Hindi','English'],           specializations: ['Psychiatry','Mental Health','Holistic Approach','Quality of Life'],            pricing: { 30: 1500, 60: 2000 }, image: '/lovable-uploads/2bd68b7a-8cfb-44b2-bc0b-66479749297a.png', bio: 'Mental health specialist who believes in a holistic approach and overall improvement in quality of life.' },
  { name: 'Ananya Sharma',          title: 'Psychologist',              experience: 4, languages: ['English','Hindi'],           specializations: ['Anxiety','Stress Management','Mindfulness','Emotional Well-being'],            pricing: { 30: 800,  50: 1100 }, image: '',                                                            bio: 'A compassionate therapist dedicated to helping individuals navigate anxiety and stress through mindfulness.' },
];

const PASSWORD = process.env.MIGRATION_PASSWORD || 'Test@123';
const ALL_TYPES = ['individual', 'couple', 'family', 'group'];   // supervision deliberately excluded — needs a separate supervisorProfile flow

const slug = (name) => name.toLowerCase()
  .replace(/^dr\.?\s+/, '')
  .replace(/[^a-z0-9]+/g, '.')
  .replace(/^\.|\.$/g, '');

// Deterministic-ish shuffle so re-running picks the same services per
// therapist (avoids "the same person now offers different services after a
// re-run" surprises).
const seededShuffle = (arr, seed) => {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const stringHash = (str) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h) + str.charCodeAt(i);
  return Math.abs(h);
};

const pickServicesFor = (name) => {
  const seed = stringHash(name);
  // Always include 'individual' (the most common booking type), then pick
  // 0-2 additional types deterministically per name.
  const extras = seededShuffle(ALL_TYPES.filter(t => t !== 'individual'), seed);
  const extraCount = (seed % 3); // 0, 1, or 2 extras
  return ['individual', ...extras.slice(0, extraCount)];
};

const buildApprovedServices = (types, pricing) => {
  // Use the highest configured price as ceiling for every service, half
  // of that as min — gives a plausible sliding range.
  const prices = Object.values(pricing).map(Number).filter(n => n > 0);
  const ceiling = prices.length ? Math.max(...prices) : 1500;
  const floor = Math.max(500, Math.floor(ceiling * 0.6));
  const now = new Date();
  return types.map(type => ({
    type,
    minPrice: floor,
    maxPrice: ceiling,
    therapistAccepted: true,
    therapistRejected: false,
    acceptedAt: now,
    approvedByAdminAt: now,
  }));
};

const baseAvailability = [0,1,2,3,4,5,6].map(d => ({
  dayOfWeek: d,
  isAvailable: d !== 0, // Sunday off
  startTime: '09:00',
  endTime: '18:00',
  chunks: [],
}));

const upsertOne = async (entry) => {
  // Match by case-insensitive name. Email is generated only if creating new.
  const existing = await Therapist.findOne({ name: { $regex: `^${entry.name}$`, $options: 'i' } });

  if (existing) {
    let changed = false;
    // Only fill approvedServices if empty (don't overwrite real production data)
    if (!Array.isArray(existing.approvedServices) || existing.approvedServices.length === 0) {
      const types = pickServicesFor(entry.name);
      existing.approvedServices = buildApprovedServices(types, entry.pricing);
      existing.servicesFinalized = true;
      changed = true;
    }
    // Always re-derive offeredServiceTypes (cheap; keeps backfill consistent)
    const accepted = (existing.approvedServices || [])
      .filter(s => s.therapistAccepted).map(s => s.type);
    const flat = [...new Set(accepted)];
    if ((existing.offeredServiceTypes || []).join('|') !== flat.join('|')) {
      existing.offeredServiceTypes = flat;
      changed = true;
    }
    if (changed) await existing.save();
    return { name: entry.name, action: changed ? 'updated' : 'unchanged', services: existing.offeredServiceTypes };
  }

  // Brand new — create
  const types = pickServicesFor(entry.name);
  const isPsychiatrist = String(entry.title || '').toLowerCase().includes('psychiatrist');
  const created = await Therapist.create({
    email: `${slug(entry.name)}@ehsaas.legacy`,
    password: PASSWORD,
    name: entry.name,
    title: entry.title,
    phone: '+91-9000000000',
    experience: entry.experience,
    languages: entry.languages,
    specializations: entry.specializations,
    bio: entry.bio || 'Imported from the legacy directory.',
    image: entry.image || '',
    therapistType: isPsychiatrist ? 'psychiatrist' : 'psychologist',
    pricing: entry.pricing,
    pricingMin: Object.fromEntries(Object.entries(entry.pricing).map(([k, v]) => [k, Math.floor(Number(v) * 0.6)])),
    isApproved: true,
    isOnboarded: true,
    onboardingStatus: 'approved',
    accountStatus: 'active',
    servicesFinalized: true,
    approvedServices: buildApprovedServices(types, entry.pricing),
    availability: baseAvailability,
    maxSessionsPerDay: 8,
    educationBackground: 'Master\'s in Psychology / Counselling',
    highestEducation: isPsychiatrist ? 'MD Psychiatry' : 'M.A. / M.Sc. Psychology',
  });
  return { name: created.name, action: 'created', services: created.offeredServiceTypes };
};

// Backfill offeredServiceTypes on every other therapist row (e.g. legacy
// docs that pre-date the new field).
const backfillRest = async (skipNames) => {
  const rows = await Therapist.find({
    name: { $nin: skipNames },
    $or: [{ offeredServiceTypes: { $exists: false } }, { offeredServiceTypes: { $size: 0 } }],
  });
  for (const t of rows) {
    const accepted = (t.approvedServices || [])
      .filter(s => s.therapistAccepted).map(s => s.type);
    t.offeredServiceTypes = [...new Set(accepted)];
    await t.save();
  }
  return rows.length;
};

const main = async () => {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Aborting.');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Connected to ${process.env.MONGODB_URI.split('@')[1]?.split('/')[0] || 'MongoDB'}\n`);

  const results = [];
  for (const t of STATIC_THERAPISTS) {
    try {
      const r = await upsertOne(t);
      results.push(r);
      console.log(`  ${r.action.toUpperCase().padEnd(9)} ${r.name.padEnd(28)} services: ${r.services.join(', ')}`);
    } catch (e) {
      console.error(`  FAILED   ${t.name}: ${e.message}`);
    }
  }

  const backfilled = await backfillRest(STATIC_THERAPISTS.map(t => t.name));
  if (backfilled > 0) console.log(`\n  Backfilled offeredServiceTypes on ${backfilled} other therapist(s).`);

  console.log(`\nDone. ${results.filter(r => r.action === 'created').length} created, ${results.filter(r => r.action === 'updated').length} updated, ${results.filter(r => r.action === 'unchanged').length} unchanged.`);
  await mongoose.disconnect();
  process.exit(0);
};

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
