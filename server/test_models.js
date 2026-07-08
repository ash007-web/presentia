import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { Student, Cycle, Presentation, Timetable, Override, Settings } from './src/models/index.js';

const runTest = async () => {
  console.log('Compiling models...');
  try {
    // Model compilation happens on import
    if (Student && Cycle && Presentation && Timetable && Override && Settings) {
      console.log('✅ All models compiled successfully.');
    } else {
      console.log('❌ Failed to compile some models.');
      process.exit(1);
    }
  } catch (err) {
    console.error('Error during compilation:', err);
    process.exit(1);
  }
  process.exit(0);
};

runTest();
