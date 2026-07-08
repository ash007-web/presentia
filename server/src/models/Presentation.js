import mongoose from 'mongoose';

const presentationSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student is required'],
    index: true,
  },
  cycle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cycle',
    required: [true, 'Cycle is required'],
    index: true,
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    index: true,
  },
  faculty: {
    type: String,
    required: [true, 'Faculty is required'],
    index: true,
  },
  presentationTitle: {
    type: String,
    default: '',
    trim: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Skipped', 'Absent', 'Redo'],
    default: 'Pending',
    index: true,
  },
  overallRating: {
    type: Number,
    default: null,
    min: 1,
    max: 5,
  },
  actualDuration: {
    type: Number,
    default: null,
  },
  feedbackTags: {
    type: [String],
    default: [],
  },
  feedback: {
    type: String,
    trim: true,
  },
  presentationDate: {
    type: Date,
    default: null,
    index: true,
  },
  presentationOrder: {
    type: Number,
    required: true,
    default: 0,
  }
}, {
  timestamps: true,
});

presentationSchema.index({ student: 1, cycle: 1 }, { unique: true });
presentationSchema.index({ cycle: 1, overallRating: -1 });

export default mongoose.model('Presentation', presentationSchema);
