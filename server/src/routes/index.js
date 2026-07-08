import express from 'express';
import studentRoutes from './studentRoutes.js';
import presentationRoutes from './presentationRoutes.js';
import cycleRoutes from './cycleRoutes.js';
import timetableRoutes from './timetableRoutes.js';
import overrideRoutes from './overrideRoutes.js';
import settingsRoutes from './settingsRoutes.js';
import reportRoutes from './reportRoutes.js';
import intelligenceRoutes from './intelligenceRoutes.js';

const router = express.Router();

router.use('/students', studentRoutes);
router.use('/presentations', presentationRoutes);
router.use('/cycles', cycleRoutes);
router.use('/timetables', timetableRoutes);
router.use('/overrides', overrideRoutes);
router.use('/settings', settingsRoutes);
router.use('/reports', reportRoutes);

// Intelligence Engines
router.use('/', intelligenceRoutes);

export default router;
