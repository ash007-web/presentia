import { Settings, Presentation, Student } from '../models/index.js';
import AppError from '../utils/AppError.js';
import { getCurrentTimetableInfo } from './timetableEngineService.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getSystemState = async (prefetchedSettings = null) => {
  const settings = prefetchedSettings || await Settings.findOne({ singletonKey: 'GLOBAL_SETTINGS' });
  if (!settings || !settings.currentCycle) {
    throw new AppError('Global settings or cycle not properly initialized', 400);
  }
  const ttInfo = await getCurrentTimetableInfo(settings);
  return { settings, activePeriod: ttInfo.activePeriod, ttInfo };
};

// ─── Session State ────────────────────────────────────────────────────────────

export const getSessionState = async (prefetchedSettings = null, systemState = null) => {
  const { settings, activePeriod } = systemState ?? await getSystemState(prefetchedSettings);
  const session = settings.activeSession;

  let elapsed = session.accumulatedTime || 0;
  if (session.state === 'Live' && session.lastUnpausedAt) {
    elapsed += (new Date() - new Date(session.lastUnpausedAt)) / 1000;
  }

  let student = null;
  const cycle = settings.currentCycle?.cycleNumber;

  if (session.presentationId) {
    const p = await Presentation.findById(session.presentationId);
    if (p) student = await Student.findById(p.studentId);
  }

  return {
    presentationRunning: session.state === 'Live',
    elapsed: Math.round(elapsed),
    student,
    cycle,
    subject: activePeriod?.subject,
    faculty: activePeriod?.faculty,
    status: session.state,
    duration: settings.defaultDuration,
  };
};

// ─── Queue State ──────────────────────────────────────────────────────────────

export const getQueueState = async (systemState = null) => {
  const { settings, activePeriod } = systemState ?? await getSystemState();

  let currentStudent = null;
  let nextStudent = null;
  let upcomingStudents = [];
  let skippedStudents = [];
  let absentStudents = [];
  let redoStudents = [];
  let estimatedRemaining = 0;
  let currentPresentationOrder = 0;

  let currentPresentationPromise = Promise.resolve(null);
  let currentStudentPromise = Promise.resolve(null);
  
  if (settings.activeSession.presentationId) {
    currentPresentationPromise = Presentation.findById(settings.activeSession.presentationId).then(async p => {
      if (p) currentStudent = await Student.findById(p.studentId);
      return p;
    });
  }

  let presentationsPromise = Promise.resolve([]);
  let allStudentsPromise = Promise.resolve([]);

  if (settings.currentCycle) {
    presentationsPromise = Presentation.find({ cycleId: settings.currentCycle.id });
    allStudentsPromise = Student.findAll();
  }

  let [presentations, allStudents] = await Promise.all([
    presentationsPromise,
    allStudentsPromise,
    currentPresentationPromise
  ]);

  if (settings.currentCycle) {
    currentPresentationOrder = presentations.length;
    const presentedStudentIds = new Set(presentations.map(p => p.studentId));

    allStudents.sort(numericRollNoSort);
    const pendingStudents = allStudents.filter(s => !presentedStudentIds.has(s.id));

    // Build enriched skipped/absent/redo lists
    for (const p of presentations) {
      const s = allStudents.find(st => st.id === p.studentId);
      if (!s) continue;
      const entry = { ...s, status: p.status, title: p.presentationTitle };
      if (p.status === 'Skipped') skippedStudents.push(entry);
      else if (p.status === 'Absent') absentStudents.push(entry);
      else if (p.status === 'Redo') redoStudents.push(entry);
    }

    allStudents = allStudents.map(s => {
      const p = presentations.find(pr => pr.studentId === s.id);
      let status = 'Pending';
      if (currentStudent && s.id === currentStudent.id) status = 'Current';
      else if (p) status = p.status;
      return {
        ...s,
        status,
        title: p ? p.presentationTitle : ''
      };
    });

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
    allStudents,
    presentationOrder: currentPresentationOrder,
    estimatedRemaining,
    duration: settings.defaultDuration,
  };
};

