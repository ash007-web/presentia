import { Settings, Presentation, Student } from '../models/index.js';
import AppError from '../utils/AppError.js';
import { getCurrentTimetableInfo } from './timetableEngineService.js';

const getSystemState = async () => {
  const settings = await Settings.findOne({ singletonKey: 'GLOBAL_SETTINGS' }).populate('currentCycle');
  if (!settings || !settings.currentCycle) {
    throw new AppError('Global settings or cycle not properly initialized', 400);
  }
  const ttInfo = await getCurrentTimetableInfo();
  return { settings, activePeriod: ttInfo.activePeriod };
};

export const getSessionState = async () => {
  const { settings, activePeriod } = await getSystemState();
  const session = settings.activeSession;
  
  let elapsed = session.accumulatedTime;
  if (session.state === 'Live' && session.lastUnpausedAt) {
    elapsed += (new Date() - session.lastUnpausedAt) / 1000;
  }
  
  let student = null;
  let cycle = settings.currentCycle?.cycleNumber;
  
  if (session.presentation) {
    const p = await Presentation.findById(session.presentation).populate('student');
    if (p) student = p.student;
  }
  
  return {
    presentationRunning: session.state === 'Live',
    elapsed: Math.round(elapsed),
    student,
    cycle,
    subject: activePeriod?.subject,
    faculty: activePeriod?.faculty,
    status: session.state,
    duration: settings.defaultDuration
  };
};

export const getQueueState = async () => {
  const { settings, activePeriod } = await getSystemState();
  
  let currentStudent = null;
  let nextStudent = null;
  let upcomingStudents = [];
  let skippedStudents = [];
  let absentStudents = [];
  let redoStudents = [];
  let estimatedRemaining = 0;
  let currentPresentationOrder = 0;
  
  if (settings.activeSession.presentation) {
    const p = await Presentation.findById(settings.activeSession.presentation).populate('student');
    if (p) currentStudent = p.student;
  }
  
  const totalStudents = await Student.countDocuments();
  
  if (settings.currentCycle) {
    const presentations = await Presentation.find({ cycle: settings.currentCycle._id }).populate('student');
    currentPresentationOrder = presentations.length;
    
    const presentedIds = presentations.map(p => p.student._id.toString());
    const allStudents = await Student.find({})
      .collation({ locale: 'en', numericOrdering: true })
      .sort({ rollNo: 1 });
    
    const pendingStudents = allStudents.filter(s => !presentedIds.includes(s._id.toString()));
    
    skippedStudents = presentations.filter(p => p.status === 'Skipped').map(p => ({ ...p.student.toObject(), status: 'Skipped', title: p.presentationTitle }));
    absentStudents = presentations.filter(p => p.status === 'Absent').map(p => ({ ...p.student.toObject(), status: 'Absent', title: p.presentationTitle }));
    redoStudents = presentations.filter(p => p.status === 'Redo').map(p => ({ ...p.student.toObject(), status: 'Redo', title: p.presentationTitle }));
    
    upcomingStudents = pendingStudents;
    if (upcomingStudents.length > 0) nextStudent = upcomingStudents[0];
    
    estimatedRemaining = (upcomingStudents.length * settings.defaultDuration) || 0;
  }
  
  return {
    currentStudent,
    nextStudent,
    upcomingStudents,
    skippedStudents,
    absentStudents,
    redoStudents,
    presentationOrder: currentPresentationOrder,
    estimatedRemaining,
    duration: settings.defaultDuration
  };
};

export const getWorkflowState = async () => {
  const { settings, activePeriod } = await getSystemState();
  let nextStudent = null;
  let remainingCount = 0;
  let completedCount = 0;

  const totalStudents = await Student.countDocuments();

  if (settings.currentCycle) {
    const presented = await Presentation.find({ cycle: settings.currentCycle._id });
    const presentedIds = presented.map(p => p.student.toString());
    
    completedCount = presented.filter(p => p.status === 'Completed').length;
    remainingCount = totalStudents - completedCount;

    nextStudent = await Student.findOne({ _id: { $nin: presentedIds } })
      .collation({ locale: 'en', numericOrdering: true })
      .sort({ rollNo: 1 });
  }

  return {
    activeSession: settings.activeSession,
    nextStudent,
    completedCount,
    remainingCount,
    totalStudents,
    currentSubject: activePeriod?.subject || null,
    currentFaculty: activePeriod?.faculty || settings.defaultFaculty || 'Navyamol K T',
    currentCycle: settings.currentCycle,
    todaysSchedule: (await getCurrentTimetableInfo()).periods || []
  };
};

