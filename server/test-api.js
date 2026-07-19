import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';
const results = {
  passed: [],
  failed: [],
};

async function runTest(name, method, url, data = null) {
  try {
    const response = await axios({
      method,
      url: `${BASE_URL}${url}`,
      data,
      validateStatus: () => true // Resolve all promises regardless of status
    });

    if (response.status >= 200 && response.status < 300) {
      results.passed.push({ name, status: response.status });
      console.log(`✅ [PASS] ${name} (${response.status})`);
      return response.data;
    } else {
      results.failed.push({ name, status: response.status, data: response.data });
      console.log(`❌ [FAIL] ${name} (${response.status}) - ${JSON.stringify(response.data)}`);
      return null;
    }
  } catch (err) {
    results.failed.push({ name, error: err.message });
    console.log(`❌ [ERROR] ${name} - ${err.message}`);
    return null;
  }
}

async function runAllTests() {
  console.log('🚀 Starting API Tests...\n');

  // 1. Settings
  let settings = await runTest('GET Settings', 'get', '/settings');
  await runTest('UPDATE Settings', 'patch', '/settings', { defaultDuration: 130 });

  // 2. Cycles
  let cycles = await runTest('GET Cycles', 'get', '/cycles');
  let newCycle = await runTest('CREATE Cycle', 'post', '/cycles', { cycleNumber: 2, semester: 'Spring 2027', startDate: new Date() });
  if (newCycle && newCycle.data && newCycle.data.cycle) {
      let cycleId = newCycle.data.cycle.id;
      await runTest('GET Cycle By ID', 'get', `/cycles/${cycleId}`);
      await runTest('UPDATE Cycle', 'patch', `/cycles/${cycleId}`, { semester: 'Summer 2027' });
      await runTest('DELETE Cycle', 'delete', `/cycles/${cycleId}`);
  }

  // 3. Students
  let students = await runTest('GET Students', 'get', '/students?limit=5');
  let newStudent = await runTest('CREATE Student', 'post', '/students', { rollNo: '999', name: 'Test Student', admissionNo: '00000' });
  if (newStudent && newStudent.data && newStudent.data.student) {
      let studentId = newStudent.data.student.id;
      await runTest('GET Student By ID', 'get', `/students/${studentId}`);
      await runTest('UPDATE Student', 'patch', `/students/${studentId}`, { title: 'Test Title' });
      await runTest('DELETE Student', 'delete', `/students/${studentId}`);
  }

  // 4. Timetables
  await runTest('GET Timetables', 'get', '/timetables');
  await runTest('GET Timetable By Day', 'get', '/timetables/Monday');
  let newTimetable = await runTest('CREATE Timetable', 'post', '/timetables', { day: 'Sunday', periods: [{ periodIndex: 0, startTime: "10:00", endTime: "11:00", subject: "Test", faculty: "Test" }]});
  await runTest('DELETE Timetable', 'delete', '/timetables/Sunday');

  // 5. Overrides
  await runTest('GET Overrides', 'get', '/overrides');
  let newOverride = await runTest('CREATE Override', 'post', '/overrides', { date: new Date(), periodIndex: 0, subject: 'Override Sub', faculty: 'Override Fac' });
  if (newOverride && newOverride.data && newOverride.data.override) {
      let overrideId = newOverride.data.override.id;
      await runTest('GET Override By ID', 'get', `/overrides/${overrideId}`);
      await runTest('UPDATE Override', 'patch', `/overrides/${overrideId}`, { subject: 'Updated Sub' });
      await runTest('DELETE Override', 'delete', `/overrides/${overrideId}`);
  }

  // 6. Presentations
  let presentations = await runTest('GET Presentations', 'get', '/presentations');
  let activeStudentId = students?.data?.students?.[0]?.id || 'fake-id';
  let activeCycleId = cycles?.data?.cycles?.[0]?.id || 'fake-id';
  let newPresentation = await runTest('CREATE Presentation', 'post', '/presentations', { student: activeStudentId, cycle: activeCycleId, subject: 'Test', faculty: 'Test', presentationTitle: 'Title' });
  if (newPresentation && newPresentation.data && newPresentation.data.presentation) {
      let presId = newPresentation.data.presentation.id;
      await runTest('GET Presentation By ID', 'get', `/presentations/${presId}`);
      await runTest('UPDATE Presentation', 'patch', `/presentations/${presId}`, { overallRating: 5 });
      await runTest('DELETE Presentation', 'delete', `/presentations/${presId}`);
  }

  // 7. Intelligence Engine / Workflow
  await runTest('GET Dashboard', 'get', '/dashboard');
  await runTest('GET Session', 'get', '/session');
  await runTest('GET Queue', 'get', '/presentation/queue');
  await runTest('GET Current Workflow', 'get', '/presentation/current');
  
  // To test the intelligence flow, we must have an active period right now.
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = days[new Date().getDay()];
  
  // Format current time "HH:MM"
  const now = new Date();
  const startTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  // End time 1 hour from now
  const endTime = `${String((now.getHours() + 1) % 24).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  await runTest('CREATE Active Timetable (For Test)', 'post', '/timetables', {
      day: today,
      periods: [{
          periodIndex: 0,
          startTime: startTime,
          endTime: endTime,
          subject: "Test Subject",
          faculty: "Test Faculty"
      }]
  });

  // Test Intelligence Flow
  await runTest('RESET Session (Pre-test)', 'post', '/presentation/reset-session');
  
  let startRes = await runTest('START Presentation', 'post', '/presentation/start', { studentId: activeStudentId });
  // Allow a moment for state to settle
  await new Promise(r => setTimeout(r, 500));
  
  await runTest('PAUSE Presentation', 'post', '/presentation/pause');
  await runTest('RESUME Presentation', 'post', '/presentation/resume');
  await runTest('FINISH Presentation', 'post', '/presentation/finish');
  
  await runTest('EVALUATE Presentation', 'post', '/presentation/evaluate', {
      overallRating: 4,
      feedbackTags: ['Good'],
      feedback: 'Nice job',
      status: 'Completed'
  });

  // 8. Analytics & Leaderboard
  await runTest('GET Analytics Overview', 'get', '/analytics/overview');
  await runTest('GET Analytics Faculty', 'get', '/analytics/faculty');
  await runTest('GET Analytics Subjects', 'get', '/analytics/subjects');
  await runTest('GET Analytics Students', 'get', '/analytics/students');
  await runTest('GET Leaderboard Current', 'get', '/leaderboard/current');
  await runTest('GET Leaderboard Overall', 'get', '/leaderboard/overall');

  console.log('\n📊 Test Summary:');
  console.log(`Passed: ${results.passed.length}`);
  console.log(`Failed: ${results.failed.length}`);

  if (results.failed.length > 0) {
      console.log('\n❌ Failed Tests:');
      results.failed.forEach(f => console.log(`- ${f.name} (${f.status || f.error})`));
  }
}

runAllTests();
