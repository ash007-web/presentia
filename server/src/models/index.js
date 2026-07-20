/**
 * Firestore Collection Helpers
 *
 * This module replaces the Mongoose model layer.
 * Each export mirrors the interface used across the codebase so that
 * services require minimal changes — just swap Mongoose syntax for Firestore calls.
 *
 * Firestore document IDs are plain strings (auto-generated).
 * Cross-reference fields use the suffix convention:
 *   presentation.studentId  → Firestore student doc ID
 *   presentation.cycleId    → Firestore cycle doc ID
 *   settings.currentCycleId → Firestore cycle doc ID
 */

import { db } from '../config/firebase.js';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getCache, setCache, deleteCache } from '../utils/cache.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Convert a Firestore DocumentSnapshot to a plain JS object with `id` set.
 */
export const docToObj = (snap) => {
  if (!snap || !snap.exists) return null;
  const data = snap.data();
  // Convert Firestore Timestamps to JS Date objects
  const converted = convertTimestamps(data);
  return { id: snap.id, _id: snap.id, ...converted };
};

/**
 * Recursively convert Firestore Timestamps to JS Date objects.
 */
export const convertTimestamps = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Timestamp) return obj.toDate();
  if (Array.isArray(obj)) return obj.map(convertTimestamps);
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const result = {};
    for (const key of Object.keys(obj)) {
      result[key] = convertTimestamps(obj[key]);
    }
    return result;
  }
  return obj;
};

/**
 * Adds createdAt/updatedAt as server timestamps when creating a document.
 */
export const withCreatedAt = (data) => ({
  ...data,
  createdAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp(),
});

/**
 * Adds updatedAt server timestamp when updating a document.
 */
export const withUpdatedAt = (data) => ({
  ...data,
  updatedAt: FieldValue.serverTimestamp(),
});

// ─── Collection References ───────────────────────────────────────────────────

export const studentsCol = () => db.collection('students');
export const cyclesCol = () => db.collection('cycles');
export const presentationsCol = () => db.collection('presentations');
export const settingsCol = () => db.collection('settings');
export const timetablesCol = () => db.collection('timetables');
export const overridesCol = () => db.collection('overrides');

// ─── Student ─────────────────────────────────────────────────────────────────

export const Student = {
  async create(data) {
    const ref = await studentsCol().add(withCreatedAt({
      rollNo: data.rollNo?.trim().toUpperCase() || '',
      admissionNo: data.admissionNo?.trim() || null,
      name: data.name?.trim() || '',
      title: data.title?.trim() || '',
    }));
    const snap = await ref.get();
    deleteCache('Student:findAll');
    deleteCache('Student:count');
    return docToObj(snap);
  },

  async findById(id) {
    if (!id) return null;
    const snap = await studentsCol().doc(id).get();
    return docToObj(snap);
  },

  async findOne(query) {
    let q = studentsCol();
    for (const [key, val] of Object.entries(query)) {
      q = q.where(key, '==', val);
    }
    const snap = await q.limit(1).get();
    if (snap.empty) return null;
    return docToObj(snap.docs[0]);
  },

  async find(query = {}) {
    let q = studentsCol();
    for (const [key, val] of Object.entries(query)) {
      if (key === '$or') continue; // handled separately
      q = q.where(key, '==', val);
    }
    const snap = await q.get();
    return snap.docs.map(docToObj);
  },

  async findAll() {
    const cached = getCache('Student:findAll');
    if (cached) return cached;
    const snap = await studentsCol().get();
    const docs = snap.docs.map(docToObj);
    setCache('Student:findAll', docs, 300); // 5 mins
    return docs;
  },

  async countDocuments() {
    const cached = getCache('Student:count');
    if (cached !== null) return cached;
    const snap = await studentsCol().count().get();
    const count = snap.data().count;
    setCache('Student:count', count, 300);
    return count;
  },

  async findByIdAndUpdate(id, data, _opts = {}) {
    if (!id) return null;
    const ref = studentsCol().doc(id);
    const snap = await ref.get();
    if (!snap.exists) return null;
    await ref.update(withUpdatedAt(data));
    deleteCache('Student:findAll');
    const existing = docToObj(snap);
    return { ...existing, ...data, updatedAt: new Date() };
  },

  async findByIdAndDelete(id) {
    if (!id) return null;
    const ref = studentsCol().doc(id);
    const snap = await ref.get();
    if (!snap.exists) return null;
    const obj = docToObj(snap);
    await ref.delete();
    deleteCache('Student:findAll');
    deleteCache('Student:count');
    return obj;
  },

  async insertMany(docs) {
    const batch = db.batch();
    const results = [];
    for (const d of docs) {
      const ref = studentsCol().doc();
      batch.set(ref, withCreatedAt({
        rollNo: d.rollNo?.trim().toUpperCase() || '',
        admissionNo: d.admissionNo?.trim() || null,
        name: d.name?.trim() || '',
        title: d.title?.trim() || '',
      }));
      results.push(ref.id);
    }
    await batch.commit();
    deleteCache('Student:findAll');
    deleteCache('Student:count');
    return results;
  },
};

