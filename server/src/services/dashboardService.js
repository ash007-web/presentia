import { getWorkflowState } from './presentationEngineService.js';
import { Presentation } from '../models/index.js';

export const getDashboardData = async () => {
  const workflow = await getWorkflowState();

  let averageRating = 0;
  let topFive = [];
  let averageDuration = 0;
  let totalTimeTaken = 0;

  if (workflow.currentCycle) {
    // Fetch all completed presentations for current cycle
    const presentations = await Presentation.find({
      cycleId: workflow.currentCycle.id,
      status: 'Completed',
    });

    if (presentations.length > 0) {
      // Compute averages in memory
      const rated = presentations.filter(p => p.overallRating != null);
      const durabled = presentations.filter(p => p.actualDuration != null);

      if (rated.length > 0) {
        averageRating = (rated.reduce((sum, p) => sum + p.overallRating, 0) / rated.length).toFixed(1);
      }
      if (durabled.length > 0) {
        const sumDur = durabled.reduce((sum, p) => sum + p.actualDuration, 0);
        averageDuration = Math.round(sumDur / durabled.length);
        totalTimeTaken += sumDur;
      }

      // Top 5 by rating — import Student for population
      const { Student } = await import('../models/index.js');
      const sorted = [...presentations].sort((a, b) => (b.overallRating || 0) - (a.overallRating || 0));
      const top = sorted.slice(0, 5);
      topFive = await Promise.all(top.map(async (p) => {
        const student = await Student.findById(p.studentId);
        return { ...p, student };
      }));
    }
  }

  const presentationProgress = workflow.totalStudents > 0
    ? Math.round((workflow.completedCount / workflow.totalStudents) * 100)
    : 0;

  if (workflow.activeSession && ['Live', 'Paused', 'Evaluating'].includes(workflow.activeSession.state)) {
    let currentDur = workflow.activeSession.accumulatedTime || 0;
    if (workflow.activeSession.state === 'Live' && workflow.activeSession.lastUnpausedAt) {
      currentDur += (new Date() - new Date(workflow.activeSession.lastUnpausedAt)) / 1000;
    }
    totalTimeTaken += currentDur;
  }

  return {
    currentCycle: workflow.currentCycle,
    currentSubject: workflow.currentSubject,
    faculty: workflow.currentFaculty,
    completed: workflow.completedCount,
    remaining: workflow.remainingCount,
    averageRating,
    averageDuration,
    nextStudent: workflow.nextStudent,
    topFive,
    presentationProgress,
    totalTimeTaken,
    activeSession: workflow.activeSession,
    todaysSchedule: workflow.todaysSchedule,
  };
};
