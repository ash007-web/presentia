import { Presentation, Settings } from '../models/index.js';

export const getCurrentLeaderboard = async () => {
  const settings = await Settings.findOne({ singletonKey: 'GLOBAL_SETTINGS' });
  if (!settings || !settings.currentCycle) return [];

  return await Presentation.aggregate([
    { $match: { cycle: settings.currentCycle, status: 'Completed' } },
    { $group: {
        _id: '$student',
        averageRating: { $avg: '$overallRating' },
        presentationsCount: { $sum: 1 },
        subjects: { $addToSet: '$subject' }
      }
    },
    { $lookup: {
        from: 'students',
        localField: '_id',
        foreignField: '_id',
        as: 'student'
      }
    },
    { $unwind: '$student' },
    { $sort: { averageRating: -1, presentationsCount: -1, 'student.rollNo': 1 } }
  ]).collation({ locale: 'en', numericOrdering: true });
};

export const getOverallLeaderboard = async () => {
  return await Presentation.aggregate([
    { $match: { status: 'Completed' } },
    { $group: {
        _id: '$student',
        averageRating: { $avg: '$overallRating' },
        presentationsCount: { $sum: 1 }
      }
    },
    { $lookup: {
        from: 'students',
        localField: '_id',
        foreignField: '_id',
        as: 'student'
      }
    },
    { $unwind: '$student' },
    { $sort: { averageRating: -1, presentationsCount: -1, 'student.rollNo': 1 } }
  ]).collation({ locale: 'en', numericOrdering: true });
};
