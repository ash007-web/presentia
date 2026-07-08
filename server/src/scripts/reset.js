import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Student, Presentation, Timetable, Settings, Cycle, Override } from '../models/index.js';
import connectDB from '../config/db.js';

dotenv.config();

const resetData = async () => {
  try {
    await connectDB();
    console.log('MongoDB Connected. Resetting data...');

    await Student.deleteMany({});
    console.log('✅ Cleared Students collection');

    await Presentation.deleteMany({});
    console.log('✅ Cleared Presentations collection');

    await Timetable.deleteMany({});
    console.log('✅ Cleared Timetable collection');

    await Cycle.deleteMany({});
    console.log('✅ Cleared Cycles collection');

    await Override.deleteMany({});
    console.log('✅ Cleared Overrides collection');

    // Note: Settings is NOT cleared as per requirements

    console.log('Database reset successfully! Only Settings remain.');
    process.exit();
  } catch (err) {
    console.error('Error with data import: ', err);
    process.exit(1);
  }
};

resetData();