// ─── Cycle ────────────────────────────────────────────────────────────────────

export const Cycle = {
  async create(data) {
    const ref = await cyclesCol().add(withCreatedAt({
      cycleNumber: data.cycleNumber,
      semester: data.semester?.trim() || '',
      startDate: data.startDate ? Timestamp.fromDate(new Date(data.startDate)) : null,
      endDate: data.endDate ? Timestamp.fromDate(new Date(data.endDate)) : null,
    }));
    const snap = await ref.get();
    return docToObj(snap);
  },

  async findById(id) {
    if (!id) return null;
    const snap = await cyclesCol().doc(id).get();
    return docToObj(snap);
  },

  async find(query = {}, sortField = null) {
    let q = cyclesCol();
    for (const [key, val] of Object.entries(query)) {
      q = q.where(key, '==', val);
    }
    const snap = await q.get();
    let docs = snap.docs.map(docToObj);
    // JS-side sort
    if (sortField) {
      const desc = sortField.startsWith('-');
      const field = desc ? sortField.slice(1) : sortField;
      docs.sort((a, b) => {
        if (a[field] < b[field]) return desc ? 1 : -1;
        if (a[field] > b[field]) return desc ? -1 : 1;
        return 0;
      });
    }
    return docs;
  },

  async countDocuments() {
    const snap = await cyclesCol().count().get();
    return snap.data().count;
  },

  async findByIdAndUpdate(id, data, _opts = {}) {
    if (!id) return null;
    const ref = cyclesCol().doc(id);
    const snap = await ref.get();
    if (!snap.exists) return null;
    const updateData = { ...data };
    if (updateData.startDate) updateData.startDate = Timestamp.fromDate(new Date(updateData.startDate));
    if (updateData.endDate) updateData.endDate = Timestamp.fromDate(new Date(updateData.endDate));
    await ref.update(withUpdatedAt(updateData));
    const existing = docToObj(snap);
    return { ...existing, ...data, updatedAt: new Date() };
  },

  async findByIdAndDelete(id) {
    if (!id) return null;
    const ref = cyclesCol().doc(id);
    const snap = await ref.get();
    if (!snap.exists) return null;
    const obj = docToObj(snap);
    await ref.delete();
    return obj;
  },
};

// ─── Presentation ─────────────────────────────────────────────────────────────

