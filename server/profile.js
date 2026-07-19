import fs from 'fs';
import { performance } from 'perf_hooks';
import { Settings, Student, Presentation, Cycle, Timetable, Override } from './src/models/index.js';
import * as presentationEngine from './src/services/presentationEngineService.js';
import * as timetableEngine from './src/services/timetableEngineService.js';
import * as dashboardService from './src/services/dashboardService.js';

let stats = {
  reads: 0,
  writes: 0,
  functionCalls: {},
};

// Monkey-patch models to count reads/writes
const patchModel = (modelName, model) => {
  for (const key of Object.keys(model)) {
    if (typeof model[key] === 'function') {
      const original = model[key];
      model[key] = async function (...args) {
        if (key.includes('find') || key === 'countDocuments') {
          stats.reads++;
        } else if (key.includes('create') || key.includes('save') || key.includes('Update') || key.includes('Delete') || key.includes('updateDoc')) {
          stats.writes++;
        }
        return original.apply(this, args);
      };
    }
  }
};

patchModel('Settings', Settings);
patchModel('Student', Student);
patchModel('Presentation', Presentation);
patchModel('Cycle', Cycle);
patchModel('Timetable', Timetable);
patchModel('Override', Override);

const resetStats = () => {
  stats = { reads: 0, writes: 0 };
};

const profileEndpoint = async (name, fn) => {
  console.log(`\n========================================`);
  console.log(`Profiling: ${name}`);
  resetStats();
  const start = performance.now();
  await fn();
  const end = performance.now();
  
  console.log(`Total execution time: ${(end - start).toFixed(2)} ms`);
  console.log(`Firestore reads: ${stats.reads}`);
  console.log(`Firestore writes: ${stats.writes}`);
};

async function run() {
  console.log("Setting up active session for tests...");
  // Make sure a presentation is live to test pause/resume
  const students = await Student.find({});
  if(students.length > 0) {
      try {
        await presentationEngine.startPresentation(students[0].id);
      } catch(e) {} // ignore if already started
  }

  // 1. /api/presentation/queue
  await profileEndpoint('/api/presentation/queue', async () => {
    await presentationEngine.getQueueState();
  });

  // 2. /api/session
  await profileEndpoint('/api/session', async () => {
    await presentationEngine.getSessionState();
  });

  // 3. /api/presentation/pause
  await profileEndpoint('/api/presentation/pause', async () => {
    try {
        await presentationEngine.pausePresentation();
    } catch(e) { console.log("Caught:", e.message); }
  });

  // 4. /api/presentation/resume
  await profileEndpoint('/api/presentation/resume', async () => {
    try {
        await presentationEngine.resumePresentation();
    } catch(e) { console.log("Caught:", e.message); }
  });

  process.exit(0);
}

run();
