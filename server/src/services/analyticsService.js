import { Presentation } from '../models/index.js';

export const getOverview = async () => {
  const total = await Presentation.countDocuments({ status: 'Completed' });
  const avg = await Presentation.aggregate([
    { $match: { status: 'Completed' } },
    { $group: { _id: null, avgRating: { $avg: '$overallRating' }, avgDuration: { $avg: '$actualDuration' } } }
  ]);

  return {
    totalPresentations: total,
    averageRating: avg.length ? avg[0].avgRating : 0,
    averageDuration: avg.length ? avg[0].avgDuration : 0,
    totalDuration: avg.length ? avg[0].avgDuration * total : 0
  };
};

export const getFacultyAnalytics = async () => {
  return await Presentation.aggregate([
    { $match: { status: 'Completed' } },
    { $group: {
        _id: '$faculty',
        avgRating: { $avg: '$overallRating' },
        count: { $sum: 1 }
      }
    },
    { $sort: { averageRating: -1 } }
  ]);
};

export const getSubjectAnalytics = async () => {
  return await Presentation.aggregate([
    { $match: { status: 'Completed' } },
    { $group: {
        _id: '$subject',
        avgRating: { $avg: '$overallRating' },
        averageDuration: { $avg: '$actualDuration' },
        count: { $sum: 1 }
      }
    },
    { $sort: { avgRating: -1 } }
  ]);
};

export const getStudentAnalytics = async () => {
  return await Presentation.aggregate([
    { $match: { status: 'Completed' } },
    { $group: {
        _id: '$student',
        avgRating: { $avg: '$overallRating' },
        count: { $sum: 1 }
      }
    },
    { $sort: { avgRating: -1 } },
    { $limit: 10 },
    { $lookup: {
        from: 'students',
        localField: '_id',
        foreignField: '_id',
        as: 'student'
      }
    },
    { $unwind: '$student' }
  ]);
};
