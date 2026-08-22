import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';
import { getRoleRedirectPath } from '../../lib/auth/auth';

export const Route = createFileRoute('/')({ component: IndexPage });

function IndexPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (user) {
        navigate({ to: getRoleRedirectPath(user.role) });
      } else {
        navigate({ to: '/login' });
      }
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-healthcare-900">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-4 animate-pulse-soft">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </div>
        <p className="text-white/60 text-sm">Loading...</p>
      </div>
    </div>
  );
}
