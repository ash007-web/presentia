import { Override } from '../models/index.js';

export const createOverride = async (data) => {
  const { date, periodIndex } = data;
  if (date && periodIndex !== undefined) {
    const dateStr = typeof date === 'string' ? date : new Date(date).toISOString();
    const [y, m, d] = dateStr.split('T')[0].split('-');
    const startOfDay = new Date(`${y}-${m}-${d}T00:00:00+05:30`);
    const endOfDay = new Date(`${y}-${m}-${d}T23:59:59+05:30`);
    
    const existingList = await Override.find({ date: { $gte: startOfDay, $lte: endOfDay } });
    const existing = existingList.find(o => o.periodIndex === periodIndex);
    if (existing) {
      return await Override.findByIdAndUpdate(existing.id || existing._id, data, { new: true });
    }
  }
  return await Override.create(data);
};

export const getOverrides = async (query) => {
  const { date, dateFrom, dateTo } = query;
  const filterQuery = {};

  if (date) {
    const dateStr = typeof date === 'string' ? date : new Date(date).toISOString();
    const [y, m, d] = dateStr.split('T')[0].split('-');
    const startOfDay = new Date(`${y}-${m}-${d}T00:00:00+05:30`);
    const endOfDay = new Date(`${y}-${m}-${d}T23:59:59+05:30`);
    filterQuery.date = { $gte: startOfDay, $lte: endOfDay };
  } else if (dateFrom || dateTo) {
    filterQuery.date = {};
    if (dateFrom) filterQuery.date.$gte = dateFrom;
    if (dateTo) filterQuery.date.$lte = dateTo;
  }

  return await Override.find(filterQuery);
};

export const getOverrideById = async (id) => {
  return await Override.findById(id);
};

export const updateOverride = async (id, data) => {
  return await Override.findByIdAndUpdate(id, data, { new: true });
};

export const deleteOverride = async (id) => {
  return await Override.findByIdAndDelete(id);
};
