import { Cycle, Presentation, Settings } from '../models/index.js';

export const createCycle = async (data) => {
  return await Cycle.create(data);
};

export const getCycles = async (query) => {
  const { semester, sort = '-cycleNumber' } = query;
  const filterQuery = {};
  if (semester) filterQuery.semester = semester;
  return await Cycle.find(filterQuery, sort);
};

export const getCycleById = async (id) => {
  return await Cycle.findById(id);
};

export const updateCycle = async (id, data) => {
  return await Cycle.findByIdAndUpdate(id, data, { new: true });
};

export const deleteCycle = async (id) => {
  const totalCycles = await Cycle.countDocuments();
  if (totalCycles <= 1) {
    throw new Error('Cannot delete the only remaining cycle.');
  }

  const cycle = await Cycle.findById(id);
  if (!cycle) return null;

  // Delete all presentations in this cycle
  await Presentation.deleteMany({ cycleId: id });
  await Cycle.findByIdAndDelete(id);

  // If deleted cycle was current, reassign
  const settings = await Settings.findOne({ singletonKey: 'GLOBAL_SETTINGS' });
  if (settings && settings.currentCycleId === id) {
    const remainingCycles = await Cycle.find({}, '-cycleNumber');
    const newCycleId = remainingCycles.length > 0 ? remainingCycles[0].id : null;
    await Settings.updateDoc({ currentCycleId: newCycleId });
  }

  return cycle;
};
