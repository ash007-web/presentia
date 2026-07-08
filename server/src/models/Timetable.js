import mongoose from 'mongoose';

const periodSchema = new mongoose.Schema({
  periodIndex: { type: Number, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  subject: { type: String, required: true },
  faculty: { type: String, required: true },
}, { _id: false });

const timetableSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: true,
    unique: true,
  },
  periods: [periodSchema]
}, {
  timestamps: true,
});

timetableSchema.index({ day: 1, 'periods.periodIndex': 1 });

export default mongoose.model('Timetable', timetableSchema);
