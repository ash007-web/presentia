import asyncHandler from '../utils/asyncHandler.js';
import * as reportService from '../services/reportService.js';

export const exportReport = asyncHandler(async (req, res) => {
  const buffer = await reportService.generateReport(req.query);
  
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=' + 'presentations_report.xlsx');
  
  res.send(buffer);
});