export const Presentation = {
  async create(data) {
    const docData = withCreatedAt({
      studentId: data.studentId || data.student || null,
      cycleId: data.cycleId || data.cycle || null,
      subject: data.subject || '',
      faculty: data.faculty || '',
      presentationTitle: data.presentationTitle || '',
      status: data.status || 'Pending',
      overallRating: data.overallRating !== undefined ? data.overallRating : null,
      actualDuration: data.actualDuration !== undefined ? data.actualDuration : null,
      feedbackTags: data.feedbackTags || [],
      feedback: data.feedback || '',
      presentationDate: data.presentationDate ? Timestamp.fromDate(new Date(data.presentationDate)) : null,
      presentationOrder: data.presentationOrder || 0,
    });
    const ref = await presentationsCol().add(docData);
    const snap = await ref.get();
    deleteCache(`Presentation:cycle:${data.cycleId || data.cycle || null}`);
    deleteCache('Presentation:findAll');
    return docToObj(snap);
  },

  async findById(id) {
    if (!id) return null;
    const snap = await presentationsCol().doc(id).get();
    return docToObj(snap);
  },

  async findOne(query = {}) {
    let q = presentationsCol();
    for (const [key, val] of Object.entries(query)) {
      q = q.where(key, '==', val);
    }
    const snap = await q.limit(1).get();
    if (snap.empty) return null;
    return docToObj(snap.docs[0]);
  },

  async find(query = {}) {
    let cacheKey = null;
    if (query.cycleId && Object.keys(query).length === 1) {
      cacheKey = `Presentation:cycle:${query.cycleId}`;
      const cached = getCache(cacheKey);
      if (cached) return cached;
    }

    let q = presentationsCol();
    for (const [key, val] of Object.entries(query)) {
      if (val === undefined) continue;
      q = q.where(key, '==', val);
    }
    const snap = await q.get();
    const results = snap.docs.map(docToObj);
    if (cacheKey) setCache(cacheKey, results, 60);
    return results;
  },

  async findAll() {
    const snap = await presentationsCol().get();
    return snap.docs.map(docToObj);
  },

  async countDocuments(query = {}) {
    let q = presentationsCol();
    for (const [key, val] of Object.entries(query)) {
      q = q.where(key, '==', val);
    }
    const snap = await q.count().get();
    return snap.data().count;
  },

  async findByIdAndUpdate(id, data, _opts = {}) {
    if (!id) return null;
    const ref = presentationsCol().doc(id);
    const snap = await ref.get();
    if (!snap.exists) return null;
    const updateData = { ...data };
    if (updateData.presentationDate) {
      updateData.presentationDate = Timestamp.fromDate(new Date(updateData.presentationDate));
    }
    await ref.update(withUpdatedAt(updateData));
    const existing = docToObj(snap);
    const merged = { ...existing, ...data, updatedAt: new Date() };
    deleteCache(`Presentation:cycle:${merged.cycleId}`);
    deleteCache('Presentation:findAll');
    return merged;
  },

  async findByIdAndDelete(id) {
    if (!id) return null;
    const ref = presentationsCol().doc(id);
    const snap = await ref.get();
    if (!snap.exists) return null;
    const obj = docToObj(snap);
    await ref.delete();
    deleteCache(`Presentation:cycle:${obj.cycleId}`);
    deleteCache('Presentation:findAll');
    return obj;
  },

  async deleteMany(query = {}) {
    let q = presentationsCol();
    for (const [key, val] of Object.entries(query)) {
      q = q.where(key, '==', val);
    }
    const snap = await q.get();
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    deleteCache(`Presentation:cycle:${query.cycleId}`);
    deleteCache('Presentation:findAll');
    return snap.size;
  },

  async save(id, data) {
    if (!id) return null;
    const ref = presentationsCol().doc(id);
    const updateData = { ...data };
    if (updateData.presentationDate) {
      updateData.presentationDate = Timestamp.fromDate(new Date(updateData.presentationDate));
    }
    await ref.update(withUpdatedAt(updateData));
    const snap = await ref.get();
    const obj = docToObj(snap);
    deleteCache(`Presentation:cycle:${obj.cycleId}`);
    deleteCache('Presentation:findAll');
    return obj;
  },
};

// ─── Settings ─────────────────────────────────────────────────────────────────

const SETTINGS_DOC = 'GLOBAL_SETTINGS';

const defaultSettings = {
  singletonKey: SETTINGS_DOC,
  defaultDuration: 120,
  currentCycleId: null,
  defaultFaculty: 'Navyamol K T',
  feedbackChips: ['Confident', 'Creative', 'Prepared', 'Clear Voice', 'Good Knowledge', 'Eye Contact', 'Interactive', 'Time Management'],
  negativeChips: ['Could Improve', 'Needs Practice'],
  animationMode: 'full',
  bellEnabled: true,
  bellSound: 'chime',
  volume: 70,
  warningThreshold: 45,
  criticalThreshold: 15,
  warnTone: true,
  alarmTone: true,
  activeSession: {
    presentationId: null,
    state: 'Idle',
    startedAt: null,
    accumulatedTime: 0,
    lastUnpausedAt: null,
  },
};

