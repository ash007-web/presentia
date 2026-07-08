import Joi from 'joi';

export const updateSettings = {
  body: Joi.object().keys({
    // DB field names
    defaultDuration: Joi.number(),
    currentCycle: Joi.alternatives().try(Joi.string(), Joi.object(), Joi.allow(null)),
    defaultFaculty: Joi.string(),
    feedbackChips: Joi.array().items(Joi.string()),
    negativeChips: Joi.array().items(Joi.string()),
    animationMode: Joi.string().valid('full', 'reduced', 'none'),
    bellEnabled: Joi.boolean(),
    bellSound: Joi.string().valid('none', 'chime', 'bell', 'beep'),
    volume: Joi.number().min(0).max(100),
    warningThreshold: Joi.number().min(5).max(120),
    criticalThreshold: Joi.number().min(5).max(60),
    warnTone: Joi.boolean(),
    alarmTone: Joi.boolean(),
  }).min(1).options({ stripUnknown: true }),
};
