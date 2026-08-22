import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import { getRoleRedirectPath } from '../../lib/auth/auth';
import { Activity, Mail, Lock, User, AlertCircle, ArrowRight, Loader2, UserRoundCog } from 'lucide-react';
import toast from 'react-hot-toast';

export const Route = createFileRoute('/register')({
  component: RegisterPage,
});

function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'patient' | 'doctor'>('patient');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await signUp(email, password, name, role);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      toast.success('Account created successfully!');
      navigate({ to: getRoleRedirectPath(role) });
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      toast.error('Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f4f1ea] p-4 sm:p-6 lg:p-8 font-vintage animate-fade-in">
      <div className="w-full max-w-md relative z-10">
        
        {/* Title Section */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-sm bg-[#faf8f3] mb-4 border border-[#b59a5c] shadow-sm">
            <Activity className="w-7 h-7 text-[#b59a5c]" />
          </div>
          <h1 className="text-3xl font-bold text-[#3b2f2f] mb-1 font-classic">Register File</h1>
          <p className="text-sm text-[#3b2f2f]/70 italic">Create your medical registry record</p>
        </div>

        {/* Vintage Framed Card */}
        <div className="bg-[#faf8f3] rounded-sm p-6 sm:p-8 border-2 border-double border-[#d2c19d] shadow-md relative">
          <div className="absolute inset-1 pointer-events-none border border-[#b59a5c]/10 rounded-xs" />

          <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
            {error && (
              <div className="p-4 bg-[#ffebee] border border-[#ffcdd2] rounded-sm flex items-start gap-3 animate-fade-in">
                <AlertCircle className="w-5 h-5 text-[#c62828] shrink-0 mt-0.5" />
                <p className="text-sm text-[#c62828] italic font-semibold">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="hc-label">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-[#b59a5c]" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="hc-input pl-10"
                    placeholder="John Doe"
                  />
                </div>
              </div>

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

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="hc-label">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-[#b59a5c]" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="hc-input pl-9"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div>
                  <label className="hc-label">Confirm Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-[#b59a5c]" />
                    </div>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="hc-input pl-9"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="hc-label">Registry Role Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('patient')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-sm border transition-all font-classic uppercase tracking-wider text-xs ${
                      role === 'patient'
                        ? 'bg-[#e7d8b5] border-[#b59a5c] text-[#3b2f2f] font-bold shadow-sm'
                        : 'bg-[#faf8f3] border-[#d2c19d] text-[#3b2f2f]/60 hover:bg-[#e7d8b5]/10'
                    }`}
                  >
                    <User className={`w-3.5 h-3.5 ${role === 'patient' ? 'text-[#b59a5c]' : 'text-[#3b2f2f]/50'}`} />
                    <span>Patient</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('doctor')}
                    className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-sm border transition-all font-classic uppercase tracking-wider text-xs ${
                      role === 'doctor'
                        ? 'bg-[#e7d8b5] border-[#b59a5c] text-[#3b2f2f] font-bold shadow-sm'
                        : 'bg-[#faf8f3] border-[#d2c19d] text-[#3b2f2f]/60 hover:bg-[#e7d8b5]/10'
                    }`}
                  >
                    <UserRoundCog className={`w-3.5 h-3.5 ${role === 'doctor' ? 'text-[#b59a5c]' : 'text-[#3b2f2f]/50'}`} />
                    <span>Doctor</span>
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3.5 mt-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              ) : (
                <>
                  Register File
                  <ArrowRight className="ml-2 w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center border-t border-[#d2c19d]/20 pt-4 relative z-10">
            <p className="text-sm text-[#3b2f2f]/80 italic">
              Already have a file registered?{' '}
              <Link to="/login" className="font-bold text-[#b59a5c] hover:text-[#9d8349] transition-colors font-classic uppercase tracking-wider text-xs">
                Sign In here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
