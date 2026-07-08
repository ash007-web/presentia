import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
  rollNo: {
    type: String,
    required: [true, 'Roll number is required'],
    unique: true,
    trim: true,
    uppercase: true,
    index: true,
  },
  admissionNo: {
    type: String,
    trim: true,
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  title: {
    type: String,
    trim: true,
  }
}, {
  timestamps: true,
});

export default mongoose.model('Student', studentSchema);
