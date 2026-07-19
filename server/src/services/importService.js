import ExcelJS from 'exceljs';
import { Student } from '../models/index.js';
import { db } from '../config/firebase.js';
import { Timestamp } from 'firebase-admin/firestore';

export const importStudentsFromExcel = async (buffer) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('No worksheet found in Excel file');
  }

  const rows = [];
  let validationErrors = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header
    const rollNo = row.getCell(1).text?.toString().trim().toUpperCase();
    const admissionNo = row.getCell(2).text?.toString().trim() || null;
    const name = row.getCell(3).text?.toString().trim();

    // Blank row detection
    if (!rollNo && !name && !admissionNo) return;

    if (!rollNo) {
      validationErrors.push(`Row ${rowNumber}: Missing Roll No`);
      return;
    }
    if (!name) {
      validationErrors.push(`Row ${rowNumber}: Missing Student Name`);
      return;
    }

    rows.push({ rollNo, name, admissionNo, rowNumber });
  });

  if (validationErrors.length > 0) {
    return { importedCount: 0, skippedCount: 0, errors: validationErrors, success: false };
  }

  // Check for duplicates within the file
  const errors = [];
  const uniqueRollNosInFile = new Set();
  for (const r of rows) {
    if (uniqueRollNosInFile.has(r.rollNo)) {
      errors.push(`Row ${r.rowNumber}: Duplicate Roll No in file (${r.rollNo})`);
    }
    uniqueRollNosInFile.add(r.rollNo);
  }

  if (errors.length > 0) {
    return { importedCount: 0, skippedCount: 0, errors, success: false };
  }

  // Check for duplicates against existing Firestore students
  const incomingRollNos = rows.map(r => r.rollNo);
  
  // Fetch all existing students and filter in memory (Firestore 'in' supports up to 30 items)
  const allStudents = await Student.findAll();
  const existingRollNos = new Set(allStudents.map(s => s.rollNo));

  let importedCount = 0;
  let skippedCount = 0;
  const docsToInsert = [];

  for (const row of rows) {
    if (existingRollNos.has(row.rollNo)) {
      skippedCount++;
    } else {
      docsToInsert.push({ rollNo: row.rollNo, name: row.name, admissionNo: row.admissionNo });
      importedCount++;
    }
  }

  if (docsToInsert.length > 0) {
    try {
      await Student.insertMany(docsToInsert);
    } catch (error) {
      return { importedCount: 0, skippedCount: 0, errors: [`Batch insert failed: ${error.message}`], success: false };
    }
  }

  return { importedCount, skippedCount, errors: [], success: true };
};
