import api from './api';

export const getSettings = async () => {
  const res = await api.get('/settings');
  return res.data?.settings || null;
};

export const updateSettings = async (data: Record<string, any>) => {
  const res = await api.patch('/settings', data);
  return res.data?.settings || null;
};

export const getCycles = async () => {
  const res = await api.get('/cycles');
  return res.data?.cycles || [];
};

export const startNewCycle = async (cycleNumber: number, semester: string) => {
  const res = await api.post('/cycles/start-new', { cycleNumber, semester });
  return res.data;
};

export const archiveCycle = async (cycleId: string) => {
  const res = await api.post('/cycles/archive', { cycleId });
  return res.data;
};

export const resetCycle = async (cycleId: string) => {
  const res = await api.post('/cycles/reset', { cycleId });
  return res.data;
};

export const deleteCycleData = async (cycleId: string) => {
  const res = await api.delete(`/cycles/${cycleId}`);
  return res.data;
};

export const renameCycle = async (cycleId: string, data: any) => {
  const res = await api.patch(`/cycles/${cycleId}`, data);
  return res.data;
};
