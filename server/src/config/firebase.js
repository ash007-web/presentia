import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let db;

const initFirebase = () => {
  if (getApps().length > 0) {
    db = getFirestore();
    return db;
  }

  // Priority 1: serviceAccountKey.json in server/ directory
  const defaultKeyPath = resolve(__dirname, '../../serviceAccountKey.json');

  // Priority 2: GOOGLE_APPLICATION_CREDENTIALS env var (path to service account)
  const envKeyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  const keyPath = existsSync(defaultKeyPath) 
    ? defaultKeyPath 
    : (envKeyPath && existsSync(envKeyPath) ? envKeyPath : null);

  if (keyPath) {
    const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
    initializeApp({ credential: cert(serviceAccount) });
    console.log('Firebase Admin SDK initialized with service account ✓');
  } else if (process.env.FIREBASE_PROJECT_ID) {
    // Priority 3: Application Default Credentials (gcloud auth / GCP environment)
    // Works on GCP Cloud Run, App Engine, etc.
    initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
    console.log(`Firebase Admin SDK initialized with ADC (project: ${process.env.FIREBASE_PROJECT_ID}) ✓`);
  } else {
    const msg = [
      '',
      '══════════════════════════════════════════════════════',
      '❌  Firebase Admin SDK initialization failed.',
      '',
      '   To fix this, do ONE of the following:',
      '   1. Download serviceAccountKey.json from Firebase Console',
      '      → Project Settings → Service Accounts → Generate new private key',
      '      → Place it at: server/serviceAccountKey.json',
      '',
      '   2. Set GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json in .env',
      '',
      '   3. Run in a GCP environment with default credentials and set FIREBASE_PROJECT_ID',
      '══════════════════════════════════════════════════════',
    ].join('\n');
    console.error(msg);
    process.exit(1);
  }

  db = getFirestore();
  return db;
};

// Initialize immediately on import
initFirebase();

export { db };
export default db;
