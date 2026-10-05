import { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authService from '../services/authService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.token) {
      loadProfile();
    }
  }, []);

  const loadProfile = async () => {
    try {
      const res = await authService.getMe();
      setProfile(res.data.data.profile);
    } catch (err) {
      console.error('Failed to load profile');
    }
  };

  const loginUser = async (email, password) => {
    setLoading(true);
    try {
      const res = await authService.login({ email, password });
      const userData = res.data.data;
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      if (userData.token) {
        localStorage.setItem('token', userData.token);
      }
      await loadProfile();
      return { success: true, role: userData.role };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const registerUser = async (data) => {
    setLoading(true);
    try {
      const res = await authService.register(data);
      const userData = res.data.data;
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      return { success: true, role: userData.role };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Registration failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setProfile(null);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, loginUser, registerUser, logout, loadProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
