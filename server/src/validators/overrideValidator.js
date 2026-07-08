import Joi from 'joi';

export const createOverride = {
  body: Joi.object().keys({
    date: Joi.date().required(),
    periodIndex: Joi.number().required(),
    subject: Joi.string().required(),
    faculty: Joi.string().required(),
  }),
};

export const updateOverride = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
  body: Joi.object().keys({
    date: Joi.date(),
    periodIndex: Joi.number(),
    subject: Joi.string(),
    faculty: Joi.string(),
  }).min(1),
};
