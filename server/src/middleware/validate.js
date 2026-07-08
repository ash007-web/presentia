import Joi from 'joi';
import AppError from '../utils/AppError.js';

const validate = (schema) => (req, res, next) => {
  const validSchema = Joi.object(schema);
  const object = {};
  
  if (Object.keys(req.params).length) object.params = req.params;
  if (Object.keys(req.query).length) object.query = req.query;
  if (Object.keys(req.body).length) object.body = req.body;

  const { value, error } = validSchema.validate(object, { abortEarly: false });

  if (error) {
    const errorMessage = error.details.map((details) => details.message).join(', ');
    return next(new AppError(errorMessage, 400));
  }
  
  Object.assign(req, value);
  return next();
};

export default validate;