export const startPresentation = async (studentId) => {
  const { settings, activePeriod } = await getSystemState();
  if (!activePeriod) throw new AppError('No active period in timetable to start presentation', 400);
  if (settings.activeSession.state !== 'Idle') throw new AppError('A presentation is already active or evaluating', 400);

  const student = await Student.findById(studentId);
  if (!student) throw new AppError('Student not found', 404);

  const orderCount = await Presentation.countDocuments({ cycle: settings.currentCycle._id, subject: activePeriod.subject });

  const presentation = await Presentation.create({
    student: student._id,
    cycle: settings.currentCycle._id,
    subject: activePeriod.subject,
    faculty: activePeriod.faculty,
    status: 'Pending',
    presentationOrder: orderCount + 1,
    presentationDate: new Date()
  });

  settings.activeSession = {
    presentation: presentation._id,
    state: 'Live',
    startedAt: new Date(),
    accumulatedTime: 0,
    lastUnpausedAt: new Date()
  };
  await settings.save();

  return await getWorkflowState();
};

export const pausePresentation = async () => {
  const settings = await Settings.findOne({ singletonKey: 'GLOBAL_SETTINGS' });
  if (settings.activeSession.state !== 'Live') throw new AppError('Presentation is not live', 400);

  const now = new Date();
  const timeSinceUnpause = (now - settings.activeSession.lastUnpausedAt) / 1000;
  
  settings.activeSession.accumulatedTime += timeSinceUnpause;
  settings.activeSession.state = 'Paused';
  await settings.save();

  return await getWorkflowState();
};

export const resumePresentation = async () => {
  const settings = await Settings.findOne({ singletonKey: 'GLOBAL_SETTINGS' });
  if (settings.activeSession.state !== 'Paused') throw new AppError('Presentation is not paused', 400);

  settings.activeSession.state = 'Live';
  settings.activeSession.lastUnpausedAt = new Date();
  await settings.save();

  return await getWorkflowState();
};

export const finishPresentation = async () => {
  const settings = await Settings.findOne({ singletonKey: 'GLOBAL_SETTINGS' });
  if (settings.activeSession.state !== 'Live' && settings.activeSession.state !== 'Paused') {
    throw new AppError('No active presentation to finish', 400);
  }

  let finalDuration = settings.activeSession.accumulatedTime;
  if (settings.activeSession.state === 'Live') {
    const now = new Date();
    finalDuration += (now - settings.activeSession.lastUnpausedAt) / 1000;
  }

  settings.activeSession.accumulatedTime = finalDuration;
  settings.activeSession.state = 'Evaluating';
  await settings.save();

  return await getWorkflowState();
};

export const submitEvaluation = async (evaluationData) => {
  const settings = await Settings.findOne({ singletonKey: 'GLOBAL_SETTINGS' });
  if (settings.activeSession.state !== 'Evaluating') throw new AppError('System is not in evaluating state', 400);

  const presentation = await Presentation.findById(settings.activeSession.presentation);
  if (!presentation) throw new AppError('Presentation record not found', 404);

  presentation.overallRating = evaluationData.overallRating;
  presentation.feedbackTags = evaluationData.feedbackTags || [];
  presentation.feedback = evaluationData.feedback || '';
  presentation.presentationTitle = evaluationData.presentationTitle || '';
  presentation.actualDuration = Math.round(settings.activeSession.accumulatedTime);
  presentation.status = evaluationData.status || 'Completed';
  await presentation.save();

  settings.activeSession = {
    presentation: null,
    state: 'Idle',
    startedAt: null,
    accumulatedTime: 0,
    lastUnpausedAt: null
  };
  await settings.save();

  return await getWorkflowState();
};

