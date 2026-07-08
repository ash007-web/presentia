import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response Interceptor for global error handling
api.interceptors.response.use(
  (response) => {
    // We expect the backend to return { status: 'success', data: { ... } }
    // We can extract and return the inner data to keep services clean
    if (response.data && response.data.status === 'success') {
      return response.data;
    }
    return response;
  },
  (error) => {
    // Format error message to be standard for frontend
    const message = error.response?.data?.message || error.message || 'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

export default api;
