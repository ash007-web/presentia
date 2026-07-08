import asyncHandler from '../utils/asyncHandler.js';
import * as settingsService from '../services/settingsService.js';
import { sendSuccess } from '../utils/responseHelper.js';

export const getSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.getSettings();
  sendSuccess(res, 200, { settings }, 'Settings retrieved successfully');
});

export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.updateSettings(req.body);
  sendSuccess(res, 200, { settings }, 'Settings updated successfully');
});