export const skipPresentation = async (studentId) => {
  const { settings, activePeriod } = await getSystemState();
  if (!activePeriod) throw new AppError('No active period in timetable', 400);

  const student = await Student.findById(studentId);
  if (!student) throw new AppError('Student not found', 404);

  const orderCount = await Presentation.countDocuments({ cycle: settings.currentCycle._id, subject: activePeriod.subject });

  await Presentation.create({
    student: student._id,
    cycle: settings.currentCycle._id,
    subject: activePeriod.subject,
    faculty: activePeriod.faculty,
    status: 'Skipped',
    presentationOrder: orderCount + 1,
    presentationDate: new Date()
  });

  return await getQueueState();
};

export const markAbsent = async (studentId) => {
  const { settings, activePeriod } = await getSystemState();
  if (!activePeriod) throw new AppError('No active period in timetable', 400);

  const student = await Student.findById(studentId);
  if (!student) throw new AppError('Student not found', 404);

  const orderCount = await Presentation.countDocuments({ cycle: settings.currentCycle._id, subject: activePeriod.subject });

  await Presentation.create({
    student: student._id,
    cycle: settings.currentCycle._id,
    subject: activePeriod.subject,
    faculty: activePeriod.faculty,
    status: 'Absent',
    presentationOrder: orderCount + 1,
    presentationDate: new Date()
  });

  return await getQueueState();
};

export const skipEvaluation = async () => {
  const settings = await Settings.findOne({ singletonKey: 'GLOBAL_SETTINGS' });
  if (settings.activeSession.state !== 'Evaluating') throw new AppError('System is not in evaluating state', 400);
  const presentation = await Presentation.findById(settings.activeSession.presentation);
  if (presentation) {
    presentation.status = 'Completed';
    presentation.actualDuration = Math.round(settings.activeSession.accumulatedTime);
    await presentation.save();
  }
  settings.activeSession = { presentation: null, state: 'Idle', startedAt: null, accumulatedTime: 0, lastUnpausedAt: null };
  await settings.save();
  return await getWorkflowState();
};

export const resetSession = async () => {
  const settings = await Settings.findOne({ singletonKey: 'GLOBAL_SETTINGS' });
  if (settings.activeSession.presentation && settings.activeSession.state !== 'Evaluating') {
    await Presentation.findByIdAndDelete(settings.activeSession.presentation);
  }
  settings.activeSession = { presentation: null, state: 'Idle', startedAt: null, accumulatedTime: 0, lastUnpausedAt: null };
  await settings.save();
  return await getWorkflowState();
};

export const overrideActiveStudent = async (studentId) => {
  const { settings, activePeriod } = await getSystemState();
  if (!activePeriod) throw new AppError('No active period in timetable to start presentation', 400);
  if (settings.activeSession.state !== 'Idle') throw new AppError('A presentation is already active or evaluating', 400);

  const student = await Student.findById(studentId);
  if (!student) throw new AppError('Student not found', 404);

  let presentation = await Presentation.findOne({ student: student._id, cycle: settings.currentCycle._id, subject: activePeriod.subject });

  if (presentation) {
    presentation.status = 'Pending';
    presentation.presentationDate = new Date();
    await presentation.save();
  } else {
    const orderCount = await Presentation.countDocuments({ cycle: settings.currentCycle._id, subject: activePeriod.subject });
    presentation = await Presentation.create({
      student: student._id,
      cycle: settings.currentCycle._id,
      subject: activePeriod.subject,
      faculty: activePeriod.faculty,
      status: 'Pending',
      presentationOrder: orderCount + 1,
      presentationDate: new Date()
    });
  }

  settings.activeSession = {
    presentation: presentation._id,
    state: 'Live',
    startedAt: new Date(),
    accumulatedTime: 0,
    lastUnpausedAt: new Date()
  };
  await settings.save();

  return await getWorkflowState();
};
