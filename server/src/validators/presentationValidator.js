import Joi from 'joi';

export const createPresentation = {
  body: Joi.object().keys({
    student: Joi.string().required(),
    cycle: Joi.string().required(),
    subject: Joi.string().required(),
    faculty: Joi.string().required(),
    presentationTitle: Joi.string().allow('', null),
    status: Joi.string().valid('Pending', 'Completed', 'Skipped', 'Absent'),
    presentationOrder: Joi.number(),
  }),
};

export const updatePresentation = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
  body: Joi.object().keys({
    student: Joi.string(),
    cycle: Joi.string(),
    subject: Joi.string(),
    faculty: Joi.string(),
    presentationTitle: Joi.string().allow('', null),
    status: Joi.string().valid('Pending', 'Completed', 'Skipped', 'Absent'),
    overallRating: Joi.number().min(1).max(5).allow(null),
    actualDuration: Joi.number().allow(null),
    feedbackTags: Joi.array().items(Joi.string()),
    feedback: Joi.string().allow('', null),
    presentationDate: Joi.date().allow(null),
    presentationOrder: Joi.number(),
  }).min(1),
};
