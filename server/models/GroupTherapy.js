import mongoose from 'mongoose';

/**
 * GroupTherapy — a group session series proposed by 1 or 2 therapists.
 * Lifecycle: pending_admin -> upcoming -> ongoing -> completed
 *                      └------> rejected | cancelled
 *
 * Member limits enforced server-side: 1 therapist => max 5 clients; 2 therapists => max 10.
 */
const groupTherapySchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  focus: { type: String, required: true }, // e.g. "Anxiety", "Trauma", "Grief"
  groupType: { type: String, enum: ['open', 'closed'], required: true },

  // Expanded therapist-supplied details
  themes: [{ type: String }],            // multiple themes/topics
  rationale: { type: String, default: '' },
  audienceDescription: { type: String, default: '' },  // "issues, age, gender, prerequisites"
  contraindications: { type: String, default: '' },    // "who is it NOT for"
  outcomes: { type: String, default: '' },             // goals/outcomes
  planProcedure: { type: String, default: '' },        // session-by-session detailed plan
  language: { type: String, default: 'English' },
  frequency: { type: String, default: '' },            // e.g. "Weekly", "Bi-weekly"
  mode: { type: String, enum: ['online', 'in-person', 'hybrid'], default: 'online' },
  durationMinutes: { type: Number, default: 60 },      // each session length
  brochureUrl: { type: String, default: '' },          // optional uploaded marketing image
  // Policies — defaults can be customised per group
  policyText: { type: String, default: '' },           // confidentiality / ground rules / crisis / refund

  ageMin: { type: Number, default: 18 },
  ageMax: { type: Number, default: 65 },
  genderPreference: { type: String, default: '' },     // 'all', 'women', 'men', 'queer-affirmative'

  // Capacity limits derived from leadTherapists.length
  maxMembers: { type: Number, required: true, min: 1, max: 10 },
  pricePerMember: { type: Number, required: true, min: 0 },

  leadTherapists: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Therapist' }],

  // Schedule
  registrationOpensAt: { type: Date, default: Date.now },
  registrationClosesAt: { type: Date, default: null },
  sessionStartAt: { type: Date, required: true },
  sessionEndAt: { type: Date, default: null },        // last session end
  totalSessions: { type: Number, default: 1 },        // # of sessions in the series

  // Status
  status: {
    type: String,
    enum: ['pending_admin', 'upcoming', 'ongoing', 'completed', 'rejected', 'cancelled'],
    default: 'pending_admin'
  },
  approvedAt: { type: Date, default: null },
  rejectedAt: { type: Date, default: null },
  rejectionReason: { type: String, default: '' },

  // Lock — within 48hr of start, admin/therapist can lock the group
  // Once locked: clients cannot leave, no refund issued, chat group auto-created
  isLocked: { type: Boolean, default: false },
  lockedAt: { type: Date, default: null },
  lockedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
  chatGroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatGroup', default: null },

  // Stats — derived (kept for fast list queries)
  enrolledCount: { type: Number, default: 0 },
  waitlistCount: { type: Number, default: 0 },
}, { timestamps: true });

groupTherapySchema.index({ status: 1, sessionStartAt: 1 });
groupTherapySchema.index({ leadTherapists: 1 });

export default mongoose.model('GroupTherapy', groupTherapySchema);
