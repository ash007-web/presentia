import asyncHandler from '../utils/asyncHandler.js';
import * as studentService from '../services/studentService.js';
import * as importService from '../services/importService.js';
import { sendSuccess } from '../utils/responseHelper.js';
import AppError from '../utils/AppError.js';

export const createStudent = asyncHandler(async (req, res) => {
  const student = await studentService.createStudent(req.body);
  sendSuccess(res, 201, { student }, 'Student created successfully');
});

export const getStudents = asyncHandler(async (req, res) => {
  const result = await studentService.getStudents(req.query);
  sendSuccess(res, 200, result, 'Students retrieved successfully');
});

export const getStudentsOverview = asyncHandler(async (req, res) => {
  const result = await studentService.getStudentsOverview(req.query.cycleId);
  sendSuccess(res, 200, result, 'Students overview retrieved successfully');
});

export const getStudent = asyncHandler(async (req, res, next) => {
  const student = await studentService.getStudentById(req.params.id);
  if (!student) {
    return next(new AppError('No student found with that ID', 404));
  }
  sendSuccess(res, 200, { student });
});

export const updateStudent = asyncHandler(async (req, res, next) => {
  const student = await studentService.updateStudent(req.params.id, req.body);
  if (!student) {
    return next(new AppError('No student found with that ID', 404));
  }
  sendSuccess(res, 200, { student }, 'Student updated successfully');
});

export const deleteStudent = asyncHandler(async (req, res, next) => {
  const student = await studentService.deleteStudent(req.params.id);
  if (!student) {
    return next(new AppError('No student found with that ID', 404));
  }
  sendSuccess(res, 204, null, 'Student deleted successfully');
});

export const importStudents = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Please upload an Excel file', 400));
  }
  const result = await importService.importStudentsFromExcel(req.file.buffer);
  sendSuccess(res, 200, result, 'Import completed');
});

