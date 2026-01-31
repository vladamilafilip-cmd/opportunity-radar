import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Plan } from '@/types';

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  updatePlan: (plan: Plan) => void;
}

// Demo users for testing
const DEMO_USERS: Record<string, { password: string; user: User }> = {
  'demo@iq200.com': {
    password: 'demo123',
    user: {
      id: 'demo-user',
      email: 'demo@iq200.com',
      name: 'Demo User',
      plan: 'pro',
      isAdmin: false,
      createdAt: new Date().toISOString(),
      isActive: true,
    },
  },
  'admin@iq200.com': {
    password: 'admin123',
    user: {
      id: 'admin-user',
      email: 'admin@iq200.com',
      name: 'Admin',
      plan: 'full',
      isAdmin: true,
      createdAt: new Date().toISOString(),
      isActive: true,
    },
  },
  'free@iq200.com': {
    password: 'free123',
    user: {
      id: 'free-user',
      email: 'free@iq200.com',
      name: 'Free User',
      plan: 'free',
      isAdmin: false,
      createdAt: new Date().toISOString(),
      isActive: true,
    },
  },
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const demoUser = DEMO_USERS[email.toLowerCase()];
        
        if (demoUser && demoUser.password === password) {
          set({
            user: demoUser.user,
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        }
        
        set({ isLoading: false });
        return false;
      },

      register: async (email: string, password: string, name: string) => {
        set({ isLoading: true });
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // In demo mode, create a new user with free plan
        const newUser: User = {
          id: `user-${Date.now()}`,
          email,
          name,
          plan: 'free',
          isAdmin: false,
          createdAt: new Date().toISOString(),
          isActive: true,
        };
        
        set({
          user: newUser,
          isAuthenticated: true,
          isLoading: false,
        });
        
        return true;
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
        });
      },

      updatePlan: (plan: Plan) => {
        set(state => ({
          user: state.user ? { ...state.user, plan } : null,
        }));
      },
    }),
    {
      name: 'iq200-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
