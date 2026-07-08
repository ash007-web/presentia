import api from './api';

export const getCurrentState = async () => {
  return await api.get('/presentation/current');
};

export const getSession = async () => {
  return await api.get('/session');
};

export const getQueue = async () => {
  return await api.get('/presentation/queue');
};

export const startPresentation = async (studentId?: string) => {
  return await api.post('/presentation/start', { studentId });
};

export const pausePresentation = async () => {
  return await api.post('/presentation/pause');
};

export const resumePresentation = async () => {
  return await api.post('/presentation/resume');
};

export const finishPresentation = async () => {
  return await api.post('/presentation/finish');
};

export const submitEvaluation = async (evaluationData: { overallRating: number; feedback?: string; presentationTitle?: string; status?: string; feedbackTags?: string[] }) => {
  return await api.post('/presentation/evaluate', evaluationData);
};

export const skipPresentation = async (studentId?: string) => {
  return await api.post('/presentation/skip', { studentId });
};

export const markAbsent = async (studentId?: string) => {
  return await api.post('/presentation/absent', { studentId });
};

export const getRecentPresentations = async () => {
  const response = await api.get('/presentations?status=Completed&sort=-updatedAt&limit=5');
  return response;
};

export const overrideActiveStudent = async (studentId: string) => {
  return await api.post('/presentation/override-active', { studentId });
};

export const skipEvaluation = async () => {
  return await api.post('/presentation/skip-evaluation');
};

export const resetSession = async () => {
  return await api.post('/presentation/reset-session');
};

