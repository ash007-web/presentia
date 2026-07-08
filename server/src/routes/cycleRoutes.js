import express from 'express';
import * as cycleController from '../controllers/cycleController.js';
import * as cycleValidator from '../validators/cycleValidator.js';
import validate from '../middleware/validate.js';

const router = express.Router();

router
  .route('/')
  .post(validate(cycleValidator.createCycle), cycleController.createCycle)
  .get(cycleController.getCycles);

router
  .route('/:id')
  .get(cycleController.getCycle)
  .patch(validate(cycleValidator.updateCycle), cycleController.updateCycle)
  .delete(cycleController.deleteCycle);

export default router;
