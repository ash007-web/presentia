import { Timetable, Override } from '../models/index.js';

export const getCurrentTimetableInfo = async () => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric',
    weekday: 'long',
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  const p = {};
  parts.forEach(({ type, value }) => { p[type] = value; });
  
  let hour = parseInt(p.hour, 10);
  if (hour === 24) hour = 0;

  const todayName = p.weekday;
  const currentMinutes = hour * 60 + parseInt(p.minute, 10);

  const y = p.year;
  const m = p.month.padStart(2, '0');
  const d = p.day.padStart(2, '0');
  
  const startOfDay = new Date(`${y}-${m}-${d}T00:00:00+05:30`);
  const endOfDay = new Date(`${y}-${m}-${d}T23:59:59+05:30`);

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
