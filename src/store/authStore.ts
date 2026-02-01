import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

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
  isAuthenticated: boolean;
  isLoading: boolean;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  updatePlan: (plan: AppUser['plan']) => void;
}

// Helper to fetch user profile and roles from database
async function fetchUserData(userId: string): Promise<AppUser | null> {
  try {
    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

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

export const useAuthStore = create<AuthStore>()((set, get) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,

  initialize: async () => {
    try {
      // Set up auth state listener FIRST
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          const userData = await fetchUserData(session.user.id);
          set({
            session,
            user: userData,
            isAuthenticated: !!userData,
            isLoading: false,
          });
        } else {
          set({
            session: null,
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      });

      // Then get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const userData = await fetchUserData(session.user.id);
        set({
          session,
          user: userData,
          isAuthenticated: !!userData,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        set({ isLoading: false });
        return { success: false, error: error.message };
      }

      if (data.user) {
        const userData = await fetchUserData(data.user.id);
        set({
          session: data.session,
          user: userData,
          isAuthenticated: !!userData,
          isLoading: false,
        });
        return { success: true };
      }

      set({ isLoading: false });
      return { success: false, error: 'Login failed' };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, error: 'An unexpected error occurred' };
    }
  },

  register: async (email: string, password: string, name: string) => {
    set({ isLoading: true });
    
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
        // Update profile with display name
        await supabase
          .from('profiles')
          .update({ display_name: name })
          .eq('user_id', data.user.id);

        const userData = await fetchUserData(data.user.id);
        set({
          session: data.session,
          user: userData,
          isAuthenticated: !!userData,
          isLoading: false,
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
    await supabase.auth.signOut();
    set({
      user: null,
      session: null,
      isAuthenticated: false,
    });
  },

  refreshUserData: async () => {
    const { session } = get();
    if (session?.user) {
      const userData = await fetchUserData(session.user.id);
      set({ user: userData });
    }
  },

  // Local update for demo/testing purposes - in production this would update via Stripe webhook
  updatePlan: (plan: AppUser['plan']) => {
    set(state => ({
      user: state.user ? { ...state.user, plan } : null,
    }));
  },
}));
