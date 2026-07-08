import Joi from 'joi';

export const createStudent = {
  body: Joi.object().keys({
    rollNo: Joi.string().required(),
    name: Joi.string().required(),
    admissionNo: Joi.string().allow('', null),
    title: Joi.string().allow('', null),
  }),
};

export const updateStudent = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
  body: Joi.object().keys({
    rollNo: Joi.string(),
    name: Joi.string(),
    admissionNo: Joi.string().allow('', null),
    title: Joi.string().allow('', null),
  }).min(1),
};
