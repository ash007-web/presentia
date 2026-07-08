import express from 'express';
import * as studentController from '../controllers/studentController.js';
import * as studentValidator from '../validators/studentValidator.js';
import validate from '../middleware/validate.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

router.post('/import', upload.single('file'), studentController.importStudents);
router.get('/overview', studentController.getStudentsOverview);

router
  .route('/')
  .post(validate(studentValidator.createStudent), studentController.createStudent)
  .get(studentController.getStudents);

router
  .route('/:id')
  .get(studentController.getStudent)
  .patch(validate(studentValidator.updateStudent), studentController.updateStudent)
  .delete(studentController.deleteStudent);

export default router;
