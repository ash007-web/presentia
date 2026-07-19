import { Presentation, Settings, Student } from '../models/index.js';

// Numeric-aware sort for roll numbers
const rollNoSort = (a, b) => {
  const extractNum = (s) => {
    const match = (s?.rollNo || '').match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  };
  const na = extractNum(a);
  const nb = extractNum(b);
  if (na !== nb) return na - nb;
  return (a?.rollNo || '').localeCompare(b?.rollNo || '');
};

const buildLeaderboard = async (presentations, allStudents) => {
  // Group by studentId
  const byStudent = {};
  for (const p of presentations) {
    const sid = p.studentId;
    if (!byStudent[sid]) {
      byStudent[sid] = { studentId: sid, ratings: [], count: 0, subjects: new Set() };
    }
    if (p.overallRating != null) byStudent[sid].ratings.push(p.overallRating);
    byStudent[sid].count++;
    byStudent[sid].subjects.add(p.subject);
  }

  const studentMap = {};
  for (const s of allStudents) studentMap[s.id] = s;

  const rows = Object.values(byStudent).map(entry => ({
    _id: entry.studentId,
    student: studentMap[entry.studentId] || null,
    averageRating: entry.ratings.length > 0
      ? entry.ratings.reduce((a, b) => a + b, 0) / entry.ratings.length
      : 0,
    presentationsCount: entry.count,
    subjects: [...entry.subjects],
  }));

  // Sort: averageRating desc, count desc, rollNo asc
  rows.sort((a, b) => {
    if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating;
    if (b.presentationsCount !== a.presentationsCount) return b.presentationsCount - a.presentationsCount;
    return rollNoSort(a.student, b.student);
  });

  return rows;
};

export const getCurrentLeaderboard = async () => {
  const settings = await Settings.findOne({ singletonKey: 'GLOBAL_SETTINGS' });
  if (!settings || !settings.currentCycle) return [];

  const [presentations, allStudents] = await Promise.all([
    Presentation.find({ cycleId: settings.currentCycle.id, status: 'Completed' }),
    Student.findAll(),
  ]);

  return buildLeaderboard(presentations, allStudents);
};

export const getOverallLeaderboard = async () => {
  const [presentations, allStudents] = await Promise.all([
    Presentation.find({ status: 'Completed' }),
    Student.findAll(),
  ]);

  return buildLeaderboard(presentations, allStudents);
};
