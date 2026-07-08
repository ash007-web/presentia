import api from './api';

export const getAnalyticsOverview = async () => {
  const res = await api.get('/analytics/overview');
  return res.data || {};
};

export const getFacultyAnalytics = async () => {
  const res = await api.get('/analytics/faculty');
  return res.data || [];
};

export const getSubjectAnalytics = async () => {
  const res = await api.get('/analytics/subjects');
  return res.data || [];
};

export const getStudentAnalytics = async () => {
  const res = await api.get('/analytics/students');
  return res.data || [];
};
