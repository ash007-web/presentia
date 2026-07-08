import Joi from 'joi';

export const createCycle = {
  body: Joi.object().keys({
    cycleNumber: Joi.number().required(),
    semester: Joi.string().required(),
    startDate: Joi.date(),
    endDate: Joi.date(),
  }),
};

export const updateCycle = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
  body: Joi.object().keys({
    cycleNumber: Joi.number(),
    semester: Joi.string(),
    startDate: Joi.date(),
    endDate: Joi.date(),
  }).min(1),
};
