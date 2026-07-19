import dotenv from 'dotenv';
dotenv.config();

import '../config/firebase.js';
import { db } from '../config/firebase.js';

const COLLECTIONS = ['students', 'presentations', 'cycles', 'overrides'];
// Note: settings and timetables are intentionally preserved

const deleteCollection = async (colName) => {
  const snap = await db.collection(colName).get();
  if (snap.empty) {
    console.log(`ℹ  ${colName}: already empty`);
    return;
  }
  const BATCH_SIZE = 400;
  for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    snap.docs.slice(i, i + BATCH_SIZE).forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
  console.log(`✅ Cleared ${colName} (${snap.size} docs deleted)`);
};

const resetData = async () => {
  try {
    console.log('Firestore connected. Resetting data...');

    for (const col of COLLECTIONS) {
      await deleteCollection(col);
    }

    // Also reset the activeSession in settings without deleting settings
    const settingsRef = db.collection('settings').doc('GLOBAL_SETTINGS');
    const settingsSnap = await settingsRef.get();
    if (settingsSnap.exists) {
      await settingsRef.update({
        'activeSession.presentationId': null,
        'activeSession.state': 'Idle',
        'activeSession.startedAt': null,
        'activeSession.accumulatedTime': 0,
        'activeSession.lastUnpausedAt': null,
      });
      console.log('✅ Settings: activeSession reset to Idle (settings preserved)');
    }

    console.log('\n✅ Firestore reset successfully! Settings and Timetables preserved.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during reset:', err);
    process.exit(1);
  }
};

resetData();
