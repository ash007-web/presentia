import { Settings, Cycle } from '../models/index.js';

export const getSettings = async () => {
  let settings = await Settings.findOne({ singletonKey: 'GLOBAL_SETTINGS' });
  if (!settings) {
    settings = await Settings.create({ singletonKey: 'GLOBAL_SETTINGS' });
  }
  return settings;
};

export const updateSettings = async (data) => {
  return await Settings.findOneAndUpdate(
    { singletonKey: 'GLOBAL_SETTINGS' },
    data,
    { new: true, upsert: true }
  );
};
