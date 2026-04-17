import mongoose from 'mongoose';

const responseSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, default: '' },
  rating: { type: Number, min: 1, max: 5 },
}, { _id: false });

const feedbackSurveySchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Therapist', required: true },
  responses: [responseSchema],
  overallSatisfaction: { type: Number, min: 1, max: 5, required: true },
  wouldRecommend: { type: Boolean, required: true },
}, { timestamps: true });

feedbackSurveySchema.index({ sessionId: 1 }, { unique: true });
feedbackSurveySchema.index({ therapistId: 1 });

export default mongoose.model('FeedbackSurvey', feedbackSurveySchema);
