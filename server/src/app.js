import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/index.js';
import errorHandler from './middleware/errorHandler.js';

// Initialize Firebase Admin SDK (Firestore) on startup
import './config/firebase.js';

const app = express();

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Health route
app.get('/', (req, res) => {
  res.json({
    status: "ok",
    message: "Presentia Backend Running (Firestore)"
  });
});

// Mount Routes
app.use('/api', apiRoutes);

// Error Handling Middleware
app.use(errorHandler);

export default app;
