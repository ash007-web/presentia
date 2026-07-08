import asyncHandler from '../utils/asyncHandler.js';
import * as presentationService from '../services/presentationService.js';
import { sendSuccess } from '../utils/responseHelper.js';
import AppError from '../utils/AppError.js';

export const createPresentation = asyncHandler(async (req, res) => {
  const presentation = await presentationService.createPresentation(req.body);
  sendSuccess(res, 201, { presentation }, 'Presentation created successfully');
});

export const getPresentations = asyncHandler(async (req, res) => {
  const result = await presentationService.getPresentations(req.query);
  sendSuccess(res, 200, result, 'Presentations retrieved successfully');
});

export const getPresentation = asyncHandler(async (req, res, next) => {
  const presentation = await presentationService.getPresentationById(req.params.id);
  if (!presentation) {
    return next(new AppError('No presentation found with that ID', 404));
  }
  sendSuccess(res, 200, { presentation });
});

export const updatePresentation = asyncHandler(async (req, res, next) => {
  const presentation = await presentationService.updatePresentation(req.params.id, req.body);
  if (!presentation) {
    return next(new AppError('No presentation found with that ID', 404));
  }
  sendSuccess(res, 200, { presentation }, 'Presentation updated successfully');
});

export const deletePresentation = asyncHandler(async (req, res, next) => {
  const presentation = await presentationService.deletePresentation(req.params.id);
  if (!presentation) {
    return next(new AppError('No presentation found with that ID', 404));
  }
  sendSuccess(res, 204, null, 'Presentation deleted successfully');
});
