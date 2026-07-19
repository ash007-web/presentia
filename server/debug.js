import { startPresentation } from './src/services/presentationEngineService.js';
import { db } from './src/config/firebase.js';

async function run() {
  try {
    const students = await db.collection('students').limit(1).get();
    const studentId = students.docs[0].id;
    console.log('Testing with student:', studentId);
    
    const res = await startPresentation(studentId);
    console.log('Success:', res);
  } catch (err) {
    console.error('Error occurred:');
    console.error(err.stack);
  } finally {
    process.exit(0);
  }
}

run();
