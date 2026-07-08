import mongoose from 'mongoose';

const cycleSchema = new mongoose.Schema({
  cycleNumber: {
    type: Number,
    required: [true, 'Cycle number is required'],
    unique: true,
  },
  semester: {
    type: String,
    required: [true, 'Semester is required'],
    trim: true,
  },
  startDate: {
    type: Date,
  },
  endDate: {
    type: Date,
  }
}, {
  timestamps: true,
});

export default mongoose.model('Cycle', cycleSchema);
