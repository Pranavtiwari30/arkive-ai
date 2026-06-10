import React, { useState } from 'react';
import { Shield, Mail, Lock, UserIcon, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();

  const handleAuth = (e) => {
    e.preventDefault();
    navigate('/');
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
              <>Sign in to <span className="text-primary italic">Arkive</span></>
            ) : (
              <>Create your <span className="text-primary italic">account</span></>
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
                placeholder="Full name"
                className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[oklch(0.18_0.03_285/0.6)] hairline text-sm outline-none focus:ring-1 focus:ring-[oklch(0.7_0.22_305/0.5)] transition-all placeholder:text-muted-foreground"
              />
            </div>
          )}

          <div className="relative">
            <Mail size={18} strokeWidth={1.7} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="email"
              placeholder="you@company.com"
              className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[oklch(0.18_0.03_285/0.6)] hairline text-sm outline-none focus:ring-1 focus:ring-[oklch(0.7_0.22_305/0.5)] transition-all placeholder:text-muted-foreground"
            />
          </div>

          <div className="relative">
            <Lock size={18} strokeWidth={1.7} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="password"
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

          <button
            type="submit"
            className={`w-full bg-foreground text-background rounded-2xl py-3.5 flex items-center justify-center gap-2 text-sm font-semibold hover:bg-[oklch(0.9_0.01_300)] transition-colors ${!isLogin ? 'mt-2' : ''}`}
          >
            <span>{isLogin ? 'Sign in' : 'Create account'}</span>
            <ArrowRight size={16} strokeWidth={2} />
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
