import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/index.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();

// Middleware
app.use(cors());
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