// ─── Workflow State ───────────────────────────────────────────────────────────

export const getWorkflowState = async (prefetchedSettings = null) => {
  const { settings, activePeriod, ttInfo } = await getSystemState(prefetchedSettings);
  let nextStudent = null;
  let remainingCount = 0;
  let completedCount = 0;
  let totalStudents = 0;

  if (settings.currentCycle) {
    const [presented, allStudents] = await Promise.all([
      Presentation.find({ cycleId: settings.currentCycle.id }),
      Student.findAll()
    ]);
    
    totalStudents = allStudents.length;
    const presentedStudentIds = new Set(presented.map(p => p.studentId));
    completedCount = presented.filter(p => p.status === 'Completed').length;
    remainingCount = totalStudents - completedCount;

    allStudents.sort(numericRollNoSort);
    nextStudent = allStudents.find(s => !presentedStudentIds.has(s.id)) || null;
  } else {
    totalStudents = await Student.countDocuments();
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
    todaysSchedule: ttInfo?.periods || [],
  };
};

export const getUnifiedWorkflowState = async (settings = null, systemState = null) => {
  const effectiveSystemState = systemState ? { ...systemState, settings: settings || systemState.settings } : null;
  const [session, queue] = await Promise.all([
    getSessionState(settings, effectiveSystemState),
    getQueueState(effectiveSystemState)
  ]);
  return { session, queue };
};

// ─── Presentation Controls ────────────────────────────────────────────────────

export const startPresentation = async (studentId) => {
  const systemState = await getSystemState();
  const { settings, activePeriod, ttInfo } = systemState;
  // Use activePeriod if a class is running right now; fall back to nextPeriod
  // so teachers can start slightly before/after a period boundary.
  const period = activePeriod || ttInfo?.nextPeriod || null;
  if (!period) throw new AppError('No active period in timetable to start presentation', 400);
  if (settings.activeSession.state !== 'Idle') throw new AppError('A presentation is already active or evaluating', 400);

  if (settings.activeSession.presentationId) {
    let updatedSettings = await Settings.updateDoc({
      activeSession: {
        ...settings.activeSession,
        state: 'Live',
        startedAt: new Date(),
        accumulatedTime: 0,
        lastUnpausedAt: new Date(),
      },
    });
    return await getUnifiedWorkflowState(updatedSettings);
  }

  const student = await Student.findById(studentId);
  if (!student) throw new AppError('Student not found', 404);

  const orderCount = await Presentation.countDocuments({ cycleId: settings.currentCycle.id, subject: period.subject });

  const presentation = await Presentation.create({
    studentId: student.id,
    cycleId: settings.currentCycle.id,
    subject: period.subject,
    faculty: period.faculty,
    status: 'Pending',
    presentationOrder: orderCount + 1,
    presentationDate: new Date(),
  });

  let updatedSettings = await Settings.updateDoc({
    activeSession: {
      presentationId: presentation.id,
      presentation: presentation.id, // compatibility
      state: 'Live',
      startedAt: new Date(),
      accumulatedTime: 0,
      lastUnpausedAt: new Date(),
    },
  });

  return await getUnifiedWorkflowState(updatedSettings, systemState);
};

export const pausePresentation = async () => {
  const systemState = await getSystemState();
  const { settings } = systemState;
  if (settings.activeSession.state !== 'Live') throw new AppError('Presentation is not live', 400);

  const now = new Date();
  const timeSinceUnpause = (now - new Date(settings.activeSession.lastUnpausedAt)) / 1000;
  const accumulated = (settings.activeSession.accumulatedTime || 0) + timeSinceUnpause;

  const updatedSettings = await Settings.updateDoc({
    activeSession: {
      ...settings.activeSession,
      accumulatedTime: accumulated,
      state: 'Paused',
    },
  });

  // Return unified state to ensure UI sync
  return await getUnifiedWorkflowState(updatedSettings, systemState);
};

