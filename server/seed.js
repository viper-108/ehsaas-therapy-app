import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Therapist from './models/Therapist.js';
import Admin from './models/Admin.js';
import Client from './models/Client.js';
import Session from './models/Session.js';
import Payment from './models/Payment.js';
import connectDB from './config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const seedTherapists = [
  {
    email: "sakshi.malagi@ehsaas.com",
    password: "password123",
    name: "Sakshi Malagi",
    title: "Psychologist",
    specializations: ["Trauma Therapy", "Clinical Psychology", "Healing", "Self-discovery"],
    experience: 3,
    rating: 4.9,
    bio: "Trauma-informed Therapist | M.A. in Clinical Psychology. For the ones questioning who they are, carrying old wounds, or learning to feel again. In this gentle space, there is no fixing, no forcing. Just room to feel what's been waiting.",
    languages: ["English", "Marathi", "Hindi"],
    availability: [
      { dayOfWeek: 1, startTime: "09:00", endTime: "18:00", isAvailable: true },
      { dayOfWeek: 2, startTime: "09:00", endTime: "18:00", isAvailable: true },
      { dayOfWeek: 3, startTime: "09:00", endTime: "18:00", isAvailable: true },
      { dayOfWeek: 4, startTime: "09:00", endTime: "18:00", isAvailable: true },
      { dayOfWeek: 5, startTime: "09:00", endTime: "18:00", isAvailable: true },
    ],
    totalSessions: 500,
    calendlyLink: "https://calendly.com/sakshi-malagi",
    image: "/lovable-uploads/987e39a6-46ca-48e0-b5f4-5b9ac3eb3c89.png",
    pricing: { "30": 600, "50": 900 },
    isApproved: true,
    isOnboarded: true,
    onboardingStatus: 'approved',
  },
  {
    email: "prakshita.kamble@ehsaas.com",
    password: "password123",
    name: "Prakshita Kamble",
    title: "Psychologist",
    specializations: ["Emotional Support", "Self-acceptance", "Identity", "Mental Health"],
    experience: 2,
    rating: 4.8,
    bio: "I offer a space where your feelings are welcome, your stories matter, and you don't have to shrink yourself to fit in. Come as you are - messy, quiet, tender, silly, or lost. There's room for it all here.",
    languages: ["English"],
    availability: [
      { dayOfWeek: 1, startTime: "10:00", endTime: "19:00", isAvailable: true },
      { dayOfWeek: 2, startTime: "10:00", endTime: "19:00", isAvailable: true },
      { dayOfWeek: 3, startTime: "10:00", endTime: "19:00", isAvailable: true },
      { dayOfWeek: 4, startTime: "10:00", endTime: "19:00", isAvailable: true },
      { dayOfWeek: 5, startTime: "10:00", endTime: "19:00", isAvailable: true },
      { dayOfWeek: 6, startTime: "10:00", endTime: "19:00", isAvailable: true },
    ],
    totalSessions: 300,
    calendlyLink: "https://calendly.com/prakshita-kamble",
    image: "/lovable-uploads/2603e6b0-6efa-463b-83d5-bcf6a4b1b340.png",
    pricing: { "30": 900, "50": 1200 },
    isApproved: true,
    isOnboarded: true,
    onboardingStatus: 'approved',
  },
  {
    email: "sejal.ketkar@ehsaas.com",
    password: "password123",
    name: "Sejal Ketkar",
    title: "Psychologist",
    specializations: ["Anxiety", "Self-doubt", "Relationship Therapy", "Emotional Processing"],
    experience: 4,
    rating: 4.9,
    bio: "I work with adults navigating anxiety, self-doubt, relationship struggles, and those 'Main aisa kyo hoon?' moments. I offer a space that's compassionate, reflective, and honest...where big feelings and messy thoughts are welcome.",
    languages: ["English", "Marathi", "Hindi"],
    availability: [
      { dayOfWeek: 2, startTime: "09:00", endTime: "18:00", isAvailable: true },
      { dayOfWeek: 3, startTime: "09:00", endTime: "18:00", isAvailable: true },
      { dayOfWeek: 4, startTime: "09:00", endTime: "18:00", isAvailable: true },
      { dayOfWeek: 5, startTime: "09:00", endTime: "18:00", isAvailable: true },
      { dayOfWeek: 6, startTime: "09:00", endTime: "18:00", isAvailable: true },
    ],
    totalSessions: 650,
    calendlyLink: "https://calendly.com/sejal-ketkar",
    image: "/lovable-uploads/2407e90e-97a9-4180-bfcc-8f0d15c8fde5.png",
    pricing: { "30": 600, "50": 900 },
    isApproved: true,
    isOnboarded: true,
    onboardingStatus: 'approved',
  },
  {
    email: "ekta.singh@ehsaas.com",
    password: "password123",
    name: "Ekta Singh",
    title: "Psychologist",
    specializations: ["Anxiety", "Self-doubt", "Counselling Psychology", "Emotional Support"],
    experience: 3,
    rating: 4.8,
    bio: "Therapist | M.Sc Counselling Psychology. I'm here to hold a safe space for anxious minds, sensitive souls, and those carrying quiet stories of self-doubt and uncertainty. Whatever you're holding — we'll start there, with care and compassion. You're welcome here, just as you are.",
    languages: ["English", "Hindi"],
    availability: [
      { dayOfWeek: 1, startTime: "11:00", endTime: "20:00", isAvailable: true },
      { dayOfWeek: 2, startTime: "11:00", endTime: "20:00", isAvailable: true },
      { dayOfWeek: 3, startTime: "11:00", endTime: "20:00", isAvailable: true },
      { dayOfWeek: 4, startTime: "11:00", endTime: "20:00", isAvailable: true },
      { dayOfWeek: 5, startTime: "11:00", endTime: "20:00", isAvailable: true },
    ],
    totalSessions: 450,
    calendlyLink: "https://calendly.com/ekta-singh",
    image: "/lovable-uploads/15c8f76e-a7f3-457f-9904-090d4b413d5a.png",
    pricing: { "30": 600, "50": 900 },
    isApproved: true,
    isOnboarded: true,
    onboardingStatus: 'approved',
  },
  {
    email: "rasika.godbole@ehsaas.com",
    password: "password123",
    name: "Rasika Godbole",
    title: "Psychologist",
    specializations: ["LGBTQ+ Affirmative", "Identity", "Self-discovery", "Queer Therapy"],
    experience: 5,
    rating: 4.9,
    bio: "I am a queer affirmative therapist, offering a space for you to reimagine, and rewrite your story. No scary labels, no unhelpful 'shoulds'. Just a journey of learning and growth.",
    languages: ["Marathi", "Hindi", "English"],
    availability: [
      { dayOfWeek: 1, startTime: "10:00", endTime: "18:00", isAvailable: true },
      { dayOfWeek: 2, startTime: "10:00", endTime: "18:00", isAvailable: true },
      { dayOfWeek: 3, startTime: "10:00", endTime: "18:00", isAvailable: true },
      { dayOfWeek: 4, startTime: "10:00", endTime: "18:00", isAvailable: true },
      { dayOfWeek: 5, startTime: "10:00", endTime: "18:00", isAvailable: true },
      { dayOfWeek: 6, startTime: "10:00", endTime: "18:00", isAvailable: true },
    ],
    totalSessions: 800,
    calendlyLink: "https://calendly.com/rasika-godbole",
    image: "/lovable-uploads/94da55a9-29ca-490c-ab5f-cfac6a49229b.png",
    pricing: { "30": 900, "50": 1200 },
    isApproved: true,
    isOnboarded: true,
    onboardingStatus: 'approved',
  },
  {
    email: "rohan.chandak@ehsaas.com",
    password: "password123",
    name: "Rohan Chandak",
    title: "Counselling Psychologist",
    specializations: ["Life Transitions", "Anxiety", "Relationship Counselling", "Emotional Well-being"],
    experience: 4,
    rating: 4.7,
    bio: "With over four years of experience, I guide individuals of all ages through their emotional journeys in a safe, supportive space. Fluent in English and Hindi, I empower clients facing life transitions, anxiety, or relationship challenges. Let's embark on this journey toward emotional well-being together.",
    languages: ["English", "Hindi"],
    availability: [
      { dayOfWeek: 1, startTime: "09:00", endTime: "19:00", isAvailable: true },
      { dayOfWeek: 2, startTime: "09:00", endTime: "19:00", isAvailable: true },
      { dayOfWeek: 3, startTime: "09:00", endTime: "19:00", isAvailable: true },
      { dayOfWeek: 4, startTime: "09:00", endTime: "19:00", isAvailable: true },
      { dayOfWeek: 5, startTime: "09:00", endTime: "19:00", isAvailable: true },
    ],
    totalSessions: 750,
    calendlyLink: "https://calendly.com/rohan-chandak",
    image: "/lovable-uploads/a17b9578-8553-49a2-a75b-78a03de25a20.png",
    pricing: { "50": 1600 },
    isApproved: true,
    isOnboarded: true,
    onboardingStatus: 'approved',
  },
  {
    email: "priyadarshini.sethia@ehsaas.com",
    password: "password123",
    name: "Priyadarshini Sethia",
    title: "Founder & Psychologist",
    specializations: ["Therapy", "Mental Health", "Healing", "Emotional Support"],
    experience: 6,
    rating: 4.9,
    bio: "I have way too many hobbies, but nothing grounds me like a good trek, quiet time in nature, reading a book, or cooking something soulful with old melodies on. As a therapist, I believe in feeling deeply, healing gently, and leaving the world kinder than I found it.",
    languages: ["English", "Hindi"],
    availability: [
      { dayOfWeek: 1, startTime: "09:00", endTime: "18:00", isAvailable: true },
      { dayOfWeek: 2, startTime: "09:00", endTime: "18:00", isAvailable: true },
      { dayOfWeek: 3, startTime: "09:00", endTime: "18:00", isAvailable: true },
      { dayOfWeek: 4, startTime: "09:00", endTime: "18:00", isAvailable: true },
      { dayOfWeek: 5, startTime: "09:00", endTime: "18:00", isAvailable: true },
      { dayOfWeek: 6, startTime: "09:00", endTime: "18:00", isAvailable: true },
    ],
    totalSessions: 1000,
    calendlyLink: "https://calendly.com/priyadarshini-sethia",
    image: "/lovable-uploads/77840dcc-8f17-4f1c-9278-f9b56f1efc73.png",
    pricing: { "30": 1400, "50": 1700 },
    isApproved: true,
    isOnboarded: true,
    onboardingStatus: 'approved',
  },
  {
    email: "madalsa.agrawal@ehsaas.com",
    password: "password123",
    name: "Dr. Madalsa Agrawal",
    title: "Psychiatrist",
    specializations: ["Psychiatry", "Mental Health", "Holistic Approach", "Quality of Life"],
    experience: 8,
    rating: 4.9,
    bio: "Mental health specialist who believes in a holistic approach and overall improvement in quality of life! Adding more smiles than fear!",
    languages: ["Hindi", "English"],
    availability: [
      { dayOfWeek: 1, startTime: "10:00", endTime: "18:00", isAvailable: true },
      { dayOfWeek: 2, startTime: "10:00", endTime: "18:00", isAvailable: true },
      { dayOfWeek: 3, startTime: "10:00", endTime: "18:00", isAvailable: true },
      { dayOfWeek: 4, startTime: "10:00", endTime: "18:00", isAvailable: true },
      { dayOfWeek: 5, startTime: "10:00", endTime: "18:00", isAvailable: true },
    ],
    totalSessions: 1200,
    calendlyLink: "https://calendly.com/dr-madalsa-agrawal",
    image: "/lovable-uploads/2bd68b7a-8cfb-44b2-bc0b-66479749297a.png",
    pricing: { "30": 1500, "60": 2000 },
    isApproved: true,
    isOnboarded: true,
    onboardingStatus: 'approved',
  },
  {
    email: "ananya.sharma@ehsaas.com",
    password: "password123",
    name: "Ananya Sharma",
    title: "Psychologist",
    specializations: ["Anxiety", "Stress Management", "Mindfulness", "Emotional Well-being"],
    experience: 4,
    rating: 4.8,
    bio: "A compassionate therapist dedicated to helping individuals navigate anxiety and stress through mindfulness-based approaches. I believe in creating a warm, non-judgmental space where healing can unfold naturally. My practice blends CBT with mindfulness techniques for lasting change.",
    languages: ["English", "Hindi"],
    availability: [
      { dayOfWeek: 0, startTime: "10:00", endTime: "16:00", isAvailable: true },
      { dayOfWeek: 1, startTime: "09:00", endTime: "18:00", isAvailable: true },
      { dayOfWeek: 2, startTime: "09:00", endTime: "18:00", isAvailable: true },
      { dayOfWeek: 3, startTime: "09:00", endTime: "18:00", isAvailable: true },
      { dayOfWeek: 4, startTime: "09:00", endTime: "18:00", isAvailable: true },
      { dayOfWeek: 5, startTime: "09:00", endTime: "18:00", isAvailable: true },
      { dayOfWeek: 6, startTime: "10:00", endTime: "16:00", isAvailable: true },
    ],
    totalSessions: 400,
    calendlyLink: "https://calendly.com/ananya-sharma",
    image: "",
    pricing: { "30": 800, "50": 1100 },
    isApproved: true,
    isOnboarded: true,
    onboardingStatus: 'approved',
  },
];

