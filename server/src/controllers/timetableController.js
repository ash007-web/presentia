import asyncHandler from '../utils/asyncHandler.js';
import * as timetableService from '../services/timetableService.js';
import { sendSuccess } from '../utils/responseHelper.js';
import AppError from '../utils/AppError.js';

export const createOrUpdateTimetable = asyncHandler(async (req, res) => {
  const timetable = await timetableService.createOrUpdateTimetable(req.body);
  sendSuccess(res, 200, { timetable }, 'Timetable saved successfully');
});

export const getTimetables = asyncHandler(async (req, res) => {
  const timetables = await timetableService.getTimetables();
  sendSuccess(res, 200, { timetables }, 'Timetables retrieved successfully');
});

export const getTimetableByDay = asyncHandler(async (req, res, next) => {
  const timetable = await timetableService.getTimetableByDay(req.params.day);
  if (!timetable) {
    return next(new AppError('No timetable found for that day', 404));
  }
  sendSuccess(res, 200, { timetable });
});

export const deleteTimetable = asyncHandler(async (req, res, next) => {
  const timetable = await timetableService.deleteTimetable(req.params.day);
  if (!timetable) {
    return next(new AppError('No timetable found for that day', 404));
  }
  sendSuccess(res, 204, null, 'Timetable deleted successfully');
});

export const getCurrentTimetable = asyncHandler(async (req, res) => {
  const { getCurrentTimetableInfo } = await import('../services/timetableEngineService.js');
  const info = await getCurrentTimetableInfo();
  
  // also fetch default faculty from settings in case it is needed
  const { Settings } = await import('../models/index.js');
  const settings = await Settings.findOne({ singletonKey: 'GLOBAL_SETTINGS' });
  const defaultFaculty = settings ? settings.defaultFaculty : 'Navyamol K T';
  
  sendSuccess(res, 200, { ...info, defaultFaculty }, 'Current timetable retrieved successfully');
});
