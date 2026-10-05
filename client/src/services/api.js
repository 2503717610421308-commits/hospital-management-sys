import axios from 'axios';

const API_URL = 'http://localhost:5000/api'; 

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const token = localStorage.getItem('token') || user?.token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// ==================== API FUNCTIONS ====================
export const loginUser = (data) => api.post('/auth/login', data);
export const registerUser = (data) => api.post('/auth/register', data);

// Dashboard data fetches
export const getAppointments = () => api.get('/appointments');
export const getMedicalRecords = () => api.get('/medical-records');
export const getPrescriptions = () => api.get('/prescriptions');
export const getPendingBills = () => api.get('/bills');

export default api;
