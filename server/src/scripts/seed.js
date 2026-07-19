import dotenv from 'dotenv';
dotenv.config();

import '../config/firebase.js';
import { Student, Presentation, Timetable, Settings, Cycle, Override } from '../models/index.js';
import { db } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';

const deleteCollection = async (colName) => {
  const snap = await db.collection(colName).get();
  if (snap.empty) return;
  const BATCH_SIZE = 400;
  for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    snap.docs.slice(i, i + BATCH_SIZE).forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
};

const seedData = async () => {
  try {
    console.log('Firestore connected. Starting Seed Process...');

    // 1. CYCLE
    await deleteCollection('cycles');
    const cycle1 = await Cycle.create({
      cycleNumber: 1,
      semester: 'Fall 2026',
      startDate: new Date(),
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
    });
    console.log('✅ Cycle 1 created, id:', cycle1.id);

    // 2. SETTINGS
    await deleteCollection('settings');
    await Settings.create({
      singletonKey: 'GLOBAL_SETTINGS',
      defaultDuration: 120,
      currentCycleId: cycle1.id,
      currentCycle: cycle1.id, // compatibility alias
      animationMode: 'full',
      bellEnabled: true,
    });
    console.log('✅ Settings initialized (2 min duration, animation full, bell enabled)');

    // 3. TIMETABLE
    await deleteCollection('timetables');
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const timings = [
      { startTime: '08:45', endTime: '09:45' },
      { startTime: '09:45', endTime: '10:45' },
      { startTime: '11:00', endTime: '12:00' },
      { startTime: '12:00', endTime: '13:00' },
      { startTime: '14:00', endTime: '15:00' },
      { startTime: '15:00', endTime: '16:00' },
      { startTime: '16:00', endTime: '17:00' },
    ];

    const schedules = {
      Monday: [
        { subject: '24INMCAT305', faculty: 'Navyamol K T' },
        { subject: '24INMCAT301', faculty: 'Linu Tess Antony' },
        { subject: '24INMCAT307', faculty: 'Merin Chacko' },
        { subject: '24INMCAT303', faculty: 'Ann Mary Thomas' },
        { subject: '24INMCAL391', faculty: 'Rony Tom & Navyamol K T' },
        { subject: '24INMCAL391', faculty: 'Rony Tom & Navyamol K T' },
        { subject: '24INMCAL391', faculty: 'Rony Tom & Navyamol K T' },
      ],
      Tuesday: [
        { subject: '24INMCAT309', faculty: 'Jincy Sebastian' },
        { subject: '24INMCAT303', faculty: 'Ann Mary Thomas' },
        { subject: '24INMCAT301', faculty: 'Linu Tess Antony' },
        { subject: '24INMCAT305', faculty: 'Navyamol K T' },
        { subject: '24INMCAT305', faculty: 'Navyamol K T' },
        { subject: 'P100', faculty: 'Navyamol K T' },
        { subject: '', faculty: '' },
      ],
      Wednesday: [
        { subject: '24INMCAT301', faculty: 'Linu Tess Antony' },
        { subject: '24INMCAT307', faculty: 'Merin Chacko' },
        { subject: '24INMCAL393', faculty: 'Navyamol K T & Ann Mary Thomas' },
        { subject: '24INMCAL393', faculty: 'Navyamol K T & Ann Mary Thomas' },
        { subject: '24INMCAT309', faculty: 'Jincy Sebastian' },
        { subject: '24INMCAT303', faculty: 'Ann Mary Thomas' },
        { subject: '', faculty: '' },
      ],
      Thursday: [
        { subject: '24INMCAL391', faculty: 'Rony Tom & Navyamol K T' },
        { subject: '24INMCAL391', faculty: 'Rony Tom & Navyamol K T' },
        { subject: '24INMCAT309', faculty: 'Jincy Sebastian' },
        { subject: '24INMCAT307', faculty: 'Merin Chacko' },
        { subject: '24INMCAT303', faculty: 'Ann Mary Thomas' },
        { subject: '24INMCAT305', faculty: 'Navyamol K T' },
        { subject: '', faculty: '' },
      ],
      Friday: [
        { subject: '24INMCAT307', faculty: 'Merin Chacko' },
        { subject: '24INMCAT309', faculty: 'Jincy Sebastian' },
        { subject: '24INMCAL393', faculty: 'Navyamol K T & Ann Mary Thomas' },
        { subject: '24INMCAL393', faculty: 'Navyamol K T & Ann Mary Thomas' },
        { subject: '24INMCAT301', faculty: 'Linu Tess Antony' },
        { subject: 'P100', faculty: 'Navyamol K T' },
        { subject: '', faculty: '' },
      ],
      Saturday: [
        { subject: 'Free Period', faculty: '-' },
        { subject: 'Free Period', faculty: '-' },
        { subject: 'Free Period', faculty: '-' },
        { subject: 'Free Period', faculty: '-' },
        { subject: 'Free Period', faculty: '-' },
        { subject: 'Free Period', faculty: '-' },
        { subject: 'Free Period', faculty: '-' },
      ],
    };

    for (const day of days) {
      const daySchedule = schedules[day];
      const periods = daySchedule.map((p, i) => ({
        periodIndex: i,
        startTime: timings[i].startTime,
        endTime: timings[i].endTime,
        subject: p.subject || 'Free Period',
        faculty: p.faculty || '-',
      }));
      await Timetable.findOneAndUpdate({ day }, { periods }, { new: true, upsert: true });
    }
    console.log('✅ Timetable generated for Monday to Saturday');

    // 4. STUDENTS
    await deleteCollection('students');
    const rosterData = [
      { rollNo: '1', name: 'ADARSH S', admissionNo: '15782' },
      { rollNo: '2', name: 'ADARSH S NARAYANAN', admissionNo: '15783' },
      { rollNo: '3', name: 'ADARSH TOM', admissionNo: '15784' },
      { rollNo: '4', name: 'ADARSH VARGHESE', admissionNo: '15785' },
      { rollNo: '5', name: 'ADHITHYAN K BIJU', admissionNo: '15786' },
      { rollNo: '6', name: 'AKASH MATHEW THOMAS', admissionNo: '15787' },
      { rollNo: '7', name: 'ALAN SEBASTIAN JOSEPH', admissionNo: '15788' },
      { rollNo: '8', name: 'ALBERT SONI', admissionNo: '15789' },
      { rollNo: '9', name: 'ALBIN THOMAS', admissionNo: '15790' },
      { rollNo: '10', name: 'ALLEN JOE CHERIAMADOM', admissionNo: '15791' },
      { rollNo: '11', name: 'ALPHONSA JAUBOY', admissionNo: '15792' },
      { rollNo: '12', name: 'ALPHONSA THOMAS', admissionNo: '15793' },
      { rollNo: '13', name: 'ALWIN SEBASTIAN', admissionNo: '15794' },
      { rollNo: '14', name: 'AMAL JOE BIJU', admissionNo: '15795' },
      { rollNo: '15', name: 'ANN MARY MATHEW', admissionNo: '15796' },
      { rollNo: '16', name: 'ANUGRAH ANIL', admissionNo: '15797' },
      { rollNo: '17', name: 'APARNA SREEJITH', admissionNo: '15798' },
      { rollNo: '18', name: 'ARON V BIJO', admissionNo: '15799' },
      { rollNo: '19', name: 'CHRIS P JOHN', admissionNo: '15800' },
      { rollNo: '20', name: 'CLARE LYZ MATHEW', admissionNo: '15801' },
      { rollNo: '21', name: 'DEEPAK T VINOD', admissionNo: '15803' },
      { rollNo: '22', name: 'DELNA ELIA KURIAN', admissionNo: '15804' },
      { rollNo: '23', name: 'DEVANANDHA P S', admissionNo: '15805' },
      { rollNo: '24', name: 'DEVIKA RAJENDRAN', admissionNo: '15806' },
      { rollNo: '25', name: 'DEVIKA SANOJ', admissionNo: '15807' },
      { rollNo: '26', name: 'DOMIYONA GIGI', admissionNo: '15808' },
      { rollNo: '27', name: 'EDWIN TOM JOSEPH', admissionNo: '15809' },
      { rollNo: '28', name: 'FASILA SATHAR', admissionNo: '15810' },
      { rollNo: '29', name: 'JAKE J MATHEW', admissionNo: '15811' },
      { rollNo: '30', name: 'JILTI THOMAS', admissionNo: '15812' },
      { rollNo: '31', name: 'JIS SAJI', admissionNo: '15813' },
      { rollNo: '32', name: 'JISS CHERIAN', admissionNo: '15814' },
      { rollNo: '33', name: 'JOYAL BOBY', admissionNo: '15816' },
      { rollNo: '34', name: 'KEBIN MANI', admissionNo: '15817' },
      { rollNo: '35', name: 'LIDA ELSA JACOB', admissionNo: '15818' },
      { rollNo: '36', name: 'MARIA SANTY', admissionNo: '15819' },
      { rollNo: '37', name: 'MARIYA JOSEPH', admissionNo: '15820' },
      { rollNo: '38', name: 'MEBIN MARTIN', admissionNo: '15821' },
      { rollNo: '39', name: 'MIDHIL SANTOSH', admissionNo: '15822' },
      { rollNo: '40', name: 'NEERAJ V V', admissionNo: '15823' },
      { rollNo: '41', name: 'NIKHIL S KUMAR', admissionNo: '15824' },
      { rollNo: '42', name: 'NITHIN ROY', admissionNo: '15825' },
      { rollNo: '43', name: 'OUSEPPACHAN SAJU', admissionNo: '15826' },
      { rollNo: '44', name: 'PRATHYUSH K.R', admissionNo: '15827' },
      { rollNo: '45', name: 'R GOKULKRISHNA', admissionNo: '15828' },
      { rollNo: '46', name: 'RICHAN JOSE', admissionNo: '15829' },
      { rollNo: '47', name: 'RICHU FRANCY SEBASTIAN', admissionNo: '15830' },
      { rollNo: '48', name: 'RITTA MARIYA MATHEW', admissionNo: '15831' },
      { rollNo: '49', name: 'SARAN KP', admissionNo: '15834' },
      { rollNo: '50', name: 'SARA PAUL', admissionNo: '15833' },
      { rollNo: '51', name: 'SAVIO SEBASTIAN', admissionNo: '15835' },
      { rollNo: '52', name: 'SAYOOJYA P.', admissionNo: '15836' },
      { rollNo: '53', name: 'SIYA FRANCIS', admissionNo: '15837' },
      { rollNo: '54', name: 'SREELAKSHMI BIJUKUMAR', admissionNo: '15838' },
      { rollNo: '55', name: 'SREYA BIJU', admissionNo: '15839' },
      { rollNo: '56', name: 'TESSA ANNA RINTU', admissionNo: '15840' },
      { rollNo: '57', name: 'THERESSA ROSE MATHEW', admissionNo: '15841' },
    ];

    await Student.insertMany(rosterData);
    console.log(`✅ ${rosterData.length} students inserted from class roster`);

    // 5. PRESENTATIONS & OVERRIDES
    await deleteCollection('presentations');
    await deleteCollection('overrides');
    console.log('✅ Presentations and Overrides cleared (waiting for actual presentations)');

    console.log('\n🎉 Firestore seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during seeding:', err);
    process.exit(1);
  }
};

seedData();
