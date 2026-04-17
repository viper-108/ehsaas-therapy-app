import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import connectDB from './config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const migrate = async () => {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    const sessions = db.collection('sessions');

    // Find sessions where notes is a plain string (old format)
    const cursor = sessions.find({ notes: { $type: 'string' } });
    let count = 0;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      if (doc.notes && typeof doc.notes === 'string' && doc.notes.trim()) {
        await sessions.updateOne(
          { _id: doc._id },
          { $set: { notes: { importantNotes: doc.notes, clientMood: '', keyTopicsDiscussed: '', interventionsOrSkillsUsed: '', plannedAgreedTasks: '', readingsOrSupervisionQuestions: '' } } }
        );
        count++;
      } else {
        // Empty string → empty object
        await sessions.updateOne(
          { _id: doc._id },
          { $set: { notes: {} } }
        );
      }
    }

    console.log(`Migrated ${count} sessions with string notes to structured format.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
};

migrate();
