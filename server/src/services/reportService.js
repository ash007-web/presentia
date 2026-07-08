import ExcelJS from 'exceljs';
import { Presentation } from '../models/index.js';

export const generateReport = async (filters) => {
  const query = {};
  
  if (filters.ids) {
    query._id = { $in: filters.ids.split(',') };
  } else {
    if (filters.cycle) query.cycle = filters.cycle;
    if (filters.subject) query.subject = filters.subject;
    if (filters.faculty) query.faculty = filters.faculty;
    if (filters.student) query.student = filters.student;
    if (filters.status) query.status = filters.status;
    
    if (filters.startDate || filters.endDate) {
      query.presentationDate = {};
      if (filters.startDate) query.presentationDate.$gte = new Date(filters.startDate);
      if (filters.endDate) query.presentationDate.$lte = new Date(filters.endDate);
    }
  }

  const presentations = await Presentation.find(query)
    .populate('student', 'rollNo name admissionNo')
    .populate('cycle', 'semester cycleNumber')
    .sort({ 'student.rollNo': 1, presentationDate: -1 });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Presentia';
  workbook.created = new Date();
  
  const worksheet = workbook.addWorksheet('Presentations', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
  });

  worksheet.columns = [
    { header: 'Roll No', key: 'rollNo', width: 12 },
    { header: 'Admission No', key: 'admissionNo', width: 16 },
    { header: 'Student Name', key: 'name', width: 25 },
    { header: 'Presentation Title', key: 'title', width: 30 },
    { header: 'Subject', key: 'subject', width: 22 },
    { header: 'Faculty', key: 'faculty', width: 22 },
    { header: 'Presentation Duration', key: 'duration', width: 22 },
    { header: 'Overall Rating', key: 'rating', width: 15 },
    { header: 'Feedback', key: 'tags', width: 32 },
    { header: 'Remarks', key: 'remarks', width: 35 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Cycle', key: 'cycle', width: 15 },
    { header: 'Date', key: 'date', width: 20 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C7BA6' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  presentations.forEach((p, idx) => {
    const row = worksheet.addRow({
      rollNo: p.student?.rollNo || '',
      admissionNo: p.student?.admissionNo || '',
      name: p.student?.name || '',
      title: p.presentationTitle || '',
      subject: p.subject || '',
      faculty: p.faculty || '',
      duration: p.actualDuration || 0,
      rating: p.overallRating || 0,
      tags: (p.feedbackTags || []).join(', '),
      remarks: p.feedback || '',
      status: p.status || '',
      cycle: p.cycle ? `Cycle ${p.cycle.cycleNumber} - ${p.cycle.semester}` : '',
      date: p.presentationDate ? p.presentationDate.toLocaleDateString('en-IN') : ''
    });

    if (idx % 2 === 1) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F7F9' } };
    }
    
    // Color-code status
    const statusCell = row.getCell('status');
    if (p.status === 'Completed') statusCell.font = { color: { argb: 'FF1A7F4B' } };
    else if (p.status === 'Absent') statusCell.font = { color: { argb: 'FFD71920' } };
    else if (p.status === 'Skipped') statusCell.font = { color: { argb: 'FFE8963C' } };
  });

  // Apply borders to all cells
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: {style:'thin', color: {argb:'FFE5E7EB'}},
        left: {style:'thin', color: {argb:'FFE5E7EB'}},
        bottom: {style:'thin', color: {argb:'FFE5E7EB'}},
        right: {style:'thin', color: {argb:'FFE5E7EB'}}
      };
      if (rowNumber > 1) {
        cell.alignment = { vertical: 'middle', wrapText: true };
      }
    });
  });

  return await workbook.xlsx.writeBuffer();
};
