import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { Phone, Mail, ArrowRight, ShieldCheck, Loader2, Lock, User as UserIcon, Eye, EyeOff, KeyRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type AuthMode = 'login' | 'register' | 'forgot-password' | 'reset-password';

export const Login: React.FC = () => {
  const { t } = useTranslation();
  const { login, register, resetPasswordRequest, resetPasswordConfirm } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [loginMethod, setLoginMethod] = useState<'mobile' | 'email'>('mobile');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const formatMobile = (digits: string) => {
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)} ${digits.slice(5, 10)}`;
  };

  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (loginMethod === 'mobile') {
      let digits = val.replace(/\D/g, '');
      if (digits.startsWith('91') && digits.length > 10) {
        digits = digits.slice(2);
      }
      setIdentifier(digits.slice(0, 10));
    } else {
      setIdentifier(val);
    }
  };

  const getFormattedIdentifier = () => {
    if (loginMethod === 'mobile') {
      return `+91${identifier}`;
    }
    return identifier;
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    setError(null);
    setSuccess(null);

    if (mode === 'register' && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6 && (mode === 'login' || mode === 'register' || mode === 'reset-password')) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const formattedId = getFormattedIdentifier();
      if (mode === 'login') {
        await login(formattedId, password);
      } else if (mode === 'register') {
        await register(formattedId, password, loginMethod);
      } else if (mode === 'forgot-password') {
        await resetPasswordRequest(formattedId);
        setMode('reset-password');
        setSuccess("Reset OTP sent to your " + (loginMethod === 'email' ? 'email' : 'mobile'));
      } else if (mode === 'reset-password') {
        await resetPasswordConfirm({ identifier: formattedId, otp, newPassword: password });
        setMode('login');
        setSuccess("Password reset successful. Please login.");
        setPassword('');
        setOtp('');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(prev => prev === 'login' ? 'register' : 'login');
    setError(null);
    setSuccess(null);
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-dark-card border border-dark-border rounded-3xl p-8 shadow-2xl"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
            {mode === 'forgot-password' || mode === 'reset-password' ? (
              <KeyRound className="text-emerald-500" size={32} />
            ) : (
              <ShieldCheck className="text-emerald-500" size={32} />
            )}
          </div>
          <h1 className="text-2xl font-bold text-stone-100">
            {mode === 'login' ? t('auth.welcomeBack') : 
             mode === 'register' ? t('auth.createAccount') : 
             t('auth.resetPassword')}
          </h1>
          <p className="text-stone-400 text-sm mt-2">
            {mode === 'login' ? t('auth.secureLogin') : 
             mode === 'register' ? t('auth.joinCommunity') : 
             t('auth.followSteps')}
          </p>
        </div>

        {/* Auth Mode Toggle (only for login/register) */}
        {(mode === 'login' || mode === 'register') && (
          <div className="flex bg-stone-900/80 p-1 rounded-xl mb-6 border border-dark-border">
            <button
              onClick={() => setMode('login')}
              className={cn(
                "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                mode === 'login' ? "bg-emerald-500 text-white shadow-lg" : "text-stone-500 hover:text-stone-300"
              )}
            >
              {t('common.login')}
            </button>
            <button
              onClick={() => setMode('register')}
              className={cn(
                "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                mode === 'register' ? "bg-emerald-500 text-white shadow-lg" : "text-stone-500 hover:text-stone-300"
              )}
            >
              {t('common.register')}
            </button>
          </div>
        )}

        <div className="space-y-5">
          {/* Login Method Toggle */}
          {(mode === 'login' || mode === 'register' || mode === 'forgot-password') && (
            <div className="flex justify-center space-x-4 mb-2">
              <button
                type="button"
                onClick={() => setLoginMethod('mobile')}
                className={cn(
                  "text-xs font-medium px-3 py-1.5 rounded-full border transition-all",
                  loginMethod === 'mobile' 
                    ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-500" 
                    : "border-dark-border text-stone-500 hover:border-stone-700"
                )}
              >
                Mobile
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('email')}
                className={cn(
                  "text-xs font-medium px-3 py-1.5 rounded-full border transition-all",
                  loginMethod === 'email' 
                    ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-500" 
                    : "border-dark-border text-stone-500 hover:border-stone-700"
                )}
              >
                Email
              </button>
            </div>
          )}

          {/* Identifier Input */}
          <div>
            <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5 ml-1">
              {loginMethod === 'mobile' ? t('auth.mobileNumber') : t('auth.emailAddress')}
            </label>
            <div className="relative">
              <div className={cn(
                "absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 flex items-center",
                loginMethod === 'mobile' && "space-x-2"
              )}>
                {loginMethod === 'email' ? <Mail size={16} /> : (
                  <>
                    <Phone size={16} />
                    <span className="text-stone-400 font-bold border-r border-stone-800 pr-2 text-sm">+91</span>
                  </>
                )}
              </div>
              <input 
                type={loginMethod === 'mobile' ? "tel" : "email"}
                value={loginMethod === 'mobile' ? formatMobile(identifier) : identifier}
                onChange={handleIdentifierChange}
                placeholder={loginMethod === 'mobile' ? "xxxxx xxxxx" : "user@email.com"}
                className={cn(
                  "w-full bg-stone-900/50 border border-dark-border rounded-xl py-3 pr-4 text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50 transition-colors text-sm",
                  loginMethod === 'mobile' ? "pl-24" : "pl-12"
                )}
                required
                disabled={mode === 'reset-password'}
              />
            </div>
          </div>

          {/* Password Input */}
          {(mode === 'login' || mode === 'register' || mode === 'reset-password') && (
            <div>
              <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5 ml-1">
                {mode === 'reset-password' ? t('auth.newPassword') : t('auth.password')}
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500">
                  <Lock size={16} />
                </div>
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-stone-900/50 border border-dark-border rounded-xl py-3 pl-12 pr-12 text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50 transition-colors text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {/* Confirm Password (Register only) */}
          {mode === 'register' && (
            <div>
              <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5 ml-1">
                {t('auth.confirmPassword')}
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500">
                  <Lock size={16} />
                </div>
                <input 
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-stone-900/50 border border-dark-border rounded-xl py-3 pl-12 pr-4 text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50 transition-colors text-sm"
                  required
                />
              </div>
            </div>
          )}

          {/* OTP Input (Reset Password only) */}
          {mode === 'reset-password' && (
            <div>
              <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5 ml-1">
                {t('auth.resetOtp')}
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500">
                  <ShieldCheck size={16} />
                </div>
                <input 
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full bg-stone-900/50 border border-dark-border rounded-xl py-3 pl-12 pr-4 text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50 transition-colors text-sm font-mono tracking-widest"
                  required
                />
              </div>
            </div>
          )}

          {error && (
            <p className="text-red-400 text-xs bg-red-400/10 p-3 rounded-lg border border-red-400/20">
              {error}
            </p>
          )}

          {success && (
            <p className="text-emerald-400 text-xs bg-emerald-400/10 p-3 rounded-lg border border-emerald-400/20">
              {success}
            </p>
          )}

          <button 
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-lg shadow-emerald-500/20"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (
              <>
                <span>
                  {mode === 'login' ? t('common.login') : 
                   mode === 'register' ? t('common.register') : 
                   mode === 'forgot-password' ? t('auth.sendResetOtp') : 
                   t('auth.resetPassword')}
                </span>
                <ArrowRight size={18} />
              </>
            )}
          </button>

          {mode === 'login' && (
            <div className="text-center">
              <button 
                type="button"
                onClick={() => setMode('forgot-password')}
                className="text-stone-500 text-xs hover:text-emerald-500 transition-colors"
              >
                {t('auth.forgotPassword')}
              </button>
            </div>
          )}

          {(mode === 'forgot-password' || mode === 'reset-password') && (
            <div className="text-center">
              <button 
                type="button"
                onClick={() => setMode('login')}
                className="text-stone-500 text-xs hover:text-emerald-500 transition-colors"
              >
                {t('auth.backToLogin')}
              </button>
            </div>
          )}
        </div>

        {mode === 'login' && (
          <div className="mt-8 pt-6 border-t border-dark-border">
            <p className="text-stone-500 text-[10px] uppercase tracking-widest text-center mb-3">
              {t('auth.quickTest')}
            </p>
            <button
              type="button"
              onClick={() => {
                setLoginMethod('mobile');
                setIdentifier('0000000000');
                setPassword('password123');
              }}
              className="w-full bg-stone-900/50 hover:bg-stone-800 text-stone-400 hover:text-emerald-500 py-2 rounded-lg text-xs transition-colors border border-dark-border"
            >
              Demo: +91 00000 00000 / password123
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