export const resumePresentation = async () => {
  const systemState = await getSystemState();
  let { settings } = systemState;
  if (settings.activeSession.state !== 'Paused') throw new AppError('Presentation is not paused', 400);

  settings = await Settings.updateDoc({
    activeSession: {
      ...settings.activeSession,
      state: 'Live',
      lastUnpausedAt: new Date(),
    },
  });

  // Return unified state to ensure UI sync
  return await getUnifiedWorkflowState(settings, systemState);
};

export const finishPresentation = async () => {
  const systemState = await getSystemState();
  const { settings } = systemState;
  if (settings.activeSession.state !== 'Live' && settings.activeSession.state !== 'Paused') {
    throw new AppError('No active presentation to finish', 400);
  }

  let finalDuration = settings.activeSession.accumulatedTime || 0;
  if (settings.activeSession.state === 'Live') {
    const now = new Date();
    finalDuration += (now - new Date(settings.activeSession.lastUnpausedAt)) / 1000;
  }

  let updatedSettings = await Settings.updateDoc({
    activeSession: {
      ...settings.activeSession,
      accumulatedTime: finalDuration,
      state: 'Evaluating',
    },
  });

  return await getUnifiedWorkflowState(updatedSettings);
};

export const submitEvaluation = async (evaluationData) => {
  const systemState = await getSystemState();
  const { settings } = systemState;
  if (settings.activeSession.state !== 'Evaluating') throw new AppError('System is not in evaluating state', 400);

  const presentationId = settings.activeSession.presentationId;
  const presentation = await Presentation.findById(presentationId);
  if (!presentation) throw new AppError('Presentation record not found', 404);

  await Presentation.findByIdAndUpdate(presentationId, {
    overallRating: evaluationData.overallRating,
    feedbackTags: evaluationData.feedbackTags || [],
    feedback: evaluationData.feedback || '',
    presentationTitle: evaluationData.presentationTitle || '',
    actualDuration: Math.round(settings.activeSession.accumulatedTime || 0),
    status: evaluationData.status || 'Completed',
  });

  let updatedSettings = await Settings.updateDoc({
    activeSession: {
      presentationId: null,
      presentation: null,
      state: 'Idle',
      startedAt: null,
      accumulatedTime: 0,
      lastUnpausedAt: null,
    },
  });

  return await getUnifiedWorkflowState(updatedSettings, systemState);
};

export const skipPresentation = async (studentId) => {
  const systemState = await getSystemState();
  const { settings, activePeriod } = systemState;
  if (!activePeriod) throw new AppError('No active period in timetable', 400);

  const student = await Student.findById(studentId);
  if (!student) throw new AppError('Student not found', 404);

  const recentPresentation = await Presentation.findOne({
    studentId: student.id,
    cycleId: settings.currentCycle.id,
    subject: activePeriod.subject,
    status: 'Skipped',
    presentationDate: { $gte: new Date(Date.now() - 10000) }
  });
  if (recentPresentation) return await getUnifiedWorkflowState(null, systemState);

  const orderCount = await Presentation.countDocuments({ cycleId: settings.currentCycle.id, subject: activePeriod.subject });

  await Presentation.create({
    studentId: student.id,
    cycleId: settings.currentCycle.id,
    subject: activePeriod.subject,
    faculty: activePeriod.faculty,
    status: 'Skipped',
    presentationOrder: orderCount + 1,
    presentationDate: new Date(),
  });

  return await getUnifiedWorkflowState(null, systemState);
};

