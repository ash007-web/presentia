import mongoose from 'mongoose';
import ExcelJS from 'exceljs';
import { Student } from '../models/index.js';

export const importStudentsFromExcel = async (buffer) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('No worksheet found in Excel file');
  }

  const rows = [];
  let rowCount = 0;
  let validationErrors = [];
  
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header
    rowCount++;
    const rollNo = row.getCell(1).text?.toString().trim();
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

  const session = await mongoose.startSession();
  let importedCount = 0;
  let skippedCount = 0;
  let errors = [];

  try {
    session.startTransaction();
    
    // Duplicate check in existing DB
    const existingStudents = await Student.find({ rollNo: { $in: rows.map(r => r.rollNo) } }).session(session);
    const existingRollNos = new Set(existingStudents.map(s => s.rollNo));
    
    const duplicateRollNosInFile = new Set();
    const uniqueRollNosInFile = new Set();
    
    for (const r of rows) {
      if (uniqueRollNosInFile.has(r.rollNo)) {
        duplicateRollNosInFile.add(r.rollNo);
        errors.push(`Row ${r.rowNumber}: Duplicate Roll No in file (${r.rollNo})`);
      }
      uniqueRollNosInFile.add(r.rollNo);
    }
    
    if (errors.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return { importedCount: 0, skippedCount: 0, errors, success: false };
    }
    
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
      await Student.insertMany(docsToInsert, { session });
    }
    
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    errors.push(`Transaction failed: ${error.message}`);
    return { importedCount: 0, skippedCount: 0, errors, success: false };
  } finally {
    session.endSession();
  }

  return { importedCount, skippedCount, errors, success: true };
};
