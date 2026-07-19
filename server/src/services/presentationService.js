import { Presentation, Student, Cycle } from '../models/index.js';

/**
 * Enrich a presentation with populated student and cycle objects.
 * Mirrors what Mongoose `.populate('student cycle')` did.
 */
const populatePresentation = async (p) => {
  if (!p) return null;
  const [student, cycle] = await Promise.all([
    p.studentId ? Student.findById(p.studentId) : Promise.resolve(null),
    p.cycleId ? Cycle.findById(p.cycleId) : Promise.resolve(null),
  ]);
  return { ...p, student, cycle };
};

export const createPresentation = async (data) => {
  return await Presentation.create(data);
};

export const getPresentations = async (query) => {
  const { student, cycle, status, subject, page = 1, limit = 10, sort = 'presentationOrder' } = query;
  const filterQuery = {};

  // Use Firestore field names
  if (student) filterQuery.studentId = student;
  if (cycle) filterQuery.cycleId = cycle;
  if (status) filterQuery.status = status;
  if (subject) filterQuery.subject = subject;

  let presentations = await Presentation.find(filterQuery);

  // Sort in memory
  const desc = sort.startsWith('-');
  const sortField = desc ? sort.slice(1) : sort;
  presentations.sort((a, b) => {
    const av = a[sortField] ?? 0;
    const bv = b[sortField] ?? 0;
    if (av < bv) return desc ? 1 : -1;
    if (av > bv) return desc ? -1 : 1;
    return 0;
  });

  const total = presentations.length;
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const start = (pageNum - 1) * limitNum;
  const paginated = presentations.slice(start, start + limitNum);

  // Populate student and cycle for each presentation
  const populated = await Promise.all(paginated.map(populatePresentation));

  return { presentations: populated, total, page: pageNum, limit: limitNum };
};

export const getPresentationById = async (id) => {
  const p = await Presentation.findById(id);
  return populatePresentation(p);
};

export const updatePresentation = async (id, data) => {
  const p = await Presentation.findByIdAndUpdate(id, data, { new: true });
  return populatePresentation(p);
};

export const deletePresentation = async (id) => {
  return await Presentation.findByIdAndDelete(id);
};
