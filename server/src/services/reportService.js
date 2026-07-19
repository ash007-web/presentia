import ExcelJS from 'exceljs';
import { Presentation, Student, Cycle } from '../models/index.js';

export const generateReport = async (filters) => {
  // Build Firestore-compatible filter
  let presentations = [];

  if (filters.ids) {
    // Fetch specific IDs
    const ids = filters.ids.split(',').map(id => id.trim());
    const fetched = await Promise.all(ids.map(id => Presentation.findById(id)));
    presentations = fetched.filter(Boolean);
  } else {
    const query = {};
    if (filters.cycle) query.cycleId = filters.cycle;
    if (filters.subject) query.subject = filters.subject;
    if (filters.faculty) query.faculty = filters.faculty;
    if (filters.student) query.studentId = filters.student;
    if (filters.status) query.status = filters.status;

    let all = await Presentation.find(query);

    // Date range filter in memory
    if (filters.startDate || filters.endDate) {
      const start = filters.startDate ? new Date(filters.startDate) : null;
      const end = filters.endDate ? new Date(filters.endDate) : null;
      all = all.filter(p => {
        if (!p.presentationDate) return false;
        const d = new Date(p.presentationDate);
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      });
    }

    presentations = all;
  }

  // Populate student and cycle for each presentation in parallel
  const [allStudents, allCycles] = await Promise.all([
    Student.findAll(),
    Cycle.find(),
  ]);
  const studentMap = {};
  for (const s of allStudents) studentMap[s.id] = s;
  const cycleMap = {};
  for (const c of allCycles) cycleMap[c.id] = c;

  const populated = presentations.map(p => ({
    ...p,
    student: studentMap[p.studentId] || null,
    cycle: cycleMap[p.cycleId] || null,
  }));

  // Sort by student rollNo asc, then presentationDate desc
  populated.sort((a, b) => {
    const ra = a.student?.rollNo || '';
    const rb = b.student?.rollNo || '';
    if (ra !== rb) return ra.localeCompare(rb);
    return new Date(b.presentationDate) - new Date(a.presentationDate);
  });

  // Build Excel workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Presentia';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Presentations', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }],
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

  populated.forEach((p, idx) => {
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
      date: p.presentationDate ? new Date(p.presentationDate).toLocaleDateString('en-IN') : '',
    });

    if (idx % 2 === 1) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F7F9' } };
    }

    const statusCell = row.getCell('status');
    if (p.status === 'Completed') statusCell.font = { color: { argb: 'FF1A7F4B' } };
    else if (p.status === 'Absent') statusCell.font = { color: { argb: 'FFD71920' } };
    else if (p.status === 'Skipped') statusCell.font = { color: { argb: 'FFE8963C' } };
  });

  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
      if (rowNumber > 1) {
        cell.alignment = { vertical: 'middle', wrapText: true };
      }
    });
  });

  return await workbook.xlsx.writeBuffer();
};
