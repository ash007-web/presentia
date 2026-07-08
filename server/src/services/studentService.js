import { Student } from '../models/index.js';

export const createStudent = async (data) => {
  return await Student.create(data);
};

export const getStudents = async (query) => {
  const { search, page = 1, limit = 10, sort = 'rollNo', ...filters } = query;
  const filterQuery = { ...filters };

  if (search) {
    filterQuery.$or = [
      { name: { $regex: search, $options: 'i' } },
      { rollNo: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;

  const pipeline = [
    { $match: filterQuery },
    {
      $lookup: {
        from: 'presentations',
        let: { studentId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$student', '$$studentId'] } } },
          { $sort: { presentationDate: -1 } },
          { $limit: 1 }
        ],
        as: 'recentPresentation'
      }
    },
    { $unwind: { path: '$recentPresentation', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        rollNo: 1, name: 1, admissionNo: 1,
        title: { $ifNull: ['$recentPresentation.presentationTitle', 'No presentation'] },
        status: { $ifNull: ['$recentPresentation.status', 'Pending'] },
        overallRating: '$recentPresentation.overallRating',
        subject: '$recentPresentation.subject',
        faculty: '$recentPresentation.faculty',
        duration: '$recentPresentation.actualDuration',
        cycle: '$recentPresentation.cycle'
      }
    },
    { $sort: { rollNo: 1 } },
    { $skip: skip },
    { $limit: Number(limit) }
  ];

  const students = await Student.aggregate(pipeline).collation({ locale: 'en', numericOrdering: true });
  
  const total = await Student.countDocuments(filterQuery);

  return { students, total, page: Number(page), limit: Number(limit) };
};

export const getStudentById = async (id) => {
  return await Student.findById(id);
};

export const updateStudent = async (id, data) => {
  return await Student.findByIdAndUpdate(id, data, { new: true, runValidators: true });
};

export const deleteStudent = async (id) => {
  return await Student.findByIdAndDelete(id);
};

export const getStudentsOverview = async (cycleId) => {
  const pipeline = [];

  const lookupMatch = cycleId ? { $expr: { $eq: ['$cycle', { $toObjectId: cycleId }] } } : {};

  pipeline.push(
    {
      $lookup: {
        from: 'presentations',
        let: { studentId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$student', '$$studentId'] }, ...lookupMatch } },
          { $sort: { presentationDate: -1 } },
          { $limit: 1 }
        ],
        as: 'recentPresentation'
      }
    },
    {
      $unwind: {
        path: '$recentPresentation',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $project: {
        rollNo: 1,
        name: 1,
        admissionNo: 1,
        presentationTitle: { $ifNull: ['$recentPresentation.presentationTitle', 'No presentation'] },
        status: { $ifNull: ['$recentPresentation.status', 'Pending'] },
        overallRating: '$recentPresentation.overallRating'
      }
    },
    { $sort: { rollNo: 1 } }
  );

  const results = await Student.aggregate(pipeline).collation({ locale: 'en', numericOrdering: true });
  return results;
};
