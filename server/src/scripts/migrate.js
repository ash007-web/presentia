/**
 * Presentia: MongoDB → Firestore Data Migration Script
 *
 * Usage:
 *   node src/scripts/migrate.js
 *
 * Prerequisites:
 *   - MONGO_URI in .env (or pass as env var)
 *   - serviceAccountKey.json in server/
 *   - firebase-admin installed
 *   - mongoose installed temporarily (add back just for this script if needed)
 *
 * This script reads all data from MongoDB and writes it to Firestore,
 * preserving all fields and re-linking cross-references to Firestore IDs.
 */

import dotenv from 'dotenv';
dotenv.config();

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Firebase Admin ───────────────────────────────────────────────────────────
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';

const keyPath = resolve(__dirname, '../../serviceAccountKey.json');
if (!existsSync(keyPath)) {
  console.error('❌ serviceAccountKey.json not found at', keyPath);
  console.error('   Download it from Firebase Console → Project Settings → Service Accounts');
  process.exit(1);
}
const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ─── MongoDB / Mongoose ───────────────────────────────────────────────────────
let mongoose;
try {
  mongoose = (await import('mongoose')).default;
} catch (e) {
  console.error('❌ mongoose not found. Temporarily install it: npm install mongoose');
  process.exit(1);
}

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌ MONGO_URI is not set in .env');
  process.exit(1);
}

// ─── Mongoose Schemas (minimal, for reading only) ─────────────────────────────
const { Schema, model } = mongoose;

const StudentSchema = new Schema({ rollNo: String, admissionNo: String, name: String, title: String }, { timestamps: true });
const CycleSchema = new Schema({ cycleNumber: Number, semester: String, startDate: Date, endDate: Date }, { timestamps: true });
const PresentationSchema = new Schema({
  student: Schema.Types.ObjectId,
  cycle: Schema.Types.ObjectId,
  subject: String, faculty: String, presentationTitle: String,
  status: String, overallRating: Number, actualDuration: Number,
  feedbackTags: [String], feedback: String,
  presentationDate: Date, presentationOrder: Number,
}, { timestamps: true });
const SettingsSchema = new Schema({
  singletonKey: String,
  defaultDuration: Number, currentCycle: Schema.Types.ObjectId,
  defaultFaculty: String, feedbackChips: [String], negativeChips: [String],
  animationMode: String, bellEnabled: Boolean, bellSound: String,
  volume: Number, warningThreshold: Number, criticalThreshold: Number,
  warnTone: Boolean, alarmTone: Boolean,
  activeSession: {
    presentation: Schema.Types.ObjectId,
    state: String, startedAt: Date, accumulatedTime: Number, lastUnpausedAt: Date,
  },
}, { timestamps: true });
const TimetableSchema = new Schema({
  day: String,
  periods: [{ periodIndex: Number, startTime: String, endTime: String, subject: String, faculty: String }],
}, { timestamps: true });
const OverrideSchema = new Schema({
  date: Date, periodIndex: Number, subject: String, faculty: String,
}, { timestamps: true });

const StudentModel = model('Student', StudentSchema);
const CycleModel = model('Cycle', CycleSchema);
const PresentationModel = model('Presentation', PresentationSchema);
const SettingsModel = model('Settings', SettingsSchema);
const TimetableModel = model('Timetable', TimetableSchema);
const OverrideModel = model('Override', OverrideSchema);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toTimestamp = (date) => date ? Timestamp.fromDate(new Date(date)) : null;

const writeBatch = async (colName, docs) => {
  if (docs.length === 0) {
    console.log(`  ℹ  ${colName}: nothing to migrate`);
    return {};
  }
  const idMap = {}; // old ObjectId string → new Firestore doc ID
  const BATCH_SIZE = 400;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const chunk = docs.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const [data, ref] of chunk) {
      batch.set(ref, data);
    }
    await batch.commit();
  }
  return idMap;
};

// ─── Main Migration ───────────────────────────────────────────────────────────