// Dummy client data
const seedClients = [
  { email: 'arjun.patel@gmail.com', password: 'client123', name: 'Arjun Patel', phone: '+91-9876543210', therapyPreferences: { type: 'Individual', concerns: ['Anxiety', 'Stress'], preferredLanguage: 'English', description: 'Looking for help with work-related anxiety' } },
  { email: 'priya.mehta@gmail.com', password: 'client123', name: 'Priya Mehta', phone: '+91-9876543211', therapyPreferences: { type: 'Individual', concerns: ['Depression', 'Self-esteem'], preferredLanguage: 'Hindi', description: 'Dealing with low mood and confidence issues' } },
  { email: 'rahul.sharma@gmail.com', password: 'client123', name: 'Rahul Sharma', phone: '+91-9876543212', therapyPreferences: { type: 'Individual', concerns: ['Relationship Issues', 'Anxiety'], preferredLanguage: 'English', description: '' } },
  { email: 'sneha.desai@gmail.com', password: 'client123', name: 'Sneha Desai', phone: '+91-9876543213', therapyPreferences: { type: 'Individual', concerns: ['Trauma', 'PTSD'], preferredLanguage: 'Marathi', description: 'Need a safe space to process past experiences' } },
  { email: 'vikram.joshi@gmail.com', password: 'client123', name: 'Vikram Joshi', phone: '+91-9876543214', therapyPreferences: { type: 'Individual', concerns: ['Life Transitions', 'Identity'], preferredLanguage: 'English', description: 'Going through a career change' } },
];

