import { Presentation, Student } from '../models/index.js';

export const getOverview = async () => {
  const presentations = await Presentation.find({ status: 'Completed' });
  const total = presentations.length;

  const rated = presentations.filter(p => p.overallRating != null);
  const durabled = presentations.filter(p => p.actualDuration != null);

  const avgRating = rated.length ? rated.reduce((s, p) => s + p.overallRating, 0) / rated.length : 0;
  const avgDuration = durabled.length ? durabled.reduce((s, p) => s + p.actualDuration, 0) / durabled.length : 0;

  return {
    totalPresentations: total,
    averageRating: avgRating,
    averageDuration: avgDuration,
    totalDuration: avgDuration * total,
  };
};

export const getFacultyAnalytics = async () => {
  const presentations = await Presentation.find({ status: 'Completed' });

  const byFaculty = {};
  for (const p of presentations) {
    const f = p.faculty || 'Unknown';
    if (!byFaculty[f]) byFaculty[f] = { ratings: [], count: 0 };
    if (p.overallRating != null) byFaculty[f].ratings.push(p.overallRating);
    byFaculty[f].count++;
  }

  return Object.entries(byFaculty)
    .map(([faculty, data]) => ({
      _id: faculty,
      avgRating: data.ratings.length ? data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length : 0,
      count: data.count,
    }))
    .sort((a, b) => b.avgRating - a.avgRating);
};

export const getSubjectAnalytics = async () => {
  const presentations = await Presentation.find({ status: 'Completed' });

  const bySubject = {};
  for (const p of presentations) {
    const s = p.subject || 'Unknown';
    if (!bySubject[s]) bySubject[s] = { ratings: [], durations: [], count: 0 };
    if (p.overallRating != null) bySubject[s].ratings.push(p.overallRating);
    if (p.actualDuration != null) bySubject[s].durations.push(p.actualDuration);
    bySubject[s].count++;
  }

  return Object.entries(bySubject)
    .map(([subject, data]) => ({
      _id: subject,
      avgRating: data.ratings.length ? data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length : 0,
      averageDuration: data.durations.length ? data.durations.reduce((a, b) => a + b, 0) / data.durations.length : 0,
      count: data.count,
    }))
    .sort((a, b) => b.avgRating - a.avgRating);
};

export const getStudentAnalytics = async () => {
  const [presentations, allStudents] = await Promise.all([
    Presentation.find({ status: 'Completed' }),
    Student.findAll(),
  ]);

  const studentMap = {};
  for (const s of allStudents) studentMap[s.id] = s;

  const byStudent = {};
  for (const p of presentations) {
    const sid = p.studentId;
    if (!byStudent[sid]) byStudent[sid] = { ratings: [], count: 0 };
    if (p.overallRating != null) byStudent[sid].ratings.push(p.overallRating);
    byStudent[sid].count++;
  }

  return Object.entries(byStudent)
    .map(([studentId, data]) => ({
      _id: studentId,
      student: studentMap[studentId] || null,
      avgRating: data.ratings.length ? data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length : 0,
      count: data.count,
    }))
    .sort((a, b) => b.avgRating - a.avgRating)
    .slice(0, 10);
};
