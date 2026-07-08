import Joi from 'joi';

const periodSchema = Joi.object().keys({
  periodIndex: Joi.number().required(),
  startTime: Joi.string().required(),
  endTime: Joi.string().required(),
  subject: Joi.string().required(),
  faculty: Joi.string().required(),
});

export const createOrUpdateTimetable = {
  body: Joi.object().keys({
    day: Joi.string().valid('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday').required(),
    periods: Joi.array().items(periodSchema).required(),
  }),
};
