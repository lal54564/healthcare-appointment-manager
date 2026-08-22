/**
 * Authentication utilities
 * 
 * Handles sign up, sign in, sign out, session management,
 * and role-based access control.
 */

import { supabase, isDevMockMode, getMockDb, saveMockDb } from '../db/client';
import type { AuthUser, UserRole, Profile } from '../db/types';

// Mock users dictionary
const MOCK_USERS: Record<string, { role: UserRole; name: string }> = {
  'admin@healthcare.demo': { role: 'admin', name: 'Admin User' },
  'dr.sharma@healthcare.demo': { role: 'doctor', name: 'Dr. Ananya Sharma' },
  'patient@healthcare.demo': { role: 'patient', name: 'Demo Patient' },
  'patient@example.com': { role: 'patient', name: 'Demo Patient' },
  'doctor@example.com': { role: 'doctor', name: 'Dr. Ananya Sharma' },
  'admin@example.com': { role: 'admin', name: 'Admin User' },
};

function getLocalMockUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const userJson = localStorage.getItem('healthcare_mock_user');
  return userJson ? JSON.parse(userJson) : null;
}

function setLocalMockUser(user: AuthUser | null) {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem('healthcare_mock_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('healthcare_mock_user');
  }
}

// Persist email→role mapping so newly registered users keep their role on re-login
function getMockRoles(): Record<string, UserRole> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem('healthcare_mock_roles') || '{}');
  } catch {
    return {};
  }
}

function setMockRole(email: string, role: UserRole) {
  if (typeof window === 'undefined') return;
  const roles = getMockRoles();
  roles[email.toLowerCase()] = role;
  localStorage.setItem('healthcare_mock_roles', JSON.stringify(roles));
}

export async function signUp(params: {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
}): Promise<{ user: AuthUser | null; error: string | null }> {
  if (isDevMockMode) {
    const userId = Math.random().toString(36).substring(2);
    const names = params.fullName.split(' ');
    const firstName = names[0] || params.fullName;
    const lastName = names.slice(1).join(' ') || 'User';

    const mockUser: AuthUser = {
      id: userId,
      email: params.email,
      role: params.role,
      profile: {
        id: userId,
        user_id: userId,
        full_name: params.fullName,
        first_name: firstName,
        last_name: lastName,
        email: params.email,
        phone: null,
        date_of_birth: null,
        gender: null,
        address: null,
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };

    setLocalMockUser(mockUser);
    // Persist the role so re-login works correctly for any role including 'admin'
    setMockRole(params.email, params.role);

    const db = getMockDb();
    db.profiles.push(mockUser.profile);

    if (params.role === 'doctor') {
      db.doctors.push({
        id: 'doc-' + userId,
        user_id: userId,
        specialisation: 'General Physician',
        qualification: 'MBBS',
        experience_years: 0,
        bio: 'General Practitioner',
        working_days: [1, 2, 3, 4, 5],
        working_hours_start: '09:00',
        working_hours_end: '17:00',
        slot_duration_minutes: 30,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    saveMockDb(db);
    return { user: mockUser, error: null };
  }

  try {
    // 1. Create the auth user — pass role in metadata so the DB trigger can use it
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          full_name: params.fullName,
          role: params.role,
        },
      },
    });

    if (authError) {
      return { user: null, error: authError.message };
    }

    if (!authData.user) {
      return { user: null, error: 'Sign up failed. Please try again.' };
    }

    // 2. Small delay to let the trigger finish
    await new Promise(resolve => setTimeout(resolve, 800));

    // 3. Ensure profile exists with the correct full_name
    const { error: profileError } = await supabase.from('profiles').upsert({
      user_id: authData.user.id,
      email: params.email,
      full_name: params.fullName,
    }, { onConflict: 'user_id' });

    if (profileError) {
      console.error('Profile upsert error:', profileError);
    }

    // 4. Assign role
    const { error: roleError } = await supabase.from('user_roles').upsert({
      user_id: authData.user.id,
      role: params.role,
    }, { onConflict: 'user_id,role' });

    if (roleError) {
      console.error('Role upsert error:', roleError);
    }

    // 5. If registering as doctor, create a basic doctors table entry
    if (params.role === 'doctor') {
      const { error: doctorError } = await supabase.from('doctors').upsert({
        user_id: authData.user.id,
        specialisation: 'General Physician',
        qualification: 'MBBS',
        experience_years: 0,
        bio: '',
        working_days: [1, 2, 3, 4, 5],
        working_hours_start: '09:00',
        working_hours_end: '17:00',
        slot_duration_minutes: 30,
        is_active: true,
      }, { onConflict: 'user_id' });

      if (doctorError) {
        console.error('Doctor record creation error:', doctorError);
      }
    }

    // 6. Fetch the complete user info
    const user = await getCurrentUser();
    return { user, error: null };
  } catch (err: any) {
    return { user: null, error: err.message || 'An unexpected error occurred during sign up.' };
  }
}

