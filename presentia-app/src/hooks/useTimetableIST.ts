import { useState, useEffect } from 'react';
import { getTimetable, getTodayOverrides } from '../services/timetableService';

const PERIODS = [
  '08:45 – 09:45',
  '09:45 – 10:45',
  '11:00 – 12:00',
  '12:00 – 13:00',
  '14:00 – 15:00',
  '15:00 – 16:00',
  '16:00 – 17:00'
];

export const useTimetableIST = () => {
  const [tt, setTt] = useState<Record<string, any[]>>({});
  const [overrides, setOverrides] = useState<any[]>([]);
  const [activePeriod, setActivePeriod] = useState<any>(null);
  const [nextPeriod, setNextPeriod] = useState<any>(null);
  const [currentFaculty, setCurrentFaculty] = useState<string>('Navyamol K T');
  const [currentSubject, setCurrentSubject] = useState<string>('');
  const [todayStr, setTodayStr] = useState<string>('');
  const [activePeriodIndex, setActivePeriodIndex] = useState<number>(-1);

  const fetchTimetableData = async () => {
    try {
      const [ttData, ovData] = await Promise.all([
        getTimetable(),
        getTodayOverrides()
      ]);
      setTt(ttData);
      setOverrides(ovData);
    } catch (err) {
      console.error('Failed to load timetable in hook', err);
    }
  };

  useEffect(() => {
    fetchTimetableData();
    const interval = setInterval(fetchTimetableData, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (Object.keys(tt).length === 0) return;

    const calculateIST = () => {
      const istString = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
      const istDate = new Date(istString);
      const dayStr = istDate.toLocaleDateString('en-US', { weekday: 'long' });
      const currentMinutes = istDate.getHours() * 60 + istDate.getMinutes();

      setTodayStr(dayStr);

      const overrideMap: Record<number, any> = {};
      overrides.forEach(ov => { overrideMap[ov.periodIndex] = ov; });

      const todayPeriods = tt[dayStr] || [];
      let calculatedActiveIndex = -1;
      let calculatedActivePeriod: any = null;
      let calculatedNextPeriod: any = null;

      for (let i = 0; i < PERIODS.length; i++) {
        const [startStr, endStr] = PERIODS[i].split(' – ');
        const [sh, sm] = startStr.split(':').map(Number);
        const [eh, em] = endStr.split(':').map(Number);
        const startMins = sh * 60 + sm;
        const endMins = eh * 60 + em;
        if (currentMinutes >= startMins && currentMinutes < endMins) {
          calculatedActiveIndex = i;
          break;
        }
      }

      const resolvePeriodData = (index: number) => {
        if (index < 0 || index >= PERIODS.length) return null;
        const [startStr, endStr] = PERIODS[index].split(' – ');
        const origP = todayPeriods[index] || {};
        const ov = overrideMap[index];
        const subject = ov ? ov.subject : (origP.subject || '');
        const faculty = ov ? ov.faculty : (origP.faculty || '');
        if (!subject) return null;
        return { periodIndex: index, subject, faculty, startTime: startStr, endTime: endStr };
      };

      calculatedActivePeriod = resolvePeriodData(calculatedActiveIndex);

      if (calculatedActiveIndex !== -1) {
        for (let i = calculatedActiveIndex + 1; i < PERIODS.length; i++) {
          const p = resolvePeriodData(i);
          if (p) { calculatedNextPeriod = p; break; }
        }
      } else {
        for (let i = 0; i < PERIODS.length; i++) {
          const [startStr] = PERIODS[i].split(' – ');
          const [sh, sm] = startStr.split(':').map(Number);
          if (currentMinutes < sh * 60 + sm) {
            const p = resolvePeriodData(i);
            if (p) { calculatedNextPeriod = p; break; }
          }
        }
      }

      setActivePeriodIndex(calculatedActiveIndex);
      setActivePeriod(calculatedActivePeriod);
      setNextPeriod(calculatedNextPeriod);
      setCurrentFaculty(calculatedActivePeriod?.faculty || 'Navyamol K T');
      setCurrentSubject(calculatedActivePeriod?.subject || '');
    };

    calculateIST();
    const tick = setInterval(calculateIST, 5000); // Check time every 5 seconds
    return () => clearInterval(tick);
  }, [tt, overrides]);

  return {
    tt,
    overrides,
    todayStr,
    activePeriodIndex,
    activePeriod,
    nextPeriod,
    currentFaculty,
    currentSubject,
    reloadTimetable: fetchTimetableData,
    setTt,
    setOverrides
  };
};