async function migrate() {
  console.log('\n🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected');

  // ── 1. Cycles ─────────────────────────────────────────────────────────────
  console.log('\n📦 Migrating cycles...');
  const cycles = await CycleModel.find().lean();
  const cycleIdMap = {};

  if (cycles.length > 0) {
    const batch = db.batch();
    for (const c of cycles) {
      const ref = db.collection('cycles').doc();
      cycleIdMap[c._id.toString()] = ref.id;
      batch.set(ref, {
        cycleNumber: c.cycleNumber,
        semester: c.semester || '',
        startDate: toTimestamp(c.startDate),
        endDate: toTimestamp(c.endDate),
        createdAt: toTimestamp(c.createdAt) || FieldValue.serverTimestamp(),
        updatedAt: toTimestamp(c.updatedAt) || FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    console.log(`  ✅ Migrated ${cycles.length} cycles`);
  } else {
    console.log('  ℹ  No cycles found');
  }

  // ── 2. Students ───────────────────────────────────────────────────────────
  console.log('\n📦 Migrating students...');
  const students = await StudentModel.find().lean();
  const studentIdMap = {};

  if (students.length > 0) {
    const BATCH_SIZE = 400;
    const refs = students.map(() => db.collection('students').doc());
    students.forEach((s, i) => { studentIdMap[s._id.toString()] = refs[i].id; });

    for (let i = 0; i < students.length; i += BATCH_SIZE) {
      const batch = db.batch();
      for (let j = i; j < Math.min(i + BATCH_SIZE, students.length); j++) {
        batch.set(refs[j], {
          rollNo: (students[j].rollNo || '').toUpperCase().trim(),
          admissionNo: students[j].admissionNo || null,
          name: students[j].name || '',
          title: students[j].title || '',
          createdAt: toTimestamp(students[j].createdAt) || FieldValue.serverTimestamp(),
          updatedAt: toTimestamp(students[j].updatedAt) || FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
    }
    console.log(`  ✅ Migrated ${students.length} students`);
  } else {
    console.log('  ℹ  No students found');
  }

  // ── 3. Presentations ──────────────────────────────────────────────────────
  console.log('\n📦 Migrating presentations...');
  const presentations = await PresentationModel.find().lean();
  const presentationIdMap = {};

  if (presentations.length > 0) {
    const BATCH_SIZE = 400;
    const refs = presentations.map(() => db.collection('presentations').doc());
    presentations.forEach((p, i) => { presentationIdMap[p._id.toString()] = refs[i].id; });

    for (let i = 0; i < presentations.length; i += BATCH_SIZE) {
      const batch = db.batch();
      for (let j = i; j < Math.min(i + BATCH_SIZE, presentations.length); j++) {
        const p = presentations[j];
        batch.set(refs[j], {
          studentId: studentIdMap[p.student?.toString()] || null,
          cycleId: cycleIdMap[p.cycle?.toString()] || null,
          subject: p.subject || '',
          faculty: p.faculty || '',
          presentationTitle: p.presentationTitle || '',
          status: p.status || 'Pending',
          overallRating: p.overallRating ?? null,
          actualDuration: p.actualDuration ?? null,
          feedbackTags: p.feedbackTags || [],
          feedback: p.feedback || '',
          presentationDate: toTimestamp(p.presentationDate),
          presentationOrder: p.presentationOrder || 0,
          createdAt: toTimestamp(p.createdAt) || FieldValue.serverTimestamp(),
          updatedAt: toTimestamp(p.updatedAt) || FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
    }
    console.log(`  ✅ Migrated ${presentations.length} presentations`);
  } else {
    console.log('  ℹ  No presentations found');
  }

  // ── 4. Timetables ─────────────────────────────────────────────────────────
  console.log('\n📦 Migrating timetables...');
  const timetables = await TimetableModel.find().lean();
  if (timetables.length > 0) {
    const batch = db.batch();
    for (const t of timetables) {
      const ref = db.collection('timetables').doc(t.day);
      batch.set(ref, {
        day: t.day,
        periods: (t.periods || []).map(p => ({
          periodIndex: p.periodIndex,
          startTime: p.startTime,
          endTime: p.endTime,
          subject: p.subject,
          faculty: p.faculty,
        })),
        createdAt: toTimestamp(t.createdAt) || FieldValue.serverTimestamp(),
        updatedAt: toTimestamp(t.updatedAt) || FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    console.log(`  ✅ Migrated ${timetables.length} timetables`);
  } else {
    console.log('  ℹ  No timetables found');
  }

  // ── 5. Overrides ──────────────────────────────────────────────────────────
  console.log('\n📦 Migrating overrides...');
  const overrides = await OverrideModel.find().lean();
  if (overrides.length > 0) {
    const BATCH_SIZE = 400;
    for (let i = 0; i < overrides.length; i += BATCH_SIZE) {
      const batch = db.batch();
      for (const o of overrides.slice(i, i + BATCH_SIZE)) {
        const ref = db.collection('overrides').doc();
        batch.set(ref, {
          date: toTimestamp(o.date),
          periodIndex: o.periodIndex,
          subject: o.subject || '',
          faculty: o.faculty || '',
          createdAt: toTimestamp(o.createdAt) || FieldValue.serverTimestamp(),
          updatedAt: toTimestamp(o.updatedAt) || FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
    }
    console.log(`  ✅ Migrated ${overrides.length} overrides`);
  } else {
    console.log('  ℹ  No overrides found');
  }

  // ── 6. Settings ───────────────────────────────────────────────────────────
  console.log('\n📦 Migrating settings...');
  const settingsList = await SettingsModel.find().lean();
  const globalSettings = settingsList.find(s => s.singletonKey === 'GLOBAL_SETTINGS') || settingsList[0];

  if (globalSettings) {
    const activePresentationId = globalSettings.activeSession?.presentation
      ? presentationIdMap[globalSettings.activeSession.presentation.toString()]
      : null;

    const ref = db.collection('settings').doc('GLOBAL_SETTINGS');
    await ref.set({
      singletonKey: 'GLOBAL_SETTINGS',
      defaultDuration: globalSettings.defaultDuration ?? 120,
      currentCycleId: globalSettings.currentCycle
        ? cycleIdMap[globalSettings.currentCycle.toString()] || null
        : null,
      defaultFaculty: globalSettings.defaultFaculty || 'Navyamol K T',
      feedbackChips: globalSettings.feedbackChips || [],
      negativeChips: globalSettings.negativeChips || [],
      animationMode: globalSettings.animationMode || 'full',
      bellEnabled: globalSettings.bellEnabled ?? true,
      bellSound: globalSettings.bellSound || 'chime',
      volume: globalSettings.volume ?? 70,
      warningThreshold: globalSettings.warningThreshold ?? 45,
      criticalThreshold: globalSettings.criticalThreshold ?? 15,
      warnTone: globalSettings.warnTone ?? true,
      alarmTone: globalSettings.alarmTone ?? true,
      activeSession: {
        presentationId: activePresentationId,
        state: globalSettings.activeSession?.state || 'Idle',
        startedAt: toTimestamp(globalSettings.activeSession?.startedAt),
        accumulatedTime: globalSettings.activeSession?.accumulatedTime || 0,
        lastUnpausedAt: toTimestamp(globalSettings.activeSession?.lastUnpausedAt),
      },
      createdAt: toTimestamp(globalSettings.createdAt) || FieldValue.serverTimestamp(),
      updatedAt: toTimestamp(globalSettings.updatedAt) || FieldValue.serverTimestamp(),
    });
    console.log('  ✅ Migrated settings');
    console.log(`     currentCycleId → ${cycleIdMap[globalSettings.currentCycle?.toString()] || 'null'}`);
  } else {
    console.log('  ℹ  No settings found — will use defaults on first request');
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('✅ Migration Complete!');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Students:      ${students.length}`);
  console.log(`  Cycles:        ${cycles.length}`);
  console.log(`  Presentations: ${presentations.length}`);
  console.log(`  Timetables:    ${timetables.length}`);
  console.log(`  Overrides:     ${overrides.length}`);
  console.log(`  Settings:      ${globalSettings ? 1 : 0}`);
  console.log('\nAll data preserved. Cross-references re-linked with Firestore IDs.');
  console.log('You can now start the server with: npm run dev\n');

  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch(err => {
  console.error('\n❌ Migration failed:', err);
  process.exit(1);
});
