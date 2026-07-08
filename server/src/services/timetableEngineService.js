import { Timetable, Override } from '../models/index.js';

export const getCurrentTimetableInfo = async () => {
  const now = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = dayNames[now.getDay()];
  
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const { Settings } = await import('../models/index.js');
  const settings = await Settings.findOne({ singletonKey: 'GLOBAL_SETTINGS' });
  const defaultFaculty = settings ? settings.defaultFaculty : 'Navyamol K T';

  const timetable = await Timetable.findOne({ day: todayName });
  if (!timetable) return { day: todayName, activePeriod: null, periods: [], defaultFaculty };

  for (const period of timetable.periods) {
    const [startH, startM] = period.startTime.split(':').map(Number);
    const [endH, endM] = period.endTime.split(':').map(Number);
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;

    if (currentMinutes >= startMins && currentMinutes <= endMins) {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      const override = await Override.findOne({
        date: { $gte: startOfDay, $lte: endOfDay },
        periodIndex: period.periodIndex
      });

      let nextPeriod = null;
      if (period.periodIndex + 1 < timetable.periods.length) {
        const np = timetable.periods[period.periodIndex + 1];
        const nextOverride = await Override.findOne({
          date: { $gte: startOfDay, $lte: endOfDay },
          periodIndex: np.periodIndex
        });
        nextPeriod = {
          periodIndex: np.periodIndex,
          startTime: np.startTime,
          endTime: np.endTime,
          subject: nextOverride ? nextOverride.subject : np.subject,
          faculty: nextOverride ? nextOverride.faculty : np.faculty,
        };
      }

      return {
        day: todayName,
        activePeriod: {
          periodIndex: period.periodIndex,
          startTime: period.startTime,
          endTime: period.endTime,
          subject: override ? override.subject : period.subject,
          faculty: override ? override.faculty : period.faculty,
          isOverridden: !!override
        },
        nextPeriod,
        periods: timetable.periods,
        defaultFaculty
      };
    }
  }

  // If no active period, maybe find the next upcoming one
  let nextPeriod = null;
  for (const period of timetable.periods) {
    const [startH, startM] = period.startTime.split(':').map(Number);
    const startMins = startH * 60 + startM;
    if (startMins > currentMinutes) {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      const nextOverride = await Override.findOne({
        date: { $gte: startOfDay, $lte: endOfDay },
        periodIndex: period.periodIndex
      });
      nextPeriod = {
        periodIndex: period.periodIndex,
        startTime: period.startTime,
        endTime: period.endTime,
        subject: nextOverride ? nextOverride.subject : period.subject,
        faculty: nextOverride ? nextOverride.faculty : period.faculty,
      };
      break;
    }
  }

  return { day: todayName, activePeriod: null, nextPeriod, periods: timetable.periods, defaultFaculty };
};
