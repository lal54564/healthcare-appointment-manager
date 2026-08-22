import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import { getRoleRedirectPath } from '../../lib/auth/auth';
import { Activity, Mail, Lock, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await signIn(email, password);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      if (!response.user) {
        throw new Error('User data missing after login');
      }

      toast.success('Successfully logged in!');
      navigate({ to: getRoleRedirectPath(response.user.role) });
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
      toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f1ea] p-4 sm:p-6 lg:p-8 font-vintage">
      <div className="w-full max-w-md relative z-10 animate-fade-in">
        
        {/* Logo and Greeting */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-sm bg-[#faf8f3] mb-4 border border-[#b59a5c] shadow-sm">
            <Activity className="w-8 h-8 text-[#b59a5c]" />
          </div>
          <h1 className="text-3xl font-bold text-[#3b2f2f] mb-1 font-classic">HealthCare Sanctuary</h1>
          <p className="text-sm text-[#3b2f2f]/70 italic">Sign in to your clinical files & appointment desk</p>
        </div>

        {/* Vintage Framed Card */}
        <div className="bg-[#faf8f3] rounded-sm p-8 border-2 border-double border-[#d2c19d] shadow-md relative">
          <div className="absolute inset-1 pointer-events-none border border-[#b59a5c]/10 rounded-xs" />

          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            {error && (
              <div className="p-4 bg-[#ffebee] border border-[#ffcdd2] rounded-sm flex items-start gap-3 animate-fade-in">
                <AlertCircle className="w-5 h-5 text-[#c62828] shrink-0 mt-0.5" />
                <p className="text-sm text-[#c62828] italic font-semibold">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="hc-label">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-[#b59a5c]" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="hc-input pl-10"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="hc-label">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-[#b59a5c]" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="hc-input pl-10"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-classic uppercase tracking-wider">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="rounded border-[#d2c19d] bg-[#faf8f3] text-[#b59a5c] focus:ring-[#b59a5c]/50 focus:ring-offset-0 transition-colors" 
                />
                <span className="text-[#3b2f2f]/80 group-hover:text-[#3b2f2f] transition-colors">Remember me</span>
              </label>
              <a href="#" className="text-[#b59a5c] hover:text-[#9d8349] font-bold transition-colors">
                Forgot?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3.5"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="ml-2 w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-[#d2c19d]/20 pt-4 relative z-10">
            <p className="text-sm text-[#3b2f2f]/80 italic">
              Don't have a file registered?{' '}
              <Link to="/register" className="font-bold text-[#b59a5c] hover:text-[#9d8349] transition-colors font-classic uppercase tracking-wider text-xs">
                Register one now
              </Link>
            </p>
          </div>
        </div>
        
        {/* Quick login directives */}
        <div className="mt-6 text-center text-[#3b2f2f]/50 text-xs italic flex flex-col gap-1">
          <p>Mock File: patient@example.com / password</p>
          <p>Mock File: doctor@example.com / password</p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
