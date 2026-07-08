import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  singletonKey: {
    type: String,
    default: 'GLOBAL_SETTINGS',
    unique: true,
  },
  defaultDuration: {
    type: Number,
    default: 120, // seconds
  },
  currentCycle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cycle',
    default: null,
  },
  defaultFaculty: {
    type: String,
    default: 'Navyamol K T'
  },
  feedbackChips: {
    type: [String],
    default: ['Confident', 'Creative', 'Prepared', 'Clear Voice', 'Good Knowledge', 'Eye Contact', 'Interactive', 'Time Management'],
  },
  negativeChips: {
    type: [String],
    default: ['Could Improve', 'Needs Practice'],
  },
  animationMode: {
    type: String,
    enum: ['full', 'reduced', 'none'],
    default: 'full',
  },
  bellEnabled: {
    type: Boolean,
    default: true,
  },
  bellSound: {
    type: String,
    enum: ['none', 'chime', 'bell', 'beep'],
    default: 'chime',
  },
  volume: {
    type: Number,
    default: 70,
    min: 0,
    max: 100,
  },
  warningThreshold: {
    type: Number,
    default: 45,
  },
  criticalThreshold: {
    type: Number,
    default: 15,
  },
  warnTone: {
    type: Boolean,
    default: true,
  },
  alarmTone: {
    type: Boolean,
    default: true,
  },
  activeSession: {
    presentation: { type: mongoose.Schema.Types.ObjectId, ref: 'Presentation', default: null },
    state: { type: String, enum: ['Idle', 'Live', 'Paused', 'Evaluating'], default: 'Idle' },
    startedAt: { type: Date, default: null },
    accumulatedTime: { type: Number, default: 0 },
    lastUnpausedAt: { type: Date, default: null }
  }
}, {
  timestamps: true,
});

export default mongoose.model('Settings', settingsSchema);
