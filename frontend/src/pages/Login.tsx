import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import Toast, { ToastType } from '../components/Toast';

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  // Inputs state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Turnstile state
  const [turnstileState, setTurnstileState] = useState<'idle' | 'verifying' | 'verified'>('idle');

  // Toast System
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<ToastType>('success');
  const [showToast, setShowToast] = useState(false);

  const triggerToast = (message: string, type: ToastType) => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  const handleTurnstileClick = () => {
    if (turnstileState !== 'idle') return;
    
    setTurnstileState('verifying');
    setTimeout(() => {
      setTurnstileState('verified');
      triggerToast('Cloudflare Turnstile security verified.', 'success');
    }, 1500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email || !password) {
      setErrorMsg('Email and password are required.');
      return;
    }

    if (turnstileState !== 'verified') {
      setErrorMsg('Please complete the security verification challenge.');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      triggerToast('Logged in successfully! Redirecting to dashboard...', 'success');
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Incorrect email or password.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white border border-gray-100 p-8 rounded-2xl shadow-xs">
        
        {/* Top Header Logo */}
        <div className="text-center flex flex-col items-center">
          <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-2xl shadow-md mb-4">
            N
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 font-sans">
            Sign in to your account
          </h2>
          <p className="mt-1.5 text-xs text-gray-500">
            Or{' '}
            <Link to="/signup" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline">
              create a new NEET practice account
            </Link>
          </p>
        </div>

        {/* Error message card */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex items-start gap-2.5 text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span className="text-xs font-semibold leading-normal">{errorMsg}</span>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Email Input */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 font-sans">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="block w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white placeholder-gray-400 focus:outline-none transition-all"
            />
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 font-sans">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="block w-full pl-3.5 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white placeholder-gray-400 focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Cloudflare Turnstile Verification Panel */}
          <div className="border border-gray-200 bg-gray-50/50 rounded-xl p-4 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              {turnstileState === 'idle' && (
                <button
                  type="button"
                  onClick={handleTurnstileClick}
                  className="w-5 h-5 border-2 border-gray-300 rounded hover:border-blue-500 transition-colors cursor-pointer bg-white"
                />
              )}
              {turnstileState === 'verifying' && (
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              )}
              {turnstileState === 'verified' && (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-50" />
              )}
              
              <span className="text-xs font-medium text-gray-700 select-none">
                {turnstileState === 'verifying' ? 'Verifying browser connection...' : 'Verify you are a human candidate'}
              </span>
            </div>
            <span className="text-[10px] font-bold font-mono tracking-wider text-gray-400">
              TURNSTILE
            </span>
          </div>

          {/* Submit Trigger */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-6 py-3 px-4 border border-transparent rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Sign In
              </>
            )}
          </button>
        </form>

      </div>

      <Toast
        message={toastMessage}
        type={toastType}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
};

export default Login;