const seedDB = async () => {
  try {
    await connectDB();

    // Clear all collections
    await Promise.all([
      Therapist.deleteMany({}),
      Admin.deleteMany({}),
      Client.deleteMany({}),
      Session.deleteMany({}),
      Payment.deleteMany({}),
    ]);
    console.log('Cleared all collections');

    // Insert therapists
    const therapists = [];
    for (const t of seedTherapists) {
      const created = await Therapist.create(t);
      therapists.push(created);
      console.log(`Created therapist: ${t.name}`);
    }

    // Insert admins
    const admins = [
      { email: 'shukla.amitedcjss@gmail.com', password: 'admin1234', name: 'Amit Shukla' },
      { email: 'pdsethia17@gmail.com', password: 'admin1234', name: 'Priyadarshini Sethia' },
    ];
    for (const a of admins) {
      await Admin.create(a);
      console.log(`Created admin: ${a.name} (${a.email})`);
    }

    // Insert clients
    const clients = [];
    for (const c of seedClients) {
      const created = await Client.create(c);
      clients.push(created);
      console.log(`Created client: ${c.name}`);
    }

    // Create dummy sessions and payments
    console.log('Creating dummy sessions and payments...');
    const now = new Date();
    const statuses = ['completed', 'completed', 'completed', 'completed', 'cancelled', 'completed'];
    const times = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
    let sessionCount = 0;
    let paymentCount = 0;

    for (let ti = 0; ti < therapists.length; ti++) {
      const therapist = therapists[ti];
      const pricing = therapist.pricing instanceof Map ? Object.fromEntries(therapist.pricing) : therapist.pricing;
      const durations = Object.keys(pricing).map(Number);
      if (durations.length === 0) continue;

      // Each therapist gets sessions with 2-3 random clients
      const numClients = Math.min(clients.length, 2 + (ti % 2));

      for (let ci = 0; ci < numClients; ci++) {
        const client = clients[(ti + ci) % clients.length];

        // Past sessions (3-5 per client-therapist pair)
        const numPastSessions = 3 + (ti % 3);
        for (let s = 0; s < numPastSessions; s++) {
          const daysAgo = 7 + s * 7 + (ti % 5); // spread over past weeks
          const date = new Date(now);
          date.setDate(date.getDate() - daysAgo);
          const duration = durations[s % durations.length];
          const amount = pricing[String(duration)];
          const status = statuses[s % statuses.length];
          const time = times[s % times.length];
          const endHour = parseInt(time.split(':')[0]) + Math.ceil(duration / 60);
          const endTime = `${String(endHour).padStart(2, '0')}:00`;

          const session = await Session.create({
            clientId: client._id,
            therapistId: therapist._id,
            date,
            startTime: time,
            endTime,
            duration,
            amount,
            status,
            sessionType: 'individual',
          });
          sessionCount++;

          // Create payment for completed sessions
          if (status === 'completed') {
            await Payment.create({
              clientId: client._id,
              therapistId: therapist._id,
              sessionId: session._id,
              amount,
              status: 'completed',
              paymentMethod: 'phonepe',
            });
            paymentCount++;
          }
        }

        // Future sessions (1-2 per client-therapist pair)
        const numFuture = 1 + (ci % 2);
        for (let s = 0; s < numFuture; s++) {
          const daysAhead = 3 + s * 7 + (ti % 4);
          const date = new Date(now);
          date.setDate(date.getDate() + daysAhead);
          const duration = durations[0];
          const amount = pricing[String(duration)];
          const time = times[(ti + s) % times.length];
          const endHour = parseInt(time.split(':')[0]) + Math.ceil(duration / 60);
          const endTime = `${String(endHour).padStart(2, '0')}:00`;

          const session = await Session.create({
            clientId: client._id,
            therapistId: therapist._id,
            date,
            startTime: time,
            endTime,
            duration,
            amount,
            status: 'scheduled',
            sessionType: 'individual',
          });
          sessionCount++;

          // Future sessions have pending payments
          await Payment.create({
            clientId: client._id,
            therapistId: therapist._id,
            sessionId: session._id,
            amount,
            status: 'completed',
            paymentMethod: 'phonepe',
          });
          paymentCount++;
        }
      }
    }

    console.log(`Created ${sessionCount} sessions and ${paymentCount} payments`);
    console.log('Seed complete!');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedDB();
