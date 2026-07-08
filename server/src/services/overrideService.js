import { Override } from '../models/index.js';

export const createOverride = async (data) => {
  return await Override.create(data);
};

export const getOverrides = async (query) => {
  const { date, dateFrom, dateTo } = query;
  const filterQuery = {};

  if (date) {
    // Exact date matching can be tricky due to timezones, assuming normalized startOfDay
    filterQuery.date = date; 
  } else if (dateFrom || dateTo) {
    filterQuery.date = {};
    if (dateFrom) filterQuery.date.$gte = dateFrom;
    if (dateTo) filterQuery.date.$lte = dateTo;
  }

  const overrides = await Override.find(filterQuery).sort('date periodIndex');
  return overrides;
};

export const getOverrideById = async (id) => {
  return await Override.findById(id);
};

export const updateOverride = async (id, data) => {
  return await Override.findByIdAndUpdate(id, data, { new: true, runValidators: true });
};

export const deleteOverride = async (id) => {
  return await Override.findByIdAndDelete(id);
};
