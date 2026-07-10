import axios from 'axios';

// In production (Vercel), use relative URL to hit the API on the same domain
// In development, use the env variable or default to localhost
const getBaseURL = () => {
  if (import.meta.env.PROD) {
    return '/api';
  }
  return import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api';
};

export const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});
