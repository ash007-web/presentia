import express from 'express';
import * as settingsController from '../controllers/settingsController.js';
import * as settingsValidator from '../validators/settingsValidator.js';
import validate from '../middleware/validate.js';

const router = express.Router();

router
  .route('/')
  .get(settingsController.getSettings)
  .patch(validate(settingsValidator.updateSettings), settingsController.updateSettings);

export default router;
