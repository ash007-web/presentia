import asyncHandler from '../utils/asyncHandler.js';
import * as presentationEngine from '../services/presentationEngineService.js';
import * as cycleService from '../services/cycleService.js';
import * as timetableEngine from '../services/timetableEngineService.js';
import * as dashboardService from '../services/dashboardService.js';
import * as leaderboardService from '../services/leaderboardService.js';
import * as analyticsService from '../services/analyticsService.js';
import { sendSuccess } from '../utils/responseHelper.js';
import ExcelJS from 'exceljs';

// Engine: Presentation
export const getSessionState = asyncHandler(async (req, res) => {
  const state = await presentationEngine.getSessionState();
  sendSuccess(res, 200, state);
});

export const getQueueState = asyncHandler(async (req, res) => {
  const state = await presentationEngine.getQueueState();
  sendSuccess(res, 200, state);
});

export const getWorkflowState = asyncHandler(async (req, res) => {
  const state = await presentationEngine.getWorkflowState();
  sendSuccess(res, 200, state);
});

export const overrideActiveStudent = asyncHandler(async (req, res) => {
  const state = await presentationEngine.overrideActiveStudent(req.body.studentId);
  sendSuccess(res, 200, state, 'Student overridden successfully');
});

export const startPresentation = asyncHandler(async (req, res) => {
  const state = await presentationEngine.startPresentation(req.body.studentId);
  sendSuccess(res, 200, state, 'Presentation started');
});

export const pausePresentation = asyncHandler(async (req, res) => {
  const state = await presentationEngine.pausePresentation();
  sendSuccess(res, 200, state, 'Presentation paused');
});

export const resumePresentation = asyncHandler(async (req, res) => {
  const state = await presentationEngine.resumePresentation();
  sendSuccess(res, 200, state, 'Presentation resumed');
});

export const finishPresentation = asyncHandler(async (req, res) => {
  const state = await presentationEngine.finishPresentation();
  sendSuccess(res, 200, state, 'Presentation finished, evaluating');
});

export const submitEvaluation = asyncHandler(async (req, res) => {
  const state = await presentationEngine.submitEvaluation(req.body);
  sendSuccess(res, 200, state, 'Evaluation submitted successfully');
});

export const skipPresentation = asyncHandler(async (req, res) => {
  const state = await presentationEngine.skipPresentation(req.body.studentId);
  sendSuccess(res, 200, state, 'Student skipped');
});

export const markAbsent = asyncHandler(async (req, res) => {
  const state = await presentationEngine.markAbsent(req.body.studentId);
  sendSuccess(res, 200, state, 'Student marked absent');
});

export const skipEvaluation = asyncHandler(async (req, res) => {
  const state = await presentationEngine.skipEvaluation();
  sendSuccess(res, 200, state, 'Evaluation skipped');
});

export const resetSession = asyncHandler(async (req, res) => {
  const state = await presentationEngine.resetSession();
  sendSuccess(res, 200, state, 'Session reset');
});

export const startNewCycle = asyncHandler(async (req, res) => {
  const { cycleNumber, semester } = req.body;
  const cycle = await cycleService.createCycle({ cycleNumber, semester, startDate: new Date() });
  const { updateSettings } = await import('../services/settingsService.js');
  const settings = await updateSettings({ currentCycle: cycle.id });
  sendSuccess(res, 200, { cycle, settings }, 'New cycle started');
});

export const archiveCycle = asyncHandler(async (req, res) => {
  const { cycleId } = req.body;
  if (!cycleId) throw new Error('cycleId is required');
  const cycle = await cycleService.updateCycle(cycleId, { endDate: new Date() });
  sendSuccess(res, 200, { cycle }, 'Cycle archived');
});

export const resetCycle = asyncHandler(async (req, res) => {
  const { cycleId } = req.body;
  if (!cycleId) throw new Error('cycleId is required');
  const { Presentation } = await import('../models/index.js');
  await Presentation.deleteMany({ cycleId });
  sendSuccess(res, 200, {}, 'Cycle reset — all presentations deleted');
});

// Engine: Timetable
export const getCurrentTimetable = asyncHandler(async (req, res) => {
  const data = await timetableEngine.getCurrentTimetableInfo();
  sendSuccess(res, 200, data);
});

// Engine: Dashboard
export const getDashboard = asyncHandler(async (req, res) => {
  const data = await dashboardService.getDashboardData();
  sendSuccess(res, 200, data);
});

// Engine: Leaderboard
export const getCurrentLeaderboard = asyncHandler(async (req, res) => {
  const data = await leaderboardService.getCurrentLeaderboard();
  sendSuccess(res, 200, { leaderboard: data });
});

export const getOverallLeaderboard = asyncHandler(async (req, res) => {
  const data = await leaderboardService.getOverallLeaderboard();
  sendSuccess(res, 200, { leaderboard: data });
});

export const exportLeaderboard = asyncHandler(async (req, res) => {
  const { type = 'current', search = '' } = req.query;
  const { Settings } = await import('../models/index.js');
  const settings = await Settings.findOne({ singletonKey: 'GLOBAL_SETTINGS' });
  const currentCycleNum = settings?.currentCycle?.cycleNumber || 1;
  const cycleLabel = `Cycle ${currentCycleNum}`;

  let data = type === 'overall'
    ? await leaderboardService.getOverallLeaderboard()
    : await leaderboardService.getCurrentLeaderboard();

  if (search) {
    const s = search.toLowerCase();
    data = data.filter(row => {
      const name = row.student?.name || '';
      const rollNo = row.student?.rollNo || '';
      return name.toLowerCase().includes(s) || String(rollNo).toLowerCase().includes(s);
    });
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Leaderboard');

  worksheet.columns = [
    { header: 'Rank', key: 'rank', width: 10 },
    { header: 'Roll No', key: 'rollNo', width: 15 },
    { header: 'Student Name', key: 'name', width: 30 },
    { header: 'Admission No', key: 'admissionNo', width: 20 },
    { header: 'Overall Rating', key: 'rating', width: 15 },
    { header: 'Completed', key: 'count', width: 15 },
    { header: 'Current Cycle', key: 'cycle', width: 15 },
  ];

  worksheet.getRow(1).font = { bold: true };
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  data.forEach((row, index) => {
    worksheet.addRow({
      rank: index + 1,
      rollNo: row.student?.rollNo || 'N/A',
      name: row.student?.name || 'Unknown',
      admissionNo: row.student?.admissionNo || 'N/A',
      rating: (row.averageRating || 0).toFixed(2),
      count: row.presentationsCount || 0,
      cycle: cycleLabel,
    });
  });

  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `Leaderboard_Cycle-${currentCycleNum}_${dateStr}.xlsx`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  await workbook.xlsx.write(res);
  res.end();
});

// Engine: Analytics
export const getAnalyticsOverview = asyncHandler(async (req, res) => {
  const data = await analyticsService.getOverview();
  sendSuccess(res, 200, data);
});
export const getAnalyticsFaculty = asyncHandler(async (req, res) => {
  const data = await analyticsService.getFacultyAnalytics();
  sendSuccess(res, 200, data);
});
export const getAnalyticsSubjects = asyncHandler(async (req, res) => {
  const data = await analyticsService.getSubjectAnalytics();
  sendSuccess(res, 200, data);
});
export const getAnalyticsStudents = asyncHandler(async (req, res) => {
  const data = await analyticsService.getStudentAnalytics();
  sendSuccess(res, 200, data);
});
