import React, { useState } from 'react';
import { Shield, Mail, Lock, UserIcon, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    if (!isLogin && !name) return;
    
    setLoading(true);
    setError(null);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const payload = isLogin 
        ? { email, password }
        : { email, password, display_name: name };

      const res = await api.post(endpoint, payload);
      const { access_token, user_id, display_name, email: userEmail } = res.data;

      localStorage.setItem('arkive_token', access_token);
      localStorage.setItem('arkive_user', JSON.stringify({ user_id, display_name, email: userEmail }));
      localStorage.setItem('isAuthenticated', 'true');
      
      navigate('/');
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail[0].msg);
      } else {
        setError(typeof detail === 'string' ? detail : 'Authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 pb-20">
      
      {/* Top Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="h-11 w-11 shrink-0 rounded-xl bg-foreground text-background flex items-center justify-center">
          <Shield size={24} strokeWidth={2} />
        </div>
        <div className="flex flex-col">
          <span className="font-serif text-2xl tracking-tight leading-tight">Arkive AI</span>
          <span className="text-[10px] uppercase text-muted-foreground tracking-[0.2em] leading-tight mt-0.5">
            Compliance Intelligence
          </span>
        </div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md rounded-3xl glass-panel hairline p-8 soft-shadow">
        <div className="text-center mb-8">
          <h4 className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
            {isLogin ? 'Welcome back' : 'Get started'}
          </h4>
          <h1 className="font-serif text-[32px] leading-tight tracking-tight">
            {isLogin ? (
              <>Sign in to <span className="text-primary">Arkive</span></>
            ) : (
              <>Create your <span className="text-primary">account</span></>
            )}
          </h1>
        </div>

        {/* Toggle */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-[oklch(0.2_0.04_290/0.5)] hairline mb-8">
          <button
            type="button"
            className={`py-2 text-sm font-medium rounded-xl transition-all ${
              isLogin ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setIsLogin(true)}
          >
            Login
          </button>
          <button
            type="button"
            className={`py-2 text-sm font-medium rounded-xl transition-all ${
              !isLogin ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setIsLogin(false)}
          >
            Register
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          {!isLogin && (
            <div className="relative">
              <UserIcon size={18} strokeWidth={1.7} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[oklch(0.18_0.03_285/0.6)] hairline text-sm outline-none focus:ring-1 focus:ring-[oklch(0.7_0.22_305/0.5)] transition-all placeholder:text-muted-foreground"
              />
            </div>
          )}

          <div className="relative">
            <Mail size={18} strokeWidth={1.7} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[oklch(0.18_0.03_285/0.6)] hairline text-sm outline-none focus:ring-1 focus:ring-[oklch(0.7_0.22_305/0.5)] transition-all placeholder:text-muted-foreground"
            />
          </div>

          <div className="relative">
            <Lock size={18} strokeWidth={1.7} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[oklch(0.18_0.03_285/0.6)] hairline text-sm outline-none focus:ring-1 focus:ring-[oklch(0.7_0.22_305/0.5)] transition-all placeholder:text-muted-foreground"
            />
          </div>

          {isLogin && (
            <div className="flex justify-end mt-1 mb-2">
              <a href="#" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">
                Forgot password?
              </a>
            </div>
          )}

          {error && (
            <div className="text-red-500 text-sm mt-2 text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-foreground text-background rounded-2xl py-3.5 flex items-center justify-center gap-2 text-sm font-semibold hover:bg-[oklch(0.9_0.01_300)] transition-colors disabled:opacity-50 ${!isLogin ? 'mt-2' : ''}`}
          >
            <span>{loading ? 'Processing...' : (isLogin ? 'Sign in' : 'Create account')}</span>
            {!loading && <ArrowRight size={16} strokeWidth={2} />}
          </button>
        </form>

        <div className="mt-8 text-center text-[13px] text-muted-foreground">
          {isLogin ? (
            <>New to Arkive? <button onClick={() => setIsLogin(false)} className="text-primary hover:underline font-medium">Create an account</button></>
          ) : (
            <>Already have an account? <button onClick={() => setIsLogin(true)} className="text-primary hover:underline font-medium">Sign in</button></>
          )}
        </div>
      </div>

      <div className="mt-8 text-center text-[12px] text-muted-foreground/70">
        By continuing you agree to our Terms and Privacy Policy.
      </div>

    </div>
  );
}
