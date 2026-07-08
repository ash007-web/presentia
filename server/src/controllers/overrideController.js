import asyncHandler from '../utils/asyncHandler.js';
import * as overrideService from '../services/overrideService.js';
import { sendSuccess } from '../utils/responseHelper.js';
import AppError from '../utils/AppError.js';

export const createOverride = asyncHandler(async (req, res) => {
  const override = await overrideService.createOverride(req.body);
  sendSuccess(res, 201, { override }, 'Override created successfully');
});

export const getOverrides = asyncHandler(async (req, res) => {
  const overrides = await overrideService.getOverrides(req.query);
  sendSuccess(res, 200, { overrides }, 'Overrides retrieved successfully');
});

export const getOverride = asyncHandler(async (req, res, next) => {
  const override = await overrideService.getOverrideById(req.params.id);
  if (!override) {
    return next(new AppError('No override found with that ID', 404));
  }
  sendSuccess(res, 200, { override });
});

export const updateOverride = asyncHandler(async (req, res, next) => {
  const override = await overrideService.updateOverride(req.params.id, req.body);
  if (!override) {
    return next(new AppError('No override found with that ID', 404));
  }
  sendSuccess(res, 200, { override }, 'Override updated successfully');
});

export const deleteOverride = asyncHandler(async (req, res, next) => {
  const override = await overrideService.deleteOverride(req.params.id);
  if (!override) {
    return next(new AppError('No override found with that ID', 404));
  }
  sendSuccess(res, 204, null, 'Override deleted successfully');
});
