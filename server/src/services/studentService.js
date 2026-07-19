import { Student, presentationsCol, docToObj } from '../models/index.js';
import { db } from '../config/firebase.js';

// Numeric-aware sort for roll numbers (e.g. "R10" after "R9")
const rollNoSort = (a, b) => {
  const extractNum = (s) => {
    const match = s?.rollNo?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  };
  const na = extractNum(a);
  const nb = extractNum(b);
  if (na !== nb) return na - nb;
  return (a.rollNo || '').localeCompare(b.rollNo || '');
};

export const createStudent = async (data) => {
  return await Student.create(data);
};

export const getStudents = async (query) => {
  const { search, page = 1, limit = 10 } = query;

  // Fetch all students and all presentations in parallel
  const [allStudents, presSnap] = await Promise.all([
    Student.findAll(),
    presentationsCol().get(),
  ]);

  const presentations = presSnap.docs.map(docToObj);

  // Build map: studentId → most recent presentation
  const recentMap = {};
  for (const p of presentations) {
    const sid = p.studentId;
    if (!recentMap[sid] || new Date(p.presentationDate) > new Date(recentMap[sid].presentationDate)) {
      recentMap[sid] = p;
    }
  }

  // Filter by search
  let filtered = allStudents;
  if (search) {
    const s = search.toLowerCase();
    filtered = allStudents.filter(st =>
      (st.name || '').toLowerCase().includes(s) ||
      (st.rollNo || '').toLowerCase().includes(s)
    );
  }

  // Sort numerically by rollNo
  filtered.sort(rollNoSort);

  const total = filtered.length;
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const start = (pageNum - 1) * limitNum;
  const paginated = filtered.slice(start, start + limitNum);

  // Join with recent presentation
  const students = paginated.map(st => {
    const rp = recentMap[st.id];
    return {
      ...st,
      title: rp?.presentationTitle || 'No presentation',
      status: rp?.status || 'Pending',
      overallRating: rp?.overallRating ?? null,
      subject: rp?.subject ?? null,
      faculty: rp?.faculty ?? null,
      duration: rp?.actualDuration ?? null,
      cycle: rp?.cycleId ?? null,
    };
  });

  return { students, total, page: pageNum, limit: limitNum };
};

export const getStudentById = async (id) => {
  return await Student.findById(id);
};

export const updateStudent = async (id, data) => {
  return await Student.findByIdAndUpdate(id, data, { new: true });
};

export const deleteStudent = async (id) => {
  return await Student.findByIdAndDelete(id);
};

export const getStudentsOverview = async (cycleId) => {
  const [allStudents, presSnap] = await Promise.all([
    Student.findAll(),
    cycleId
      ? presentationsCol().where('cycleId', '==', cycleId).get()
      : presentationsCol().get(),
  ]);

  const presentations = presSnap.docs.map(docToObj);

  // Build map: studentId → most recent presentation in this cycle
  const recentMap = {};
  for (const p of presentations) {
    const sid = p.studentId;
    if (!recentMap[sid] || new Date(p.presentationDate) > new Date(recentMap[sid].presentationDate)) {
      recentMap[sid] = p;
    }
  }

  const results = allStudents.map(st => {
    const rp = recentMap[st.id];
    return {
      ...st,
      presentationTitle: rp?.presentationTitle || 'No presentation',
      status: rp?.status || 'Pending',
      overallRating: rp?.overallRating ?? null,
    };
  });

  results.sort(rollNoSort);
  return results;
};
