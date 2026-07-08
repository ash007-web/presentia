import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/index.js';
import errorHandler from './middleware/errorHandler.js';

import connectDB from './config/db.js';

const app = express();

// Ensure DB is connected for serverless environments
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
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
    message: "Presentia Backend Running"
  });
});

// Mount Routes
app.use('/api', apiRoutes);

// Error Handling Middleware
app.use(errorHandler);

export default app;