export const Settings = {
  async findOne(_query) {
    const cached = getCache('Settings:GLOBAL');
    if (cached) return cached;
    const ref = settingsCol().doc(SETTINGS_DOC);
    const snap = await ref.get();
    if (!snap.exists) return null;
    const data = docToObj(snap);
    // Populate currentCycle if currentCycleId is present
    if (data.currentCycleId) {
      const cycle = await Cycle.findById(data.currentCycleId);
      data.currentCycle = cycle;
    } else {
      data.currentCycle = null;
    }
    // Compatibility: expose activeSession.presentation as presentationId
    if (data.activeSession) {
      data.activeSession.presentation = data.activeSession.presentationId || null;
    }
    setCache('Settings:GLOBAL', data, 60); // 1 minute TTL for settings to prevent stale issues, though invalidated anyway
    return data;
  },

  async findOneRaw(_query) {
    const ref = settingsCol().doc(SETTINGS_DOC);
    const snap = await ref.get();
    if (!snap.exists) return null;
    return docToObj(snap);
  },

  async create(data) {
    const ref = settingsCol().doc(SETTINGS_DOC);
    await ref.set(withCreatedAt({ ...defaultSettings, ...data }));
    deleteCache('Settings:GLOBAL');
    return this.findOne({ singletonKey: SETTINGS_DOC });
  },

  async findOneAndUpdate(_query, data, _opts = {}) {
    const ref = settingsCol().doc(SETTINGS_DOC);
    const snap = await ref.get();
    const updateData = buildSettingsUpdate(data);
    if (!snap.exists) {
      await ref.set(withCreatedAt({ ...defaultSettings, ...updateData }));
    } else {
      await ref.update(withUpdatedAt(updateData));
    }
    const cached = getCache('Settings:GLOBAL');
    if (cached) {
      const merged = { ...cached, ...data, updatedAt: new Date() };
      if (merged.activeSession) {
        merged.activeSession.presentation = merged.activeSession.presentationId || null;
      }
      setCache('Settings:GLOBAL', merged, 60);
      return merged;
    }
    deleteCache('Settings:GLOBAL');
    return this.findOne({ singletonKey: SETTINGS_DOC });
  },

  async updateDoc(data) {
    const ref = settingsCol().doc(SETTINGS_DOC);
    const updateData = buildSettingsUpdate(data);
    await ref.update(withUpdatedAt(updateData));
    
    const cached = getCache('Settings:GLOBAL');
    if (cached) {
      const merged = { ...cached, ...data, updatedAt: new Date() };
      if (merged.activeSession) {
        merged.activeSession.presentation = merged.activeSession.presentationId || null;
      }
      setCache('Settings:GLOBAL', merged, 60);
      return merged;
    }
    deleteCache('Settings:GLOBAL');
    return this.findOne({ singletonKey: SETTINGS_DOC });
  },
};

/**
 * Build a Firestore update-compatible object from settings data.
 * Handles nested activeSession fields using dot-notation.
 */
function buildSettingsUpdate(data) {
  const result = {};
  for (const [key, val] of Object.entries(data)) {
    if (key === 'activeSession' && val && typeof val === 'object') {
      for (const [sk, sv] of Object.entries(val)) {
        const fsKey = sk === 'presentation' ? 'activeSession.presentationId' : `activeSession.${sk}`;
        if (sv instanceof Date) {
          result[fsKey] = Timestamp.fromDate(sv);
        } else {
          result[fsKey] = sv;
        }
      }
    } else if (key === 'currentCycle' || key === 'currentCycleId') {
      // Handled safely after the loop
    } else if (val instanceof Date) {
      result[key] = Timestamp.fromDate(val);
    } else {
      result[key] = val;
    }
  }

  // Handle cycle logic safely
  const cycleVal = data.currentCycleId !== undefined ? data.currentCycleId : data.currentCycle;
  if (cycleVal !== undefined) {
    let extractedId = null;
    if (typeof cycleVal === 'string') {
      extractedId = cycleVal;
    } else if (cycleVal && typeof cycleVal === 'object') {
      extractedId = cycleVal.id || cycleVal._id || String(cycleVal);
    }
    if (extractedId === '[object Object]') extractedId = null;
    result['currentCycleId'] = extractedId;
  }
  return result;
}

// ─── Timetable ────────────────────────────────────────────────────────────────

