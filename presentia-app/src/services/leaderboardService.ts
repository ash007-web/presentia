import api from './api';

export const getLeaderboard = async (type: 'current' | 'overall' = 'current') => {
  const res = await api.get(`/leaderboard/${type}`);
  return res.data?.leaderboard || [];
};

export const getLeaderboardWithHistory = async (type: 'current' | 'overall' = 'current') => {
  // Fetch leaderboard and per-student presentation history for sparklines
  const [leaderboard, presentations] = await Promise.all([
    getLeaderboard(type),
    api.get('/presentations?status=Completed&sort=presentationDate&limit=1000').then(r => r.data?.presentations || [])
  ]);

  // Build per-student rating history from the presentations list
  const historyMap: Record<string, number[]> = {};
  presentations.forEach((p: any) => {
    const sid = p.student?._id || p.student;
    if (sid && p.overallRating) {
      if (!historyMap[sid]) historyMap[sid] = [];
      historyMap[sid].push(p.overallRating);
    }
  });

  return leaderboard.map((l: any) => ({
    ...l,
    name: l.student?.name || 'Unknown',
    rollNo: l.student?.rollNo || '',
    count: l.presentationsCount || 0,
    ratingHistory: historyMap[l._id] || [l.averageRating]
  }));
};

export const exportLeaderboardData = async (type: 'current' | 'overall', search: string) => {
  const res = await api.get('/leaderboard/export', {
    params: { type, search },
    responseType: 'blob'
  });
  const disposition = res.headers['content-disposition'];
  let filename = 'Leaderboard_Export.xlsx';
  if (disposition && disposition.includes('filename="')) {
    filename = disposition.split('filename="')[1].split('"')[0];
  }
  return { blob: res.data, filename };
};
