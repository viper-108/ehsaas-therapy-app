import mongoose from 'mongoose';

/**
 * SupervisionGroup — group supervision led by a single supervisor (or co-leads).
 * 4-session lockstep payment (no cancellation/refund).
 *
 * Lifecycle: pending_admin → upcoming → ongoing → completed | rejected | cancelled
 */
const supervisionGroupSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  level: { type: String, default: 'beginner' },        // "Beginners 0-2 yrs", etc.
  format: { type: String, default: '' },               // "one case discussion, one theme discussion"
  groupSize: { type: Number, required: true, min: 2, max: 12 },

  supervisorTherapistIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Therapist' }],

  schedule: { type: String, default: '' },             // "Mon 7-9 PM IST", or first session datetime
  sessionStartAt: { type: Date, default: null },
  totalSessions: { type: Number, default: 4 },
  durationMinutes: { type: Number, default: 90 },
  pricePer4Sessions: { type: Number, required: true, min: 0 },  // lockstep payment

  language: { type: String, default: 'English' },
  mode: { type: String, enum: ['online', 'in-person', 'hybrid'], default: 'online' },

  status: {
    type: String,
    enum: ['pending_admin', 'upcoming', 'ongoing', 'completed', 'rejected', 'cancelled'],
    default: 'pending_admin'
  },
  approvedAt: { type: Date, default: null },
  rejectedAt: { type: Date, default: null },
  rejectionReason: { type: String, default: '' },

  enrolledCount: { type: Number, default: 0 },
}, { timestamps: true });

supervisionGroupSchema.index({ status: 1 });
supervisionGroupSchema.index({ supervisorTherapistIds: 1 });

export default mongoose.model('SupervisionGroup', supervisionGroupSchema);
