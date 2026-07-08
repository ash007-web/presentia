import express from 'express';
import * as intelligenceController from '../controllers/intelligenceController.js';

const router = express.Router();

// Presentation Engine
router.post('/presentation/start', intelligenceController.startPresentation);
router.post('/presentation/pause', intelligenceController.pausePresentation);
router.post('/presentation/resume', intelligenceController.resumePresentation);
router.post('/presentation/finish', intelligenceController.finishPresentation);
router.post('/presentation/evaluate', intelligenceController.submitEvaluation);
router.post('/presentation/skip', intelligenceController.skipPresentation);
router.post('/presentation/absent', intelligenceController.markAbsent);
router.post('/presentation/override-active', intelligenceController.overrideActiveStudent);
router.post('/presentation/skip-evaluation', intelligenceController.skipEvaluation);
router.post('/presentation/reset-session', intelligenceController.resetSession);
router.get('/presentation/current', intelligenceController.getWorkflowState);
router.get('/session', intelligenceController.getSessionState);
router.get('/presentation/queue', intelligenceController.getQueueState);

// Timetable Engine
router.get('/timetable/current', intelligenceController.getCurrentTimetable);

// Dashboard Service
router.get('/dashboard', intelligenceController.getDashboard);

// Leaderboard Engine
router.get('/leaderboard/current', intelligenceController.getCurrentLeaderboard);
router.get('/leaderboard/overall', intelligenceController.getOverallLeaderboard);
router.get('/leaderboard/export', intelligenceController.exportLeaderboard);

// Analytics Engine
router.get('/analytics/overview', intelligenceController.getAnalyticsOverview);
router.get('/analytics/faculty', intelligenceController.getAnalyticsFaculty);
router.get('/analytics/subjects', intelligenceController.getAnalyticsSubjects);
router.get('/analytics/students', intelligenceController.getAnalyticsStudents);

// Cycle Management
router.post('/cycles/start-new', intelligenceController.startNewCycle);
router.post('/cycles/archive', intelligenceController.archiveCycle);
router.post('/cycles/reset', intelligenceController.resetCycle);

export default router;
