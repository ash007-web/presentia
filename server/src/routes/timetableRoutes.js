import express from 'express';
import * as timetableController from '../controllers/timetableController.js';
import * as timetableValidator from '../validators/timetableValidator.js';
import validate from '../middleware/validate.js';

const router = express.Router();

router
  .route('/')
  .post(validate(timetableValidator.createOrUpdateTimetable), timetableController.createOrUpdateTimetable)
  .get(timetableController.getTimetables);

router
  .route('/current')
  .get(timetableController.getCurrentTimetable);

router
  .route('/:day')
  .get(timetableController.getTimetableByDay)
  .delete(timetableController.deleteTimetable);

export default router;
