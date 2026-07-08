import { Settings } from '../models/index.js';

export const getSettings = async () => {
  let settings = await Settings.findOne({ singletonKey: 'GLOBAL_SETTINGS' }).populate('currentCycle');
  if (!settings) {
    settings = await Settings.create({ singletonKey: 'GLOBAL_SETTINGS' });
    settings = await Settings.findOne({ singletonKey: 'GLOBAL_SETTINGS' }).populate('currentCycle');
  }
  return settings;
};

export const updateSettings = async (data) => {
  return await Settings.findOneAndUpdate(
    { singletonKey: 'GLOBAL_SETTINGS' },
    data,
    { new: true, runValidators: true, upsert: true }
  ).populate('currentCycle');
};
