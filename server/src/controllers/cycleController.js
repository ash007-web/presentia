import asyncHandler from '../utils/asyncHandler.js';
import * as cycleService from '../services/cycleService.js';
import { sendSuccess } from '../utils/responseHelper.js';
import AppError from '../utils/AppError.js';

export const createCycle = asyncHandler(async (req, res) => {
  const cycle = await cycleService.createCycle(req.body);
  sendSuccess(res, 201, { cycle }, 'Cycle created successfully');
});

export const getCycles = asyncHandler(async (req, res) => {
  const cycles = await cycleService.getCycles(req.query);
  sendSuccess(res, 200, { cycles }, 'Cycles retrieved successfully');
});

export const getCycle = asyncHandler(async (req, res, next) => {
  const cycle = await cycleService.getCycleById(req.params.id);
  if (!cycle) {
    return next(new AppError('No cycle found with that ID', 404));
  }
  sendSuccess(res, 200, { cycle });
});

export const updateCycle = asyncHandler(async (req, res, next) => {
  const cycle = await cycleService.updateCycle(req.params.id, req.body);
  if (!cycle) {
    return next(new AppError('No cycle found with that ID', 404));
  }
  sendSuccess(res, 200, { cycle }, 'Cycle updated successfully');
});

export const deleteCycle = asyncHandler(async (req, res, next) => {
  const cycle = await cycleService.deleteCycle(req.params.id);
  if (!cycle) {
    return next(new AppError('No cycle found with that ID', 404));
  }
  sendSuccess(res, 204, null, 'Cycle deleted successfully');
});
