import api from './api';

export const getTimetable = async () => {
  const res = await api.get('/timetables');
  const arr = res.data?.timetables || [];
  const formatted: any = { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [] };
  arr.forEach((t: any) => {
    if (formatted[t.day]) formatted[t.day] = t.periods || [];
  });
  return formatted;
};

export const saveTimetableDay = async (day: string, periods: any[]) => {
  const res = await api.post('/timetables', { day, periods });
  return res.data;
};

export const getSubjectFaculty = async (): Promise<Record<string, string>> => {
  const tt = await getTimetable();
  const map: Record<string, string> = {};
  Object.values(tt).forEach((dayPeriods: any) => {
    dayPeriods.forEach((p: any) => {
      if (p.subject && p.faculty) map[p.subject] = p.faculty;
    });
  });
  return map;
};

export const getTodayOverrides = async () => {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const res = await api.get(`/overrides?date=${dateStr}`);
  return res.data?.overrides || [];
};

export const createOverride = async (periodIndex: number, subject: string, faculty: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const res = await api.post('/overrides', { date: today.toISOString(), periodIndex, subject, faculty });
  return res.data?.override || null;
};

export const deleteOverride = async (id: string) => {
  await api.delete(`/overrides/${id}`);
};

export const getCurrentTimetableInfo = async () => {
  const res = await api.get('/timetable/current');
  return res.data || {};
};
