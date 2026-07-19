/**
 * reset_state.js — Firestore version
 * Resets presentations and activeSession, keeps latest cycle in settings.
 * Usage: node reset_state.js
 */
import dotenv from 'dotenv';
dotenv.config();

import './src/config/firebase.js';
import { db } from './src/config/firebase.js';
import { Presentation, Cycle, Settings } from './src/models/index.js';

const run = async () => {
  try {
    // Delete all presentations
    const snap = await db.collection('presentations').get();
    if (!snap.empty) {
      const BATCH_SIZE = 400;
      for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
        const batch = db.batch();
        snap.docs.slice(i, i + BATCH_SIZE).forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
      console.log(`✅ Cleared ${snap.size} presentations`);
    }

    // Find or create cycle
    let cycles = await Cycle.find();
    if (cycles.length === 0) {
      const newCycle = await Cycle.create({ cycleNumber: 1, semester: 'Semester 1', startDate: new Date() });
      cycles = [newCycle];
    }

    // Keep latest cycle
    cycles.sort((a, b) => (b.cycleNumber || 0) - (a.cycleNumber || 0));
    const cycle = cycles[0];

    // Delete older cycles
    for (const c of cycles.slice(1)) {
      await db.collection('cycles').doc(c.id).delete();
    }

    // Reset settings
    const settingsRef = db.collection('settings').doc('GLOBAL_SETTINGS');
    const settingsSnap = await settingsRef.get();
    if (settingsSnap.exists) {
      await settingsRef.update({
        currentCycleId: cycle.id,
        'activeSession.presentationId': null,
        'activeSession.state': 'Idle',
        'activeSession.startedAt': null,
        'activeSession.accumulatedTime': 0,
        'activeSession.lastUnpausedAt': null,
      });
    }

    console.log('✅ Reset complete. Current cycle:', cycle.cycleNumber);
    process.exit(0);
  } catch (err) {
    console.error('❌ Reset failed:', err);
    process.exit(1);
  }
};

run();
