import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Therapist from './models/Therapist.js';
import Client from './models/Client.js';
import Session from './models/Session.js';
import Payment from './models/Payment.js';
import connectDB from './config/db.js';

dotenv.config();

const seedDemo = async () => {
  try {
    await connectDB();

    // Clear old demo data (sessions & payments)
    await Session.deleteMany({});
    await Payment.deleteMany({});
    // Remove old demo client if exists
    await Client.deleteOne({ email: 'demo.client@ehsaas.com' });
    // Remove old demo therapist if exists
    await Therapist.deleteOne({ email: 'demo.therapist@ehsaas.com' });

    console.log('Cleared old demo data');

    // =============================================
    // 1. CREATE DEMO THERAPIST
    // =============================================
    const demoTherapist = await Therapist.create({
      email: 'demo.therapist@ehsaas.com',
      password: 'demo1234',
      name: 'Dr. Ananya Sharma',
      title: 'Clinical Psychologist',
      phone: '+91-9876543210',
      specializations: ['Anxiety', 'Depression', 'Trauma Therapy', 'Relationship Issues', 'Self-esteem', 'Stress Management'],
      experience: 7,
      rating: 4.9,
      bio: 'With 7+ years of clinical experience, I specialize in helping individuals navigate anxiety, depression, and relationship challenges. My approach combines CBT and mindfulness techniques to create lasting change. I believe every person deserves a safe space to explore their feelings.',
      languages: ['English', 'Hindi', 'Marathi'],
      image: '/lovable-uploads/d39c5cef-c68f-4cc4-8df2-3845155b3807.png',
      availability: [
        { dayOfWeek: 0, startTime: '10:00', endTime: '14:00', isAvailable: true },
        { dayOfWeek: 1, startTime: '09:00', endTime: '18:00', isAvailable: true },
        { dayOfWeek: 2, startTime: '09:00', endTime: '18:00', isAvailable: true },
        { dayOfWeek: 3, startTime: '09:00', endTime: '18:00', isAvailable: true },
        { dayOfWeek: 4, startTime: '09:00', endTime: '18:00', isAvailable: true },
        { dayOfWeek: 5, startTime: '09:00', endTime: '18:00', isAvailable: true },
        { dayOfWeek: 6, startTime: '10:00', endTime: '15:00', isAvailable: true },
      ],
      totalSessions: 42,
      totalHours: 35,
      totalEarnings: 37800,
      calendlyLink: 'https://calendly.com/dr-ananya-sharma',
      pricing: { '30': 800, '50': 1200 },
      isApproved: true,
      isOnboarded: true,
    });
    console.log(`Created demo therapist: ${demoTherapist.name} (${demoTherapist._id})`);

    // =============================================
    // 2. CREATE DEMO CLIENT
    // =============================================
    const demoClient = await Client.create({
      email: 'demo.client@ehsaas.com',
      password: 'demo1234',
      name: 'Rahul Mehra',
      phone: '+91-9123456789',
      therapyPreferences: {
        type: 'Individual Therapy',
        concerns: ['Anxiety', 'Stress', 'Self-esteem', 'Life Transitions'],
        preferredLanguage: 'English',
        description: 'I have been feeling anxious about work and relationships. Looking for someone to help me manage stress and build confidence.',
      },
    });
    console.log(`Created demo client: ${demoClient.name} (${demoClient._id})`);

    // =============================================
    // 3. GET ALL THERAPISTS (for diverse session data)
    // =============================================
    const allTherapists = await Therapist.find({ isApproved: true });
    const sakshi = allTherapists.find(t => t.name === 'Sakshi Malagi');
    const sejal = allTherapists.find(t => t.name === 'Sejal Ketkar');
    const priyadarshini = allTherapists.find(t => t.name === 'Priyadarshini Sethia');

    // =============================================
    // 4. CREATE PAST COMPLETED SESSIONS (for demo therapist)
    // =============================================
    const pastDates = [];
    for (let i = 1; i <= 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      pastDates.push(d);
    }

    // Create a second demo client for therapist's other sessions
    const demoClient2 = await Client.create({
      email: 'priya.verma@example.com',
      password: 'demo1234',
      name: 'Priya Verma',
      phone: '+91-8765432109',
      therapyPreferences: {
        type: 'Individual Therapy',
        concerns: ['Depression', 'Relationship Issues'],
        preferredLanguage: 'Hindi',
        description: 'Going through a tough breakup and feeling lost.',
      },
    });

    const demoClient3 = await Client.create({
      email: 'arjun.patel@example.com',
      password: 'demo1234',
      name: 'Arjun Patel',
      phone: '+91-7654321098',
      therapyPreferences: {
        type: 'Individual Therapy',
        concerns: ['Anxiety', 'Self-doubt'],
        preferredLanguage: 'English',
        description: 'Work-related anxiety and imposter syndrome.',
      },
    });

    console.log('Created additional demo clients');

    // ---- Sessions for DEMO THERAPIST (Dr. Ananya Sharma) ----

    // 15 completed past sessions
    const completedSessions = [];
    const clients = [demoClient, demoClient2, demoClient3];
    const times = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
    const durations = [30, 50];

    for (let i = 0; i < 15; i++) {
      const client = clients[i % 3];
      const date = pastDates[i + 2]; // skip first 2 days
      const dur = durations[i % 2];
      const pricing = demoTherapist.pricing instanceof Map
        ? Object.fromEntries(demoTherapist.pricing)
        : demoTherapist.pricing;
      const amount = pricing[String(dur)] || 800;
      const time = times[i % times.length];
      const endMin = parseInt(time.split(':')[1]) + dur;
      const endHour = parseInt(time.split(':')[0]) + Math.floor(endMin / 60);
      const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;

      const session = await Session.create({
        clientId: client._id,
        therapistId: demoTherapist._id,
        date,
        startTime: time,
        endTime,
        duration: dur,
        amount,
        status: 'completed',
        sessionType: 'individual',
      });
      completedSessions.push(session);

      // Create completed payment for each
      await Payment.create({
        clientId: client._id,
        therapistId: demoTherapist._id,
        sessionId: session._id,
        amount,
        status: 'completed',
        paymentMethod: 'stripe',
        stripePaymentIntentId: `pi_demo_${i}_${Date.now()}`,
      });
    }
    console.log('Created 15 completed sessions for demo therapist');

    // 3 cancelled past sessions
    for (let i = 0; i < 3; i++) {
      await Session.create({
        clientId: clients[i]._id,
        therapistId: demoTherapist._id,
        date: pastDates[i + 18],
        startTime: '11:00',
        endTime: '11:50',
        duration: 50,
        amount: 1200,
        status: 'cancelled',
        sessionType: 'individual',
      });
    }
    console.log('Created 3 cancelled sessions for demo therapist');

    // 1 no-show past session
    await Session.create({
      clientId: demoClient2._id,
      therapistId: demoTherapist._id,
      date: pastDates[22],
      startTime: '14:00',
      endTime: '14:50',
      duration: 50,
      amount: 1200,
      status: 'no-show',
      sessionType: 'individual',
    });
    console.log('Created 1 no-show session for demo therapist');

    // 5 upcoming scheduled sessions for demo therapist
    const futureDates = [];
    for (let i = 1; i <= 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      futureDates.push(d);
    }

    for (let i = 0; i < 5; i++) {
      const client = clients[i % 3];
      const dur = durations[i % 2];
      const pricing = demoTherapist.pricing instanceof Map
        ? Object.fromEntries(demoTherapist.pricing)
        : demoTherapist.pricing;
      const amount = pricing[String(dur)] || 800;
      const time = times[i + 1];

      const endMin = parseInt(time.split(':')[1]) + dur;
      const endHour = parseInt(time.split(':')[0]) + Math.floor(endMin / 60);
      const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;

      const session = await Session.create({
        clientId: client._id,
        therapistId: demoTherapist._id,
        date: futureDates[i * 2 + 1],
        startTime: time,
        endTime,
        duration: dur,
        amount,
        status: 'scheduled',
        sessionType: 'individual',
      });

      await Payment.create({
        clientId: client._id,
        therapistId: demoTherapist._id,
        sessionId: session._id,
        amount,
        status: 'completed',
        paymentMethod: 'stripe',
        stripePaymentIntentId: `pi_future_${i}_${Date.now()}`,
      });
    }
    console.log('Created 5 upcoming sessions for demo therapist');

    // ---- Sessions for DEMO CLIENT (Rahul Mehra) with OTHER therapists ----

    // 8 completed past sessions with different therapists
    const otherTherapists = [sakshi, sejal, priyadarshini, demoTherapist].filter(Boolean);

    for (let i = 0; i < 8; i++) {
      const therapist = otherTherapists[i % otherTherapists.length];
      const date = pastDates[i + 3];
      const dur = durations[i % 2];
      const pricing = therapist.pricing instanceof Map
        ? Object.fromEntries(therapist.pricing)
        : therapist.pricing;
      const amount = pricing[String(dur)] || 600;
      const time = times[(i + 2) % times.length];

      const endMin = parseInt(time.split(':')[1]) + dur;
      const endHour = parseInt(time.split(':')[0]) + Math.floor(endMin / 60);
      const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;

      const session = await Session.create({
        clientId: demoClient._id,
        therapistId: therapist._id,
        date,
        startTime: time,
        endTime,
        duration: dur,
        amount,
        status: 'completed',
        sessionType: 'individual',
      });

      await Payment.create({
        clientId: demoClient._id,
        therapistId: therapist._id,
        sessionId: session._id,
        amount,
        status: 'completed',
        paymentMethod: 'stripe',
        stripePaymentIntentId: `pi_client_past_${i}_${Date.now()}`,
      });
    }
    console.log('Created 8 past sessions for demo client with various therapists');

    // 2 cancelled sessions for demo client
    for (let i = 0; i < 2; i++) {
      const therapist = otherTherapists[i];
      await Session.create({
        clientId: demoClient._id,
        therapistId: therapist._id,
        date: pastDates[i + 12],
        startTime: '15:00',
        endTime: '15:50',
        duration: 50,
        amount: 900,
        status: 'cancelled',
        sessionType: 'individual',
      });
    }
    console.log('Created 2 cancelled sessions for demo client');

    // 4 upcoming sessions for demo client with different therapists
    for (let i = 0; i < 4; i++) {
      const therapist = otherTherapists[i % otherTherapists.length];
      const dur = durations[i % 2];
      const pricing = therapist.pricing instanceof Map
        ? Object.fromEntries(therapist.pricing)
        : therapist.pricing;
      const amount = pricing[String(dur)] || 600;
      const time = times[(i + 3) % times.length];

      const endMin = parseInt(time.split(':')[1]) + dur;
      const endHour = parseInt(time.split(':')[0]) + Math.floor(endMin / 60);
      const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;

      const session = await Session.create({
        clientId: demoClient._id,
        therapistId: therapist._id,
        date: futureDates[i * 3 + 1],
        startTime: time,
        endTime,
        duration: dur,
        amount,
        status: 'scheduled',
        sessionType: 'individual',
      });

      await Payment.create({
        clientId: demoClient._id,
        therapistId: therapist._id,
        sessionId: session._id,
        amount,
        status: 'completed',
        paymentMethod: 'stripe',
        stripePaymentIntentId: `pi_client_future_${i}_${Date.now()}`,
      });
    }
    console.log('Created 4 upcoming sessions for demo client');

    // =============================================
    // 5. UPDATE THERAPIST STATS
    // =============================================
    // Update demo therapist's session count & earnings from actual data
    const demoTherapistCompletedSessions = await Session.countDocuments({
      therapistId: demoTherapist._id, status: 'completed'
    });
    const demoTherapistPayments = await Payment.find({
      therapistId: demoTherapist._id, status: 'completed'
    });
    const demoEarnings = demoTherapistPayments.reduce((sum, p) => sum + p.amount, 0);
    const demoCompletedSessionDocs = await Session.find({
      therapistId: demoTherapist._id, status: 'completed'
    });
    const demoHours = demoCompletedSessionDocs.reduce((sum, s) => sum + (s.duration / 60), 0);

    await Therapist.findByIdAndUpdate(demoTherapist._id, {
      totalSessions: demoTherapistCompletedSessions,
      totalEarnings: demoEarnings,
      totalHours: Math.round(demoHours * 10) / 10,
    });

    // Also update other therapists who had sessions with demo client
    for (const t of otherTherapists) {
      if (!t) continue;
      const tCompleted = await Session.countDocuments({ therapistId: t._id, status: 'completed' });
      const tPayments = await Payment.find({ therapistId: t._id, status: 'completed' });
      const tEarnings = tPayments.reduce((sum, p) => sum + p.amount, 0);
      const tSessions = await Session.find({ therapistId: t._id, status: 'completed' });
      const tHours = tSessions.reduce((sum, s) => sum + (s.duration / 60), 0);
      await Therapist.findByIdAndUpdate(t._id, {
        totalSessions: t.totalSessions + tCompleted,
        totalEarnings: tEarnings,
        totalHours: Math.round(tHours * 10) / 10,
      });
    }

    console.log('\n====================================');
    console.log('DEMO SEED COMPLETE!');
    console.log('====================================\n');

    // Final summary
    const totalSessions = await Session.countDocuments();
    const totalPayments = await Payment.countDocuments();
    const totalClients = await Client.countDocuments();
    const totalTherapists = await Therapist.countDocuments();

    console.log(`Total Therapists: ${totalTherapists}`);
    console.log(`Total Clients: ${totalClients}`);
    console.log(`Total Sessions: ${totalSessions}`);
    console.log(`  - Completed: ${await Session.countDocuments({ status: 'completed' })}`);
    console.log(`  - Scheduled: ${await Session.countDocuments({ status: 'scheduled' })}`);
    console.log(`  - Cancelled: ${await Session.countDocuments({ status: 'cancelled' })}`);
    console.log(`  - No-show: ${await Session.countDocuments({ status: 'no-show' })}`);
    console.log(`Total Payments: ${totalPayments}`);

    console.log('\n--- LOGIN CREDENTIALS ---');
    console.log('');
    console.log('DEMO CLIENT:');
    console.log('  Email:    demo.client@ehsaas.com');
    console.log('  Password: demo1234');
    console.log('');
    console.log('DEMO THERAPIST:');
    console.log('  Email:    demo.therapist@ehsaas.com');
    console.log('  Password: demo1234');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedDemo();