export const Timetable = {
  async findOne(query = {}) {
    if (query.day) {
      const cached = getCache(`Timetable:${query.day}`);
      if (cached) return cached;
      const snap = await timetablesCol().doc(query.day).get();
      const obj = docToObj(snap);
      setCache(`Timetable:${query.day}`, obj, 3600); // 1 hour cache
      return obj;
    }
    const snap = await timetablesCol().limit(1).get();
    if (snap.empty) return null;
    return docToObj(snap.docs[0]);
  },

  async find(_query = {}) {
    const snap = await timetablesCol().get();
    return snap.docs.map(docToObj);
  },

  async findOneAndUpdate(query = {}, data, _opts = {}) {
    const day = query.day;
    if (!day) throw new Error('Timetable findOneAndUpdate requires day field');
    const ref = timetablesCol().doc(day);
    const snap = await ref.get();
    const docData = { day, periods: data.periods || [], updatedAt: FieldValue.serverTimestamp() };
    if (!snap.exists) {
      await ref.set({ ...docData, createdAt: FieldValue.serverTimestamp() });
    } else {
      await ref.update(docData);
    }
    const existing = snap.exists ? docToObj(snap) : null;
    const merged = existing ? { ...existing, periods: data.periods || [], updatedAt: new Date() } : { day, periods: data.periods || [], createdAt: new Date(), updatedAt: new Date(), id: day, _id: day };
    setCache(`Timetable:${day}`, merged, 3600);
    return merged;
  },

  async findOneAndDelete(query = {}) {
    const day = query.day;
    if (!day) return null;
    const ref = timetablesCol().doc(day);
    const snap = await ref.get();
    if (!snap.exists) return null;
    const obj = docToObj(snap);
    await ref.delete();
    return obj;
  },
};

// ─── Override ─────────────────────────────────────────────────────────────────

export const Override = {
  async create(data) {
    const docData = withCreatedAt({
      date: data.date ? Timestamp.fromDate(new Date(data.date)) : null,
      periodIndex: data.periodIndex,
      subject: data.subject || '',
      faculty: data.faculty || '',
    });
    const ref = await overridesCol().add(docData);
    const snap = await ref.get();
    return docToObj(snap);
  },

  async findById(id) {
    if (!id) return null;
    const snap = await overridesCol().doc(id).get();
    return docToObj(snap);
  },

  async findOne(query = {}) {
    let q = overridesCol();
    let cacheKey = null;

    // Handle date range queries like { date: { $gte: ..., $lte: ... } }
    for (const [key, val] of Object.entries(query)) {
      if (val && typeof val === 'object' && ('$gte' in val || '$lte' in val)) {
        if (val.$gte) q = q.where(key, '>=', Timestamp.fromDate(new Date(val.$gte)));
        if (val.$lte) q = q.where(key, '<=', Timestamp.fromDate(new Date(val.$lte)));
      } else {
        q = q.where(key, '==', val);
      }
    }
    const snap = await q.limit(1).get();
    if (snap.empty) return null;
    return docToObj(snap.docs[0]);
  },

  async find(query = {}) {
    // Override cache is intentionally disabled — overrides are short-lived
    // and must reflect changes immediately. Caching caused stale reads.
    let q = overridesCol();
    for (const [key, val] of Object.entries(query)) {
      if (val && typeof val === 'object' && ('$gte' in val || '$lte' in val)) {
        if (val.$gte) q = q.where(key, '>=', Timestamp.fromDate(new Date(val.$gte)));
        if (val.$lte) q = q.where(key, '<=', Timestamp.fromDate(new Date(val.$lte)));
      } else if (val !== undefined) {
        q = q.where(key, '==', val);
      }
    }
    const snap = await q.get();
    const results = snap.docs.map(docToObj).sort((a, b) => {
      const dateDiff = new Date(a.date) - new Date(b.date);
      if (dateDiff !== 0) return dateDiff;
      return a.periodIndex - b.periodIndex;
    });
    return results;
  },

  async findByIdAndUpdate(id, data, _opts = {}) {
    if (!id) return null;
    const ref = overridesCol().doc(id);
    const snap = await ref.get();
    if (!snap.exists) return null;
    const updateData = { ...data };
    if (updateData.date) updateData.date = Timestamp.fromDate(new Date(updateData.date));
    await ref.update(withUpdatedAt(updateData));
    const existing = docToObj(snap);
    return { ...existing, ...data, updatedAt: new Date() };
  },

  async findByIdAndDelete(id) {
    if (!id) return null;
    const ref = overridesCol().doc(id);
    const snap = await ref.get();
    if (!snap.exists) return null;
    const obj = docToObj(snap);
    await ref.delete();
    return obj;
  },
};

export default { Student, Cycle, Presentation, Settings, Timetable, Override };
