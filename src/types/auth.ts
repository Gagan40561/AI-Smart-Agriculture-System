export interface User {
  id: string;
  identifier: string; // email or mobile
  type: 'email' | 'mobile';
  role?: 'farmer' | 'admin';
  name?: string;
  location?: string;
  farmType?: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  isNewUser: boolean;
}

export interface OTPStore {
  otp: string;
  expiresAt: number;
  attempts: number;
}
