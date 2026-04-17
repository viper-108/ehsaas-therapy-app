import mongoose from 'mongoose';

const clientHistorySchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true },
  socioDemographics: { type: String, required: true },
  dateOfFirstSession: { type: Date, required: true },
  presentingConcerns: { type: String, required: true },
  historyOfPresentingConcerns: { type: String, required: true },
  familyHistoryMentalHealth: { type: String, required: true },
  personalHistory: { type: String, required: true }, // developmental milestones, education, relationships, childhood, medical, sexual, marital, substance use
  premorbidPersonality: { type: String, required: true }, // social relations, intellectual activities, mood, attitude, energy, habits
  clientEngagementMotivation: { type: String, required: true },
}, { timestamps: true });

clientHistorySchema.index({ clientId: 1, therapistId: 1 }, { unique: true });

export default mongoose.model('ClientHistory', clientHistorySchema);
