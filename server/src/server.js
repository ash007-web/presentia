import dotenv from 'dotenv';
import connectDB from './config/db.js';
import app from './app.js';

// Load env vars
dotenv.config();

// Connect to MongoDB
connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
