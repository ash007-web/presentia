import ExcelJS from 'exceljs';
import { Student, studentsCol, withUpdatedAt } from '../models/index.js';
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
    const presentationTitle = row.getCell(2).text?.toString().trim() || '';

    // Blank row detection
    if (!rollNo && !presentationTitle) return;

    if (!rollNo) {
      validationErrors.push(`Row ${rowNumber}: Missing Roll No`);
      return;
    }

    rows.push({ rollNo, presentationTitle, rowNumber });
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
  const existingStudentsMap = new Map(allStudents.map(s => [s.rollNo, s]));

  let importedCount = 0;
  let skippedCount = 0;
  
  const batch = db.batch();
  let hasUpdates = false;

  for (const row of rows) {
    const existingStudent = existingStudentsMap.get(row.rollNo);
    if (existingStudent) {
      const ref = studentsCol().doc(existingStudent.id);
      batch.update(ref, withUpdatedAt({ title: row.presentationTitle }));
      hasUpdates = true;
      importedCount++;
    } else {
      skippedCount++;
    }
  }

  if (hasUpdates) {
    try {
      await batch.commit();
      // Since we updated students directly, we should clear the cache as the legacy method did
      const { deleteCache } = await import('../utils/cache.js');
      deleteCache('Student:findAll');
    } catch (error) {
      return { importedCount: 0, skippedCount: 0, errors: [`Batch update failed: ${error.message}`], success: false };
    }
  }

  return { importedCount, skippedCount, errors: [], success: true };
};
