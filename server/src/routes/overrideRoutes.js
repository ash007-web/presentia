import express from 'express';
import * as overrideController from '../controllers/overrideController.js';
import * as overrideValidator from '../validators/overrideValidator.js';
import validate from '../middleware/validate.js';

const router = express.Router();

router
  .route('/')
  .post(validate(overrideValidator.createOverride), overrideController.createOverride)
  .get(overrideController.getOverrides);

router
  .route('/:id')
  .get(overrideController.getOverride)
  .patch(validate(overrideValidator.updateOverride), overrideController.updateOverride)
  .delete(overrideController.deleteOverride);

export default router;
