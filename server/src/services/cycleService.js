import { Cycle } from '../models/index.js';

export const createCycle = async (data) => {
  return await Cycle.create(data);
};

export const getCycles = async (query) => {
  const { semester, sort = '-cycleNumber' } = query;
  const filterQuery = {};

  if (semester) filterQuery.semester = semester;

  const cycles = await Cycle.find(filterQuery).sort(sort);
  return cycles;
};

export const getCycleById = async (id) => {
  return await Cycle.findById(id);
};

export const updateCycle = async (id, data) => {
  return await Cycle.findByIdAndUpdate(id, data, { new: true, runValidators: true });
};

export const deleteCycle = async (id) => {
  const { Presentation, Settings } = await import('../models/index.js');
  
  const totalCycles = await Cycle.countDocuments();
  if (totalCycles <= 1) {
    throw new Error('Cannot delete the only remaining cycle.');
  }

  const cycle = await Cycle.findById(id);
  if (!cycle) return null;

  await Presentation.deleteMany({ cycle: id });
  await Cycle.findByIdAndDelete(id);

  const settings = await Settings.findOne({ singletonKey: 'GLOBAL_SETTINGS' });
  if (settings && settings.currentCycle && settings.currentCycle.toString() === id.toString()) {
    const remainingCycles = await Cycle.find().sort({ cycleNumber: -1 });
    settings.currentCycle = remainingCycles.length > 0 ? remainingCycles[0]._id : null;
    await settings.save();
  }

  return cycle;
};
