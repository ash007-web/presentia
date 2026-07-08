import { Timetable } from '../models/index.js';

export const createOrUpdateTimetable = async (data) => {
  const { day, periods } = data;
  return await Timetable.findOneAndUpdate({ day }, { periods }, { new: true, upsert: true, runValidators: true });
};

export const getTimetables = async () => {
  return await Timetable.find();
};

export const getTimetableByDay = async (day) => {
  return await Timetable.findOne({ day });
};

export const deleteTimetable = async (day) => {
  return await Timetable.findOneAndDelete({ day });
};