export async function signIn(params: {
  email: string;
  password: string;
}): Promise<{ user: AuthUser | null; error: string | null }> {
  if (isDevMockMode) {
    const db = getMockDb();
    const matched = MOCK_USERS[params.email];
    
    // Find profile in mock db
    let profile = db.profiles.find(p => p.email.toLowerCase() === params.email.toLowerCase());
    
    let role: UserRole = 'patient';
    if (matched) {
      role = matched.role;
    } else {
      // Check persisted role map (written at signUp time)
      const persistedRole = getMockRoles()[params.email.toLowerCase()];
      if (persistedRole) {
        role = persistedRole;
      } else if (profile) {
        const isDoctor = db.doctors.some(d => d.user_id === profile.user_id);
        role = isDoctor ? 'doctor' : 'patient';
      } else if (params.email.toLowerCase().includes('doctor') || params.email.toLowerCase().includes('dr.')) {
        role = 'doctor';
      }
    }

    const name = matched ? matched.name : (profile ? profile.full_name : params.email.split('@')[0]);

    // Find profile template if not found in db
    if (!profile) {
      if (role === 'doctor') {
        profile = db.profiles.find(p => p.email === 'dr.sharma@healthcare.demo');
      } else if (role === 'admin') {
        profile = db.profiles.find(p => p.email === 'admin@healthcare.demo');
      } else {
        profile = db.profiles.find(p => p.email === 'patient@healthcare.demo');
      }
    }

    const userId = profile ? profile.user_id : Math.random().toString(36).substring(2);
    const userProfile = profile ? {
      ...profile,
      email: params.email
    } : {
      id: userId,
      user_id: userId,
      full_name: name.charAt(0).toUpperCase() + name.slice(1),
      first_name: name.charAt(0).toUpperCase() + name.slice(1),
      last_name: 'User',
      email: params.email,
      phone: '9876543210',
      date_of_birth: '1990-01-01',
      gender: 'Other',
      address: 'Healthcare Clinic St',
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockUser: AuthUser = {
      id: userId,
      email: params.email,
      role,
      profile: userProfile,
    };

    setLocalMockUser(mockUser);

    if (!db.profiles.some(p => p.user_id === userId)) {
      db.profiles.push(userProfile);
      saveMockDb(db);
    }

    return { user: mockUser, error: null };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: params.email,
      password: params.password,
    });

    if (error) {
      return { user: null, error: error.message };
    }

    if (!data.user) {
      return { user: null, error: 'Sign in failed. Please try again.' };
    }

    const user = await getCurrentUser();
    return { user, error: null };
  } catch (err) {
    return { user: null, error: 'An unexpected error occurred during sign in.' };
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  if (isDevMockMode) {
    setLocalMockUser(null);
    return;
  }
  await supabase.auth.signOut();
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (isDevMockMode) {
    return getLocalMockUser();
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    // Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Fetch role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    // If profile or role is missing, build a minimal fallback from auth metadata
    const meta = user.user_metadata || {};
    const fallbackRole = (meta.role as UserRole) || 'patient';
    const fallbackProfile: Profile = {
      id: user.id,
      user_id: user.id,
      full_name: meta.full_name || user.email?.split('@')[0] || 'User',
      email: user.email || '',
      phone: null,
      date_of_birth: null,
      gender: null,
      address: null,
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return {
      id: user.id,
      email: user.email || '',
      role: (roleData?.role as UserRole) || fallbackRole,
      profile: (profile as Profile) || fallbackProfile,
    };
  } catch {
    return null;
  }
}

/**
 * Get the redirect path based on user role
 */
export function getRoleRedirectPath(role: UserRole): string {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'doctor':
      return '/doctor';
    case 'patient':
      return '/patient';
    default:
      return '/login';
  }
}

/**
 * Check if a user has the required role
 */
export function hasRole(user: AuthUser | null, requiredRole: UserRole): boolean {
  return user?.role === requiredRole;
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  if (isDevMockMode) {
    // Return unsubscribe mock
    const user = getLocalMockUser();
    callback(user);
    return {
      data: {
        subscription: {
          unsubscribe: () => {},
        },
      },
    };
  }

  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_OUT' || !session?.user) {
      callback(null);
      return;
    }
    
    const user = await getCurrentUser();
    callback(user);
  });
}
