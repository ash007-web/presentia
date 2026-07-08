import { getWorkflowState } from './presentationEngineService.js';
import { Presentation } from '../models/index.js';

export const getDashboardData = async () => {
  const workflow = await getWorkflowState();
  
  let averageRating = 0;
  let topFive = [];
  let averageDuration = 0;

  if (workflow.currentCycle) {
    const aggResult = await Presentation.aggregate([
      { 
        $match: { 
          cycle: workflow.currentCycle._id, 

          status: 'Completed'
        } 
      },
      {
        $facet: {
          stats: [
            { $group: { _id: null, averageRating: { $avg: '$overallRating' }, averageDuration: { $avg: '$actualDuration' } } }
          ],
          topFive: [
            { $sort: { overallRating: -1 } },
            { $limit: 5 },
            { $lookup: { from: 'students', localField: 'student', foreignField: '_id', as: 'student' } },
            { $unwind: '$student' }
          ]
        }
      }
    ]);
    
    if (aggResult.length > 0) {
      if (aggResult[0].stats.length > 0) {
        averageRating = aggResult[0].stats[0].averageRating.toFixed(1);
        averageDuration = Math.round(aggResult[0].stats[0].averageDuration || 0);
      }
      topFive = aggResult[0].topFive;
    }
  }

  const presentationProgress = workflow.totalStudents > 0 
    ? Math.round((workflow.completedCount / workflow.totalStudents) * 100) 
    : 0;

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
    activeSession: workflow.activeSession,
    todaysSchedule: workflow.todaysSchedule 
  };
};
