import { User, AuthResponse } from '../types/auth';

const API_URL = '/api/auth';
const APP_STORAGE_KEY = 'agri_app_data';

export const authService = {
  async sendOtp(identifier: string): Promise<{ message: string; expiresAt: number }> {
    const response = await fetch(`${API_URL}/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send OTP');
    }

    return response.json();
  },

  async login(identifier: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    localStorage.setItem('agri_auth_token', data.token);
    return data.status === 'ok' ? data : { ...data, status: 'ok' };
  },

  async register(identifier: string, password: string, type: 'email' | 'mobile'): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password, type }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    const data = await response.json();
    localStorage.setItem('agri_auth_token', data.token);
    return data.status === 'ok' ? data : { ...data, status: 'ok' };
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<{ message: string }> {
    const token = localStorage.getItem('agri_auth_token');
    if (!token) throw new Error('No token found');

    const response = await fetch(`${API_URL}/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ oldPassword, newPassword }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to change password');
    }

    return response.json();
  },

  async resetPasswordRequest(identifier: string): Promise<{ message: string; expiresAt: number }> {
    const response = await fetch(`${API_URL}/reset-password-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to request password reset');
    }

    return response.json();
  },

  async resetPasswordConfirm(data: any): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/reset-password-confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to reset password');
    }

    return response.json();
  },

  async getProfile(): Promise<User | null> {
    const token = localStorage.getItem('agri_auth_token');
    if (!token) return null;

    try {
      const response = await fetch(`${API_URL}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        localStorage.removeItem('agri_auth_token');
        return null;
      }

      const data = await response.json();
      if (data.status === 'ok') {
        const { status, ...user } = data;
        return user as User;
      }
      return data;
    } catch (err) {
      localStorage.removeItem('agri_auth_token');
      return null;
    }
  },

  async updateProfile(data: { name: string; location: string; farmType: string }): Promise<User> {
    const token = localStorage.getItem('agri_auth_token');
    if (!token) throw new Error('No token found');

    const response = await fetch(`${API_URL}/update-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to update profile');
    }

    const resData = await response.json();
    if (resData.status === 'ok') {
      const { status, ...user } = resData;
      return user as User;
    }
    return resData;
  },

  logout() {
    localStorage.removeItem('agri_auth_token');
    localStorage.removeItem(APP_STORAGE_KEY);
  },

  getToken() {
    return localStorage.getItem('agri_auth_token');
  }
};