export const markAbsent = async (studentId) => {
  const systemState = await getSystemState();
  const { settings, activePeriod } = systemState;
  if (!activePeriod) throw new AppError('No active period in timetable', 400);

  const student = await Student.findById(studentId);
  if (!student) throw new AppError('Student not found', 404);

  const recentPresentation = await Presentation.findOne({
    studentId: student.id,
    cycleId: settings.currentCycle.id,
    subject: activePeriod.subject,
    status: 'Absent',
    presentationDate: { $gte: new Date(Date.now() - 10000) }
  });
  if (recentPresentation) return await getUnifiedWorkflowState(null, systemState);

  const orderCount = await Presentation.countDocuments({ cycleId: settings.currentCycle.id, subject: activePeriod.subject });

  await Presentation.create({
    studentId: student.id,
    cycleId: settings.currentCycle.id,
    subject: activePeriod.subject,
    faculty: activePeriod.faculty,
    status: 'Absent',
    presentationOrder: orderCount + 1,
    presentationDate: new Date(),
  });

  return await getUnifiedWorkflowState(null, systemState);
};

export const skipEvaluation = async () => {
  const systemState = await getSystemState();
  const { settings } = systemState;
  if (settings.activeSession.state !== 'Evaluating') throw new AppError('System is not in evaluating state', 400);

  const presentationId = settings.activeSession.presentationId;
  if (presentationId) {
    await Presentation.findByIdAndUpdate(presentationId, {
      status: 'Completed',
      actualDuration: Math.round(settings.activeSession.accumulatedTime || 0),
    });
  }

  let updatedSettings = await Settings.updateDoc({
    activeSession: {
      presentationId: null,
      presentation: null,
      state: 'Idle',
      startedAt: null,
      accumulatedTime: 0,
      lastUnpausedAt: null,
    },
  });

  return await getUnifiedWorkflowState(updatedSettings, systemState);
};

export const resetSession = async () => {
  const systemState = await getSystemState();
  const { settings } = systemState;
  const presentationId = settings.activeSession.presentationId;

  if (presentationId && settings.activeSession.state !== 'Evaluating') {
    await Presentation.findByIdAndDelete(presentationId);
  }

  let updatedSettings = await Settings.updateDoc({
    activeSession: {
      presentationId: null,
      presentation: null,
      state: 'Idle',
      startedAt: null,
      accumulatedTime: 0,
      lastUnpausedAt: null,
    },
  });

  return await getUnifiedWorkflowState(updatedSettings, systemState);
};

export const overrideActiveStudent = async (studentId) => {
  const systemState = await getSystemState();
  const { settings, activePeriod, ttInfo } = systemState;
  const period = activePeriod || ttInfo?.nextPeriod || null;
  if (!period) throw new AppError('No active period in timetable to start presentation', 400);
  if (settings.activeSession.state !== 'Idle') throw new AppError('A presentation is already active or evaluating', 400);

  const student = await Student.findById(studentId);
  if (!student) throw new AppError('Student not found', 404);

  let presentation = await Presentation.findOne({
    studentId: student.id,
    cycleId: settings.currentCycle.id,
    subject: period.subject,
  });

  if (presentation) {
    await Presentation.findByIdAndUpdate(presentation.id, {
      status: 'Pending',
      presentationDate: new Date(),
    });
    presentation = await Presentation.findById(presentation.id);
  } else {
    const orderCount = await Presentation.countDocuments({
      cycleId: settings.currentCycle.id,
      subject: period.subject,
    });
    presentation = await Presentation.create({
      studentId: student.id,
      cycleId: settings.currentCycle.id,
      subject: period.subject,
      faculty: period.faculty,
      status: 'Pending',
      presentationOrder: orderCount + 1,
      presentationDate: new Date(),
    });
  }

  let updatedSettings = await Settings.updateDoc({
    activeSession: {
      presentationId: presentation.id,
      presentation: presentation.id,
      state: 'Idle',
      startedAt: null,
      accumulatedTime: 0,
      lastUnpausedAt: null,
    },
  });

  return await getUnifiedWorkflowState(updatedSettings);
};

// ─── Utility ──────────────────────────────────────────────────────────────────

function numericRollNoSort(a, b) {
  const extractNum = (s) => {
    const match = (s?.rollNo || '').match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  };
  const na = extractNum(a);
  const nb = extractNum(b);
  if (na !== nb) return na - nb;
  return (a.rollNo || '').localeCompare(b.rollNo || '');
}
