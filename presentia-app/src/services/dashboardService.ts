import api from './api';

export const getDashboardStats = async () => {
  const response = await api.get('/dashboard');
  return response;
};

export const getWeeklyTrend = async () => {
  // Get presentations for each day of the current week
  const res = await api.get('/presentations?status=Completed&limit=1000&sort=presentationDate');
  const presentations = res.data?.presentations || [];
  
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sun
  // Build Monday-based week
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);

  const counts = days.map((_, i) => {
    const dayStart = new Date(monday);
    dayStart.setDate(monday.getDate() + i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayStart.getDate() + 1);
    return presentations.filter((p: any) => {
      const d = new Date(p.presentationDate || p.createdAt);
      return d >= dayStart && d < dayEnd;
    }).length;
  });

  const todayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const total = counts.reduce((a, b) => a + b, 0);
  
  return { counts, labels: days, todayIndex, total };
};
