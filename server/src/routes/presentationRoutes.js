import express from 'express';
import * as presentationController from '../controllers/presentationController.js';
import * as presentationValidator from '../validators/presentationValidator.js';
import validate from '../middleware/validate.js';

const router = express.Router();

router
  .route('/')
  .post(validate(presentationValidator.createPresentation), presentationController.createPresentation)
  .get(presentationController.getPresentations);

router
  .route('/:id')
  .get(presentationController.getPresentation)
  .patch(validate(presentationValidator.updatePresentation), presentationController.updatePresentation)
  .delete(presentationController.deletePresentation);

export default router;
