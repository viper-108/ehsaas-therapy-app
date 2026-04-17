import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  category: { type: String, default: 'general', trim: true },
  description: { type: String, default: '' },
}, { timestamps: true });

settingsSchema.statics.get = async function(key, fallback = null) {
  const setting = await this.findOne({ key });
  return setting ? setting.value : fallback;
};

settingsSchema.statics.getByCategory = async function(category) {
  const settings = await this.find({ category });
  const map = {};
  settings.forEach(s => { map[s.key] = s.value; });
  return map;
};

settingsSchema.statics.set = async function(key, value, category, description) {
  return this.findOneAndUpdate(
    { key },
    { value, ...(category && { category }), ...(description && { description }) },
    { upsert: true, new: true }
  );
};

export default mongoose.model('Settings', settingsSchema);
