import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';

// Timeout for auth initialization to prevent infinite loading
const AUTH_INIT_TIMEOUT_MS = 8000;

// App-specific user type with role/plan info
interface AppUser {
  id: string;
  email: string;
  name: string | null;
  plan: 'free' | 'pro' | 'elite' | 'team';
  isAdmin: boolean;
  createdAt: string;
  isActive: boolean;
}

interface AuthStore {
  user: AppUser | null;
  session: Session | null;
  isAuthenticated: boolean; // TRUE if session exists (regardless of userData)
  isLoading: boolean; // Initial auth check in progress
  isUserDataLoading: boolean; // User profile/role data loading
  userDataError: string | null; // Error specific to userData fetch
  error: string | null; // General auth error
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  updatePlan: (plan: AppUser['plan']) => void;
}

// Helper to bootstrap user data if missing
async function bootstrapUser(): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('bootstrap_user');
    if (error) {
      console.error('Bootstrap user failed:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Bootstrap user exception:', error);
    return false;
  }
}

// Helper to fetch user profile and roles from database with retry logic
async function fetchUserData(userId: string, retryOnMissing = true): Promise<AppUser | null> {
  try {
    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // If profile missing and retry is enabled, try bootstrap
    if ((profileError || !profile) && retryOnMissing) {
      console.log('Profile missing, attempting bootstrap...');
      const bootstrapped = await bootstrapUser();
      if (bootstrapped) {
        // Wait a bit for data to propagate
        await new Promise(resolve => setTimeout(resolve, 200));
        // Retry without further bootstrap attempts
        return fetchUserData(userId, false);
      }
      return null;
    }

    if (profileError || !profile) {
      console.error('Error fetching profile:', profileError);
      return null;
    }

    // Check admin role using has_role function
    const { data: isAdmin } = await supabase
      .rpc('has_role', { _user_id: userId, _role: 'admin' });

    // Get user plan
    const { data: planTier } = await supabase
      .rpc('get_user_plan', { _user_id: userId });

    return {
      id: userId,
      email: profile.email,
      name: profile.display_name,
      plan: (planTier as 'free' | 'pro' | 'elite' | 'team') || 'free',
      isAdmin: isAdmin || false,
      createdAt: profile.created_at,
      isActive: true,
    };
  } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
  }
}

// Store subscription reference for cleanup
let authSubscription: { unsubscribe: () => void } | null = null;
let isInitialized = false;

export const useAuthStore = create<AuthStore>()((set, get) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,
  isUserDataLoading: false,
  userDataError: null,
  error: null,

  initialize: async () => {
    // Prevent duplicate initialization
    if (isInitialized) {
      return;
    }
    isInitialized = true;

    // Clean up existing subscription if any
    if (authSubscription) {
      authSubscription.unsubscribe();
      authSubscription = null;
    }

    // Set up timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('Auth initialization timed out after', AUTH_INIT_TIMEOUT_MS, 'ms');
      set({ isLoading: false, error: 'Auth initialization timed out. Please refresh.' });
    }, AUTH_INIT_TIMEOUT_MS);

    try {
      // Set up auth state listener FIRST (this handles subsequent auth changes)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        
        // Don't process during initial load - getSession handles that
        if (event === 'INITIAL_SESSION') {
          return;
        }
        
        if (session?.user) {
          // Session exists - user is authenticated
          set({
            session,
            isAuthenticated: true,
            isUserDataLoading: true,
            userDataError: null,
            error: null,
          });
          
          // Fetch user data in background (don't block auth state)
          setTimeout(async () => {
            const userData = await fetchUserData(session.user.id);
            set({
              user: userData,
              isUserDataLoading: false,
              userDataError: userData ? null : 'Failed to load profile data',
              isLoading: false,
            });
          }, 0);
        } else {
          // No session - user is logged out
          set({
            session: null,
            user: null,
            isAuthenticated: false,
            isLoading: false,
            isUserDataLoading: false,
            userDataError: null,
            error: null,
          });
        }
      });

      authSubscription = subscription;

      // Then get current session
      const { data: { session }, error } = await supabase.auth.getSession();
      clearTimeout(timeoutId);

      if (error) {
        console.error('Error getting session:', error);
        set({ isLoading: false, error: error.message });
        return;
      }
      
      if (session?.user) {
        // Session exists - mark as authenticated immediately
        set({
          session,
          isAuthenticated: true,
          isUserDataLoading: true,
          userDataError: null,
          isLoading: false, // Auth check done
          error: null,
        });
        
        // Fetch user data
        const userData = await fetchUserData(session.user.id);
        set({
          user: userData,
          isUserDataLoading: false,
          userDataError: userData ? null : 'Failed to load profile data',
        });
      } else {
        set({ isLoading: false, error: null });
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Auth initialization error:', error);
      set({ isLoading: false, error: 'Failed to initialize authentication' });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null, userDataError: null });
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        set({ isLoading: false, error: error.message });
        return { success: false, error: error.message };
      }

      if (data.user && data.session) {
        // Session exists - mark as authenticated immediately
        set({
          session: data.session,
          isAuthenticated: true,
          isLoading: false,
          isUserDataLoading: true,
          error: null,
        });
        
        // Fetch user data (non-blocking for auth status)
        const userData = await fetchUserData(data.user.id);
        
        set({
          user: userData,
          isUserDataLoading: false,
          userDataError: userData ? null : 'Profile data unavailable',
        });
        
        return { success: true };
      }

      set({ isLoading: false, error: 'Login failed' });
      return { success: false, error: 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      set({ isLoading: false, error: 'An unexpected error occurred' });
      return { success: false, error: 'An unexpected error occurred' };
    }
  },

  register: async (email: string, password: string, name: string) => {
    set({ isLoading: true, error: null, userDataError: null });
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            display_name: name,
          },
        },
      });

      if (error) {
        set({ isLoading: false });
        return { success: false, error: error.message };
      }

      // If email confirmation is required
      if (data.user && !data.session) {
        set({ isLoading: false });
        return { 
          success: true, 
          error: 'Please check your email to confirm your account before signing in.' 
        };
      }

      if (data.user && data.session) {
        // Authenticated - trigger bootstrap to ensure data exists
        set({
          session: data.session,
          isAuthenticated: true,
          isLoading: false,
          isUserDataLoading: true,
        });
        
        // Bootstrap and fetch user data
        await bootstrapUser();
        
        // Update profile with display name
        await supabase
          .from('profiles')
          .update({ display_name: name })
          .eq('user_id', data.user.id);

        const userData = await fetchUserData(data.user.id);
        set({
          user: userData,
          isUserDataLoading: false,
          userDataError: userData ? null : 'Profile setup in progress',
        });
        
        return { success: true };
      }

      set({ isLoading: false });
      return { success: false, error: 'Registration failed' };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, error: 'An unexpected error occurred' };
    }
  },

  logout: async () => {
    set({ isLoading: true });
    await supabase.auth.signOut();
    set({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
      isUserDataLoading: false,
      userDataError: null,
      error: null,
    });
  },

  refreshUserData: async () => {
    const { session } = get();
    if (session?.user) {
      set({ isUserDataLoading: true, userDataError: null });
      const userData = await fetchUserData(session.user.id);
      set({ 
        user: userData, 
        isUserDataLoading: false,
        userDataError: userData ? null : 'Failed to refresh profile data',
      });
    }
  },

  // Local update for demo/testing purposes - in production this would update via Stripe webhook
  updatePlan: (plan: AppUser['plan']) => {
    set(state => ({
      user: state.user ? { ...state.user, plan } : null,
    }));
  },
}));
