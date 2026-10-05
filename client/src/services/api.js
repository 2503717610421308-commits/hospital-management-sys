import axios from 'axios';

// Backend சர்வரின் முகவரி (உங்களது போர்ட் எண்ணிற்கு ஏற்ப மாற்றிக்கொள்ளலாம்)
const API_URL = 'http://localhost:5000'; 

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request செய்யும் போது யூசரின் டோக்கனை (Token) அனுப்பும் செட்டப்
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
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

// டேஷ்போர்டு மதிப்புகளை சர்வரில் இருந்து வாங்கும் फंக்ஷன்கள் (API Calls)
export const getAppointments = () => api.get('/api/appointments');
export const getMedicalRecords = () => api.get('/api/records');
export const getPrescriptions = () => api.get('/api/prescriptions');
export const getPendingBills = () => api.get('/api/bills');

export default api;
