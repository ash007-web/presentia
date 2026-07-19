import dotenv from 'dotenv';
dotenv.config();

import './src/config/firebase.js';
import { Student, Cycle, Presentation, Timetable, Override, Settings } from './src/models/index.js';

const runTest = async () => {
  console.log('Verifying Firestore models...');
  try {
    if (Student && Cycle && Presentation && Timetable && Override && Settings) {
      console.log('✅ All Firestore collection helpers loaded successfully.');
    } else {
      console.log('❌ Failed to load some collection helpers.');
      process.exit(1);
    }
  } catch (err) {
    console.error('Error during verification:', err);
    process.exit(1);
  }
  process.exit(0);
};

runTest();
