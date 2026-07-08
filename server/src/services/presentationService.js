import { Presentation } from '../models/index.js';

export const createPresentation = async (data) => {
  return await Presentation.create(data);
};

export const getPresentations = async (query) => {
  const { student, cycle, status, subject, page = 1, limit = 10, sort = 'presentationOrder' } = query;
  const filterQuery = {};

  if (student) filterQuery.student = student;
  if (cycle) filterQuery.cycle = cycle;
  if (status) filterQuery.status = status;
  if (subject) filterQuery.subject = subject;

  const skip = (page - 1) * limit;
  const presentations = await Presentation.find(filterQuery)
    .populate('student cycle')
    .sort(sort)
    .skip(skip)
    .limit(Number(limit));
    
  const total = await Presentation.countDocuments(filterQuery);

  return { presentations, total, page: Number(page), limit: Number(limit) };
};

export const getPresentationById = async (id) => {
  return await Presentation.findById(id).populate('student cycle');
};

export const updatePresentation = async (id, data) => {
  return await Presentation.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate('student cycle');
};

export const deletePresentation = async (id) => {
  return await Presentation.findByIdAndDelete(id);
};
