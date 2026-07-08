import mongoose from 'mongoose';

const overrideSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    index: true,
  },
  periodIndex: {
    type: Number,
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  faculty: {
    type: String,
    required: true,
  }
}, {
  timestamps: true,
});

// A specific period on a specific date can only be overridden once
overrideSchema.index({ date: 1, periodIndex: 1 }, { unique: true });

export default mongoose.model('Override', overrideSchema);
